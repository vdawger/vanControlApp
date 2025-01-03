import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import DraggableFlatList, {
  DragEndParams,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ButtonSettingsModal } from "./components/ButtonSettingsModal";
import { DragIcon } from "./components/DragIcon";
import { MessageLogModal } from "./components/MessageLogModal";
import ProgressBar from "./components/ProgressBar";
import RelayButton, {
  idToReadable,
  RelayButtonProps,
} from "./components/RelayButton";
import { ResetModal } from "./components/ResetModal";
import { UnhideButtonsModal } from "./components/UnhideButtonsModal";
import WifiStatus from "./components/WifiStatus";
import {
  clearLocalStorage,
  saveBoardIps,
  saveButtonState,
  useLoadSavedData,
} from "./hooks/useLoadSavedData";
import { useMessages } from "./hooks/useMessages";

type UpdateButtonsWithStatusesProps = {
  boardIp: string;
  relaysRaw: { [s: string]: number };
};

export default function Index() {
  const [boardIps, setBoardIps] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [buttons, setButtons] = useState<RelayButtonProps[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const { messages, addMessage, clearMessages } = useMessages();

  const updateButtonsWithStatus = ({
    boardIp: toggleIpAddress,
    relaysRaw: newRelayStatuses,
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
      return newButtons;
    });
  };

  const FIRST_IP = 12;
  const LAST_IP = 24;

  const scanSubnet = async () => {
    const subnet = "192.168.10.";
    const failedIps = [];
    const ipsToScan = [
      FIRST_IP - 1,
      FIRST_IP,
      FIRST_IP + 1,
      LAST_IP - 1,
      LAST_IP,
      LAST_IP + 1,
    ];
    addMessage(`Scanning ${ipsToScan.length} IPs on subnet ${subnet}XXX`);
    setScanning((p) => true);
    setScanProgress((p) => 0);

    for (let i of ipsToScan) {
      const ip = `${subnet}${i}`;
      const url = `http://${ip}/status`;

      try {
        const response = await fetch(url);
        if (response.status === 200) {
          addMessage(`Scan found ${ip} is a board`);
          const relaysRaw = await response.json();
          updateButtonsWithStatus({
            boardIp: ip,
            relaysRaw: relaysRaw,
          });
          setBoardIps((prev) => {
            const newIps = [...prev, ip];
            saveBoardIps(newIps, addMessage);
            return newIps;
          });
        }
      } catch (error) {
        failedIps.push(ip);
      }

      // Update every 5 IPs or at the end
      if (failedIps.length % 5 === 0 || i === LAST_IP) {
        addMessage(`No response from ${failedIps.join(", ")}`);
        setScanProgress((prev) => {
          const newProgress = Math.round(
            ((i - FIRST_IP) / ipsToScan.length) * 100
          );
          return newProgress;
        });
      }
    }

    setScanning((p) => false);
    setScanProgress((p) => 100);
  };

  const handleReset = async () => {
    addMessage("Resetting storage, ips, and buttons");
    clearLocalStorage(addMessage);
    setBoardIps([]);
    setButtons([]);
    addMessage("Reset complete. Scanning again.");
    scanSubnet();
  };

  const forgetBoards = async () => {
    addMessage("Forgetting boards and rescanning");
    saveBoardIps([], addMessage);
    setBoardIps([]);
    scanSubnet();
  };

  useLoadSavedData({
    addMessage,
    boardIps,
    setBoardIps,
    buttons,
    setButtons,
    scanning,
    scanProgress,
    scan: scanSubnet,
    dataLoaded,
    setDataLoaded,
  });

  const getStatusUpdates = async () => {
    if (boardIps.length === 0) return;
    addMessage("Checking statuses for: " + boardIps.join(", "));
    for (const ip of boardIps) {
      const url = `http://${ip}/status`;

      try {
        const response = await fetch(url);
        if (response.status === 200) {
          const relaysRaw = await response.json();
          updateButtonsWithStatus({
            boardIp: ip,
            relaysRaw: relaysRaw,
          });
        } else {
          addMessage(
            `${ip} fetch error: ${JSON.stringify(response).slice(0, 100)}`
          );
        }
      } catch (error) {
        addMessage(`Error scanning ${ip}. Error: ${error}`);
      }
    }
  };

  // Load data from storage
  useEffect(() => {
    const intervalId = setInterval(getStatusUpdates, 1000);

    // Clean up the interval on component unmount
    return () => clearInterval(intervalId);
  }, [boardIps, buttons, scanning]);

  const onDragEnd = ({ data }: DragEndParams<RelayButtonProps>) => {
    setButtons(data);
  };

  const renderButtonRow = ({
    item,
    drag,
  }: RenderItemParams<RelayButtonProps>) => {
    if (item.hidden) return null;
    return (
      <View style={styles.buttonRow}>
        <DragIcon drag={drag} />
        <ButtonSettingsModal
          button={item}
          setButtons={setButtons}
          saveButtonState={saveButtonState}
          modalTitle={idToReadable(item.id)}
          addMessage={addMessage}
        />
        <RelayButton {...item} boardIps={boardIps} />
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View
        style={{
          height: "100%",
          paddingBottom: scanProgress ? 160 : 140,
          backgroundColor: "black",
        }}
      >
        {scanProgress < 100 ? <ProgressBar progress={scanProgress} /> : null}

        <DraggableFlatList
          data={buttons}
          renderItem={renderButtonRow}
          onDragEnd={onDragEnd}
          scrollEnabled={true}
          keyExtractor={(item) => item.uuid}
        />

        <View style={styles.buttonRow}>
          <WifiStatus addMessage={addMessage} />
          <MessageLogModal
            messages={messages}
            scanProgress={scanProgress}
            clearMessages={clearMessages}
          />
        </View>

        <View style={styles.buttonRow}>
          <ResetModal handleReset={handleReset} forgetBoards={forgetBoards} />
          <UnhideButtonsModal
            buttons={buttons}
            setButtons={setButtons}
            addMessage={addMessage}
          />
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  expand: {
    flex: 1,
  },
});

export type { UpdateButtonsWithStatusesProps };
