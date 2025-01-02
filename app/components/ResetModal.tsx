import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { FC, useState } from "react";
import {
  Modal,
  Text,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from "react-native";
import { buttonStyles } from "../componentStyles/buttonStyles";

interface ResetModal {
  handleReset: () => void;
}

export const ResetModal: FC<ResetModal> = ({ handleReset: handleReset }) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={{ alignItems: "center", flex: 0.5 }}>
      <TouchableOpacity
        style={[
          buttonStyles.modalButton,
          buttonStyles.danger,
          buttonStyles.fullWidth,
        ]}
        onPress={(e) => setModalVisible(true)}
      >
        <View style={{ flexDirection: "row" }}>
          <Text style={{ color: "white" }}>Reset </Text>
          <MaterialIcons name="lock-reset" size={24} color="white" />
        </View>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={buttonStyles.centeredView}>
          <View style={buttonStyles.modalView}>
            <Text style={buttonStyles.titleText}>Reset Hidden Buttons?</Text>

            <Text style={buttonStyles.text}>
              This will reset all hidden buttons to be visible and require a
              network rescan.
            </Text>

            <View style={buttonStyles.buttonRow}>
              <TouchableHighlight
                style={[
                  buttonStyles.modalButton,
                  buttonStyles.rowWidth,
                  buttonStyles.danger,
                ]}
                onPress={(e) => {
                  handleReset();
                  setModalVisible(false);
                }}
              >
                <Text style={[buttonStyles.text]}>Reset</Text>
              </TouchableHighlight>

              <TouchableHighlight
                style={[
                  buttonStyles.modalButton,
                  buttonStyles.rowWidth,
                  buttonStyles.cancel,
                ]}
                onPress={(e) => setModalVisible(false)}
              >
                <Text style={[buttonStyles.text]}>Cancel</Text>
              </TouchableHighlight>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
