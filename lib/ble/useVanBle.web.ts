// Browser stand-in for useVanBle. Browsers cannot use the app's Bluetooth module, so on web
// (npx expo start --web) the app runs against made-up boards. This is for working on the screens only.
import { useState } from "react";
import {
  ACTION,
  DEVICE_PANEL,
  DEVICE_RELAY,
  OP,
  utf8Decode,
} from "./protocol";
import { Board, BoardMap, CommandArgs, VanBle } from "./types";

const relay = (
  mac: string,
  name: string,
  names: string[],
  extra: Partial<Board> = {}
): Board => ({
  mac,
  name,
  type: DEVICE_RELAY,
  count: 8,
  claimed: true,
  ota: false,
  state: 0,
  names,
  targets: [],
  connected: true,
  authOk: true,
  ...extra,
});

const MAC_24V = "a0b1c2d3e4f5";

const DEMO: BoardMap = Object.fromEntries(
  [
    relay(
      MAC_24V,
      "van-24v",
      ["outside", "bed", "kitchen", "cycle_12v_board", "floor", "shower", "espresso", "weston"],
      { state: 0b01000110 }
    ),
    relay(
      "a0b1c2d3e4f6",
      "van-12v",
      ["water_pump", "cycle_24v_board", "roof_power", "fresh_htr", "pax_htr", "drain_and_gry_htr", "hall_flr_htr", "broken"],
      { state: 0b00000001 }
    ),
    relay(
      "a0b1c2d3e4f7",
      "van-rear",
      ["water_filter_power", "unused", "skip_filter", "tank_to_fill_and_house", "none", "none", "none", "none"],
      { connected: false, authOk: null }
    ),
    {
      ...relay("a0b1c2d3e4f8", "switchesFront", []),
      type: DEVICE_PANEL,
      count: 6,
      targets: [4, 1, 0, 2, 6, 7].map((r) => ({ mac: MAC_24V, relay: r })),
    },
    {
      ...relay("a0b1c2d3e4f9", "switchesKitchen", [], {
        claimed: false,
        authOk: null,
      }),
      type: DEVICE_PANEL,
      count: 6,
      targets: [null, null, null, null, null, null],
    },
  ].map((b) => [b.mac, b])
);

export function useVanBle(
  passcode: string | null,
  addMessage: (s: string) => void
): VanBle {
  const [boards, setBoards] = useState<BoardMap>(DEMO);

  const patch = (mac: string, change: (b: Board) => Partial<Board>) =>
    setBoards((prev) =>
      prev[mac] ? { ...prev, [mac]: { ...prev[mac], ...change(prev[mac]) } } : prev
    );

  const send = async (
    mac: string,
    op: number,
    args: CommandArgs,
    what: string
  ) => {
    const a = typeof args === "function" ? args(1) : args;
    await new Promise((r) => setTimeout(r, 150));
    if (!passcode) {
      addMessage(`${what}: no passcode set`);
      return false;
    }
    patch(mac, (b) => {
      switch (op) {
        case OP.setRelay:
          return {
            state:
              a[1] === ACTION.toggle
                ? b.state ^ (1 << a[0])
                : a[1] === ACTION.on
                ? b.state | (1 << a[0])
                : b.state & ~(1 << a[0]),
          };
        case OP.setName:
          return { name: utf8Decode(a) };
        case OP.setRelayName:
          return {
            names: b.names.map((n, i) => (i === a[0] ? utf8Decode(a.slice(1)) : n)),
          };
        case OP.ota:
          return { ota: a[0] !== 0 };
        case OP.setSwitch: {
          const macHex = Array.from(a.slice(1, 7), (x) =>
            x.toString(16).padStart(2, "0")
          ).join("");
          const target = /^0+$/.test(macHex) ? null : { mac: macHex, relay: a[7] };
          return { targets: b.targets.map((t, i) => (i === a[0] ? target : t)) };
        }
        default:
          return {};
      }
    });
    return true;
  };

  return {
    boards: Object.fromEntries(
      Object.entries(boards).map(([mac, b]) => [
        mac,
        // Without a passcode nothing has been checked yet, like the real thing.
        passcode || !b.claimed ? b : { ...b, authOk: null },
      ])
    ),
    bluetoothOn: true,
    send,
    sendThenRefresh: send,
    toggleRelay: (mac, index) =>
      send(mac, OP.setRelay, Uint8Array.of(index, ACTION.toggle), "Toggle"),
    claim: async (mac) => {
      patch(mac, () => ({ claimed: true, authOk: true }));
      return true;
    },
    adoptFromPasscode: async (mac) => {
      patch(mac, () => ({ authOk: true }));
      return true;
    },
    forgetBoards: () =>
      setBoards((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([, b]) => b.connected))
      ),
  };
}
