import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { FC, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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
} from "../ble/protocol";
import { Board, BoardMap } from "../ble/useVanBle";
import { buttonStyles } from "../componentStyles/buttonStyles";
import { idToReadable } from "./RelayButton";

type Args = Uint8Array | ((counter: number) => Uint8Array);

interface BoardsModalProps {
  boards: BoardMap;
  passcode: string | null;
  bluetoothOn: boolean;
  setPasscode: (passcode: string) => void;
  send: (mac: string, op: number, args: Args, what: string) => Promise<boolean>;
  sendThenRefresh: (
    mac: string,
    op: number,
    args: Args,
    what: string
  ) => Promise<boolean>;
  claim: (mac: string) => Promise<boolean>;
  adoptFromPasscode: (mac: string, currentPasscode: string) => Promise<boolean>;
}

type Prompt = {
  title: string;
  hint: string;
  initial: string;
  minLength: number;
  maxLength: number;
  onSubmit: (text: string) => void;
};

type Mode =
  | { kind: "list" }
  | { kind: "prompt"; prompt: Prompt }
  | { kind: "pick"; panelMac: string; switchIndex: number };

const NO_ARGS = new Uint8Array(0);

export const BoardsModal: FC<BoardsModalProps> = ({
  boards,
  passcode,
  bluetoothOn,
  setPasscode,
  send,
  sendThenRefresh,
  claim,
  adoptFromPasscode,
}) => {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [text, setText] = useState("");

  const all = Object.values(boards).sort((a, b) => a.name.localeCompare(b.name));
  const relayBoards = all.filter((b) => b.type === DEVICE_RELAY);
  const ready = all.filter((b) => b.connected && b.authOk).length;
  const needsAttention =
    !bluetoothOn ||
    !passcode ||
    all.some((b) => b.connected && (!b.claimed || b.authOk === false));

  const ask = (prompt: Prompt) => {
    setText(prompt.initial);
    setMode({ kind: "prompt", prompt });
  };
  const back = () => setMode({ kind: "list" });

  const askPasscode = () =>
    ask({
      title: passcode ? "Change this phone's passcode" : "Set passcode",
      hint: `At least ${MIN_PASSCODE_LENGTH} characters. Use the same passcode on every phone. Changing it here does not change the boards.`,
      initial: "",
      minLength: MIN_PASSCODE_LENGTH,
      maxLength: 64,
      onSubmit: setPasscode,
    });

  const statusOf = (b: Board) => {
    if (!b.connected) return "Out of range";
    if (!b.claimed) return "New board: no passcode yet";
    if (b.authOk === false) return "Uses a different passcode";
    if (b.authOk === null) return passcode ? "Checking passcode…" : "Set a passcode first";
    return "Ready";
  };

  const targetLabel = (b: Board, i: number) => {
    const t = b.targets[i];
    if (!t) return "not used";
    const target = boards[t.mac];
    if (!target) return `unknown board, relay ${t.relay + 1}`;
    return `${target.name}: ${idToReadable(target.names[t.relay] ?? `relay ${t.relay + 1}`)}`;
  };

  const small = (
    label: string,
    onPress: () => void,
    style = buttonStyles.primary
  ) => (
    <TouchableOpacity
      key={label}
      style={[buttonStyles.button, buttonStyles.smallButton, style]}
      onPress={onPress}
    >
      <Text style={buttonStyles.text}>{label}</Text>
    </TouchableOpacity>
  );

  const renderBoard = (b: Board) => {
    const usable = b.connected && b.authOk === true;
    return (
      <View key={b.mac} style={buttonStyles.card}>
        <Text style={buttonStyles.text}>
          {b.name || b.mac}
          <Text style={buttonStyles.dimText}>
            {b.type === DEVICE_PANEL ? "  switch panel" : "  relays"}
          </Text>
        </Text>
        <Text style={buttonStyles.dimText}>{statusOf(b)}</Text>

        <View style={buttonStyles.wrapRow}>
          {b.connected &&
            !b.claimed &&
            passcode &&
            small("Give it my passcode", () => claim(b.mac))}
          {b.connected &&
            b.authOk === false &&
            passcode &&
            small("Switch it to my passcode", () =>
              ask({
                title: `${b.name}: current passcode`,
                hint: "Enter the passcode this board uses now. It will be changed to this phone's passcode.",
                initial: "",
                minLength: 1,
                maxLength: 64,
                onSubmit: (current) => adoptFromPasscode(b.mac, current),
              })
            )}
          {usable &&
            small("Rename", () =>
              ask({
                title: "Rename board",
                hint: "Shown in the Bluetooth list and here.",
                initial: b.name,
                minLength: 1,
                maxLength: MAX_NAME_LENGTH,
                onSubmit: (name) =>
                  sendThenRefresh(b.mac, OP.setName, utf8Encode(name), "Rename"),
              })
            )}
          {usable &&
            small("Blink", () => send(b.mac, OP.identify, NO_ARGS, "Blink"))}
          {usable &&
            small(b.ota ? "Stop update mode" : "Update mode", () =>
              sendThenRefresh(
                b.mac,
                OP.ota,
                Uint8Array.of(b.ota ? 0 : 1),
                "Update mode"
              )
            )}
          {usable &&
            small(
              "Reboot",
              () => send(b.mac, OP.reboot, NO_ARGS, "Reboot"),
              buttonStyles.danger
            )}
        </View>

        {usable && b.ota && passcode && (
          <Text style={buttonStyles.dimText}>
            {`Update mode is on for 10 minutes. Join WiFi "${b.name}" with password ${otaPassword(
              deriveKey(passcode)
            )}, then open http://192.168.4.1/update and upload firmware.bin.`}
          </Text>
        )}

        {usable &&
          b.type === DEVICE_PANEL &&
          Array.from({ length: b.count }, (_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() =>
                setMode({ kind: "pick", panelMac: b.mac, switchIndex: i })
              }
            >
              <Text style={[buttonStyles.text, { paddingVertical: 8 }]}>
                {`Switch ${i + 1} → ${targetLabel(b, i)}`}
                {(b.state >> i) & 1 ? "  (pressed)" : ""}
              </Text>
            </TouchableOpacity>
          ))}
      </View>
    );
  };

  const setSwitch = (
    panelMac: string,
    switchIndex: number,
    relayMac: string | null,
    relay: number
  ) => {
    const args = new Uint8Array(8);
    args[0] = switchIndex;
    if (relayMac) args.set(fromHex(relayMac), 1);
    args[7] = relay;
    sendThenRefresh(panelMac, OP.setSwitch, args, "Set switch");
    back();
  };

  const renderList = () => (
    <>
      <Text style={buttonStyles.titleText}>Boards</Text>
      {!bluetoothOn && (
        <Text style={[buttonStyles.text, buttonStyles.spaceAfter]}>
          Bluetooth is off or not allowed for this app.
        </Text>
      )}
      <View style={[buttonStyles.wrapRow, buttonStyles.spaceAfter]}>
        {small(passcode ? "Change passcode" : "Set passcode", askPasscode)}
      </View>
      <ScrollView style={{ maxHeight: 420 }}>
        {all.length === 0 && (
          <Text style={buttonStyles.dimText}>
            No boards found yet. Boards in Bluetooth range show up here on their
            own.
          </Text>
        )}
        {all.map(renderBoard)}
      </ScrollView>
    </>
  );

  const renderPrompt = (prompt: Prompt) => {
    const value = text.trim();
    const valid = value.length >= prompt.minLength;
    return (
      <>
        <Text style={buttonStyles.titleText}>{prompt.title}</Text>
        <Text style={[buttonStyles.dimText, buttonStyles.spaceAfter]}>
          {prompt.hint}
        </Text>
        <TextInput
          style={buttonStyles.input}
          value={text}
          onChangeText={setText}
          maxLength={prompt.maxLength}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          placeholderTextColor="grey"
        />
        <TouchableOpacity
          style={[
            buttonStyles.button,
            buttonStyles.fullWidth,
            valid ? buttonStyles.primary : buttonStyles.disabledButton,
          ]}
          disabled={!valid}
          onPress={() => {
            prompt.onSubmit(value);
            back();
          }}
        >
          <Text style={buttonStyles.text}>Save</Text>
        </TouchableOpacity>
      </>
    );
  };

  const renderPick = (panelMac: string, switchIndex: number) => (
    <>
      <Text style={buttonStyles.titleText}>{`Switch ${switchIndex + 1} controls…`}</Text>
      <ScrollView style={{ maxHeight: 420 }}>
        <TouchableOpacity
          style={buttonStyles.card}
          onPress={() => setSwitch(panelMac, switchIndex, null, 0)}
        >
          <Text style={buttonStyles.text}>Not used</Text>
        </TouchableOpacity>
        {relayBoards.flatMap((rb) =>
          Array.from({ length: rb.count }, (_, i) => (
            <TouchableOpacity
              key={`${rb.mac}-${i}`}
              style={buttonStyles.card}
              onPress={() => setSwitch(panelMac, switchIndex, rb.mac, i)}
            >
              <Text style={buttonStyles.text}>
                {`${rb.name}: ${idToReadable(rb.names[i] ?? `relay ${i + 1}`)}`}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </>
  );

  return (
    <View style={{ alignItems: "center", width: "50%" }}>
      <TouchableOpacity
        style={[
          buttonStyles.button,
          buttonStyles.fullWidth,
          needsAttention ? buttonStyles.danger : buttonStyles.relayOn,
        ]}
        onPress={() => {
          back();
          setVisible(true);
        }}
      >
        <View style={{ flexDirection: "row" }}>
          <Text style={{ color: "white" }}>
            {!passcode ? "Set passcode " : `Boards ${ready}/${all.length} `}
          </Text>
          <MaterialIcons name="bluetooth" size={20} color="white" />
        </View>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={() => setVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={buttonStyles.modalAtBottomOfScreen}
        >
          <View style={buttonStyles.modalView}>
            {mode.kind === "list" && renderList()}
            {mode.kind === "prompt" && renderPrompt(mode.prompt)}
            {mode.kind === "pick" && renderPick(mode.panelMac, mode.switchIndex)}
            <View style={[buttonStyles.buttonRow, { marginTop: 10 }]}>
              <TouchableOpacity
                style={[
                  buttonStyles.button,
                  buttonStyles.fullWidth,
                  buttonStyles.cancel,
                ]}
                onPress={() =>
                  mode.kind === "list" ? setVisible(false) : back()
                }
              >
                <Text style={buttonStyles.text}>
                  {mode.kind === "list" ? "Done" : "Cancel"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};
