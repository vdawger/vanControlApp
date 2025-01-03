import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { TouchableHighlight } from "react-native";
import { buttonStyles } from "../componentStyles/buttonStyles";

export interface DragIconProps {
  drag: () => void;
}

export const DragIcon: React.FC<DragIconProps> = ({ drag }) => {
  return (
    <TouchableHighlight onLongPress={drag} style={[buttonStyles.relayIcon]}>
      <MaterialCommunityIcons name="drag" size={50} color="white" />
    </TouchableHighlight>
  );
};
