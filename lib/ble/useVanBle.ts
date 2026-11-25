// Finds every van board in Bluetooth range, stays connected to each, and sends passcode-signed commands.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, Device, Subscription } from "react-native-ble-plx";
import {
  ACTION,
  Broadcast,
  broadcastName,
  buildClaim,
  buildCommand,
  decodeBroadcast,
  deriveKey,
  DEVICE_POWER,
  fromBase64,
  maskNewKey,
  OP,
  parseBroadcast,
  parseConfig,
  parseInfo,
  parseNonce,
  parseResp,
  RESP,
  respText,
  toBase64,
  UUID,
} from "./protocol";
import { Board, BoardMap, CommandArgs as Args, VanBle } from "./types";

type Session = {
  deviceId: string;
  mac: string;
  type: number;
  nonce: Uint8Array;
  counter: number;
  waiters: Map<string, (code: number) => void>;
  queue: Promise<unknown>;
  subs: Subscription[];
  /** Opened just for a command (Cerbo): the board stays out of range-tracking and is let go after. */
  transient: boolean;
  users: number;
  idle?: ReturnType<typeof setTimeout>;
};

const STORAGE_KEY = "knownBoards";
const RESPONSE_TIMEOUT_MS = 2500;
const BROADCAST_STALE_MS = 20000;
const TRANSIENT_IDLE_MS = 3000;
/** Readings that fail the passcode check this many times in a row mean a different passcode. */
const BAD_TAGS_FOR_LOCKED = 3;

const sameUuid = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

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
): VanBle {
  const [boards, setBoards] = useState<BoardMap>({});
  const [bluetoothOn, setBluetoothOn] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const sessions = useRef(new Map<string, Session>()).current; // by Bluetooth device id
  const connecting = useRef(new Set<string>()).current;
  const keyRef = useRef<Uint8Array | null>(null);
  const savedJson = useRef("");
  const log = useRef(addMessage);
  log.current = addMessage;

  const broadcastIds = useRef(new Map<string, string>()).current; // Cerbo MAC -> Bluetooth device id
  const lastIv = useRef(new Map<string, number>()).current;
  const lastSeen = useRef(new Map<string, number>()).current;
  const badTags = useRef(new Map<string, number>()).current;
  const opening = useRef(new Map<string, Promise<Session | undefined>>()).current;

  const patchBoard = useCallback((mac: string, change: Partial<Board> | ((old: Board) => Partial<Board>)) => {
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
        flags: [],
        flagsOnBoard: false,
        targets: [],
        connected: false,
        authOk: null,
      };
      const patch = typeof change === "function" ? change(old) : change;
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
      flags: config.flags,
      flagsOnBoard: config.flagsOnBoard,
      targets: config.targets,
      state,
      ...(s.transient ? {} : { connected: true }),
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
    clearTimeout(s.idle);
    if (s.transient) return;
    patchBoard(s.mac, { connected: false, authOk: null });
    log.current(`Lost ${s.mac}`);
  };

  const connect = async (
    id: string,
    label: string,
    transient = false
  ): Promise<Session | undefined> => {
    if (connecting.has(id) || sessions.has(id)) return sessions.get(id);
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
        transient,
        users: 0,
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
      if (!transient) log.current(`Connected to ${label}`);
      if (info.claimed) await verify(s);
      return s;
    } catch (e) {
      log.current(`Could not connect to ${label}: ${e}`);
      dropSession(id);
      manager.cancelDeviceConnection(id).catch(() => undefined);
      return undefined;
    } finally {
      connecting.delete(id);
    }
  };
  /** A Cerbo only takes a connection for commands: open one on demand and let it go once idle. */
  const withSession = async <T,>(
    mac: string,
    run: (s: Session) => Promise<T>
  ): Promise<T | undefined> => {
    let s = sessionFor(mac);
    if (!s) {
      const deviceId = broadcastIds.get(mac);
      if (!deviceId) return undefined;
      let pending = opening.get(mac);
      if (!pending) {
        pending = connect(deviceId, mac, true).finally(() => opening.delete(mac));
        opening.set(mac, pending);
      }
      s = await pending;
      if (!s) return undefined;
    }
    if (!s.transient) return run(s);
    const session = s;
    session.users++;
    clearTimeout(session.idle);
    try {
      return await run(session);
    } finally {
      session.users--;
      if (session.users === 0)
        session.idle = setTimeout(() => {
          manager.cancelDeviceConnection(session.deviceId).catch(() => undefined);
          dropSession(session.deviceId);
        }, TRANSIENT_IDLE_MS);
    }
  };

  const handleBroadcast = (deviceId: string, b: Broadcast) => {
    broadcastIds.set(b.mac, deviceId);
    lastSeen.set(b.mac, Date.now());
    const pageKey = `${b.mac}:${b.page}`;
    if (lastIv.get(pageKey) === b.iv) return;
    lastIv.set(pageKey, b.iv);

    const name = broadcastName(b);
    const key = keyRef.current;
    const power = b.claimed && key && name === null ? decodeBroadcast(key, b) : null;
    if (power) badTags.set(b.mac, 0);
    else if (b.claimed && key && name === null)
      badTags.set(b.mac, (badTags.get(b.mac) ?? 0) + 1);
    const locked = (badTags.get(b.mac) ?? 0) >= BAD_TAGS_FOR_LOCKED;

    patchBoard(b.mac, (old) => ({
      type: DEVICE_POWER,
      claimed: b.claimed,
      connected: true,
      name: name ?? (old.name || "Cerbo GX"),
      authOk: !b.claimed || !key ? null : power ? true : locked ? false : old.authOk,
      ...(power
        ? { power: { ...old.power, ...power }, powerAt: Date.now() }
        : {}),
    }));
  };

  const onScan = (device: Device) => {
    if (device.serviceUUIDs?.some((u) => sameUuid(u, UUID.service))) {
      connect(device.id, device.name ?? device.id);
      return;
    }
    const b = parseBroadcast(device.manufacturerData);
    if (b) handleBroadcast(device.id, b);
  };
  const scanRef = useRef(onScan);
  scanRef.current = onScan;

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
              // Saved by an older version of the app, a board may lack newer fields (flags).
              if (!next[b.mac])
                next[b.mac] = {
                  ...b,
                  names: b.names ?? [],
                  flags: b.flags ?? [],
                  targets: b.targets ?? [],
                  power: undefined,
                  powerAt: undefined,
                  connected: false,
                  authOk: null,
                  state: 0,
                };
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
        power: undefined,
        powerAt: undefined,
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
        // No service filter: a Cerbo's broadcast has no room for the service UUID.
        manager.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
          if (error) log.current(`Scan error: ${error.message}`);
          else if (device) scanRef.current(device);
        });
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

  // A Cerbo that stops broadcasting has gone out of range.
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setBoards((prev) => {
        const gone = Object.values(prev).filter(
          (b) =>
            b.type === DEVICE_POWER &&
            b.connected &&
            now - (lastSeen.get(b.mac) ?? 0) > BROADCAST_STALE_MS
        );
        if (gone.length === 0) return prev;
        const next = { ...prev };
        for (const b of gone) next[b.mac] = { ...b, connected: false, authOk: null };
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // New passcode on the phone: recheck it against every connected board.
  useEffect(() => {
    keyRef.current = passcode ? deriveKey(passcode) : null;
    badTags.clear();
    lastIv.clear();
    setBoards((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([mac, b]) => [
          mac,
          b.type === DEVICE_POWER ? { ...b, authOk: null, power: undefined, powerAt: undefined } : b,
        ])
      )
    );
    sessions.forEach((s) => {
      patchBoard(s.mac, { authOk: null });
      verify(s);
    });
  }, [passcode]);

  /** Sends a command signed with the phone's passcode. Resolves true if the board accepted it. */
  const send = async (mac: string, op: number, args: Args, what: string, quiet = false) => {
    const key = keyRef.current;
    if (!key) {
      if (!quiet) log.current(`${what}: no passcode set`);
      return false;
    }
    const code = await withSession(mac, (s) => sendWithKey(s, key, op, args));
    if (code === undefined) {
      if (!quiet) log.current(`${what}: board not in range`);
      return false;
    }
    if (code === RESP.badAuth) patchBoard(mac, { authOk: false });
    if (code !== RESP.ok && !quiet) log.current(`${what}: ${respText(code)}`);
    return code === RESP.ok;
  };

  const sendThenRefresh = async (
    mac: string,
    op: number,
    args: Args,
    what: string,
    quiet = false
  ) => {
    const ok = await send(mac, op, args, what, quiet);
    if (ok) await withSession(mac, (s) => refreshBoard(s)).catch(() => undefined);
    return ok;
  };

  const toggleRelay = (mac: string, index: number) =>
    send(mac, OP.setRelay, Uint8Array.of(index, ACTION.toggle), "Toggle");

  /** Gives a board with no passcode the phone's passcode. */
  const claim = async (mac: string) => {
    const key = keyRef.current;
    if (!key) return false;
    const code = await withSession(mac, async (s) => {
      const run = () => {
        const counter = ++s.counter;
        return writeAndWait(s, buildClaim(counter, key), counter);
      };
      const result = s.queue.then(run, run);
      s.queue = result.catch(() => undefined);
      const c = await result;
      await refreshBoard(s).catch(() => undefined);
      await verify(s);
      return c;
    });
    if (code === undefined) log.current("Set passcode: board not in range");
    else if (code !== RESP.ok) log.current(`Set passcode: ${respText(code)}`);
    return code === RESP.ok;
  };

  /** Moves a board from another passcode to the phone's passcode. */
  const adoptFromPasscode = async (mac: string, currentPasscode: string) => {
    const key = keyRef.current;
    if (!key) return false;
    const oldKey = deriveKey(currentPasscode);
    const code = await withSession(mac, async (s) => {
      const c = await sendWithKey(s, oldKey, OP.setPasscode, (counter) =>
        maskNewKey(oldKey, s.nonce, counter, key)
      );
      await verify(s);
      return c;
    });
    if (code === undefined) log.current("Change passcode: board not in range");
    else if (code !== RESP.ok) log.current(`Change passcode: ${respText(code)}`);
    if (code === RESP.ok) badTags.set(mac, 0);
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
