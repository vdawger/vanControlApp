import React, { useEffect } from "react";
import { Text, TouchableOpacity } from "react-native";
import { buttonStyles } from "../componentStyles/buttonStyles";

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
  const styleIfOn = reversableTurnedOn
    ? buttonStyles.relayOn
    : buttonStyles.relayOff;

  const [toggling, setToggling] = React.useState(false);
  const [statusStyle, setStatusStyle] = React.useState(styleIfOn);

  useEffect(() => {
    setStatusStyle((p) => {
      return reversableTurnedOn ? buttonStyles.relayOn : buttonStyles.relayOff;
    });
    setToggling((p) => false);
  }, [turnedOn, reversed]);

  const buttonText = idToReadable(id); // Convert ID to readable text

  const sendToggleCommand = async () => {
    if (toggling) {
      return;
    }
    setToggling((p) => true);
    setStatusStyle((p) => buttonStyles.disabledButton);

    const url = `http://${toggleIpAddress}/toggleRelay?${encodeURIComponent(
      id
    )}=toggle`;
    fetch(url);
  };

  return (
    <TouchableOpacity
      style={[buttonStyles.modalButton, statusStyle, buttonStyles.expand]}
      onPress={sendToggleCommand}
      disabled={toggling}
    >
      <Text style={[buttonStyles.text]}>
        {toggling && "Toggling: "} {buttonText}
      </Text>
    </TouchableOpacity>
  );
};

export { idToReadable };
export type { RelayButtonProps };
export default RelayButton;
