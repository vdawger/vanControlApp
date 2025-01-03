import React from "react";
import { DimensionValue, StyleSheet, Text, View } from "react-native";

type ProgressBarProps = {
  progress?: number;
};

const ProgressBar: React.FC<ProgressBarProps> = ({ progress = 0 }) => {
  const barWidth: DimensionValue = `${progress}%`;

  return (
    <View style={styles.container}>
      <View style={[styles.bar, { width: barWidth }]}>
        <Text style={styles.text}>{barWidth}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 30,
    backgroundColor: "black",
    borderRadius: 10,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    backgroundColor: "blue",
  },
  text: {
    color: "white",
    textAlign: "center",
  },
});

export default ProgressBar;
