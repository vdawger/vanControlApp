import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { color } from "@/lib/theme";
import { VanProvider } from "@/lib/VanContext";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.bg }}>
      <VanProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: color.bg },
            headerTintColor: color.text,
            headerTitleStyle: { fontWeight: "700" },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: color.bg },
          }}
        >
          {/* Home draws its own header: header buttons do not receive taps on Android with the new architecture. */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="settings/index"
            options={{ title: "Boards & setup" }}
          />
        </Stack>
      </VanProvider>
    </GestureHandlerRootView>
  );
}
