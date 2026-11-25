import {
  activeAlarms,
  broadcastName,
  decodeBroadcast,
  fromHex,
  INVERTER_ALARMS,
  parseBroadcast,
  toBase64,
} from "./protocol";

// Captured from the Cerbo running cerbo/vanswitch_cerbo.py with a throwaway test key.
const KEY = fromHex("4e48e4ea31ddd6713389d932b996d7fe49fdf508a0aa409767c84f753f18a410");
const captured = (hex: string) => toBase64(fromHex("ffff" + hex));

describe("power broadcasts", () => {
  it("reads the live page", () => {
    const b = parseBroadcast(captured("5630c0619ab5ecb3fb57d06df16b20a13ebd931187459000"));
    expect(b).not.toBeNull();
    if (!b) return;
    expect(b.mac).toBe("c0619ab5ecb3");
    expect(b.claimed).toBe(true);
    expect(b.page).toBe(0);
    const p = decodeBroadcast(KEY, b);
    expect(p?.soc).toBeCloseTo(90.6, 1);
    expect(p?.volts).toBeGreaterThan(48);
    expect(p?.volts).toBeLessThan(58);
    expect(p?.systemState).toBe(9);
  });

  it("reads the detail pages", () => {
    const one = parseBroadcast(captured("5631c0619ab5ecb3fc57d0b58296444b831154ea1e18e803"));
    const two = parseBroadcast(captured("5632c0619ab5ecb3fe57d03fd2a33912928c74c857580b1a"));
    if (!one || !two) throw new Error("not parsed");
    const p1 = decodeBroadcast(KEY, one);
    expect(p1?.mode).toBe(3);
    expect(p1?.acInSource).toBe(240);
    const p2 = decodeBroadcast(KEY, two);
    expect(p2?.acInLimit).toBe(26);
    expect(activeAlarms(p2?.inverterAlarms, INVERTER_ALARMS).map((a) => a.name)).toContain(
      "Temperature sensor"
    );
  });

  it("rejects the wrong passcode", () => {
    const b = parseBroadcast(captured("5630c0619ab5ecb3fb57d06df16b20a13ebd931187459000"));
    if (!b) throw new Error("not parsed");
    expect(decodeBroadcast(new Uint8Array(32), b)).toBeNull();
  });

  it("reads the name page and ignores other data", () => {
    const b = parseBroadcast(captured("5623c0619ab5ecb337e57e56616e436572626f"));
    if (!b) throw new Error("not parsed");
    expect(b.claimed).toBe(false);
    expect(broadcastName(b)).toBe("VanCerbo");
    expect(parseBroadcast(toBase64(fromHex("e102100260a0017d6039b0707da0795b")))).toBeNull();
  });
});
