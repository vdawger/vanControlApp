import { Target } from "./protocol";

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

export type CommandArgs = Uint8Array | ((counter: number) => Uint8Array);

export type VanBle = {
  boards: BoardMap;
  bluetoothOn: boolean;
  /** Sends a command signed with the phone's passcode. Resolves true if the board accepted it. */
  send: (
    mac: string,
    op: number,
    args: CommandArgs,
    what: string
  ) => Promise<boolean>;
  /** Same, then re-reads the board's names and settings. */
  sendThenRefresh: (
    mac: string,
    op: number,
    args: CommandArgs,
    what: string
  ) => Promise<boolean>;
  toggleRelay: (mac: string, index: number) => Promise<boolean>;
  /** Gives a board with no passcode the phone's passcode. */
  claim: (mac: string) => Promise<boolean>;
  /** Moves a board from another passcode to the phone's passcode. */
  adoptFromPasscode: (mac: string, currentPasscode: string) => Promise<boolean>;
  forgetBoards: () => void;
};

export type BoardStatus = "ready" | "away" | "new" | "locked" | "checking";

export function boardStatus(b: Board): BoardStatus {
  if (!b.connected) return "away";
  if (!b.claimed) return "new";
  if (b.authOk === false) return "locked";
  if (b.authOk === null) return "checking";
  return "ready";
}
