import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useEffect, useState } from "react";
import { BATTERY_ALARMS, DEVICE_POWER, INVERTER_ALARMS, Power, activeAlarms } from "./ble/protocol";
import { Board, BoardMap, boardStatus } from "./ble/types";
import { color } from "./theme";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const SYSTEM_STATES: { [state: number]: string } = {
  0: "Off",
  1: "Low power",
  2: "Fault",
  3: "Bulk",
  4: "Absorption",
  5: "Float",
  6: "Storage",
  7: "Equalize",
  8: "Passthru",
  9: "Inverting",
  10: "Assisting",
  11: "Power supply",
  252: "External control",
  0x100: "Discharging",
  0x101: "Sustain",
  0x102: "Recharge",
  0x103: "Scheduled charge",
  0x104: "Dynamic ESS",
};

const AC_SOURCES: { [source: number]: string } = {
  0: "Not available",
  1: "Grid",
  2: "Generator",
  3: "Shore",
  240: "Not connected",
};

const MODES: { [mode: number]: string } = {
  1: "Charger only",
  2: "Inverter only",
  3: "On",
  4: "Off",
};

/** Readings older than this are shown dimmed. */
export const POWER_STALE_MS = 30000;

export const systemStateLabel = (p: Power) =>
  p.systemState === undefined ? "—" : SYSTEM_STATES[p.systemState] ?? `State ${p.systemState}`;
export const acSourceLabel = (p: Power) =>
  p.acInSource === undefined ? "—" : AC_SOURCES[p.acInSource] ?? "AC input";
export const modeLabel = (p: Power) =>
  p.mode === undefined ? "—" : MODES[p.mode] ?? `Mode ${p.mode}`;
export const acInConnected = (p: Power) =>
  p.acInSource !== undefined && p.acInSource !== 240 && p.acInSource !== 0;

export function watts(w: number | undefined): string {
  if (w === undefined) return "—";
  const abs = Math.abs(w);
  if (abs >= 1000) return `${(w / 1000).toFixed(abs >= 10000 ? 0 : 1)} kW`;
  return `${Math.round(w)} W`;
}

export function timeLeft(minutes: number | undefined): string | null {
  if (minutes === undefined) return null;
  if (minutes >= 48 * 60) return `${Math.round(minutes / 60)} h left`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h} h ${m} m left` : `${m} m left`;
}

export type BatteryFlow = "charging" | "discharging" | "idle";
export function batteryFlow(p: Power): BatteryFlow {
  const w = p.batteryWatts ?? 0;
  if (w > 10) return "charging";
  if (w < -10) return "discharging";
  return "idle";
}

export function socColor(soc: number | undefined): string {
  if (soc === undefined) return color.textDim;
  if (soc < 20) return color.danger;
  if (soc < 40) return color.warn;
  return color.ok;
}

export function batteryIcon(soc: number | undefined, flow: BatteryFlow): IconName {
  if (soc === undefined) return "battery-unknown";
  const step = Math.max(1, Math.min(10, Math.round(soc / 10))) * 10;
  if (flow === "charging") return `battery-charging-${step}` as IconName;
  return step === 100 ? "battery" : (`battery-${step}` as IconName);
}

export type Alarm = { name: string; level: number; source: "Inverter" | "Battery" };
export function powerAlarms(p: Power): Alarm[] {
  return [
    ...activeAlarms(p.inverterAlarms, INVERTER_ALARMS).map((a) => ({ ...a, source: "Inverter" as const })),
    ...activeAlarms(p.batteryAlarms, BATTERY_ALARMS).map((a) => ({ ...a, source: "Battery" as const })),
  ];
}

/** The Cerbo to show: the first one in range whose readings this phone can read. */
export function powerBoard(boards: BoardMap): Board | undefined {
  const cerbos = Object.values(boards).filter((b) => b.type === DEVICE_POWER);
  return cerbos.find((b) => boardStatus(b) === "ready" && b.power) ?? cerbos.find((b) => b.connected) ?? cerbos[0];
}

/** Re-renders every second, for "updated 5 s ago". */
export function useNow(): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}
