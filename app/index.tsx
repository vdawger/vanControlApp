import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";

interface RelayButtonProps {
  id: number;
  // Add other props as needed
}

const RelayButton: React.FC<RelayButtonProps> = ({ id }) => {
  return (
    <TouchableOpacity>
      <Text>Relay Button {id}</Text>
    </TouchableOpacity>
  );
};

export default function Index() {
  const [buttons, setButtons] = useState<RelayButtonProps[]>([
    { id: 1 },
    { id: 2 },
    { id: 3 },
  ]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <DraggableFlatList
          data={buttons}
          renderItem={({ item }) => <RelayButton {...item} />}
          keyExtractor={(item) => item.id.toString()}
          onDragEnd={({ data }) => setButtons(data)}
        />
      </View>
    </GestureHandlerRootView>
  );
}
