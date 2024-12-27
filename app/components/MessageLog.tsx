import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

interface Message {
  id: string;
  text: string;
}

interface MessageLogProps {
  messages: Message[];
}

const MessageLog: React.FC<MessageLogProps> = ({ messages }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Message Log</Text>
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <View style={styles.message}>
            <Text>{item.text}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
        inverted // Inverts the list so new messages appear at the top
        style={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  list: {
    flex: 1,
    marginBottom: 10,
    backgroundColor: "grey",
  },
  title: {
    padding: 10,
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  message: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    color: "white",
    fontSize: 12,
  },
});

export type { Message };
export default MessageLog;
