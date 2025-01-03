import MaterialIcons from "@expo/vector-icons/MaterialIcons";
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
  boardIps?: string[];
  hidden?: boolean;
}

const RelayButton: React.FC<RelayButtonProps> = ({
  id,
  turnedOn,
  toggleIpAddress,
  reversed,
  boardIps,
}) => {
  const reversableTurnedOn = reversed ? !turnedOn : turnedOn;
  const styleIfOn = reversableTurnedOn
    ? buttonStyles.relayOn
    : buttonStyles.relayOff;

  const [toggling, setToggling] = React.useState(false);
  const [statusStyle, setStatusStyle] = React.useState(styleIfOn);

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
    fetch(url).then((response) => {
      // assume  it's changed until status udpate confirms it
      setToggling((p) => false);
      setStatusStyle((p) => {
        return reversableTurnedOn
          ? buttonStyles.relayOff
          : buttonStyles.relayOn;
      });
    });
  };

  const boardDisconnected =
    !boardIps || !boardIps.find((ip) => ip === toggleIpAddress);

  useEffect(() => {
    setToggling((p) => false);
    setStatusStyle((p) => {
      if (boardDisconnected) return buttonStyles.disabledButton;
      return reversableTurnedOn ? buttonStyles.relayOn : buttonStyles.relayOff;
    });
  }, [turnedOn, reversed, boardDisconnected]);

  return (
    <TouchableOpacity
      style={[buttonStyles.button, statusStyle, buttonStyles.expand]}
      onPress={sendToggleCommand}
      disabled={toggling || boardDisconnected}
    >
      <Text style={[buttonStyles.text]}>
        {toggling && "Toggling: "} {`${buttonText} `}
        {boardDisconnected && (
          <MaterialIcons name="signal-wifi-off" size={12} color="white" />
        )}
      </Text>
    </TouchableOpacity>
  );
};

export { idToReadable };
export type { RelayButtonProps };
export default RelayButton;
