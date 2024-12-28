import Ionicons from "@expo/vector-icons/Ionicons";
import { FC, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from "react-native";

interface ButtonSettingsModalProps {
  uuid: string;
  handleHide: (uuid: string) => void;
  handleReverseToggle: (uuid: string) => void;
  modalTitle: string;
}

export const ButtonSettingsModal: FC<ButtonSettingsModalProps> = ({
  uuid,
  handleHide,
  handleReverseToggle,
  modalTitle,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

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
                  handleReverseToggle(uuid);
                  setModalVisible(false);
                }}
              >
                <Text style={[styles.text]}>Reverse On/Off</Text>
              </TouchableHighlight>
            </View>

            <View style={styles.buttonView}>
              <TouchableHighlight
                style={[styles.button, styles.danger]}
                onPress={(e) => handleHide(uuid)}
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
