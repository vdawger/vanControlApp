import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, IconName } from "@/components/Button";
import { PowerBar } from "@/components/PowerBar";
import { RelayTile } from "@/components/RelayTile";
import { PromptSheet } from "@/components/Sheet";
import { ConfirmToggleSheet, SwitchSettingsSheet } from "@/components/SwitchSettingsSheet";
import {
  DEVICE_POWER,
  DEVICE_RELAY,
  MAX_NAME_LENGTH,
  MIN_PASSCODE_LENGTH,
  OP,
  RELAY_FLAG,
  utf8Encode,
} from "@/lib/ble/protocol";
import { Board, boardStatus } from "@/lib/ble/types";
import { powerBoard } from "@/lib/power";
import { ButtonPref } from "@/lib/storage";
import { color, radius, readable, space, type } from "@/lib/theme";
import { useVan } from "@/lib/VanContext";

const UNAVAILABLE: { [status: string]: string | null } = {
  ready: null,
  away: "Out of range",
  new: "Needs setup",
  locked: "Locked",
  checking: "Checking",
};

export default function Home() {
  const van = useVan();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [askPasscode, setAskPasscode] = useState(false);
  const [renaming, setRenaming] = useState<ButtonPref | null>(null);
  const [settingsFor, setSettingsFor] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ item: ButtonPref; lit: boolean } | null>(null);

  const { boards, buttons, passcode } = van;
  const relayBoards = Object.values(boards).filter((b) => b.type === DEVICE_RELAY);
  const allBoards = Object.values(boards);
  const inRange = allBoards.filter((b) => b.connected).length;
  const newBoards = allBoards.filter((b) => boardStatus(b) === "new");
  const lockedBoards = allBoards.filter((b) => boardStatus(b) === "locked");

  const nameOf = (b: ButtonPref) =>
    boards[b.mac]?.names[b.index] ?? `relay ${b.index + 1}`;
  const shown = buttons.filter((b) => !b.hidden && boards[b.mac]);
  const hiddenCount = buttons.filter((b) => b.hidden).length;
  const cerbo = powerBoard(boards);
  const showPower = !editing && !!cerbo?.power && boardStatus(cerbo) === "ready";

  const headerButton = (
    icon: IconName,
    label: string,
    onPress: () => void,
    text?: string
  ) => (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.6 }]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={color.text} />
      {text ? <Text style={styles.headerButtonText}>{text}</Text> : null}
    </Pressable>
  );

  const statusLine = () => {
    if (!van.bluetoothOn)
      return { dot: color.danger, text: "Bluetooth is off or not allowed" };
    if (allBoards.length === 0)
      return { dot: color.textFaint, text: "Looking for boards…" };
    return {
      dot: inRange ? color.ok : color.textFaint,
      text: `${inRange} of ${allBoards.length} boards in range`,
    };
  };
  const status = statusLine();

  const notice = (
    key: string,
    icon: IconName,
    title: string,
    body: string,
    action: string,
    onPress: () => void
  ) => (
    <View key={key} style={styles.notice}>
      <MaterialCommunityIcons name={icon} size={24} color={color.warn} />
      <View style={styles.noticeText}>
        <Text style={type.heading}>{title}</Text>
        <Text style={[type.dim, { marginTop: 2, marginBottom: space.md }]}>
          {body}
        </Text>
        <Button label={action} onPress={onPress} small />
      </View>
    </View>
  );

  const header = (
    <View>
      <Pressable
        style={styles.status}
        onPress={() => router.push("/settings")}
        accessibilityRole="button"
        accessibilityLabel="Boards and setup"
      >
        <View style={[styles.dot, { backgroundColor: status.dot }]} />
        <Text style={type.dim}>{status.text}</Text>
        <MaterialCommunityIcons
          name="chevron-right"
          size={18}
          color={color.textFaint}
        />
      </Pressable>

      {van.loaded && !passcode
        ? notice(
            "passcode",
            "key-variant",
            "Set your passcode",
            "One passcode works with every board that shares it. Enter the one your van uses, or pick a new one to set up new boards.",
            "Set passcode",
            () => setAskPasscode(true)
          )
        : null}
      {passcode
        ? newBoards.map((b: Board) =>
            notice(
              b.mac,
              "plus-circle-outline",
              `New ${b.type === DEVICE_POWER ? "Cerbo" : "board"}: ${b.name}`,
              b.type === DEVICE_POWER
                ? "Adding it gives it your passcode, so phones with the passcode can read its battery and inverter."
                : "It has no passcode yet. Adding it gives it yours, so this phone and any other with the passcode can use it.",
              "Add to my van",
              () => van.claim(b.mac)
            )
          )
        : null}
      {lockedBoards.map((b: Board) =>
        notice(
          b.mac,
          "lock-outline",
          `${b.name} uses a different passcode`,
          "Switch it to this phone's passcode from the setup screen.",
          "Open setup",
          () => router.push("/settings")
        )
      )}
    </View>
  );

  const empty = (
    <View style={styles.empty}>
      {relayBoards.length === 0 ? (
        <>
          <ActivityIndicator color={color.textDim} />
          <Text style={[type.dim, styles.emptyText]}>
            Relay boards show up here on their own when they are in Bluetooth
            range.
          </Text>
        </>
      ) : (
        <Text style={[type.dim, styles.emptyText]}>
          Every switch is hidden. Tap Arrange to show some.
        </Text>
      )}
    </View>
  );

  const renderTile = ({ item }: { item: ButtonPref }) => {
    const board = boards[item.mac];
    const relayOn = ((board.state >> item.index) & 1) === 1;
    const flags = van.switchFlags(item);
    const nc = (flags & RELAY_FLAG.nc) !== 0;
    const confirm = (flags & RELAY_FLAG.confirm) !== 0;
    return (
      <View style={styles.cell}>
        <RelayTile
          name={nameOf(item)}
          boardName={board.name}
          relayOn={relayOn}
          normallyClosed={nc}
          confirm={confirm}
          unavailable={UNAVAILABLE[boardStatus(board)]}
          onToggle={async () => {
            if (confirm) {
              setConfirming({ item, lit: nc ? !relayOn : relayOn });
              return true;
            }
            return van.toggleRelay(item.mac, item.index);
          }}
        />
      </View>
    );
  };

  const badge = (label: string, icon?: IconName) => (
    <View key={label} style={styles.badge}>
      {icon ? <MaterialCommunityIcons name={icon} size={12} color={color.textDim} /> : null}
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );

  const renderEditRow = ({ item, drag, isActive }: RenderItemParams<ButtonPref>) => {
    const board = boards[item.mac];
    const flags = van.switchFlags(item);
    const nc = (flags & RELAY_FLAG.nc) !== 0;
    const confirm = (flags & RELAY_FLAG.confirm) !== 0;
    return (
      <View style={[styles.row, isActive && styles.rowActive]}>
        <Pressable
          onPressIn={drag}
          disabled={isActive}
          hitSlop={8}
          accessibilityLabel="Drag to reorder"
          style={styles.handle}
        >
          <MaterialCommunityIcons name="drag" size={26} color={color.textDim} />
        </Pressable>
        <Pressable
          style={[styles.rowMain, item.hidden && styles.rowHidden]}
          onPress={() => setSettingsFor(item.uuid)}
          accessibilityRole="button"
          accessibilityLabel={`${readable(nameOf(item))} settings`}
        >
          <View style={styles.rowText}>
            <Text style={type.body} numberOfLines={1}>
              {readable(nameOf(item))}
            </Text>
            <View style={styles.badges}>
              <Text style={type.dim} numberOfLines={1}>
                {board?.name ?? "Unknown board"}
              </Text>
              {nc ? badge("NC") : null}
              {confirm ? badge("Confirm", "shield-check-outline") : null}
              {item.hidden ? badge("Hidden", "eye-off-outline") : null}
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={color.textFaint} />
        </Pressable>
      </View>
    );
  };

  const settingsItem = buttons.find((b) => b.uuid === settingsFor) ?? null;
  const settingsBoard = settingsItem ? boards[settingsItem.mac] : undefined;

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: showPower ? 0 : insets.bottom }]}>
      <View style={styles.header}>
        <Text style={type.title}>{editing ? "Arrange" : "Van"}</Text>
        <View style={styles.headerButtons}>
          {editing
            ? headerButton("check", "Done arranging", () => setEditing(false), "Done")
            : headerButton("tune-variant", "Arrange switches", () => setEditing(true), "Arrange")}
          {!editing &&
            headerButton("cog-outline", "Boards and setup", () => router.push("/settings"))}
        </View>
      </View>

      {editing ? (
        <DraggableFlatList
          data={buttons.filter((b) => boards[b.mac])}
          keyExtractor={(item) => item.uuid}
          renderItem={renderEditRow}
          onDragEnd={({ data }) =>
            // Buttons of boards this phone no longer knows keep their place at the end.
            van.setButtons([...data, ...buttons.filter((b) => !boards[b.mac])])
          }
          extraData={boards}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.legend}>
              <Text style={type.dim}>
                Drag the handle to reorder. Tap a switch to rename it, set it
                normally open or closed, ask before switching, or hide it.
              </Text>
              <Text style={type.dim}>
                Names, NO/NC and confirm are saved on the board, so every phone
                with the passcode gets them. On a board with older firmware,
                NO/NC and confirm stay on this phone. Order and hidden switches
                are always just for this phone.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(item) => item.uuid}
          renderItem={renderTile}
          numColumns={2}
          extraData={boards}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={header}
          ListEmptyComponent={van.loaded ? empty : null}
          ListFooterComponent={
            hiddenCount > 0 && shown.length > 0 ? (
              <Text style={[type.dim, styles.footer]}>
                {`${hiddenCount} hidden. Tap Arrange to show them.`}
              </Text>
            ) : null
          }
        />
      )}

      {showPower && cerbo ? (
        <PowerBar board={cerbo} bottomInset={insets.bottom} onPress={() => router.push("/power")} />
      ) : null}

      <PromptSheet
        visible={askPasscode}
        title="Passcode"
        hint={`At least ${MIN_PASSCODE_LENGTH} characters. Use the same one on every phone.`}
        minLength={MIN_PASSCODE_LENGTH}
        onSubmit={van.setPasscode}
        onClose={() => setAskPasscode(false)}
      />
      <PromptSheet
        visible={!!renaming}
        title="Rename"
        hint="Saved on the board, so every phone sees it."
        initial={renaming ? nameOf(renaming) : ""}
        maxLength={MAX_NAME_LENGTH}
        onSubmit={(name) => {
          if (!renaming) return;
          van.sendThenRefresh(
            renaming.mac,
            OP.setRelayName,
            Uint8Array.of(renaming.index, ...utf8Encode(name)),
            "Rename"
          );
        }}
        onClose={() => setRenaming(null)}
      />
      <SwitchSettingsSheet
        visible={!!settingsItem && !renaming}
        name={settingsItem ? nameOf(settingsItem) : ""}
        boardName={settingsBoard?.name ?? ""}
        flags={settingsItem ? van.switchFlags(settingsItem) : 0}
        flagsSavedOn={
          !settingsBoard?.flagsOnBoard ? "phone" : settingsItem?.flagsPending ? "pending" : "board"
        }
        hidden={!!settingsItem?.hidden}
        boardReady={!!settingsBoard && boardStatus(settingsBoard) === "ready"}
        onSetFlags={(flags) => settingsItem && van.setSwitchFlags(settingsItem, flags)}
        onRename={() => settingsItem && setRenaming(settingsItem)}
        onSetHidden={(hidden) => settingsItem && van.updateButton(settingsItem.uuid, { hidden })}
        onClose={() => setSettingsFor(null)}
      />
      <ConfirmToggleSheet
        visible={!!confirming}
        name={confirming ? nameOf(confirming.item) : ""}
        lit={!!confirming?.lit}
        onConfirm={() => confirming && van.toggleRelay(confirming.item.mac, confirming.item.index)}
        onClose={() => setConfirming(null)}
      />
    </View>
  );
}

const GAP = space.md;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  listContent: { padding: space.lg - GAP / 2, paddingBottom: space.xl * 2 },
  cell: { flex: 1, maxWidth: "50%", padding: GAP / 2 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  headerButtons: { flexDirection: "row", gap: space.sm },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    minHeight: 40,
    minWidth: 40,
    justifyContent: "center",
    paddingHorizontal: space.sm + 2,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  headerButtonText: { color: color.text, fontSize: 14, fontWeight: "600" },
  legend: { gap: space.sm, marginHorizontal: GAP / 2, marginBottom: space.md },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: GAP / 2,
    paddingBottom: space.md,
  },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
  notice: {
    flexDirection: "row",
    gap: space.md,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space.lg,
    marginHorizontal: GAP / 2,
    marginBottom: space.md,
  },
  noticeText: { flex: 1, alignItems: "flex-start" },
  empty: { alignItems: "center", padding: space.xl, gap: space.md },
  emptyText: { textAlign: "center" },
  footer: { textAlign: "center", marginTop: space.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    padding: space.sm,
    marginHorizontal: GAP / 2,
    marginBottom: space.sm,
  },
  rowActive: { backgroundColor: color.surfaceRaised, borderColor: color.textDim },
  rowHidden: { opacity: 0.5 },
  rowText: { flex: 1 },
  handle: { padding: space.xs },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm },
  badges: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space.xs, marginTop: 2 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
  },
  badgeText: { color: color.textDim, fontSize: 11, fontWeight: "600" },
});
