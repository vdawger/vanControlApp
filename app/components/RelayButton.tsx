import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

function idToReadable(str: string): string {
  str = str.replace(/_/g, " "); // Replace underscores with spaces
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(); // Convert to sentence case
}
interface RelayButtonProps {
  id: string;
  turnedOn: boolean;
  toggleIpAddress: string;
  setToToggle: Dispatch<SetStateAction<[string, string][]>>;
  unHide?: boolean;
}

const RelayButton: React.FC<RelayButtonProps> = ({
  id,
  turnedOn,
  toggleIpAddress,
  setToToggle,
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

  const toggleRelay = () => {
    setToToggle((prev) => [...prev, [id, toggleIpAddress]]);
  };

  if (hidden) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styleIfOn]}
        onPress={toggleRelay}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText]}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
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
