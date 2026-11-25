// Wire protocol shared with the board firmware.
// The firmware's copy is esp32_24v_van_controller/include/proto.h - keep them in step.
import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";

const uuid = (n: number) => `7a1e000${n}-5d2c-4b8e-9f3a-6c1d2e3f4a5b`;
export const UUID = {
  service: uuid(1),
  info: uuid(2),
  nonce: uuid(3),
  cmd: uuid(4),
  resp: uuid(5),
  state: uuid(6),
  config: uuid(7),
};

export const DEVICE_RELAY = 1;
export const DEVICE_PANEL = 2;
/** A Cerbo GX: broadcasts battery and inverter readings, readable with the passcode. */
export const DEVICE_POWER = 3;

export const OP = {
  setRelay: 0x01,
  setName: 0x02,
  setRelayName: 0x03,
  setPasscode: 0x04,
  ota: 0x05,
  reboot: 0x06,
  identify: 0x07,
  ping: 0x08,
  /** index(1) flags(1): RELAY_FLAG bits, stored on the board. */
  setRelayFlags: 0x09,
  claim: 0x10,
  setSwitch: 0x20,
};

/** Per-relay settings kept on the board so every phone with the passcode sees them. */
export const RELAY_FLAG = {
  /** Wired normally closed: the load is on while the relay is off. */
  nc: 0x01,
  /** Ask before switching it from the app. */
  confirm: 0x02,
};

export const ACTION = { off: 0, on: 1, toggle: 2 };

export const RESP = {
  ok: 0,
  badAuth: 1,
  staleCounter: 2,
  badArgs: 3,
  notClaimed: 4,
  alreadyClaimed: 5,
  timeout: -1,
};

export const MIN_PASSCODE_LENGTH = 8;
export const MAX_NAME_LENGTH = 24;

// ---- bytes ----

export function utf8Encode(s: string): Uint8Array {
  const out: number[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000)
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else
      out.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 63),
        0x80 | ((c >> 6) & 63),
        0x80 | (c & 63)
      );
  }
  return Uint8Array.from(out);
}

export function utf8Decode(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; ) {
    const c = b[i];
    if (c < 0x80) {
      s += String.fromCodePoint(c);
      i += 1;
    } else if (c < 0xe0) {
      s += String.fromCodePoint(((c & 31) << 6) | (b[i + 1] & 63));
      i += 2;
    } else if (c < 0xf0) {
      s += String.fromCodePoint(
        ((c & 15) << 12) | ((b[i + 1] & 63) << 6) | (b[i + 2] & 63)
      );
      i += 3;
    } else {
      s += String.fromCodePoint(
        ((c & 7) << 18) |
          ((b[i + 1] & 63) << 12) |
          ((b[i + 2] & 63) << 6) |
          (b[i + 3] & 63)
      );
      i += 4;
    }
  }
  return s;
}

export function toBase64(b: Uint8Array): string {
  let s = "";
  b.forEach((x) => (s += String.fromCharCode(x)));
  return btoa(s);
}

export function fromBase64(s: string | null | undefined): Uint8Array {
  const bin = atob(s ?? "");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function toHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export function fromHex(s: string): Uint8Array {
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++)
    out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

function u32le(n: number): Uint8Array {
  return Uint8Array.of(n & 255, (n >>> 8) & 255, (n >>> 16) & 255, n >>> 24);
}

// ---- passcode ----

/** Boards store this key, never the passcode itself. */
export function deriveKey(passcode: string): Uint8Array {
  return sha256(utf8Encode("vanswitch-v1:" + passcode));
}

function mac(key: Uint8Array, label: string, data: Uint8Array): Uint8Array {
  return hmac(sha256, key, concat(utf8Encode(label), data));
}

/** counter(4) op(1) args tag(8). The tag proves we hold the passcode and ties the command to this board's nonce. */
export function buildCommand(
  key: Uint8Array,
  nonce: Uint8Array,
  counter: number,
  op: number,
  args: Uint8Array
): Uint8Array {
  const body = concat(u32le(counter), Uint8Array.of(op), args);
  const tag = mac(key, "VS1", concat(nonce, body)).slice(0, 8);
  return concat(body, tag);
}

/** A board with no passcode accepts the first key it is given, unsigned. */
export function buildClaim(counter: number, key: Uint8Array): Uint8Array {
  return concat(u32le(counter), Uint8Array.of(OP.claim), key);
}

/** New key hidden behind a one-time pad only a holder of the old key can make. */
export function maskNewKey(
  oldKey: Uint8Array,
  nonce: Uint8Array,
  counter: number,
  newKey: Uint8Array
): Uint8Array {
  const pad = mac(oldKey, "VSK", concat(nonce, u32le(counter)));
  return newKey.map((b, i) => b ^ pad[i]);
}

/** WiFi password of a board's update hotspot. */
export function otaPassword(key: Uint8Array): string {
  return toHex(mac(key, "VSOTA", new Uint8Array(0)).slice(0, 5));
}

// ---- parsing ----

export type Info = {
  version: number;
  type: number;
  claimed: boolean;
  count: number;
  mac: string;
  ota: boolean;
};

export function parseInfo(b: Uint8Array): Info {
  if (b.length < 11) throw new Error("Board info too short");
  return {
    version: b[0],
    type: b[1],
    claimed: b[2] !== 0,
    count: b[3],
    mac: toHex(b.slice(4, 10)),
    ota: b[10] !== 0,
  };
}

export function parseNonce(b: Uint8Array): {
  nonce: Uint8Array;
  counter: number;
} {
  if (b.length < 12) throw new Error("Board nonce too short");
  const counter = (b[8] | (b[9] << 8) | (b[10] << 16) | (b[11] << 24)) >>> 0;
  return { nonce: b.slice(0, 8), counter };
}

export function parseResp(b: Uint8Array): {
  counter: number;
  code: number;
  tagEcho: string;
} | null {
  if (b.length < 7) return null;
  const counter = (b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)) >>> 0;
  return { counter, code: b[4], tagEcho: toHex(b.slice(5, 7)) };
}

export type Target = { mac: string; relay: number };

export function parseConfig(
  b: Uint8Array,
  type: number
): {
  name: string;
  names: string[];
  flags: number[];
  /** The board sent a flags column, so it stores NO/NC and confirm itself. */
  flagsOnBoard: boolean;
  targets: (Target | null)[];
} {
  const [name = "", ...rest] = utf8Decode(b).split("\n");
  if (type !== DEVICE_PANEL) {
    // Each relay line is its name, a tab and its RELAY_FLAG bits. Older firmware sends just the name.
    const lines = rest.map((line) => line.split("\t"));
    return {
      name,
      names: lines.map(([n]) => n),
      flags: lines.map(([, f]) => Number(f) || 0),
      flagsOnBoard: lines.some((l) => l.length > 1),
      targets: [],
    };
  }
  const targets = rest.map((line) => {
    const [macHex, relay] = line.split(":");
    return macHex?.length === 12 ? { mac: macHex, relay: Number(relay) } : null;
  });
  return { name, names: [], flags: [], flagsOnBoard: false, targets };
}

// ---- power broadcasts (Cerbo GX) ----
// Manufacturer data 0xFFFF: 'V', version<<5 | claimed<<4 | page, mac(6), iv(3), then
// pages 0-2: body(11) xor HMAC(key, "VSB" mac iv page), tag(2) = HMAC(key, "VST" mac iv page body)
// page 3: the name in plain text.

const BROADCAST_COMPANY = 0xffff;
const BROADCAST_MAGIC = 0x56;
const BROADCAST_VERSION = 1;
const PAGE_NAME = 3;
const BODY_LEN = 11;

export type Power = {
  soc?: number;
  volts?: number;
  batteryWatts?: number;
  acInWatts?: number;
  acOutWatts?: number;
  systemState?: number;
  amps?: number;
  minutesLeft?: number;
  batteryTemp?: number;
  acInL1?: number;
  acOutL1?: number;
  acInSource?: number;
  mode?: number;
  pvWatts?: number;
  dcWatts?: number;
  inverterAlarms?: number;
  batteryAlarms?: number;
  vebusError?: number;
  acInLimit?: number;
};

export type Broadcast = {
  mac: string;
  claimed: boolean;
  page: number;
  iv: number;
  raw: Uint8Array;
};

export function parseBroadcast(manufacturerData: string | null | undefined): Broadcast | null {
  if (!manufacturerData) return null;
  const b = fromBase64(manufacturerData);
  if (b.length < 14 || b[0] !== (BROADCAST_COMPANY & 255) || b[1] !== BROADCAST_COMPANY >> 8) return null;
  if (b[2] !== BROADCAST_MAGIC || b[3] >> 5 !== BROADCAST_VERSION) return null;
  return {
    mac: toHex(b.slice(4, 10)),
    claimed: ((b[3] >> 4) & 1) === 1,
    page: b[3] & 15,
    iv: b[10] | (b[11] << 8) | (b[12] << 16),
    raw: b.slice(4),
  };
}

export function broadcastName(b: Broadcast): string | null {
  return b.page === PAGE_NAME ? utf8Decode(b.raw.slice(9)) : null;
}

/** null: not a readings page, or the tag does not match this key (wrong passcode). */
export function decodeBroadcast(key: Uint8Array, b: Broadcast): Power | null {
  if (b.page === PAGE_NAME || b.raw.length < 9 + BODY_LEN + 2) return null;
  const nonce = concat(b.raw.slice(0, 9), Uint8Array.of(b.page));
  const body = b.raw.slice(9, 9 + BODY_LEN);
  const tag = b.raw.slice(9 + BODY_LEN, 9 + BODY_LEN + 2);
  const expected = mac(key, "VST", concat(nonce, body));
  if (expected[0] !== tag[0] || expected[1] !== tag[1]) return null;
  const stream = mac(key, "VSB", nonce);
  return readPage(b.page, body.map((x, i) => x ^ stream[i]));
}

function readPage(page: number, p: Uint8Array): Power {
  const v = new DataView(p.buffer, p.byteOffset, p.byteLength);
  const u16 = (at: number, scale = 1) => {
    const n = v.getUint16(at, true);
    return n === 0xffff ? undefined : n / scale;
  };
  const i16 = (at: number, scale = 1) => {
    const n = v.getInt16(at, true);
    return n === 0x7fff ? undefined : n / scale;
  };
  const u8 = (at: number) => (p[at] === 0xff ? undefined : p[at]);
  const i8 = (at: number) => (p[at] === 0x7f ? undefined : v.getInt8(at));
  if (page === 0) {
    const state = u8(10);
    return {
      soc: u16(0, 10),
      volts: u16(2, 100),
      batteryWatts: i16(4),
      acInWatts: i16(6),
      acOutWatts: i16(8),
      systemState: state !== undefined && state >= 0xf0 ? 0x100 + state - 0xf0 : state,
    };
  }
  if (page === 1)
    return {
      amps: i16(0, 10),
      minutesLeft: u16(2),
      batteryTemp: i8(4),
      acInL1: i16(5),
      acOutL1: i16(7),
      acInSource: u8(9),
      mode: u8(10),
    };
  return {
    pvWatts: i16(0),
    dcWatts: i16(2),
    inverterAlarms: v.getUint16(4, true),
    batteryAlarms: v.getUint16(6, true) | (p[8] << 16),
    vebusError: u8(9),
    acInLimit: u8(10),
  };
}

/** Each alarm takes two bits: 0 ok, 1 warning, 2 alarm. Names in the Cerbo's order. */
export const INVERTER_ALARMS = [
  "Low battery",
  "Overload",
  "High temperature",
  "Ripple",
  "Temperature sensor",
  "Voltage sensor",
  "High DC voltage",
  "High DC current",
];
export const BATTERY_ALARMS = [
  "Low voltage",
  "High voltage",
  "Low SOC",
  "Low cell voltage",
  "High charge current",
  "High discharge current",
  "High temperature",
  "Low temperature",
  "High charge temperature",
  "Low charge temperature",
  "Cell imbalance",
  "Internal failure",
];

export function activeAlarms(bits: number | undefined, names: string[]) {
  if (!bits) return [];
  return names
    .map((name, i) => ({ name, level: (bits >>> (2 * i)) & 3 }))
    .filter((a) => a.level > 0);
}

export function respText(code: number): string {
  switch (code) {
    case RESP.ok:
      return "ok";
    case RESP.badAuth:
      return "wrong passcode";
    case RESP.staleCounter:
      return "out of step, try again";
    case RESP.badArgs:
      return "board rejected the value";
    case RESP.notClaimed:
      return "board has no passcode yet";
    case RESP.alreadyClaimed:
      return "board already has a passcode";
    default:
      return "no answer from board";
  }
}
