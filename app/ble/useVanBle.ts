// Finds every van board in Bluetooth range, stays connected to each, and sends passcode-signed commands.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, Device, Subscription } from "react-native-ble-plx";
import {
  ACTION,
  buildClaim,
  buildCommand,
  deriveKey,
  fromBase64,
  maskNewKey,
  OP,
  parseConfig,
  parseInfo,
  parseNonce,
  parseResp,
  RESP,
  respText,
  Target,
  toBase64,
  UUID,
} from "./protocol";

export type Board = {
  /** The board's WiFi MAC as hex: stable across phones, unlike the Bluetooth id. */
  mac: string;
  name: string;
  type: number;
  count: number;
  claimed: boolean;
  ota: boolean;
  /** Bit i set = relay i on (relay board) or switch i pressed (panel). */
  state: number;
  /** Relay names (relay boards). */
  names: string[];
  /** What each switch drives (panels). */
  targets: (Target | null)[];
  connected: boolean;
  /** true/false once our passcode has been checked against the board; null before that. */
  authOk: boolean | null;
};

export type BoardMap = { [mac: string]: Board };

type Session = {
  deviceId: string;
  mac: string;
  type: number;
  nonce: Uint8Array;
  counter: number;
  waiters: Map<string, (code: number) => void>;
  queue: Promise<unknown>;
  subs: Subscription[];
};

type Args = Uint8Array | ((counter: number) => Uint8Array);

const STORAGE_KEY = "knownBoards";
const RESPONSE_TIMEOUT_MS = 2500;

const manager = new BleManager();

async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  const wanted =
    Number(Platform.Version) >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const result = await PermissionsAndroid.requestMultiple(wanted);
  return wanted.every((p) => result[p] === PermissionsAndroid.RESULTS.GRANTED);
}

export function useVanBle(
  passcode: string | null,
  addMessage: (s: string) => void
) {
  const [boards, setBoards] = useState<BoardMap>({});
  const [bluetoothOn, setBluetoothOn] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const sessions = useRef(new Map<string, Session>()).current; // by Bluetooth device id
  const connecting = useRef(new Set<string>()).current;
  const keyRef = useRef<Uint8Array | null>(null);
  const savedJson = useRef("");
  const log = useRef(addMessage);
  log.current = addMessage;

  const patchBoard = useCallback((mac: string, patch: Partial<Board>) => {
    setBoards((prev) => {
      const old: Board = prev[mac] ?? {
        mac,
        name: "",
        type: 0,
        count: 0,
        claimed: false,
        ota: false,
        state: 0,
        names: [],
        targets: [],
        connected: false,
        authOk: null,
      };
      return { ...prev, [mac]: { ...old, ...patch } };
    });
  }, []);

  const sessionFor = (mac: string) =>
    Array.from(sessions.values()).find((s) => s.mac === mac);

  const read = async (deviceId: string, characteristic: string) =>
    fromBase64(
      (
        await manager.readCharacteristicForDevice(
          deviceId,
          UUID.service,
          characteristic
        )
      ).value
    );

  const refreshNonce = async (s: Session) => {
    const n = parseNonce(await read(s.deviceId, UUID.nonce));
    s.nonce = n.nonce;
    s.counter = Math.max(s.counter, n.counter);
  };

  const refreshBoard = async (s: Session) => {
    const info = parseInfo(await read(s.deviceId, UUID.info));
    const config = parseConfig(await read(s.deviceId, UUID.config), info.type);
    const state = (await read(s.deviceId, UUID.state))[0] ?? 0;
    patchBoard(s.mac, {
      name: config.name,
      type: info.type,
      count: info.count,
      claimed: info.claimed,
      ota: info.ota,
      names: config.names,
      targets: config.targets,
      state,
      connected: true,
    });
    return info;
  };

  /** Writes one command and waits for the board's answer to it. */
  const writeAndWait = (s: Session, cmd: Uint8Array, counter: number) => {
    const tagEcho =
      cmd[4] === OP.claim
        ? "0000"
        : Array.from(cmd.slice(-8, -6), (x) =>
            x.toString(16).padStart(2, "0")
          ).join("");
    const waiterKey = `${counter}:${tagEcho}`;
    return new Promise<number>((resolve) => {
      const done = (code: number) => {
        clearTimeout(timer);
        s.waiters.delete(waiterKey);
        resolve(code);
      };
      // No notification in time (it can be missed right after connecting): the board
      // also keeps its latest answer readable, so look there before giving up.
      const timer = setTimeout(async () => {
        try {
          const r = parseResp(await read(s.deviceId, UUID.resp));
          done(r && `${r.counter}:${r.tagEcho}` === waiterKey ? r.code : RESP.timeout);
        } catch {
          done(RESP.timeout);
        }
      }, RESPONSE_TIMEOUT_MS);
      s.waiters.set(waiterKey, done);
      manager
        .writeCharacteristicWithResponseForDevice(
          s.deviceId,
          UUID.service,
          UUID.cmd,
          toBase64(cmd)
        )
        .catch(() => done(RESP.timeout));
    });
  };

  /** Commands to one board run one at a time so their counters stay in order. */
  const sendWithKey = (s: Session, key: Uint8Array, op: number, args: Args) => {
    const run = async () => {
      for (let attempt = 0; ; attempt++) {
        const counter = ++s.counter;
        const a = typeof args === "function" ? args(counter) : args;
        const cmd = buildCommand(key, s.nonce, counter, op, a);
        const code = await writeAndWait(s, cmd, counter);
        // Another phone used a higher counter since we last looked: catch up and retry once.
        if (code === RESP.staleCounter && attempt === 0) {
          await refreshNonce(s);
          continue;
        }
        return code;
      }
    };
    const result = s.queue.then(run, run);
    s.queue = result.catch(() => undefined);
    return result;
  };

  const verify = async (s: Session) => {
    const key = keyRef.current;
    if (!key) return;
    const code = await sendWithKey(s, key, OP.ping, new Uint8Array(0));
    if (code === RESP.ok || code === RESP.badAuth) {
      patchBoard(s.mac, { authOk: code === RESP.ok });
    }
  };

  const dropSession = (deviceId: string) => {
    const s = sessions.get(deviceId);
    if (!s) return;
    sessions.delete(deviceId);
    s.subs.forEach((sub) => sub.remove());
    s.waiters.forEach((done) => done(RESP.timeout));
    patchBoard(s.mac, { connected: false, authOk: null });
    log.current(`Lost ${s.mac}`);
  };

  const connect = async (device: Device) => {
    const id = device.id;
    if (connecting.has(id) || sessions.has(id)) return;
    connecting.add(id);
    try {
      await manager.connectToDevice(id, { requestMTU: 185, timeout: 10000 });
      await manager.discoverAllServicesAndCharacteristicsForDevice(id);
      const info = parseInfo(await read(id, UUID.info));
      const s: Session = {
        deviceId: id,
        mac: info.mac,
        type: info.type,
        nonce: new Uint8Array(8),
        counter: 0,
        waiters: new Map(),
        queue: Promise.resolve(),
        subs: [],
      };
      sessions.set(id, s);
      s.subs.push(
        manager.monitorCharacteristicForDevice(
          id,
          UUID.service,
          UUID.state,
          (error, ch) => {
            if (error || !ch) return;
            patchBoard(s.mac, { state: fromBase64(ch.value)[0] ?? 0 });
          }
        ),
        manager.monitorCharacteristicForDevice(
          id,
          UUID.service,
          UUID.resp,
          (error, ch) => {
            if (error || !ch) return;
            const r = parseResp(fromBase64(ch.value));
            if (r) s.waiters.get(`${r.counter}:${r.tagEcho}`)?.(r.code);
          }
        ),
        manager.onDeviceDisconnected(id, () => dropSession(id))
      );
      await refreshNonce(s);
      await refreshBoard(s);
      log.current(`Connected to ${device.name ?? info.mac}`);
      if (info.claimed) await verify(s);
    } catch (e) {
      log.current(`Could not connect to ${device.name ?? id}: ${e}`);
      dropSession(id);
      manager.cancelDeviceConnection(id).catch(() => undefined);
    } finally {
      connecting.delete(id);
    }
  };
  const connectRef = useRef(connect);
  connectRef.current = connect;

  // Remembered boards show up (greyed out) before they are back in range.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (json) {
          savedJson.current = json;
          const saved: Board[] = JSON.parse(json);
          setBoards((prev) => {
            const next = { ...prev };
            for (const b of saved) {
              if (!next[b.mac])
                next[b.mac] = { ...b, connected: false, authOk: null, state: 0 };
            }
            return next;
          });
        }
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const json = JSON.stringify(
      Object.values(boards).map((b) => ({
        ...b,
        connected: false,
        authOk: null,
        state: 0,
        ota: false,
      }))
    );
    if (json === savedJson.current) return;
    savedJson.current = json;
    AsyncStorage.setItem(STORAGE_KEY, json).catch(() => undefined);
  }, [boards, loaded]);

  // Scan the whole time the app is open; connect to every board that shows up.
  useEffect(() => {
    let stateSub: Subscription | undefined;
    let cancelled = false;
    (async () => {
      if (!(await requestPermissions())) {
        log.current("Bluetooth permission was not granted");
        return;
      }
      if (cancelled) return;
      stateSub = manager.onStateChange((state) => {
        const on = state === "PoweredOn";
        setBluetoothOn(on);
        if (!on) return;
        manager.startDeviceScan(
          [UUID.service],
          { allowDuplicates: true },
          (error, device) => {
            if (error) log.current(`Scan error: ${error.message}`);
            else if (device) connectRef.current(device);
          }
        );
      }, true);
    })();
    return () => {
      cancelled = true;
      stateSub?.remove();
      manager.stopDeviceScan();
      Array.from(sessions.keys()).forEach((id) => {
        dropSession(id);
        manager.cancelDeviceConnection(id).catch(() => undefined);
      });
    };
  }, []);

  // New passcode on the phone: recheck it against every connected board.
  useEffect(() => {
    keyRef.current = passcode ? deriveKey(passcode) : null;
    sessions.forEach((s) => {
      patchBoard(s.mac, { authOk: null });
      verify(s);
    });
  }, [passcode]);

  /** Sends a command signed with the phone's passcode. Resolves true if the board accepted it. */
  const send = async (mac: string, op: number, args: Args, what: string) => {
    const s = sessionFor(mac);
    const key = keyRef.current;
    if (!s || !key) {
      log.current(`${what}: ${s ? "no passcode set" : "board not in range"}`);
      return false;
    }
    const code = await sendWithKey(s, key, op, args);
    if (code === RESP.badAuth) patchBoard(mac, { authOk: false });
    if (code !== RESP.ok) log.current(`${what}: ${respText(code)}`);
    return code === RESP.ok;
  };

  const sendThenRefresh = async (
    mac: string,
    op: number,
    args: Args,
    what: string
  ) => {
    const ok = await send(mac, op, args, what);
    const s = sessionFor(mac);
    if (ok && s) await refreshBoard(s).catch(() => undefined);
    return ok;
  };

  const toggleRelay = (mac: string, index: number) =>
    send(mac, OP.setRelay, Uint8Array.of(index, ACTION.toggle), "Toggle");

  /** Gives a board with no passcode the phone's passcode. */
  const claim = async (mac: string) => {
    const s = sessionFor(mac);
    const key = keyRef.current;
    if (!s || !key) return false;
    const run = () => {
      const counter = ++s.counter;
      return writeAndWait(s, buildClaim(counter, key), counter);
    };
    const result = s.queue.then(run, run);
    s.queue = result.catch(() => undefined);
    const code = await result;
    if (code !== RESP.ok) log.current(`Set passcode: ${respText(code)}`);
    await refreshBoard(s).catch(() => undefined);
    await verify(s);
    return code === RESP.ok;
  };

  /** Moves a board from another passcode to the phone's passcode. */
  const adoptFromPasscode = async (mac: string, currentPasscode: string) => {
    const s = sessionFor(mac);
    const key = keyRef.current;
    if (!s || !key) return false;
    const oldKey = deriveKey(currentPasscode);
    const code = await sendWithKey(s, oldKey, OP.setPasscode, (counter) =>
      maskNewKey(oldKey, s.nonce, counter, key)
    );
    if (code !== RESP.ok) log.current(`Change passcode: ${respText(code)}`);
    await verify(s);
    return code === RESP.ok;
  };

  const forgetBoards = () => {
    setBoards((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([, b]) => b.connected))
    );
  };

  return {
    boards,
    bluetoothOn,
    send,
    sendThenRefresh,
    toggleRelay,
    claim,
    adoptFromPasscode,
    forgetBoards,
  };
}
