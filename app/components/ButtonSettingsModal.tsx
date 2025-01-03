import Ionicons from "@expo/vector-icons/Ionicons";
import { FC, useState } from "react";
import {
  Modal,
  Text,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from "react-native";
import { buttonStyles } from "../componentStyles/buttonStyles";
import { RelayButtonProps } from "./RelayButton";

interface ButtonSettingsModalProps {
  button: RelayButtonProps;
  modalTitle: string;
  setButtons: React.Dispatch<React.SetStateAction<RelayButtonProps[]>>;
  saveButtonState: (
    buttons: RelayButtonProps[],
    addMessage: (s: string) => void
  ) => void;
  addMessage: (s: string) => void;
}

export const ButtonSettingsModal: FC<ButtonSettingsModalProps> = ({
  button,
  modalTitle,
  setButtons,
  saveButtonState,
  addMessage,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const hideButtonRow = (uuid: string) => {
    setButtons((prevButtons) => {
      const newButtons = prevButtons.map((button) => {
        if (button.uuid === uuid) {
          return { ...button, hidden: true };
        }
        return button;
      });
      saveButtonState(newButtons, addMessage);
      return newButtons;
    });
  };

  const handleReverseToggle = (uuid: string) => {
    setButtons((prevButtons) => {
      const newButtons = prevButtons.map((button) => {
        if (button.uuid !== uuid) return button;
        return { ...button, reversed: !button.reversed };
      });
      saveButtonState(newButtons, addMessage);
      return newButtons;
    });
  };

  return (
    <View>
      <TouchableHighlight
        style={[buttonStyles.relayIcon]}
        onPress={(e) => setModalVisible(true)}
      >
        <Ionicons name="settings-outline" size={50} color="white" />
      </TouchableHighlight>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={buttonStyles.modalAtBottomOfScreen}>
          <View style={buttonStyles.modalView}>
            <Text style={buttonStyles.titleText}>{modalTitle}</Text>
            <View style={buttonStyles.buttonRow}>
              <TouchableOpacity
                style={[
                  buttonStyles.button,
                  buttonStyles.primary,
                  buttonStyles.fullWidth,
                ]}
                onPress={(e) => {
                  handleReverseToggle(button.uuid);
                  setModalVisible(false);
                }}
              >
                <Text style={[buttonStyles.text]}>
                  {button.reversed ? "Make On" : "Make Off"} = On
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
                onPress={(e) => hideButtonRow(button.uuid)}
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
                onPress={(e) => setModalVisible(false)}
              >
                <Text style={[buttonStyles.text]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
