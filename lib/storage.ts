import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/** How one relay button is shown on this phone. The list order is the display order. */
export type ButtonPref = {
  /** `${board MAC}-${relay index}` */
  uuid: string;
  mac: string;
  index: number;
  /** No longer used: normally open/closed is stored on the board. Older saved data still has it. */
  reversed?: boolean;
  hidden: boolean;
};

const BUTTONS_KEY = "buttonPrefs";
const PASSCODE_KEY = "passcode";

export async function loadButtonPrefs(): Promise<ButtonPref[]> {
  try {
    const json = await AsyncStorage.getItem(BUTTONS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveButtonPrefs(prefs: ButtonPref[]) {
  await AsyncStorage.setItem(BUTTONS_KEY, JSON.stringify(prefs));
}

// The phone's secure store has no browser equivalent; the web build is only a screen preview.
const web = Platform.OS === "web";

export async function loadPasscode(): Promise<string | null> {
  try {
    if (web) return await AsyncStorage.getItem(PASSCODE_KEY);
    return await SecureStore.getItemAsync(PASSCODE_KEY);
  } catch {
    return null;
  }
}

export async function savePasscode(passcode: string) {
  if (web) return AsyncStorage.setItem(PASSCODE_KEY, passcode);
  await SecureStore.setItemAsync(PASSCODE_KEY, passcode);
}

export async function clearEverything() {
  await AsyncStorage.clear();
  if (!web) await SecureStore.deleteItemAsync(PASSCODE_KEY);
}
