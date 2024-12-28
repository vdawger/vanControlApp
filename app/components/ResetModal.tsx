import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { FC, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from "react-native";

interface ResetModal {
  handleReset: () => void;
}

export const ResetModal: FC<ResetModal> = ({ handleReset: handleReset }) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View>
      <TouchableHighlight
        style={[styles.button, styles.danger]}
        onPress={(e) => setModalVisible(true)}
      >
        <View style={{ flexDirection: "row" }}>
          <Text style={{ color: "white" }}>Reset Hidden Buttons </Text>
          <MaterialIcons name="lock-reset" size={24} color="white" />
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
            <Text style={styles.titleText}>Reset Hidden Buttons?</Text>

            <Text style={styles.text}>
              This will reset all hidden buttons to be visible and require a
              network rescan.
            </Text>

            <View style={styles.buttonView}>
              <TouchableHighlight
                style={[styles.button, styles.danger]}
                onPress={(e) => {
                  handleReset();
                  setModalVisible(false);
                }}
              >
                <Text style={[styles.text]}>Reset</Text>
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
