import React, { useEffect, useState } from "react";
import { LogBox, StyleSheet, View } from "react-native";
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

LogBox.ignoreLogs([
  "[Reanimated] Tried to modify key", // Suppress specific Reanimated warning
]);

type UpdateButtonsWithStatusesProps = {
  boardIp: string;
  relaysRaw: { [s: string]: number };
};

type LastSuccessfulStatusCheckProps = {
  [ip: string]: number;
};

const MAX_STATUS_CHECKS_SINCE_LAST_CONTACT = 14;

export default function Index() {
  const [boardIps, setBoardIps] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [buttons, setButtons] = useState<RelayButtonProps[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [statusChecksSinceLastContact, setStatusChecksSinceLastContact] =
    useState<LastSuccessfulStatusCheckProps>({});

  const { messages, addMessage, clearMessages } = useMessages();

  const updateButtonsWithStatus = ({
    boardIp: toggleIpAddress,
    relaysRaw: newRelayStatuses,
  }: UpdateButtonsWithStatusesProps) => {
    setButtons((prevButtons) => {
      const newButtons: RelayButtonProps[] = [...prevButtons];

      Object.entries(newRelayStatuses).forEach(([relayId, value]) => {
        const existingButton = newButtons.find(
          (button) => button.id === relayId
        );
        if (existingButton) {
          existingButton.turnedOn = !!value;
        } else {
          const uuid = `${toggleIpAddress}-${relayId}`;
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

  const FIRST_SUBNET = 12;
  const LAST_SUBNET = 24;

  const scanSubnet = async () => {
    const subnet = "192.168.10.";
    const failedIps = [];
    const ipsToScan = [
      FIRST_SUBNET - 1,
      FIRST_SUBNET,
      FIRST_SUBNET + 1,
      LAST_SUBNET - 1,
      LAST_SUBNET,
      LAST_SUBNET + 1,
    ];
    addMessage(`Scanning ${ipsToScan.length} IPs on subnet ${subnet}XXX`);
    setScanning((p) => true);
    setScanProgress((p) => 0);
    setStatusChecksSinceLastContact(
      (p) => ({} as LastSuccessfulStatusCheckProps)
    );

    for (let lastSubnet of ipsToScan) {
      const ip = `${subnet}${lastSubnet}`;
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
          setStatusChecksSinceLastContact((prev) => {
            return { ...prev, [ip]: 0 };
          });
        }
      } catch (error) {
        failedIps.push(ip);
      }

      if (failedIps.length % 1 === 0 || lastSubnet === LAST_SUBNET) {
        addMessage(`No response from ${failedIps.join(", ")}`);
      }
      setScanProgress((prev) => {
        const index = ipsToScan.indexOf(lastSubnet);
        const newProgress = Math.round((index / ipsToScan.length) * 100);
        return newProgress;
      });
    }

    setScanning((p) => false);
    setScanProgress((p) => 100);
  };

  const handleReset = async () => {
    addMessage("Resetting storage, ips, and buttons");
    clearLocalStorage(addMessage);
    setBoardIps([]);
    setButtons([]);
    setStatusChecksSinceLastContact({});
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
    setScanProgress,
  });

  const getStatusUpdates = async () => {
    if (boardIps.length === 0 || scanning) return;
    addMessage("Checking statuses for: " + boardIps.join(", "));
    for (const ip of boardIps) {
      const url = `http://${ip}/status`;

      if (
        statusChecksSinceLastContact[ip] &&
        statusChecksSinceLastContact[ip] > MAX_STATUS_CHECKS_SINCE_LAST_CONTACT
      ) {
        addMessage(`Have not heard from ${ip} in 7 checks. Removing.`);
        setBoardIps((prev) => {
          // without the one we haven't heard from:
          return prev.filter((savedBoardIp) => savedBoardIp !== ip);
        });
        continue;
      }

      try {
        const response = await fetch(url);
        if (response.status === 200) {
          const relaysRaw = await response.json();
          updateButtonsWithStatus({
            boardIp: ip,
            relaysRaw: relaysRaw,
          });

          setStatusChecksSinceLastContact((prev) => {
            return { ...prev, [ip]: 0 };
          });
        } else {
          setStatusChecksSinceLastContact((prev) => {
            const lastCheck = prev[ip] ?? 0;
            return { ...prev, [ip]: lastCheck + 1 };
          });

          addMessage(
            `${ip} fetch error attempt #${
              statusChecksSinceLastContact[ip]
            }: ${JSON.stringify(response).slice(0, 100)}`
          );
        }
      } catch (error) {
        setStatusChecksSinceLastContact((prev) => {
          const lastCheck = prev[ip] ?? 0;
          return { ...prev, [ip]: lastCheck + 1 };
        });

        addMessage(
          `Error scanning ${ip}. Attempt ${
            JSON.stringify(statusChecksSinceLastContact[ip]) ?? "unk"
          }. Error: ${error}`
        );
      }
    }
  };

  // scanning every second for status updates:
  useEffect(() => {
    const intervalId = setInterval(getStatusUpdates, 1000);

    // Clean up the interval on component unmount
    return () => clearInterval(intervalId);
  }, [boardIps, buttons, scanning]);

  const onDragEnd = ({ data }: DragEndParams<RelayButtonProps>) => {
    const newButtons = data.map((button) => ({ ...button }));
    setButtons(newButtons);
  };

  const renderButtonRow = ({
    item,
    drag,
  }: RenderItemParams<RelayButtonProps>) => {
    if (item.hidden) return null;
    const buttonProps = { ...item };

    return (
      <View style={styles.buttonRow}>
        <DragIcon drag={drag} />
        <ButtonSettingsModal
          button={buttonProps}
          setButtons={setButtons}
          saveButtonState={saveButtonState}
          modalTitle={idToReadable(buttonProps.id)}
          addMessage={addMessage}
        />
        <RelayButton {...buttonProps} boardIps={boardIps} />
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

        <DraggableFlatList
          data={buttons}
          renderItem={renderButtonRow}
          onDragEnd={onDragEnd}
          scrollEnabled={true}
          keyExtractor={(item) => item.uuid}
        />
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
