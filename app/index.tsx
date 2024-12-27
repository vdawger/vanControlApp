import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MessageLog, { Message } from "./components/MessageLog";
import ProgressBar from "./components/ProgressBar";
import RelayButton, { RelayButtonProps } from "./components/RelayButton";

export default function Index() {
  const [activeIps, setActiveIps] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const [messages, setMessages] = useState<Message[]>([]);
  const addMessage = useCallback((text: string) => {
    setMessages((prevMessages) => {
      const newMessage = {
        id: Date.now().toString(), // Simple unique ID
        text,
      };

      // Prepend new message and keep only the latest 10 messages
      return [newMessage, ...prevMessages].slice(0, 10);
    });
  }, []);

  const [buttons, setButtons] = useState<RelayButtonProps[]>([]);

  const updateButtonsWithStatuses = (
    newRelayStatuses: { [s: string]: unknown } | ArrayLike<unknown>,
    relayIp: string
  ) => {
    setButtons((prevButtons) => {
      const newButtons: RelayButtonProps[] = [...prevButtons];

      Object.entries(newRelayStatuses).forEach(([relayId, value]) => {
        const existingButton = newButtons.find(
          (button) => button.id === relayId
        );
        if (existingButton) {
          existingButton.turnedOn = !!value;
        } else {
          newButtons.push({
            id: relayId,
            turnedOn: !!value,
            toggleAddress: relayIp,
            updateButtonsWithStatuses,
            addMessage,
          });
        }
      });
      storeLocal("buttons", JSON.stringify(newButtons));
      return newButtons;
    });
  };

  const storeLocal = async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      addMessage(`Error saving data ${error}`);
    }
  };

  const getLocal = async (key: string) => {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        return value;
      } else {
        return null;
      }
    } catch (error) {
      addMessage(`Error retrieving data ${error}`);
      return null;
    }
  };

  const scanSubnet = async () => {
    const subnet = "192.168.10.";
    const newActiveIps: string[] = [];

    for (let i = 1; i <= 255; i++) {
      const ip = `${subnet}${i}`;
      const url = `http://${ip}/status`;

      try {
        const response = await fetch(url, {
          method: "GET",
        });
        if (response.status === 200) {
          newActiveIps.push(ip);
          const relaysRaw = await response.json();
          updateButtonsWithStatuses(relaysRaw, ip);
          addMessage(`IP ${ip} responded with 200`);
        }
      } catch (error) {
        console.error(`Error scanning ${ip}. Error: ${error}`);
      }

      // Update every 5 IPs or at the end
      setScanProgress((prev) => {
        // Convert i to a percentage of total IPs (255)
        const newProgress = Math.round((i / 255) * 100);
        return newProgress;
      });
    }

    setActiveIps(newActiveIps);
    await storeLocal("activeIps", JSON.stringify(newActiveIps));
    setScanning(false);
    setScanProgress(100);
    await storeLocal("ipsScanned", "255");
  };

  useEffect(() => {
    if (activeIps.length === 0) {
      getLocal("activeIps").then((value) => {
        if (value) {
          setActiveIps(JSON.parse(value));
          addMessage(`Loaded active IPs: ${value}`);
        } else {
          if (!scanProgress && !scanning) {
            setScanning(true);
            scanSubnet();
          }
        }
      });
    }

    if (buttons.length === 0) {
      getLocal("buttons").then((value) => {
        if (value) {
          setButtons(JSON.parse(value));
        }
      });
    }
  }, [activeIps, buttons, scanning]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 0.75 }}>
          <ProgressBar progress={scanProgress} />
          <FlatList
            data={buttons}
            renderItem={({ item }) => <RelayButton {...item} />}
            keyExtractor={(item) => item.id.toString()}
          />
        </View>
        <View style={[styles.messages, { flex: 0.25 }]}>
          <MessageLog messages={messages} />
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  messages: {
    flex: 1,
    marginBottom: 10,
  },
});
