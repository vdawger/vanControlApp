import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useNavigation } from "expo-router";
import { TouchableOpacity } from "react-native";

export default function RootLayout() {
  const navigation = useNavigation();
  return (
    <Stack
      screenOptions={{
        headerTitle: "Van Switches",
      }}
    >
      <Stack.Screen
        name="index"
        options={({ navigation }) => ({
          headerRight: () => (
            <TouchableOpacity
              onPress={(e) => {
                console.error("Navigate to settings", e);
                // navigation.navigate("settings");
              }}
            >
              <Ionicons name="settings-outline" size={24} color="black" />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}
