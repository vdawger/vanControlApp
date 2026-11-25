import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Board } from "@/lib/ble/types";
import {
  batteryFlow,
  batteryIcon,
  POWER_STALE_MS,
  powerAlarms,
  socColor,
  systemStateLabel,
  useNow,
  watts,
} from "@/lib/power";
import { color, radius, space } from "@/lib/theme";

type Props = {
  board: Board;
  bottomInset: number;
  onPress: () => void;
};

/** Battery and inverter at a glance, pinned under the switches while the Cerbo is in range. */
export function PowerBar({ board, bottomInset, onPress }: Props) {
  const now = useNow();
  const p = board.power;
  if (!p) return null;
  const flow = batteryFlow(p);
  const stale = !board.powerAt || now - board.powerAt > POWER_STALE_MS;
  const alarms = powerAlarms(p);
  const worst = alarms.reduce((m, a) => Math.max(m, a.level), 0);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Battery ${p.soc ?? "unknown"} percent, ${systemStateLabel(p)}. Open power overview.`}
      style={({ pressed }) => [
        styles.bar,
        { paddingBottom: Math.max(bottomInset, space.md) },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[styles.row, stale && styles.stale]}>
        <MaterialCommunityIcons name={batteryIcon(p.soc, flow)} size={30} color={socColor(p.soc)} />
        <View>
          <Text style={styles.soc}>{p.soc === undefined ? "—" : `${Math.round(p.soc)}%`}</Text>
          <View style={styles.inline}>
            <MaterialCommunityIcons
              name={flow === "charging" ? "arrow-down-bold" : flow === "discharging" ? "arrow-up-bold" : "minus"}
              size={12}
              color={flow === "charging" ? color.ok : color.textDim}
            />
            <Text style={styles.small}>{watts(p.batteryWatts === undefined ? undefined : Math.abs(p.batteryWatts))}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.stat}>
          <View style={styles.inline}>
            <MaterialCommunityIcons name="power-plug-outline" size={14} color={color.textDim} />
            <Text style={styles.value}>{watts(p.acOutWatts)}</Text>
          </View>
          <Text style={styles.small} numberOfLines={1}>{systemStateLabel(p)}</Text>
        </View>

        {(p.acInWatts ?? 0) > 0 ? (
          <View style={styles.stat}>
            <View style={styles.inline}>
              <MaterialCommunityIcons name="transmission-tower-import" size={14} color={color.accent} />
              <Text style={styles.value}>{watts(p.acInWatts)}</Text>
            </View>
            <Text style={styles.small}>AC in</Text>
          </View>
        ) : null}

        <View style={styles.end}>
          {worst > 0 ? (
            <MaterialCommunityIcons
              name="alert"
              size={20}
              color={worst >= 2 ? color.danger : color.warn}
              accessibilityLabel={`${alarms.length} alarm${alarms.length === 1 ? "" : "s"}`}
            />
          ) : null}
          <MaterialCommunityIcons name="chevron-up" size={22} color={color.textFaint} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: color.surface,
    borderTopWidth: 1,
    borderTopColor: color.border,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  stale: { opacity: 0.45 },
  soc: { color: color.text, fontSize: 22, fontWeight: "700", fontVariant: ["tabular-nums"] },
  inline: { flexDirection: "row", alignItems: "center", gap: 3 },
  small: { color: color.textDim, fontSize: 12, fontVariant: ["tabular-nums"] },
  value: { color: color.text, fontSize: 16, fontWeight: "600", fontVariant: ["tabular-nums"] },
  divider: { width: 1, alignSelf: "stretch", backgroundColor: color.border },
  stat: { gap: 2, flexShrink: 1 },
  end: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: space.sm },
});
