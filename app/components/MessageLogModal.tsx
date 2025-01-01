import FontAwesome from "@expo/vector-icons/FontAwesome";
import { FC, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from "react-native";
import { Message } from "../hooks/useMessages";
import ProgressBar from "./ProgressBar";

interface MessageLogModalProps {
  messages: Message[];
  scanProgress: number;
}

export const MessageLogModal: FC<MessageLogModalProps> = ({
  messages,
  scanProgress,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View>
      <TouchableHighlight
        style={[styles.button, styles.primary]}
        onPress={(e) => setModalVisible(true)}
      >
        <View style={{ flexDirection: "row" }}>
          <Text style={{ color: "white" }}>{messages.length}</Text>
          <Text style={{ color: "white" }}> messages </Text>
          <FontAwesome name="stack-overflow" size={24} color="white" />
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
            <Text style={styles.titleText}>Network Scanned</Text>
            <ProgressBar progress={scanProgress} />
            <Text style={styles.titleText}>Message Log</Text>
            <FlatList
              data={messages}
              renderItem={({ item }) => (
                <View style={styles.message}>
                  <Text
                    style={styles.text}
                  >{`${item.time}: ${item.text}`}</Text>
                </View>
              )}
              keyExtractor={(item) => item.id}
              inverted // Inverts the list so new messages appear at the top
              style={styles.list}
            />
            <View style={styles.buttonView}>
              <TouchableHighlight
                style={[styles.button, styles.cancel]}
                onPress={(e) => setModalVisible(false)}
              >
                <Text style={[styles.text]}>Done</Text>
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

export type { Message };
