import AntDesign from "@expo/vector-icons/AntDesign";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { UpdateButtonsWithStatuses } from "..";

function idToReadable(str: string): string {
  str = str.replace(/_/g, " "); // Replace underscores with spaces
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(); // Convert to sentence case
}
interface RelayButtonProps {
  id: string;
  turnedOn: boolean;
  toggleIpAddress: string;
  updateButtonsWithStatuses?: ({
    toggleIpAddress,
    newRelayStatuses,
  }: UpdateButtonsWithStatuses) => void;
  moveUp?: () => void;
  moveDown?: () => void;
  toggleRelay?: () => void;
  addMessage?: (message: string) => void;
  unHide?: boolean;
}

const RelayButton: React.FC<RelayButtonProps> = ({
  id,
  turnedOn,
  toggleIpAddress,
  updateButtonsWithStatuses,
  moveUp,
  moveDown,
  addMessage,
  unHide,
}) => {
  const styleIfOn = turnedOn ? styles.relayOff : styles.relayOn;
  const buttonText = idToReadable(id); // Convert ID to readable text
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (unHide) {
      setHidden(false);
    }
  });

  const toggleRelay = async () => {
    const url = `http://${toggleIpAddress.replace(
      /\/$/,
      ""
    )}/toggleRelay?${encodeURIComponent(id)}=toggle`;
    try {
      const response = await fetch(url, {
        method: "GET",
      });
      if (response.status === 200) {
        const relaysRaw = await response.json();
        if (updateButtonsWithStatuses) {
          updateButtonsWithStatuses({
            toggleIpAddress,
            newRelayStatuses: relaysRaw,
          });
        }
      }
    } catch (error) {
      if (addMessage) {
        addMessage(`Error toggling ${id}. Error: ${error}`);
      }
    }
  };

  if (hidden) return null;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.button, styles.iconButton]}
          onPress={moveUp}
          disabled={!moveUp}
        >
          <AntDesign
            name="arrowup"
            size={24}
            color={!moveUp ? "black" : "white"}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.iconButton]}
          onPress={moveDown}
          disabled={!moveDown}
        >
          <AntDesign
            name="arrowdown"
            size={24}
            color={!moveDown ? "black" : "white"}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styleIfOn, styles.expand]}
          onPress={toggleRelay}
        >
          <Text style={[styles.buttonText]}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  expand: {
    flex: 1,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  iconButton: {
    backgroundColor: "black",
  },
  hideButton: {
    backgroundColor: "grey",
  },
  relayOn: {
    backgroundColor: "grey",
  },
  relayOff: {
    backgroundColor: "green",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
});

export type { RelayButtonProps };
export default RelayButton;
