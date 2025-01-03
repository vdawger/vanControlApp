import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
import { RelayButtonProps } from "../components/RelayButton";

// dangerous without types:
const storeLocal = async (key: string, value: any): Promise<string> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return `${key} saved`;
  } catch (error) {
    return `Error saving ${key} data ${error}`;
  }
};

const getLocal = async (
  key: string,
  addMessage: (s: string) => void
): Promise<any[]> => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      return JSON.parse(value);
    } else {
      return [];
    }
  } catch (error) {
    addMessage(`Error retrieving data ${error}`);
    return [];
  }
};

const clearLocalStorage = async (addMessage: (s: string) => void) => {
  try {
    await AsyncStorage.clear();
    addMessage("Cleared storage successfully");
  } catch (error) {
    addMessage(`Error clearing local storage: ${error}`);
  }
};

// SAFER with types:

const saveButtonState = async (
  buttons: RelayButtonProps[],
  addMessage: (s: string) => void
) => {
  const message = await storeLocal("buttons", buttons);
  addMessage(message);
};

const getSavedButtons = async (
  addMessage: (s: string) => void
): Promise<RelayButtonProps[]> => {
  const buttons = await getLocal("buttons", addMessage);
  return buttons as RelayButtonProps[];
};

const getSavedIps = async (
  addMessage: (s: string) => void
): Promise<string[]> => {
  const ips = await getLocal("boardIps", addMessage);
  return ips as string[];
};

const saveBoardIps = async (
  boardIps: string[],
  addMessage: (s: string) => void
) => {
  const message = await storeLocal("boardIps", boardIps);
  addMessage(message);
};

type UseLoadSavedDataProps = {
  addMessage: (s: string) => void;
  boardIps: string[];
  setBoardIps: (ips: string[]) => void;
  buttons: RelayButtonProps[];
  setButtons: (buttons: RelayButtonProps[]) => void;
  scanning: boolean;
  scanProgress: number;
  scan: () => void;
  dataLoaded: boolean;
  setDataLoaded: (b: boolean) => void;
  setScanProgress: (n: number) => void;
};

const useLoadSavedData = ({
  addMessage,
  boardIps,
  setBoardIps,
  buttons,
  setButtons,
  scanning,
  scanProgress,
  scan,
  dataLoaded,
  setDataLoaded,
  setScanProgress,
}: UseLoadSavedDataProps) => {
  useEffect(() => {
    if (dataLoaded) {
      return;
    }
    let isMounted = true;

    const loadSavedData = async () => {
      if (!boardIps || boardIps?.length === 0) {
        addMessage("Loading saved IPs...");
        const savedIps = await getSavedIps(addMessage);

        if (savedIps && savedIps.length > 0) {
          setBoardIps(savedIps);
          setScanProgress(100);
          addMessage(`Restoring saved IPs: ${savedIps}`);
        } else {
          addMessage(`No active IPs stored`);
          if (!scanProgress && !scanning) {
            addMessage("Scanning for boards...");
            scan();
          }
          if (scanning) {
            addMessage("Scanning in progress...");
          }
          if (scanProgress) {
            addMessage(`Scanning ${scanProgress}% complete...`);
          }
        }
      }

      if (buttons?.length === 0) {
        addMessage("Loading saved buttons...");
        const savedButtons = await getSavedButtons(addMessage);

        if (savedButtons && savedButtons.length > 0) {
          setButtons(savedButtons);
          const valStr = JSON.stringify(savedButtons);
          addMessage(`Restoring saved buttons: ${valStr.slice(0, 50)}`);
        } else {
          if (!scanning) {
            addMessage("No buttons previously saved");
          }
        }
      }
    };

    if (isMounted) {
      loadSavedData();
      setDataLoaded(true);
    }

    return () => {
      isMounted = false;
    };
  }, [buttons, boardIps]);
};

export {
  clearLocalStorage,
  getSavedButtons,
  getSavedIps,
  saveBoardIps,
  saveButtonState,
  useLoadSavedData,
  UseLoadSavedDataProps,
};
