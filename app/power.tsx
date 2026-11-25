import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, IconName } from "@/components/Button";
import { Power } from "@/lib/ble/protocol";
import { boardStatus } from "@/lib/ble/types";
import {
  acInConnected,
  acSourceLabel,
  batteryFlow,
  batteryIcon,
  modeLabel,
  POWER_STALE_MS,
  powerAlarms,
  powerBoard,
  socColor,
  systemStateLabel,
  timeLeft,
  useNow,
  watts,
} from "@/lib/power";
import { color, radius, space, type } from "@/lib/theme";
import { useVan } from "@/lib/VanContext";

type Direction = "left" | "right" | "up" | "down";

/** A connector between two boxes; chevrons pulse in the direction power flows. */
function Flow({ active, direction }: { active: boolean; direction: Direction }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.2, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);
  const vertical = direction === "up" || direction === "down";
  return (
    <View style={vertical ? styles.flowV : styles.flowH}>
      <View style={[vertical ? styles.lineV : styles.lineH, active && styles.lineActive]} />
      {active ? (
        <Animated.View style={[styles.chevron, { opacity: pulse }]}>
          <MaterialCommunityIcons name={`chevron-${direction}`} size={18} color={color.on} />
        </Animated.View>
      ) : null}
    </View>
  );
}

function Box({
  icon,
  label,
  value,
  sub,
  tint = color.text,
  dim = false,
}: {
  icon: IconName;
  label: string;
  value: string;
  sub?: string | null;
  tint?: string;
  dim?: boolean;
}) {
  return (
    <View style={[styles.box, dim && styles.boxDim]} accessible accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ""}`}>
      <View style={styles.boxHead}>
        <MaterialCommunityIcons name={icon} size={18} color={tint} />
        <Text style={styles.boxLabel} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={styles.boxValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {sub ? <Text style={styles.boxSub} numberOfLines={2}>{sub}</Text> : null}
    </View>
  );
}

function Battery({ p }: { p: Power }) {
  const flow = batteryFlow(p);
  const tint = socColor(p.soc);
  const left = flow === "discharging" ? timeLeft(p.minutesLeft) : null;
  return (
    <View style={styles.battery} accessible accessibilityLabel={`Battery ${p.soc ?? "unknown"} percent, ${flow}`}>
      <View style={styles.batteryHead}>
        <MaterialCommunityIcons name={batteryIcon(p.soc, flow)} size={34} color={tint} />
        <Text style={styles.batterySoc}>{p.soc === undefined ? "—" : `${p.soc.toFixed(1)}%`}</Text>
        <View style={styles.batteryState}>
          <Text style={[styles.flowText, { color: flow === "charging" ? color.ok : color.textDim }]}>
            {flow === "charging" ? "Charging" : flow === "discharging" ? "Discharging" : "Idle"}
          </Text>
          {left ? <Text style={styles.boxSub}>{left}</Text> : null}
        </View>
      </View>
      <View style={styles.socTrack}>
        <View style={[styles.socFill, { width: `${Math.max(0, Math.min(100, p.soc ?? 0))}%`, backgroundColor: tint }]} />
      </View>
      <View style={styles.batteryStats}>
        <Text style={styles.stat}>{p.volts === undefined ? "—" : `${p.volts.toFixed(2)} V`}</Text>
        <Text style={styles.stat}>{p.amps === undefined ? "—" : `${p.amps.toFixed(1)} A`}</Text>
        <Text style={styles.stat}>{watts(p.batteryWatts)}</Text>
        <Text style={styles.stat}>{p.batteryTemp === undefined ? "—" : `${p.batteryTemp} °C`}</Text>
      </View>
    </View>
  );
}

const leg2 = (total: number | undefined, l1: number | undefined) =>
  total === undefined || l1 === undefined ? undefined : total - l1;

export default function PowerScreen() {
  const van = useVan();
  const router = useRouter();
  const now = useNow();
  const board = powerBoard(van.boards);
  const p = board?.power;
  const status = board ? boardStatus(board) : "away";

  if (!board || !p) {
    const message =
      !board
        ? "No Cerbo found yet. It shows up on its own when it's in Bluetooth range."
        : status === "new"
        ? `${board.name} has no passcode yet. Add it to your van to read it.`
        : status === "locked"
        ? `${board.name} uses a different passcode.`
        : status === "away"
        ? `${board.name} is out of range.`
        : `Reading ${board.name}…`;
    return (
      <View style={[styles.screen, styles.center]}>
        <MaterialCommunityIcons name="battery-unknown" size={48} color={color.textFaint} />
        <Text style={[type.dim, styles.centerText]}>{message}</Text>
        {board && (status === "new" || status === "locked") ? (
          <Button label="Open setup" icon="cog-outline" onPress={() => router.push("/settings")} />
        ) : null}
      </View>
    );
  }

  const stale = !board.powerAt || now - board.powerAt > POWER_STALE_MS;
  const flow = batteryFlow(p);
  const acIn = acInConnected(p);
  const alarms = powerAlarms(p);
  const ago = board.powerAt ? Math.max(0, Math.round((now - board.powerAt) / 1000)) : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.diagram, stale && styles.stale]}>
        <View style={styles.row}>
          <Box
            icon="transmission-tower"
            label="AC input"
            value={acIn ? watts(p.acInWatts) : "—"}
            sub={acSourceLabel(p)}
            tint={acIn ? color.accent : color.textFaint}
            dim={!acIn}
          />
          <Flow active={acIn && (p.acInWatts ?? 0) > 5} direction="right" />
          <Box
            icon="sine-wave"
            label="Inverter"
            value={systemStateLabel(p)}
            sub={modeLabel(p)}
            tint={color.on}
          />
          <Flow active={(p.acOutWatts ?? 0) > 5} direction="right" />
          <Box icon="power-plug-outline" label="AC loads" value={watts(p.acOutWatts)} />
        </View>

        <View style={styles.vertical}>
          <Flow active={flow !== "idle"} direction={flow === "charging" ? "down" : "up"} />
        </View>

        <Battery p={p} />

        <View style={[styles.row, styles.bottomRow]}>
          {p.pvWatts !== undefined ? (
            <Box icon="solar-power" label="Solar" value={watts(p.pvWatts)} tint={color.on} />
          ) : null}
          <Box icon="car-battery" label="DC loads" value={watts(p.dcWatts === undefined ? undefined : Math.abs(p.dcWatts))} />
        </View>
      </View>

      {alarms.length > 0 ? (
        <View style={styles.card}>
          <Text style={type.label}>Alarms</Text>
          {alarms.map((a) => (
            <View key={`${a.source}-${a.name}`} style={styles.alarm}>
              <MaterialCommunityIcons
                name={a.level >= 2 ? "alert-octagon" : "alert"}
                size={18}
                color={a.level >= 2 ? color.danger : color.warn}
              />
              <Text style={[type.body, { flex: 1 }]}>{a.name}</Text>
              <Text style={type.dim}>{a.source}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={type.label}>Per leg</Text>
        <View style={styles.legs}>
          <Text style={[type.dim, styles.legHead]} />
          <Text style={[type.dim, styles.legCell]}>L1</Text>
          <Text style={[type.dim, styles.legCell]}>L2</Text>
        </View>
        <View style={styles.legs}>
          <Text style={[type.body, styles.legHead]}>AC loads</Text>
          <Text style={[type.body, styles.legCell]}>{watts(p.acOutL1)}</Text>
          <Text style={[type.body, styles.legCell]}>{watts(leg2(p.acOutWatts, p.acOutL1))}</Text>
        </View>
        {acIn ? (
          <View style={styles.legs}>
            <Text style={[type.body, styles.legHead]}>AC input</Text>
            <Text style={[type.body, styles.legCell]}>{watts(p.acInL1)}</Text>
            <Text style={[type.body, styles.legCell]}>{watts(leg2(p.acInWatts, p.acInL1))}</Text>
          </View>
        ) : null}
        {p.acInLimit !== undefined ? (
          <Text style={[type.dim, { marginTop: space.sm }]}>{`Input limit ${p.acInLimit} A`}</Text>
        ) : null}
      </View>

      <Text style={[type.dim, styles.footer]}>
        {`${board.name}${ago === null ? "" : ` · updated ${ago < 5 ? "just now" : `${ago} s ago`}`}`}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: space.lg, paddingBottom: space.xl * 2, gap: space.md },
  center: { alignItems: "center", justifyContent: "center", padding: space.xl, gap: space.md },
  centerText: { textAlign: "center" },
  diagram: { gap: 0 },
  stale: { opacity: 0.45 },
  row: { flexDirection: "row", alignItems: "stretch" },
  bottomRow: { gap: space.md, marginTop: space.md },
  vertical: { alignItems: "center" },
  box: {
    flex: 1,
    minWidth: 0,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    padding: space.sm + 2,
    gap: 2,
  },
  boxDim: { opacity: 0.6 },
  boxHead: { flexDirection: "row", alignItems: "center", gap: 4 },
  boxLabel: { color: color.textDim, fontSize: 11, fontWeight: "600", flexShrink: 1 },
  boxValue: { color: color.text, fontSize: 17, fontWeight: "700", fontVariant: ["tabular-nums"] },
  boxSub: { color: color.textDim, fontSize: 11 },
  flowH: { width: 18, alignItems: "center", justifyContent: "center" },
  flowV: { height: 30, width: 30, alignItems: "center", justifyContent: "center" },
  lineH: { position: "absolute", left: 0, right: 0, height: 2, backgroundColor: color.border },
  lineV: { position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: color.border },
  lineActive: { backgroundColor: color.on, opacity: 0.4 },
  chevron: { backgroundColor: color.bg, borderRadius: radius.pill },
  battery: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  batteryHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  batterySoc: { color: color.text, fontSize: 32, fontWeight: "700", fontVariant: ["tabular-nums"] },
  batteryState: { marginLeft: "auto", alignItems: "flex-end" },
  flowText: { fontSize: 14, fontWeight: "600" },
  socTrack: { height: 8, borderRadius: radius.pill, backgroundColor: color.surfaceRaised, overflow: "hidden" },
  socFill: { height: "100%", borderRadius: radius.pill },
  batteryStats: { flexDirection: "row", justifyContent: "space-between" },
  stat: { color: color.text, fontSize: 15, fontVariant: ["tabular-nums"] },
  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
  },
  alarm: { flexDirection: "row", alignItems: "center", gap: space.sm },
  legs: { flexDirection: "row", alignItems: "center" },
  legHead: { flex: 1 },
  legCell: { width: 80, textAlign: "right", fontVariant: ["tabular-nums"] },
  footer: { textAlign: "center" },
});
