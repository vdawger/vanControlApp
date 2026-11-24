import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { color, radius, readable, space } from "@/lib/theme";
import { IconName } from "./Button";

type RelayTileProps = {
  name: string;
  boardName: string;
  /** What the board reports for the relay. */
  relayOn: boolean;
  /** Show the tile lit when the relay is off (for things wired the other way round). */
  /** Wired normally closed: the load is on while the relay is off. */
  normallyClosed: boolean;
  /** Asks before switching; shown as a small shield. */
  confirm?: boolean;
  /** Why it cannot be used right now, if it cannot. */
  unavailable: string | null;
  onToggle: () => Promise<boolean>;
};

/** Picks a picture from the relay's name; anything unrecognised is treated as a light. */
function iconFor(name: string, lit: boolean): IconName {
  const n = name.toLowerCase();
  if (/pump/.test(n)) return "water-pump";
  if (/htr|heat/.test(n)) return "radiator";
  if (/water|tank|filter|drain/.test(n)) return "water";
  if (/cycle|power|board/.test(n)) return "power-cycle";
  return lit ? "lightbulb-on" : "lightbulb-outline";
}

export function RelayTile({
  name,
  boardName,
  relayOn,
  normallyClosed,
  confirm = false,
  unavailable,
  onToggle,
}: RelayTileProps) {
  const [busy, setBusy] = useState(false);
  // Lit always follows what the board last reported, never a guess.
  const lit = !unavailable && (normallyClosed ? !relayOn : relayOn);
  const fg = lit ? color.onText : color.text;
  const sub = lit ? color.onText : color.textDim;

  const press = async () => {
    if (busy) return;
    setBusy(true);
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    try {
      await onToggle();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={press}
      disabled={busy || !!unavailable}
      accessibilityRole="switch"
      accessibilityState={{ checked: lit, disabled: !!unavailable }}
      accessibilityLabel={`${readable(name)}, ${boardName}`}
      style={({ pressed }) => [
        styles.tile,
        lit && styles.lit,
        !!unavailable && styles.unavailable,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.top}>
        <View style={styles.icons}>
          <MaterialCommunityIcons name={iconFor(name, lit)} size={26} color={fg} />
          {confirm ? (
            <MaterialCommunityIcons name="shield-check-outline" size={16} color={sub} />
          ) : null}
        </View>
        {busy ? (
          <ActivityIndicator size="small" color={fg} />
        ) : (
          <Text style={[styles.state, { color: sub }]}>
            {unavailable ?? (lit ? "On" : "Off")}
          </Text>
        )}
      </View>
      <Text style={[styles.name, { color: fg }]} numberOfLines={2}>
        {readable(name)}
      </Text>
      <Text style={[styles.board, { color: sub }]} numberOfLines={1}>
        {boardName}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 112,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space.md + 2,
    justifyContent: "space-between",
  },
  lit: { backgroundColor: color.on, borderColor: color.on },
  unavailable: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  icons: { flexDirection: "row", alignItems: "center", gap: space.xs },
  state: { fontSize: 13, fontWeight: "600" },
  name: { fontSize: 16, fontWeight: "600", marginTop: space.md },
  board: { fontSize: 12, marginTop: 2 },
});
