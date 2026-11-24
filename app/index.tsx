import React, { useEffect, useState } from "react";
import { LogBox, StyleSheet, View } from "react-native";
import DraggableFlatList, {
  DragEndParams,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DEVICE_RELAY, OP, utf8Encode } from "./ble/protocol";
import { useVanBle } from "./ble/useVanBle";
import { BoardsModal } from "./components/BoardsModal";
import { ButtonSettingsModal } from "./components/ButtonSettingsModal";
import { DragIcon } from "./components/DragIcon";
import { MessageLogModal } from "./components/MessageLogModal";
import RelayButton, { idToReadable } from "./components/RelayButton";
import { ResetModal } from "./components/ResetModal";
import { UnhideButtonsModal } from "./components/UnhideButtonsModal";
import {
  ButtonPref,
  clearEverything,
  loadButtonPrefs,
  loadPasscode,
  saveButtonPrefs,
  savePasscode,
} from "./hooks/storage";
import { useMessages } from "./hooks/useMessages";

LogBox.ignoreLogs([
  "[Reanimated] Tried to modify key", // Suppress specific Reanimated warning
]);

export default function Index() {
  const { messages, addMessage, clearMessages } = useMessages();
  const [passcode, setPasscodeState] = useState<string | null>(null);
  const [buttons, setButtons] = useState<ButtonPref[]>([]);
  const [loaded, setLoaded] = useState(false);

  const ble = useVanBle(passcode, addMessage);
  const { boards } = ble;

  useEffect(() => {
    (async () => {
      setPasscodeState(await loadPasscode());
      setButtons(await loadButtonPrefs());
      setLoaded(true);
    })();
  }, []);

  // Order, hidden and reversed are this phone's choices: save every change, including drags.
  useEffect(() => {
    if (!loaded) return;
    saveButtonPrefs(buttons).catch((e) =>
      addMessage(`Could not save buttons: ${e}`)
    );
  }, [buttons, loaded]);

  // A relay we have not seen before gets a button at the end of the list.
  useEffect(() => {
    if (!loaded) return;
    setButtons((prev) => {
      const known = new Set(prev.map((b) => b.uuid));
      const added: ButtonPref[] = [];
      for (const board of Object.values(boards)) {
        if (board.type !== DEVICE_RELAY) continue;
        for (let index = 0; index < board.count; index++) {
          const uuid = `${board.mac}-${index}`;
          if (!known.has(uuid))
            added.push({
              uuid,
              mac: board.mac,
              index,
              reversed: false,
              hidden: false,
            });
        }
      }
      return added.length ? [...prev, ...added] : prev;
    });
  }, [boards, loaded]);

  const setPasscode = (value: string) => {
    setPasscodeState(value);
    savePasscode(value).catch((e) =>
      addMessage(`Could not save passcode: ${e}`)
    );
  };

  const updateButton = (uuid: string, patch: Partial<ButtonPref>) =>
    setButtons((prev) =>
      prev.map((b) => (b.uuid === uuid ? { ...b, ...patch } : b))
    );

  const handleReset = async () => {
    await clearEverything().catch((e) => addMessage(`Reset failed: ${e}`));
    setPasscodeState(null);
    setButtons([]);
    ble.forgetBoards();
    addMessage("Reset complete");
  };

  const onDragEnd = ({ data }: DragEndParams<ButtonPref>) => setButtons(data);

  const renderButtonRow = ({ item, drag }: RenderItemParams<ButtonPref>) => {
    if (item.hidden) return null;
    const board = boards[item.mac];
    const name = board?.names[item.index] ?? `relay ${item.index + 1}`;
    const usable = !!board?.connected && board.authOk === true;

    return (
      <View style={styles.buttonRow}>
        <DragIcon drag={drag} />
        <ButtonSettingsModal
          modalTitle={`${idToReadable(name)} (${board?.name ?? "unknown board"})`}
          name={name}
          reversed={item.reversed}
          canRename={usable}
          onReverse={() => updateButton(item.uuid, { reversed: !item.reversed })}
          onHide={() => updateButton(item.uuid, { hidden: true })}
          onRename={(newName) =>
            ble.sendThenRefresh(
              item.mac,
              OP.setRelayName,
              Uint8Array.of(item.index, ...utf8Encode(newName)),
              "Rename"
            )
          }
        />
        <RelayButton
          label={name}
          turnedOn={!!board && ((board.state >> item.index) & 1) === 1}
          reversed={item.reversed}
          unavailable={!usable}
          onToggle={() => ble.toggleRelay(item.mac, item.index)}
        />
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View
        style={{
          height: "100%",
          paddingBottom: 140,
          backgroundColor: "black",
        }}
      >
        <View style={styles.buttonRow}>
          <BoardsModal
            boards={boards}
            passcode={passcode}
            bluetoothOn={ble.bluetoothOn}
            setPasscode={setPasscode}
            send={ble.send}
            sendThenRefresh={ble.sendThenRefresh}
            claim={ble.claim}
            adoptFromPasscode={ble.adoptFromPasscode}
          />
          <MessageLogModal messages={messages} clearMessages={clearMessages} />
        </View>

        <View style={styles.buttonRow}>
          <ResetModal
            handleReset={handleReset}
            forgetBoards={ble.forgetBoards}
          />
          <UnhideButtonsModal
            numberOfHiddenButtons={buttons.filter((b) => b.hidden).length}
            unhideButtons={() =>
              setButtons((prev) => prev.map((b) => ({ ...b, hidden: false })))
            }
          />
        </View>

        <DraggableFlatList
          data={buttons}
          renderItem={renderButtonRow}
          onDragEnd={onDragEnd}
          scrollEnabled={true}
          keyExtractor={(item) => item.uuid}
          extraData={boards}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
});
