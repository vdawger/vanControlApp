import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import DraggableFlatList, {
  DragEndParams,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ButtonSettingsModal } from "./components/ButtonSettingsModal";
import { DragIcon } from "./components/DragIcon";
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
  const [buttons, setButtons] = useState<RelayButtonProps[]>([]);

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

  const updateButtonsWithStatuses = ({
    toggleIpAddress,
    newRelayStatuses,
  }: UpdateButtonsWithStatuses) => {
    setButtons((prevButtons) => {
      const newButtons: RelayButtonProps[] = [...prevButtons];

      Object.entries(newRelayStatuses).forEach(([relayId, value], index) => {
        const existingButton = newButtons.find(
          (button) => button.id === relayId
        );
        if (existingButton) {
          existingButton.turnedOn = !!value;
        } else {
          const uuid = toggleIpAddress + "-" + index.toString();
          newButtons.push({
            id: relayId,
            uuid,
            turnedOn: !!value,
            toggleIpAddress,
            hidden: false,
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

  // Load data from storage
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

  const onDragEnd = ({ data }: DragEndParams<RelayButtonProps>) => {
    setButtons(data);
  };

  const hideButtonRow = (uuid: string) => {
    setButtons((prevButtons) => {
      return prevButtons.map((button) => {
        if (button.uuid === uuid) {
          return { ...button, hidden: true };
        }
        return button;
      });
    });
  };

  const renderButton = ({ item, drag }: RenderItemParams<RelayButtonProps>) => {
    if (item.hidden) return null;
    return (
      <View style={styles.buttonRow}>
        <DragIcon drag={drag} />
        <ButtonSettingsModal
          uuid={item.uuid}
          handleHide={hideButtonRow}
          modalTitle={item.id}
        />
        <RelayButton
          {...item}
          addMessage={addMessage}
          updateButtonsWithStatuses={updateButtonsWithStatuses}
        />
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 0.75 }}>
          <ProgressBar progress={scanProgress} />
          <DraggableFlatList
            data={buttons}
            renderItem={renderButton}
            onDragEnd={onDragEnd}
            scrollEnabled={true}
            keyExtractor={(item) => item.uuid}
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
  buttonRow: {
    width: "100%",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  expand: {
    flex: 1,
  },
});

export type { UpdateButtonsWithStatuses };
