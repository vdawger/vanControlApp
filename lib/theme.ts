import { TextStyle } from "react-native";

export const color = {
  bg: "#0B0D10",
  surface: "#15181E",
  surfaceRaised: "#1D2129",
  border: "#2A2F39",
  text: "#F2F4F7",
  textDim: "#9AA3AF",
  textFaint: "#6B7380",
  /** A relay that is on: warm, like a lamp. */
  on: "#F6B73C",
  onText: "#1B1404",
  accent: "#5B9CF6",
  ok: "#34C77B",
  warn: "#F6B73C",
  danger: "#F2545B",
  backdrop: "rgba(0, 0, 0, 0.6)",
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };

export const type: { [k: string]: TextStyle } = {
  title: { color: color.text, fontSize: 22, fontWeight: "700" },
  heading: { color: color.text, fontSize: 17, fontWeight: "600" },
  body: { color: color.text, fontSize: 15 },
  dim: { color: color.textDim, fontSize: 13 },
  label: {
    color: color.textFaint,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
};

/** "water_pump" -> "Water pump" */
export function readable(name: string): string {
  const s = name.replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
