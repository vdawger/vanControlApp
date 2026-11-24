import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Stack, useRouter } from "expo-router";
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
import { Button, IconName } from "@/components/Button";
import { RelayTile } from "@/components/RelayTile";
import { PromptSheet } from "@/components/Sheet";
import {
  DEVICE_RELAY,
  MAX_NAME_LENGTH,
  MIN_PASSCODE_LENGTH,
  OP,
  utf8Encode,
} from "@/lib/ble/protocol";
import { Board, boardStatus } from "@/lib/ble/types";
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
  const [editing, setEditing] = useState(false);
  const [askPasscode, setAskPasscode] = useState(false);
  const [renaming, setRenaming] = useState<ButtonPref | null>(null);

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

  const headerButton = (icon: IconName, label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.headerButton}
    >
      <MaterialCommunityIcons name={icon} size={24} color={color.text} />
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
              `New board: ${b.name}`,
              "It has no passcode yet. Adding it gives it yours, so this phone and any other with the passcode can use it.",
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
          Every button is hidden. Tap the pencil to show some.
        </Text>
      )}
    </View>
  );

  const renderTile = ({ item }: { item: ButtonPref }) => {
    const board = boards[item.mac];
    return (
      <View style={styles.cell}>
        <RelayTile
          name={nameOf(item)}
          boardName={board.name}
          relayOn={((board.state >> item.index) & 1) === 1}
          reversed={item.reversed}
          unavailable={UNAVAILABLE[boardStatus(board)]}
          onToggle={() => van.toggleRelay(item.mac, item.index)}
        />
      </View>
    );
  };

  const iconToggle = (
    icon: IconName,
    label: string,
    active: boolean,
    onPress: () => void,
    disabled = false
  ) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.rowIcon, active && styles.rowIconActive, disabled && { opacity: 0.3 }]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={active ? color.onText : color.text}
      />
    </Pressable>
  );

  const renderEditRow = ({ item, drag, isActive }: RenderItemParams<ButtonPref>) => {
    const board = boards[item.mac];
    const usable = !!board && boardStatus(board) === "ready";
    return (
      <View style={[styles.row, isActive && styles.rowActive, item.hidden && styles.rowHidden]}>
        <Pressable
          onLongPress={drag}
          delayLongPress={120}
          hitSlop={8}
          accessibilityLabel="Hold and drag to reorder"
          style={styles.handle}
        >
          <MaterialCommunityIcons name="drag" size={26} color={color.textDim} />
        </Pressable>
        <View style={styles.rowText}>
          <Text style={type.body} numberOfLines={1}>
            {readable(nameOf(item))}
          </Text>
          <Text style={type.dim} numberOfLines={1}>
            {board?.name ?? "Unknown board"}
            {item.reversed ? " · lit when off" : ""}
          </Text>
        </View>
        {iconToggle("pencil-outline", "Rename", false, () => setRenaming(item), !usable)}
        {iconToggle("swap-vertical", "Show lit when off", item.reversed, () =>
          van.updateButton(item.uuid, { reversed: !item.reversed })
        )}
        {iconToggle(
          item.hidden ? "eye-off-outline" : "eye-outline",
          item.hidden ? "Show" : "Hide",
          false,
          () => van.updateButton(item.uuid, { hidden: !item.hidden })
        )}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerButtons}>
              {headerButton(
                editing ? "check" : "pencil-outline",
                editing ? "Done arranging" : "Arrange buttons",
                () => setEditing(!editing)
              )}
              {headerButton("cog-outline", "Boards and setup", () =>
                router.push("/settings")
              )}
            </View>
          ),
        }}
      />

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
            <Text style={[type.dim, { marginBottom: space.md }]}>
              Hold the handle to reorder. Names are saved on the board, so every
              phone sees them. Order, hidden and “lit when off” are just for
              this phone.
            </Text>
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
                {`${hiddenCount} hidden. Tap the pencil to show them.`}
              </Text>
            ) : null
          }
        />
      )}

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
    </View>
  );
}

const GAP = space.md;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  listContent: { padding: space.lg - GAP / 2, paddingBottom: space.xl * 2 },
  cell: { flex: 1, maxWidth: "50%", padding: GAP / 2 },
  headerButtons: { flexDirection: "row", gap: space.lg, paddingRight: space.xs },
  headerButton: { padding: 2 },
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
  rowIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: color.surfaceRaised,
  },
  rowIconActive: { backgroundColor: color.on },
});
