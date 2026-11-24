import Ionicons from "@expo/vector-icons/Ionicons";
import { FC, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from "react-native";
import { MAX_NAME_LENGTH } from "../ble/protocol";
import { buttonStyles } from "../componentStyles/buttonStyles";

interface ButtonSettingsModalProps {
  modalTitle: string;
  name: string;
  reversed: boolean;
  /** Renaming is stored on the board, so it needs the board in range. */
  canRename: boolean;
  onReverse: () => void;
  onHide: () => void;
  onRename: (name: string) => void;
}

export const ButtonSettingsModal: FC<ButtonSettingsModalProps> = ({
  modalTitle,
  name,
  reversed,
  canRename,
  onReverse,
  onHide,
  onRename,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState(name);

  const open = () => {
    setNewName(name);
    setModalVisible(true);
  };
  const trimmed = newName.trim();
  const renameReady = canRename && trimmed.length > 0 && trimmed !== name;

  return (
    <View>
      <TouchableHighlight style={[buttonStyles.relayIcon]} onPress={open}>
        <Ionicons name="settings-outline" size={50} color="white" />
      </TouchableHighlight>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={buttonStyles.modalAtBottomOfScreen}
        >
          <View style={buttonStyles.modalView}>
            <Text style={buttonStyles.titleText}>{modalTitle}</Text>

            <TextInput
              style={buttonStyles.input}
              value={newName}
              onChangeText={setNewName}
              maxLength={MAX_NAME_LENGTH}
              editable={canRename}
              placeholder="Name"
              placeholderTextColor="grey"
              autoCorrect={false}
            />
            <View style={buttonStyles.buttonRow}>
              <TouchableOpacity
                style={[
                  buttonStyles.button,
                  buttonStyles.fullWidth,
                  renameReady
                    ? buttonStyles.primary
                    : buttonStyles.disabledButton,
                ]}
                disabled={!renameReady}
                onPress={() => {
                  onRename(trimmed);
                  setModalVisible(false);
                }}
              >
                <Text style={[buttonStyles.text]}>
                  {canRename ? "Rename" : "Rename (board not in range)"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={buttonStyles.buttonRow}>
              <TouchableOpacity
                style={[
                  buttonStyles.button,
                  buttonStyles.primary,
                  buttonStyles.fullWidth,
                ]}
                onPress={() => {
                  onReverse();
                  setModalVisible(false);
                }}
              >
                <Text style={[buttonStyles.text]}>
                  {reversed ? "Make On" : "Make Off"} = On
                </Text>
              </TouchableOpacity>
            </View>

            <View style={buttonStyles.buttonRow}>
              <TouchableOpacity
                style={[
                  buttonStyles.button,
                  buttonStyles.danger,
                  buttonStyles.fullWidth,
                ]}
                onPress={() => {
                  onHide();
                  setModalVisible(false);
                }}
              >
                <Text style={[buttonStyles.text]}>Hide</Text>
              </TouchableOpacity>
            </View>

            <View style={buttonStyles.buttonRow}>
              <TouchableOpacity
                style={[
                  buttonStyles.button,
                  buttonStyles.cancel,
                  buttonStyles.fullWidth,
                ]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[buttonStyles.text]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};
