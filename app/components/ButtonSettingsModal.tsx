import Ionicons from "@expo/vector-icons/Ionicons";
import { FC, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from "react-native";
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
        style={{ width: 50 }}
        onPress={(e) => setModalVisible(true)}
      >
        <Ionicons name="settings-outline" size={40} color="white" />
      </TouchableHighlight>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.titleText}>{modalTitle}</Text>
            <View style={styles.buttonView}>
              <TouchableHighlight
                style={[styles.button, styles.primary]}
                onPress={(e) => {
                  handleReverseToggle(button.uuid);
                  setModalVisible(false);
                }}
              >
                <Text style={[styles.text]}>
                  {button.reversed ? "Make On" : "Make Off"} = On
                </Text>
              </TouchableHighlight>
            </View>

            <View style={styles.buttonView}>
              <TouchableHighlight
                style={[styles.button, styles.danger]}
                onPress={(e) => hideButtonRow(button.uuid)}
              >
                <Text style={[styles.text]}>Hide</Text>
              </TouchableHighlight>
            </View>

            <View style={styles.buttonView}>
              <TouchableHighlight
                style={[styles.button, styles.cancel]}
                onPress={(e) => setModalVisible(false)}
              >
                <Text style={[styles.text]}>Cancel</Text>
              </TouchableHighlight>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonView: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
  },
  button: {
    width: "80%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderColor: "black",
    borderWidth: 1,
    flexDirection: "row",
    marginVertical: 5,
    alignSelf: "center",
  },
  danger: {
    backgroundColor: "red",
  },
  primary: {
    backgroundColor: "blue",
  },
  cancel: {
    backgroundColor: "grey",
  },
  text: {
    paddingHorizontal: 5,
    color: "white",
  },
  centeredView: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // transparent color how do i make this transparent?
  },
  modalView: {
    backgroundColor: "black",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 10,
    width: "100%",
  },
  titleText: {
    fontSize: 20,
    color: "white",
    textAlign: "center",
    marginVertical: 10,
  },
});
