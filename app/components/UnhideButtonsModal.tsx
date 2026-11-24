import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { FC, useState } from "react";
import {
  Modal,
  Text,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from "react-native";
import { buttonStyles } from "../componentStyles/buttonStyles";

interface UnhideButtonsModalProps {
  numberOfHiddenButtons: number;
  unhideButtons: () => void;
}

export const UnhideButtonsModal: FC<UnhideButtonsModalProps> = ({
  numberOfHiddenButtons,
  unhideButtons,
}) => {
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
          <Text style={{ color: "white" }}>Unhide </Text>
          <MaterialCommunityIcons
            name="gesture-tap-button"
            size={24}
            color="white"
          />
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
            <Text style={buttonStyles.titleText}>
              <Text style={buttonStyles.titleText}>Show hidden buttons?</Text>
            </Text>
            <Text style={buttonStyles.text}>
              {`You've hidden ${numberOfHiddenButtons} buttons. Want to show them?.`}
            </Text>
            <View style={buttonStyles.buttonRow}>
              <TouchableHighlight
                style={[
                  buttonStyles.button,
                  buttonStyles.twoButtonsInARow,
                  numberOfHiddenButtons === 0
                    ? buttonStyles.disabledButton
                    : buttonStyles.primary,
                ]}
                onPress={(e) => unhideButtons()}
                disabled={numberOfHiddenButtons === 0}
              >
                <Text style={[buttonStyles.text]}>
                  {`Show ${numberOfHiddenButtons} buttons`}.
                </Text>
              </TouchableHighlight>
              <TouchableHighlight
                style={[
                  buttonStyles.button,
                  buttonStyles.twoButtonsInARow,
                  buttonStyles.cancel,
                ]}
                onPress={(e) => setModalVisible(false)}
              >
                <Text style={[buttonStyles.text]}>Nevermind</Text>
              </TouchableHighlight>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
