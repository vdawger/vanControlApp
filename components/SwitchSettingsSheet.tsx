import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { RELAY_FLAG } from "@/lib/ble/protocol";
import { color, radius, readable, space, type } from "@/lib/theme";
import { Button } from "./Button";
import { Sheet } from "./Sheet";

type Props = {
  visible: boolean;
  name: string;
  boardName: string;
  /** RELAY_FLAG bits in effect for this switch. */
  flags: number;
  /** Where NO/NC and confirm live: on the board, on this phone only (board firmware too old),
   *  or on this phone until the board is back in range. */
  flagsSavedOn: "board" | "phone" | "pending";
  hidden: boolean;
  /** Board in range and accepting this phone's passcode: needed to rename. */
  boardReady: boolean;
  onSetFlags: (flags: number) => void;
  onRename: () => void;
  onSetHidden: (hidden: boolean) => void;
  onClose: () => void;
};

/** Everything about one switch: what is saved on the board (every phone) and on this phone. */
export function SwitchSettingsSheet({
  visible,
  name,
  boardName,
  flags,
  flagsSavedOn,
  hidden,
  boardReady,
  onSetFlags,
  onRename,
  onSetHidden,
  onClose,
}: Props) {
  const nc = (flags & RELAY_FLAG.nc) !== 0;
  const confirm = (flags & RELAY_FLAG.confirm) !== 0;
  const setFlag = (flag: number, on: boolean) =>
    onSetFlags(on ? flags | flag : flags & ~flag);

  return (
    <Sheet visible={visible} title={readable(name)} onClose={onClose}>
      <Text style={[type.dim, styles.sub]}>{boardName}</Text>

      <Text style={type.label}>
        {flagsSavedOn === "board" ? "Saved on the board · every phone" : "Saved on this phone"}
      </Text>
      {flagsSavedOn !== "board" && (
        <Text style={[type.dim, styles.note]}>
          {flagsSavedOn === "phone"
            ? `${boardName}'s firmware can't store these yet, so this phone keeps them. Other phones set their own until the board is updated.`
            : `Goes to ${boardName} next time it's in range, for every phone.`}
        </Text>
      )}

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={type.body}>Wiring</Text>
          <Text style={type.dim}>
            {nc
              ? "Normally closed: shows On while the relay is off."
              : "Normally open: shows On while the relay is on."}
          </Text>
        </View>
        <View style={styles.segment} accessibilityRole="radiogroup">
          {(["NO", "NC"] as const).map((label) => {
            const selected = (label === "NC") === nc;
            return (
              <Pressable
                key={label}
                disabled={selected}
                onPress={() => setFlag(RELAY_FLAG.nc, label === "NC")}
                hitSlop={4}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={label === "NO" ? "Normally open" : "Normally closed"}
                style={[styles.segmentItem, selected && styles.segmentSelected]}
              >
                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={type.body}>Ask before switching</Text>
          <Text style={type.dim}>Shows a confirm prompt in the app. Wall switches still switch it directly.</Text>
        </View>
        <Switch
          value={confirm}
          onValueChange={(on) => setFlag(RELAY_FLAG.confirm, on)}
          trackColor={{ true: color.on, false: color.border }}
          thumbColor={color.text}
          accessibilityLabel="Ask before switching"
        />
      </View>

      <Text style={[type.label, styles.section]}>Name · saved on the board</Text>
      <Pressable
        style={styles.row}
        onPress={onRename}
        disabled={!boardReady}
        accessibilityRole="button"
        accessibilityLabel="Rename"
      >
        <View style={styles.rowText}>
          <Text style={[type.body, !boardReady && { opacity: 0.4 }]}>Rename</Text>
          {!boardReady && <Text style={type.dim}>Needs the board in range.</Text>}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={color.textFaint} />
      </Pressable>

      <Text style={[type.label, styles.section]}>This phone only</Text>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={type.body}>Show on home screen</Text>
        </View>
        <Switch
          value={!hidden}
          onValueChange={(show) => onSetHidden(!show)}
          trackColor={{ true: color.on, false: color.border }}
          thumbColor={color.text}
          accessibilityLabel="Show on home screen"
        />
      </View>

      <View style={styles.done}>
        <Button label="Done" kind="quiet" onPress={onClose} />
      </View>
    </Sheet>
  );
}

type ConfirmProps = {
  visible: boolean;
  name: string;
  /** What the tile shows now; the prompt offers the opposite. */
  lit: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** "Turn the water pump off?" for switches marked Ask before switching. */
export function ConfirmToggleSheet({ visible, name, lit, onConfirm, onClose }: ConfirmProps) {
  const action = lit ? "off" : "on";
  return (
    <Sheet visible={visible} title={`Turn ${readable(name)} ${action}?`} onClose={onClose}>
      <View style={{ gap: space.sm }}>
        <Button
          label={`Turn ${action}`}
          icon={lit ? "power-off" : "power"}
          onPress={() => {
            onClose();
            onConfirm();
          }}
        />
        <Button label="Cancel" kind="quiet" onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sub: { marginTop: -space.sm, marginBottom: space.lg },
  note: { marginTop: space.xs },
  section: { marginTop: space.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  rowText: { flex: 1, gap: 2 },
  segment: {
    flexDirection: "row",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.border,
    overflow: "hidden",
  },
  segmentItem: {
    height: 36,
    minWidth: 44,
    paddingHorizontal: space.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
  },
  segmentSelected: { backgroundColor: color.on },
  segmentText: { color: color.textDim, fontSize: 13, fontWeight: "700" },
  segmentTextSelected: { color: color.onText },
  done: { marginTop: space.lg },
});
