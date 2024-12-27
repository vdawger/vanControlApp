import React, { useRef, useState } from "react";
import {
  Animated,
  FlatList,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Message {
  id: string;
  text: string;
}

interface MessageLogProps {
  messages: Message[];
}

const MessageLog: React.FC<MessageLogProps> = ({ messages }) => {
  const [isHidden, setIsHidden] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 0; // Only respond to downward swipes
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          // Only move down if swiping down
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          // If swiped down more than 100 units, hide
          Animated.timing(translateY, {
            toValue: 300, // Adjust this value based on how much you want to hide
            duration: 300,
            useNativeDriver: true,
          }).start(() => setIsHidden(true));
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const showMessages = () => {
    setIsHidden(false);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.container, { transform: [{ translateY }] }]}
    >
      {!isHidden && (
        <TouchableOpacity
          onPress={() => setIsHidden(true)}
          style={styles.hideButton}
        >
          <Text>Hide</Text>
        </TouchableOpacity>
      )}
      {isHidden && (
        <TouchableOpacity
          onPress={showMessages}
          style={[
            styles.hideButton,
            { position: "absolute", top: 0, left: 0, zIndex: 1 },
          ]}
        >
          <Text>Show</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <View style={styles.message}>
            <Text>{item.text}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
        inverted
        style={styles.list}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
    marginBottom: 10,
    backgroundColor: "grey",
  },
  message: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    color: "white",
    fontSize: 12,
  },
  hideButton: {
    padding: 10,
    backgroundColor: "#333",
    alignItems: "center",
  },
});

export type { Message };
export default MessageLog;
