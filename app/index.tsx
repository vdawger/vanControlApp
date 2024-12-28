import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MessageLog, { Message } from "./components/MessageLog";
import ProgressBar from "./components/ProgressBar";
import RelayButton, { RelayButtonProps } from "./components/RelayButton";

type UpdateButtonsWithStatuses = {
  toggleIpAddress: string;
  newRelayStatuses: { [s: string]: number };
};

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

  const updateButtonsWithStatuses = ({
    toggleIpAddress,
    newRelayStatuses,
  }: UpdateButtonsWithStatuses) => {
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
            toggleIpAddress,
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

  const firstIP = 12;
  const lastIP = 24;

  const scanSubnet = async () => {
    const subnet = "192.168.10.";
    const newActiveIps: string[] = [];

    for (let i = firstIP; i <= lastIP; i++) {
      const ip = `${subnet}${i}`;
      const url = `http://${ip}/status`;

      try {
        const response = await fetch(url, {
          method: "GET",
        });
        if (response.status === 200) {
          newActiveIps.push(ip);
          const relaysRaw = await response.json();
          updateButtonsWithStatuses({
            toggleIpAddress: ip,
            newRelayStatuses: relaysRaw,
          });
          addMessage(`IP ${ip} responded with 200`);
        }
      } catch (error) {
        console.error(`Error scanning ${ip}. Error: ${error}`);
      }

      // Update every 5 IPs or at the end
      setScanProgress((prev) => {
        // Convert i to a percentage of total IPs (255)
        const newProgress = Math.round(
          ((i - firstIP) / (lastIP - firstIP)) * 100
        );
        return newProgress;
      });
    }

    setActiveIps(newActiveIps);
    await storeLocal("activeIps", JSON.stringify(newActiveIps));
    setScanning(false);
    setScanProgress(100);
    await storeLocal("ipsScanned", "255");
  };

  const getStatusUpdates = async () => {
    for (const ip of activeIps) {
      const url = `http://${ip}/status`;

      try {
        const response = await fetch(url, {
          method: "GET",
        });
        if (response.status === 200) {
          const relaysRaw = await response.json();
          updateButtonsWithStatuses({
            toggleIpAddress: ip,
            newRelayStatuses: relaysRaw,
          });
        }
      } catch (error) {
        console.error(`Error scanning ${ip}. Error: ${error}`);
      }
    }
  };

  useEffect(() => {
    if (activeIps.length === 0) {
      getLocal("activeIps").then((value) => {
        if (value) {
          setActiveIps(JSON.parse(value));
          setScanProgress(100);
          addMessage(`Remembered active IPs: ${value}`);
        } else {
          if (!scanProgress && !scanning) {
            setScanning(true);
            scanSubnet();
          }
        }
      });
    }

    const intervalId = setInterval(getStatusUpdates, 1000);

    // Clean up the interval on component unmount
    return () => clearInterval(intervalId);
  }, [activeIps, buttons, scanning]);

  const moveButtonUp = (id: string) => {
    setButtons((currentButtons) => {
      const index = currentButtons.findIndex((button) => button.id === id);
      if (index > 0) {
        const newButtons = [...currentButtons];
        const [removed] = newButtons.splice(index, 1);
        newButtons.splice(index - 1, 0, removed);
        return newButtons;
      }
      return currentButtons;
    });
  };

  const moveButtonDown = (id: string) => {
    setButtons((currentButtons) => {
      const index = currentButtons.findIndex((button) => button.id === id);
      if (index < currentButtons.length - 1) {
        const newButtons = [...currentButtons];
        const [removed] = newButtons.splice(index, 1);
        newButtons.splice(index + 1, 0, removed);
        return newButtons;
      }
      return currentButtons;
    });
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 0.75 }}>
          <ProgressBar progress={scanProgress} />
          <FlatList
            data={buttons}
            renderItem={({ item, index }) => (
              <RelayButton
                {...item}
                updateButtonsWithStatuses={updateButtonsWithStatuses}
                moveUp={index > 0 ? () => moveButtonUp(item.id) : undefined}
                moveDown={
                  index < buttons.length - 1
                    ? () => moveButtonDown(item.id)
                    : undefined
                }
                addMessage={addMessage}
              />
            )}
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

export type { UpdateButtonsWithStatuses };
