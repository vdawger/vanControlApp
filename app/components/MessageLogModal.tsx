import FontAwesome from "@expo/vector-icons/FontAwesome";
import { FC, useState } from "react";
import { FlatList, Modal, Text, TouchableOpacity, View } from "react-native";
import { buttonStyles } from "../componentStyles/buttonStyles";
import { Message } from "../hooks/useMessages";
import ProgressBar from "./ProgressBar";

interface MessageLogModalProps {
  messages: Message[];
  scanProgress: number;
  clearMessages: () => void;
}

export const MessageLogModal: FC<MessageLogModalProps> = ({
  messages,
  scanProgress,
  clearMessages,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const clearLog = () => {
    clearMessages();
  };

  return (
    <View style={{ alignItems: "center", width: "50%" }}>
      <TouchableOpacity
        style={[
          buttonStyles.button,
          buttonStyles.primary,
          buttonStyles.fullWidth,
        ]}
        onPress={(e) => setModalVisible(true)}
      >
        <View style={{ flexDirection: "row" }}>
          <Text style={{ color: "white" }}>{messages.length}</Text>
          <Text style={{ color: "white" }}> messages </Text>
          <FontAwesome name="stack-overflow" size={24} color="white" />
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
            <Text style={buttonStyles.titleText}>Network Scanned</Text>
            <ProgressBar progress={scanProgress} />
            <Text style={buttonStyles.text}>
              {scanProgress === 100 ? "Scan complete" : "Scanning..."}
            </Text>
            <Text style={buttonStyles.titleText}>Message Log</Text>
            <FlatList
              data={messages}
              renderItem={({ item }) => (
                <View style={buttonStyles.message}>
                  <Text
                    style={buttonStyles.text}
                  >{`${item.time}: ${item.text}`}</Text>
                </View>
              )}
              keyExtractor={(item) => item.id}
              inverted // Inverts the list so new messages appear at the top
              style={buttonStyles.messageList}
            />
            <View style={buttonStyles.buttonRow}>
              <TouchableOpacity
                style={[
                  buttonStyles.button,
                  buttonStyles.twoButtonsInARow,
                  buttonStyles.danger,
                ]}
                onPress={(e) => clearLog()}
              >
                <Text style={[buttonStyles.text]}>Clear Messages</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  buttonStyles.button,
                  buttonStyles.twoButtonsInARow,
                  buttonStyles.cancel,
                ]}
                onPress={(e) => setModalVisible(false)}
              >
                <Text style={[buttonStyles.text]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export type { Message };
