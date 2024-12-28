import { Stack, useNavigation } from "expo-router";

export default function RootLayout() {
  const navigation = useNavigation();
  return (
    <Stack
      screenOptions={{
        headerTitle: "Van Switches",
        headerStyle: {
          backgroundColor: "black",
        },
        headerTintColor: "white",
      }}
    >
      <Stack.Screen name="index" options={({ navigation }) => ({})} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}
