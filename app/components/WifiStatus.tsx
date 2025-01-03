import React, { useEffect, useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { NetworkInfo } from "react-native-network-info";
import WifiManager from "react-native-wifi-reborn";
import { buttonStyles } from "../componentStyles/buttonStyles";

type WifiStatusProps = {
  addMessage: (s: string) => void;
};

const WifiStatus = ({ addMessage }: WifiStatusProps) => {
  const [ssid, setSsid] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [gatewayIP, setGatewayIP] = useState<string | null>("");

  useEffect(() => {
    const getWifiEnabled = async () => {
      try {
        const enabled = await WifiManager.isEnabled();
        setIsEnabled(enabled);
      } catch (error) {
        setIsEnabled(false);
        addMessage(
          "Error determining if WiFi is enabled: " + JSON.stringify(error)
        );
      }
    };
    const getWifiName = async () => {
      try {
        const wifiName = await WifiManager.getCurrentWifiSSID();
        setSsid(wifiName);
      } catch (error) {
        addMessage("Error getting WiFi SSID: " + JSON.stringify(error));
        setSsid("error");
      }
    };

    const getGatewayIP = async () => {
      try {
        const gatewayIp = await NetworkInfo.getSubnet();
        addMessage("Gateway IP: " + gatewayIp);
        setGatewayIP(gatewayIp);
      } catch (e) {
        addMessage("Error getting gateway IP: " + JSON.stringify(e));
      }
    };

    // Call this function where needed, e.g., in a useEffect or on button press
    getGatewayIP();
    getWifiName();
    getWifiEnabled();
  }, []);

  return (
    <View style={{ alignItems: "center", width: "50%" }}>
      <TouchableOpacity
        style={[
          buttonStyles.button,
          buttonStyles.fullWidth,
          isEnabled ? buttonStyles.relayOn : buttonStyles.danger,
        ]}
        onPress={(e) => setModalVisible(true)}
      >
        <Text style={[buttonStyles.text]}>Wifi: {ssid}</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={buttonStyles.modalAtBottomOfScreen}>
          <View style={buttonStyles.modalView}>
            <Text style={buttonStyles.titleText}>Wifi Info</Text>
            <Text style={buttonStyles.text}>SSID: {ssid}</Text>
            <Text style={buttonStyles.text}>
              Wifi is {isEnabled ? "enabled" : "disabled"}
            </Text>
            <Text style={buttonStyles.text}>{`Gateway IP: ${
              gatewayIP ? gatewayIP : "unknown"
            }`}</Text>

            <View style={buttonStyles.buttonRow}>
              <TouchableOpacity
                style={[
                  buttonStyles.button,
                  buttonStyles.fullWidth,
                  buttonStyles.cancel,
                ]}
                onPress={(e) => setModalVisible(false)}
              >
                <Text style={[buttonStyles.text]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default WifiStatus;
