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
  forgetBoards: () => void;
}

export const ResetModal: FC<ResetModal> = ({ handleReset, forgetBoards }) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={{ alignItems: "center", flex: 0.5 }}>
      <TouchableOpacity
        style={[
          buttonStyles.button,
          buttonStyles.cancel,
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
        <View style={buttonStyles.modalAtBottomOfScreen}>
          <View style={buttonStyles.modalView}>
            <Text style={buttonStyles.titleText}>Reset Menu</Text>

            <View style={buttonStyles.buttonRow}>
              <TouchableHighlight
                style={[
                  buttonStyles.button,
                  buttonStyles.fullWidth,
                  buttonStyles.primary,
                ]}
                onPress={(e) => {
                  forgetBoards();
                  setModalVisible(false);
                }}
              >
                <Text style={[buttonStyles.text]}>Forget Boards</Text>
              </TouchableHighlight>
            </View>
            <Text style={[buttonStyles.text, buttonStyles.spaceAfter]}>
              This will forget boards that are out of range. Boards in range stay.
            </Text>

            <View style={buttonStyles.buttonRow}>
              <TouchableHighlight
                style={[
                  buttonStyles.button,
                  buttonStyles.fullWidth,
                  buttonStyles.danger,
                ]}
                onPress={(e) => {
                  handleReset();
                  setModalVisible(false);
                }}
              >
                <Text style={[buttonStyles.text]}>Reset Settings</Text>
              </TouchableHighlight>
            </View>
            <Text style={[buttonStyles.text, buttonStyles.spaceAfter]}>
              This will forget the passcode, button order, hidden buttons and
              known boards on this phone. Boards keep their passcode.
            </Text>

            <View style={buttonStyles.buttonRow}>
              <TouchableHighlight
                style={[
                  buttonStyles.button,
                  buttonStyles.fullWidth,
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
