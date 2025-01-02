import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

function idToReadable(str: string): string {
  str = str.replace(/_/g, " "); // Replace underscores with spaces
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(); // Convert to sentence case
}
interface RelayButtonProps {
  id: string;
  turnedOn: boolean;
  toggleIpAddress: string;
  uuid: string;
  reversed: boolean;
  hidden?: boolean;
}

const RelayButton: React.FC<RelayButtonProps> = ({
  id,
  turnedOn,
  toggleIpAddress,
  reversed,
}) => {
  const reversableTurnedOn = reversed ? !turnedOn : turnedOn;
  const styleIfOn = reversableTurnedOn ? styles.relayOff : styles.relayOn;

  const [toggling, setToggling] = React.useState(false);
  const [statusStyle, setStatusStyle] = React.useState(styleIfOn);

  useEffect(() => {
    setStatusStyle((p) => {
      return reversableTurnedOn ? styles.relayOff : styles.relayOn;
    });
    setToggling((p) => false);
  }, [turnedOn, reversed]);

  const buttonText = idToReadable(id); // Convert ID to readable text

  const sendToggleCommand = async () => {
    if (toggling) {
      return;
    }
    setToggling((p) => true);
    setStatusStyle((p) => styles.disabledButton);

    const url = `http://${toggleIpAddress}/toggleRelay?${encodeURIComponent(
      id
    )}=toggle`;
    fetch(url);
  };

  return (
    <TouchableOpacity
      style={[styles.button, statusStyle, styles.expand]}
      onPress={sendToggleCommand}
      disabled={toggling}
    >
      <Text style={[styles.buttonText]}>
        {toggling && "Toggling: "} {buttonText}
      </Text>
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
  disabledButton: {
    backgroundColor: "darkgrey",
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
