import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useState } from "react";
import { Text, TouchableOpacity } from "react-native";
import { buttonStyles } from "../componentStyles/buttonStyles";

function idToReadable(str: string): string {
  str = str.replace(/_/g, " "); // Replace underscores with spaces
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(); // Convert to sentence case
}

interface RelayButtonProps {
  label: string;
  turnedOn: boolean;
  reversed: boolean;
  /** Board out of range, or it does not accept this phone's passcode. */
  unavailable: boolean;
  onToggle: () => Promise<boolean>;
}

const RelayButton: React.FC<RelayButtonProps> = ({
  label,
  turnedOn,
  reversed,
  unavailable,
  onToggle,
}) => {
  const [toggling, setToggling] = useState(false);

  // The colour always comes from what the board last reported, never from a guess.
  const shownOn = reversed ? !turnedOn : turnedOn;
  const statusStyle =
    unavailable || toggling
      ? buttonStyles.disabledButton
      : shownOn
      ? buttonStyles.relayOn
      : buttonStyles.relayOff;

  const press = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      await onToggle();
    } finally {
      setToggling(false);
    }
  };

  return (
    <TouchableOpacity
      style={[buttonStyles.button, statusStyle, buttonStyles.expand]}
      onPress={press}
      disabled={toggling || unavailable}
    >
      <Text style={[buttonStyles.text]}>
        {`${idToReadable(label)} `}
        {unavailable && (
          <MaterialIcons name="bluetooth-disabled" size={12} color="white" />
        )}
      </Text>
    </TouchableOpacity>
  );
};

export { idToReadable };
export type { RelayButtonProps };
export default RelayButton;
