import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { TouchableHighlight } from "react-native";

export interface DragIconProps {
  drag: () => void;
}

export const DragIcon: React.FC<DragIconProps> = ({ drag }) => {
  return (
    <TouchableHighlight
      onLongPress={drag}
      style={{
        width: 50,
        alignContent: "center",
      }}
    >
      <MaterialCommunityIcons name="drag" size={40} color="black" />
    </TouchableHighlight>
  );
};
