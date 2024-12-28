import { useNavigation } from "expo-router";
import { Text, View } from "react-native";

export default function SettingsScreen() {
  const navigation = useNavigation();
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Settings Screen</Text>
      {/* Add your settings components here */}
    </View>
  );
}
