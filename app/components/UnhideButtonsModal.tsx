import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { FC, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from "react-native";
import { saveButtonState } from "../hooks/useLoadSavedData";
import { RelayButtonProps } from "./RelayButton";

interface UnhideButtonsModalProps {
  buttons: RelayButtonProps[];
  setButtons: React.Dispatch<React.SetStateAction<RelayButtonProps[]>>;
  addMessage: (s: string) => void;
}

export const UnhideButtonsModal: FC<UnhideButtonsModalProps> = ({
  buttons,
  setButtons,
  addMessage,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const unhideButtons = () => {
    setButtons((prevButtons) => {
      const newButtons = prevButtons.map((button) => {
        return { ...button, hidden: false };
      });
      saveButtonState(newButtons, addMessage);
      return newButtons;
    });
  };

  const numberOfHiddenButtons = buttons.filter(
    (button) => button.hidden
  )?.length;

  return (
    <View>
      <TouchableHighlight
        style={[styles.button, styles.fullWidth, styles.cancel]}
        onPress={(e) => setModalVisible(true)}
      >
        <View style={{ flexDirection: "row" }}>
          <Text style={{ color: "white" }}> Unhide </Text>
          <MaterialCommunityIcons
            name="gesture-tap-button"
            size={24}
            color="white"
          />
        </View>
      </TouchableHighlight>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.titleText}>
              <Text style={styles.titleText}>Show hidden buttons?</Text>
            </Text>
            <Text style={styles.text}>
              {`You've hidden ${numberOfHiddenButtons} buttons. Want to show them?.`}
            </Text>
            <View style={styles.buttonView}>
              <TouchableHighlight
                style={[
                  styles.button,
                  styles.rowWidth,
                  numberOfHiddenButtons === 0
                    ? styles.disabledButton
                    : styles.primary,
                ]}
                onPress={(e) => unhideButtons()}
                disabled={numberOfHiddenButtons === 0}
              >
                <Text style={[styles.text]}>
                  {`Show ${numberOfHiddenButtons} buttons`}.
                </Text>
              </TouchableHighlight>
              <TouchableHighlight
                style={[styles.button, styles.rowWidth, styles.cancel]}
                onPress={(e) => setModalVisible(false)}
              >
                <Text style={[styles.text]}>Nevermind</Text>
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
  fullWidth: {
    width: "80%",
  },
  rowWidth: {
    width: "40%",
  },
  button: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    marginVertical: 5,
    alignSelf: "center",
  },
  cancel: {
    backgroundColor: "grey",
  },
  primary: {
    backgroundColor: "blue",
  },
  disabledButton: {
    backgroundColor: "darkgrey",
  },
  danger: {
    backgroundColor: "red",
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
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  list: {
    height: 400,
    marginBottom: 10,
  },
  message: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "grey",
    color: "white",
    fontSize: 12,
  },
});
