import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

/** How one relay button is shown on this phone. The list order is the display order. */
export type ButtonPref = {
  /** `${board MAC}-${relay index}` */
  uuid: string;
  mac: string;
  index: number;
  reversed: boolean;
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

export async function loadPasscode(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PASSCODE_KEY);
  } catch {
    return null;
  }
}

export async function savePasscode(passcode: string) {
  await SecureStore.setItemAsync(PASSCODE_KEY, passcode);
}

export async function clearEverything() {
  await AsyncStorage.clear();
  await SecureStore.deleteItemAsync(PASSCODE_KEY);
}
