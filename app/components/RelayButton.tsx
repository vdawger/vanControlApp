import React from "react";
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
  hidden?: boolean;
}

const RelayButton: React.FC<RelayButtonProps> = ({
  id,
  turnedOn,
  toggleIpAddress,
  updateButtonsWithStatuses,
  addMessage,
}) => {
  const styleIfOn = turnedOn ? styles.relayOff : styles.relayOn;
  const buttonText = idToReadable(id); // Convert ID to readable text

  const toggleRelay = async () => {
    const url = `http://${toggleIpAddress}/toggleRelay?${encodeURIComponent(
      id
    )}=toggle`;
    fetch(url).then((response) => {
      response
        .json()
        .then((relaysRaw) => {
          if (updateButtonsWithStatuses) {
            updateButtonsWithStatuses({
              toggleIpAddress,
              newRelayStatuses: relaysRaw,
            });
          }

          if (addMessage) {
            addMessage(`Toggled ${id}, got updates.`);
          }
        })
        .catch((error) => {
          if (addMessage) {
            addMessage(`Error toggling ${id}. Error: ${error}`);
          }
        });
    });
  };

  return (
    <TouchableOpacity
      style={[styles.button, styleIfOn, styles.expand]}
      onPress={toggleRelay}
    >
      <Text style={[styles.buttonText]}>{buttonText}</Text>
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
});

export { idToReadable };
export type { RelayButtonProps };
export default RelayButton;
