// Everything the screens share: the Bluetooth link to the boards, this phone's passcode,
// how the relay buttons are arranged, and the activity log.
import React, { createContext, useContext, useEffect, useState } from "react";
import { DEVICE_RELAY } from "./ble/protocol";
import { VanBle } from "./ble/types";
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

  // Order, hidden and reversed are this phone's choices: save every change, including drags.
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
              reversed: false,
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
        messages,
        clearMessages,
        resetPhone,
      }}
    >
      {children}
    </VanContext.Provider>
  );
}
