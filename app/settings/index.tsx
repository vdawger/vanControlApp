import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, IconName } from "@/components/Button";
import { PromptSheet, Sheet } from "@/components/Sheet";
import {
  deriveKey,
  DEVICE_PANEL,
  DEVICE_RELAY,
  fromHex,
  MAX_NAME_LENGTH,
  MIN_PASSCODE_LENGTH,
  OP,
  otaPassword,
  utf8Encode,
} from "@/lib/ble/protocol";
import { Board, boardStatus, BoardStatus } from "@/lib/ble/types";
import { color, radius, readable, space, type } from "@/lib/theme";
import { useVan } from "@/lib/VanContext";

const NO_ARGS = new Uint8Array(0);

const STATUS: { [s in BoardStatus]: { label: string; tint: string } } = {
  ready: { label: "Ready", tint: color.ok },
  away: { label: "Out of range", tint: color.textFaint },
  new: { label: "New", tint: color.warn },
  locked: { label: "Different passcode", tint: color.danger },
  checking: { label: "Checking", tint: color.textFaint },
};

type Prompt = {
  title: string;
  hint?: string;
  initial?: string;
  minLength?: number;
  maxLength?: number;
  onSubmit: (text: string) => void;
};

export default function Settings() {
  const van = useVan();
  const { boards, passcode } = van;
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [picking, setPicking] = useState<{ mac: string; index: number } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showAllLog, setShowAllLog] = useState(false);

  const all = Object.values(boards).sort((a, b) => a.name.localeCompare(b.name));
  const relayBoards = all.filter((b) => b.type === DEVICE_RELAY);
  const awayCount = all.filter((b) => !b.connected).length;

  const askPasscode = () =>
    setPrompt({
      title: passcode ? "Change this phone's passcode" : "Set passcode",
      hint: `At least ${MIN_PASSCODE_LENGTH} characters. Use the same one on every phone. This changes the phone only; boards keep theirs until you switch them.`,
      minLength: MIN_PASSCODE_LENGTH,
      onSubmit: van.setPasscode,
    });

  const targetLabel = (b: Board, i: number) => {
    const t = b.targets[i];
    if (!t) return "Not used";
    const target = boards[t.mac];
    if (!target) return `Unknown board, relay ${t.relay + 1}`;
    return `${readable(target.names[t.relay] ?? `relay ${t.relay + 1}`)} · ${target.name}`;
  };

  const setSwitch = (relayMac: string | null, relay: number) => {
    if (!picking) return;
    const args = new Uint8Array(8);
    args[0] = picking.index;
    if (relayMac) args.set(fromHex(relayMac), 1);
    args[7] = relay;
    van.sendThenRefresh(picking.mac, OP.setSwitch, args, "Set switch");
    setPicking(null);
  };

  const renderBoard = (b: Board) => {
    const status = boardStatus(b);
    const ready = status === "ready";
    const isPanel = b.type === DEVICE_PANEL;
    const icon: IconName = isPanel ? "gesture-tap-button" : "electric-switch";
    return (
      <View key={b.mac} style={styles.card}>
        <View style={styles.cardHead}>
          <MaterialCommunityIcons name={icon} size={24} color={color.text} />
          <View style={{ flex: 1 }}>
            <Text style={type.heading}>{b.name || b.mac}</Text>
            <Text style={type.dim}>
              {isPanel ? `Switch panel · ${b.count} switches` : `Relay board · ${b.count} relays`}
            </Text>
          </View>
          <View style={[styles.pill, { borderColor: STATUS[status].tint }]}>
            <Text style={[styles.pillText, { color: STATUS[status].tint }]}>
              {STATUS[status].label}
            </Text>
          </View>
        </View>

        {status === "new" && (
          <View style={styles.cardBody}>
            <Text style={[type.dim, styles.gapBelow]}>
              This board has no passcode yet. Adding it gives it this phone's
              passcode.
            </Text>
            <Button
              label={passcode ? "Add to my van" : "Set a passcode first"}
              icon="plus"
              onPress={passcode ? () => van.claim(b.mac) : askPasscode}
            />
          </View>
        )}

        {status === "locked" && (
          <View style={styles.cardBody}>
            <Text style={[type.dim, styles.gapBelow]}>
              This board was set up with another passcode. Enter that passcode
              to move it to this phone's.
            </Text>
            <Button
              label="Switch to my passcode"
              icon="key-change"
              onPress={() =>
                setPrompt({
                  title: `${b.name}: current passcode`,
                  hint: "The passcode this board uses now.",
                  onSubmit: (current) => van.adoptFromPasscode(b.mac, current),
                })
              }
            />
          </View>
        )}

        {ready && isPanel && (
          <View style={styles.cardBody}>
            {Array.from({ length: b.count }, (_, i) => (
              <Pressable
                key={i}
                style={styles.switchRow}
                onPress={() => setPicking({ mac: b.mac, index: i })}
                accessibilityRole="button"
                accessibilityLabel={`Switch ${i + 1}: ${targetLabel(b, i)}`}
              >
                <View
                  style={[styles.switchNumber, (b.state >> i) & 1 ? styles.switchPressed : null]}
                >
                  <Text style={styles.switchNumberText}>{i + 1}</Text>
                </View>
                <Text style={[type.body, { flex: 1 }]} numberOfLines={1}>
                  {targetLabel(b, i)}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={color.textFaint}
                />
              </Pressable>
            ))}
          </View>
        )}

        {ready && (
          <View style={[styles.cardBody, styles.actions]}>
            <Button
              small
              kind="quiet"
              icon="pencil-outline"
              label="Rename"
              onPress={() =>
                setPrompt({
                  title: "Rename board",
                  initial: b.name,
                  maxLength: MAX_NAME_LENGTH,
                  onSubmit: (name) =>
                    van.sendThenRefresh(b.mac, OP.setName, utf8Encode(name), "Rename"),
                })
              }
            />
            <Button
              small
              kind="quiet"
              icon="led-on"
              label="Blink"
              onPress={() => van.send(b.mac, OP.identify, NO_ARGS, "Blink")}
            />
            <Button
              small
              kind="quiet"
              icon="wifi"
              label={b.ota ? "Stop update mode" : "Update mode"}
              onPress={() =>
                van.sendThenRefresh(b.mac, OP.ota, Uint8Array.of(b.ota ? 0 : 1), "Update mode")
              }
            />
            <Button
              small
              kind="quiet"
              icon="restart"
              label="Restart"
              onPress={() => van.send(b.mac, OP.reboot, NO_ARGS, "Restart")}
            />
          </View>
        )}

        {ready && b.ota && passcode && (
          <View style={styles.cardBody}>
            <Text style={type.dim}>Update mode is on for 10 minutes.</Text>
            <Text style={[type.body, { marginTop: space.xs }]} selectable>
              {`1. Join WiFi “${b.name}”\n2. Password: ${otaPassword(deriveKey(passcode))}\n3. Open http://192.168.4.1/update\n4. Upload the firmware.bin for this board`}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const log = showAllLog ? van.messages : van.messages.slice(0, 5);

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={type.label}>Passcode</Text>
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <MaterialCommunityIcons
              name={passcode ? "key-variant" : "key-alert-outline"}
              size={24}
              color={passcode ? color.text : color.warn}
            />
            <View style={{ flex: 1 }}>
              <Text style={type.heading}>{passcode ? "Passcode is set" : "No passcode yet"}</Text>
              <Text style={type.dim}>
                One passcode works with every board that shares it. No pairing.
              </Text>
            </View>
          </View>
          <View style={styles.cardBody}>
            <Button
              small={!!passcode}
              kind={passcode ? "quiet" : "primary"}
              label={passcode ? "Change" : "Set passcode"}
              onPress={askPasscode}
            />
          </View>
        </View>

        <Text style={type.label}>Boards</Text>
        {!van.bluetoothOn && (
          <Text style={[type.dim, styles.gapBelow]}>
            Bluetooth is off or this app is not allowed to use it.
          </Text>
        )}
        {all.length === 0 ? (
          <View style={styles.card}>
            <Text style={type.dim}>
              No boards found yet. Boards in Bluetooth range show up here on
              their own.
            </Text>
          </View>
        ) : (
          all.map(renderBoard)
        )}

        <Text style={type.label}>Activity</Text>
        <View style={styles.card}>
          {log.length === 0 ? (
            <Text style={type.dim}>Nothing yet.</Text>
          ) : (
            log.map((m) => (
              <Text key={m.id} style={[type.dim, { marginBottom: space.xs }]}>
                <Text style={{ color: color.textFaint }}>{m.time}  </Text>
                {m.text}
              </Text>
            ))
          )}
          {van.messages.length > 5 && (
            <View style={[styles.actions, { marginTop: space.sm }]}>
              <Button
                small
                kind="quiet"
                label={showAllLog ? "Show less" : `Show all ${van.messages.length}`}
                onPress={() => setShowAllLog(!showAllLog)}
              />
              <Button small kind="quiet" label="Clear" onPress={van.clearMessages} />
            </View>
          )}
        </View>

        <Text style={type.label}>This phone</Text>
        <View style={[styles.card, styles.actions]}>
          <Button
            small
            kind="quiet"
            label={`Forget ${awayCount} out-of-range board${awayCount === 1 ? "" : "s"}`}
            disabled={awayCount === 0}
            onPress={van.forgetBoards}
          />
          <Button small kind="danger" label="Reset this phone" onPress={() => setConfirmReset(true)} />
        </View>
      </ScrollView>

      {/* Sheets sit outside the ScrollView so they cover the screen, not the scrolled content. */}

      <PromptSheet
        visible={!!prompt}
        title={prompt?.title ?? ""}
        hint={prompt?.hint}
        initial={prompt?.initial}
        minLength={prompt?.minLength}
        maxLength={prompt?.maxLength}
        onSubmit={(text) => prompt?.onSubmit(text)}
        onClose={() => setPrompt(null)}
      />

      <Sheet
        visible={!!picking}
        title={picking ? `Switch ${picking.index + 1} controls` : ""}
        onClose={() => setPicking(null)}
      >
        <ScrollView style={{ maxHeight: 420 }}>
          <Pressable style={styles.option} onPress={() => setSwitch(null, 0)}>
            <Text style={type.body}>Not used</Text>
          </Pressable>
          {relayBoards.map((rb) => (
            <View key={rb.mac}>
              <Text style={[type.label, styles.optionGroup]}>{rb.name}</Text>
              {Array.from({ length: rb.count }, (_, i) => (
                <Pressable
                  key={i}
                  style={styles.option}
                  onPress={() => setSwitch(rb.mac, i)}
                >
                  <Text style={type.body}>
                    {readable(rb.names[i] ?? `relay ${i + 1}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      </Sheet>

      <Sheet
        visible={confirmReset}
        title="Reset this phone?"
        onClose={() => setConfirmReset(false)}
      >
        <Text style={[type.dim, styles.gapBelow]}>
          Forgets the passcode, button order, hidden buttons and known boards
          on this phone. The boards keep their passcode and names.
        </Text>
        <View style={{ gap: space.sm }}>
          <Button
            kind="danger"
            label="Reset"
            onPress={() => {
              setConfirmReset(false);
              van.resetPhone();
            }}
          />
          <Button kind="quiet" label="Cancel" onPress={() => setConfirmReset(false)} />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: space.lg, paddingBottom: space.xl * 2, gap: space.sm },
  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: space.md },
  cardBody: {
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: color.border,
    alignItems: "flex-start",
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  gapBelow: { marginBottom: space.md },
  pill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 3,
  },
  pillText: { fontSize: 12, fontWeight: "600" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: space.md,
    paddingVertical: space.sm,
  },
  switchNumber: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  switchPressed: { backgroundColor: color.on },
  switchNumberText: { color: color.text, fontSize: 13, fontWeight: "700" },
  option: {
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  optionGroup: { marginTop: space.lg, marginBottom: space.xs },
});
