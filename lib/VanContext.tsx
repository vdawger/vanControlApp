// Everything the screens share: the Bluetooth link to the boards, this phone's passcode,
// how the relay buttons are arranged, and the activity log.
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { DEVICE_RELAY, OP } from "./ble/protocol";
import { boardStatus, VanBle } from "./ble/types";
import { useVanBle } from "./ble/useVanBle";
import {
  ButtonPref,
  clearEverything,
  loadButtonPrefs,
  loadPasscode,
  saveButtonPrefs,
  savePasscode,
} from "./storage";
import { Message, useMessages } from "./useMessages";

type Van = VanBle & {
  /** False until saved settings have been read, so screens do not flash their empty state. */
  loaded: boolean;
  passcode: string | null;
  setPasscode: (passcode: string) => void;
  buttons: ButtonPref[];
  setButtons: React.Dispatch<React.SetStateAction<ButtonPref[]>>;
  updateButton: (uuid: string, patch: Partial<ButtonPref>) => void;
  /** A switch's NO/NC and confirm (RELAY_FLAG bits): the board's when it stores them, else this phone's. */
  switchFlags: (button: ButtonPref) => number;
  /** Saves NO/NC and confirm on this phone, and on the board when it can store them. */
  setSwitchFlags: (button: ButtonPref, flags: number) => void;
  messages: Message[];
  clearMessages: () => void;
  resetPhone: () => Promise<void>;
};

const VanContext = createContext<Van | null>(null);

export function useVan(): Van {
  const van = useContext(VanContext);
  if (!van) throw new Error("useVan must be used inside VanProvider");
  return van;
}

export function VanProvider({ children }: { children: React.ReactNode }) {
  const { messages, addMessage, clearMessages } = useMessages();
  const [passcode, setPasscodeState] = useState<string | null>(null);
  const [buttons, setButtons] = useState<ButtonPref[]>([]);
  const [loaded, setLoaded] = useState(false);

  const ble = useVanBle(passcode, addMessage);
  const { boards } = ble;

  useEffect(() => {
    (async () => {
      setPasscodeState(await loadPasscode());
      setButtons(await loadButtonPrefs());
      setLoaded(true);
    })();
  }, []);

  // Order and hidden are this phone's choices: save every change, including drags.
  useEffect(() => {
    if (!loaded) return;
    saveButtonPrefs(buttons).catch((e) =>
      addMessage(`Could not save buttons: ${e}`)
    );
  }, [buttons, loaded]);

  // A relay we have not seen before gets a button at the end of the list.
  useEffect(() => {
    if (!loaded) return;
    setButtons((prev) => {
      const known = new Set(prev.map((b) => b.uuid));
      const added: ButtonPref[] = [];
      for (const board of Object.values(boards)) {
        if (board.type !== DEVICE_RELAY) continue;
        for (let index = 0; index < board.count; index++) {
          const uuid = `${board.mac}-${index}`;
          if (!known.has(uuid))
            added.push({
              uuid,
              mac: board.mac,
              index,
              hidden: false,
            });
        }
      }
      return added.length ? [...prev, ...added] : prev;
    });
  }, [boards, loaded]);

  const setPasscode = (value: string) => {
    setPasscodeState(value);
    savePasscode(value).catch((e) =>
      addMessage(`Could not save passcode: ${e}`)
    );
  };

  const updateButton = (uuid: string, patch: Partial<ButtonPref>) =>
    setButtons((prev) =>
      prev.map((b) => (b.uuid === uuid ? { ...b, ...patch } : b))
    );

  const switchFlags = (button: ButtonPref) => {
    const board = boards[button.mac];
    const fromBoard = board?.flags?.[button.index] ?? 0;
    if (board?.flagsOnBoard && !button.flagsPending) return fromBoard;
    return button.flags ?? fromBoard;
  };

  // Clears the pending mark once the board holds exactly what this phone set.
  const markSaved = (uuid: string, flags: number) =>
    setButtons((prev) =>
      prev.map((b) => (b.uuid === uuid && b.flags === flags ? { ...b, flagsPending: false } : b))
    );

  const saveFlagsOnBoard = (button: ButtonPref, flags: number) =>
    ble
      .sendThenRefresh(
        button.mac,
        OP.setRelayFlags,
        Uint8Array.of(button.index, flags),
        "Switch settings",
        true // a board on older firmware refuses: the phone's copy is enough
      )
      .then((ok) => ok && markSaved(button.uuid, flags));

  const setSwitchFlags = (button: ButtonPref, flags: number) => {
    updateButton(button.uuid, { flags, flagsPending: true });
    const board = boards[button.mac];
    if (board && boardStatus(board) === "ready") saveFlagsOnBoard(button, flags);
  };

  // Settings made while a board was away or on older firmware go to it once it can store them.
  const uploadTried = useRef(new Set<string>());
  useEffect(() => {
    for (const button of buttons) {
      if (!button.flagsPending || button.flags === undefined) continue;
      const board = boards[button.mac];
      if (!board?.flagsOnBoard || boardStatus(board) !== "ready") continue;
      const attempt = `${button.uuid}:${button.flags}`;
      if (uploadTried.current.has(attempt)) continue;
      uploadTried.current.add(attempt);
      saveFlagsOnBoard(button, button.flags);
    }
  }, [boards, buttons]);

  const resetPhone = async () => {
    await clearEverything().catch((e) => addMessage(`Reset failed: ${e}`));
    setPasscodeState(null);
    setButtons([]);
    ble.forgetBoards();
    addMessage("This phone was reset");
  };

  return (
    <VanContext.Provider
      value={{
        ...ble,
        loaded,
        passcode,
        setPasscode,
        buttons,
        setButtons,
        updateButton,
        switchFlags,
        setSwitchFlags,
        messages,
        clearMessages,
        resetPhone,
      }}
    >
      {children}
    </VanContext.Provider>
  );
}
