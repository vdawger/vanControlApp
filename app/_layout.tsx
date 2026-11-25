import { ErrorBoundaryProps, Stack } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { color, space, type } from "@/lib/theme";
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
          <Stack.Screen name="power" options={{ title: "Power" }} />
        </Stack>
      </VanProvider>
    </GestureHandlerRootView>
  );
}

/** Shown instead of a blank screen if something fails while drawing. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, backgroundColor: color.bg, padding: space.lg, paddingTop: 80, gap: space.md }}>
      <StatusBar style="light" />
      <Text style={type.title}>Something went wrong</Text>
      <Text style={type.dim}>{error.message}</Text>
      <Pressable
        onPress={retry}
        accessibilityRole="button"
        style={{ alignSelf: "flex-start", paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: 12, backgroundColor: color.on }}
      >
        <Text style={{ color: color.onText, fontWeight: "700" }}>Try again</Text>
      </Pressable>
    </View>
  );
}
