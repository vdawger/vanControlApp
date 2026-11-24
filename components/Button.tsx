import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { color, radius, space } from "@/lib/theme";

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  /** primary: the main action. quiet: one of several. danger: destructive. */
  kind?: "primary" | "quiet" | "danger";
  /** Short and inline, for rows of actions. */
  small?: boolean;
  disabled?: boolean;
};

export function Button({
  label,
  onPress,
  icon,
  kind = "primary",
  small = false,
  disabled = false,
}: ButtonProps) {
  const fg =
    kind === "primary" ? color.onText : kind === "danger" ? color.danger : color.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        small ? styles.small : styles.large,
        kind === "primary" ? styles.primary : styles.outlined,
        kind === "danger" && styles.danger,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {icon ? (
        <MaterialCommunityIcons name={icon} size={small ? 16 : 20} color={fg} />
      ) : null}
      <Text style={[styles.label, small && styles.smallLabel, { color: fg }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    borderRadius: radius.md,
  },
  large: { minHeight: 50, paddingHorizontal: space.lg },
  small: { minHeight: 38, paddingHorizontal: space.md },
  primary: { backgroundColor: color.on },
  outlined: {
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.border,
  },
  danger: { borderColor: color.danger },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  label: { fontSize: 16, fontWeight: "600" },
  smallLabel: { fontSize: 14 },
});
