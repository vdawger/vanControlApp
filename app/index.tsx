import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import DraggableFlatList, {
  DragEndParams,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ButtonSettingsModal } from "./components/ButtonSettingsModal";
import { DragIcon } from "./components/DragIcon";
import { Message, MessageLogModal } from "./components/MessageLogModal";
import ProgressBar from "./components/ProgressBar";
import RelayButton, {
  idToReadable,
  RelayButtonProps,
} from "./components/RelayButton";
import { ResetModal } from "./components/ResetModal";

type UpdateButtonsWithStatusesProps = {
  toggleIpAddress: string;
  newRelayStatuses: { [s: string]: number };
};

export default function Index() {
  const [activeIps, setActiveIps] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [buttons, setButtons] = useState<RelayButtonProps[]>([]);

  const [messages, setMessages] = useState<Message[]>([]);
  const addMessage = (text: string) => {
    console.log(text, messages);
    setMessages((prevMessages) => {
      const newMessage = {
        id: Date.now().toString(), // Simple unique ID
        text,
      };

      // Prepend new message and keep only the latest 10 messages
      return [newMessage, ...prevMessages].slice(0, 10);
    });
  };

  const updateButtonsWithStatuses = ({
    toggleIpAddress,
    newRelayStatuses,
  }: UpdateButtonsWithStatusesProps) => {
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
            reversed: false,
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

  const clearLocalStorage = async () => {
    try {
      await AsyncStorage.clear();
      addMessage("Local storage cleared successfully");
    } catch (error) {
      addMessage(`Error clearing local storage: ${error}`);
    }
  };

  const handleReset = async () => {
    clearLocalStorage();
    setActiveIps([]);
    setButtons([]);
    setScanProgress(0);
    setScanning(false);
  };

  const firstIP = 12;
  const lastIP = 24;

  const scanSubnet = async () => {
    const subnet = "192.168.10.";
    const newActiveIps: string[] = [];
    const failedIps = [];

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
          addMessage(`IP ${ip} is a board`);
        }
      } catch (error) {
        failedIps.push(ip);
      }

      if (failedIps.length % 5 === 0 || i === lastIP) {
        addMessage(`No response from ${failedIps.join(", ")}`);
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

  const handleReverseToggle = (uuid: string) => {
    setButtons((prevButtons) => {
      return prevButtons.map((button) => {
        if (button.uuid !== uuid) return button;
        return { ...button, reversed: !button.reversed };
      });
    });
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
          handleReverseToggle={handleReverseToggle}
          modalTitle={idToReadable(item.id)}
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
      <View
        style={{ height: "100%", paddingBottom: 100, backgroundColor: "black" }}
      >
        {scanProgress < 100 && <ProgressBar progress={scanProgress} />}
        <DraggableFlatList
          data={buttons}
          renderItem={renderButton}
          onDragEnd={onDragEnd}
          scrollEnabled={true}
          keyExtractor={(item) => item.uuid}
        />
        <MessageLogModal messages={messages} scanProgress={scanProgress} />
        <ResetModal handleReset={handleReset} />
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

export type { UpdateButtonsWithStatusesProps };
