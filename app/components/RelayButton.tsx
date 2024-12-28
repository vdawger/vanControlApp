import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { UpdateButtonsWithStatuses } from "..";

function idToReadable(str: string): string {
  str = str.replace(/_/g, " "); // Replace underscores with spaces
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(); // Convert to sentence case
}
interface RelayButtonProps {
  id: string;
  turnedOn: boolean;
  toggleIpAddress: string;
  uuid: string;
  updateButtonsWithStatuses?: ({
    toggleIpAddress,
    newRelayStatuses,
  }: UpdateButtonsWithStatuses) => void;
  toggleRelay?: () => void;
  addMessage?: (message: string) => void;
  unHide?: boolean;
}

const RelayButton: React.FC<RelayButtonProps> = ({
  id,
  turnedOn,
  toggleIpAddress,
  uuid,
  updateButtonsWithStatuses,
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
    <TouchableOpacity
      style={[styles.button, styleIfOn, styles.expand]}
      onPress={toggleRelay}
    >
      <Text style={[styles.buttonText]}>{buttonText}</Text>
      <Text style={[styles.small]}>{uuid}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
  small: {
    fontSize: 10,
    color: "#fff",
  },
});

export type { RelayButtonProps };
export default RelayButton;
