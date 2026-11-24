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

export const OP = {
  setRelay: 0x01,
  setName: 0x02,
  setRelayName: 0x03,
  setPasscode: 0x04,
  ota: 0x05,
  reboot: 0x06,
  identify: 0x07,
  ping: 0x08,
  claim: 0x10,
  setSwitch: 0x20,
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
export const MAX_NAME_LENGTH = 20;

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
): { name: string; names: string[]; targets: (Target | null)[] } {
  const [name = "", ...rest] = utf8Decode(b).split("\n");
  if (type !== DEVICE_PANEL) return { name, names: rest, targets: [] };
  const targets = rest.map((line) => {
    const [macHex, relay] = line.split(":");
    return macHex?.length === 12 ? { mac: macHex, relay: Number(relay) } : null;
  });
  return { name, names: [], targets };
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
