import { StyleSheet } from "react-native";

export const buttonStyles = StyleSheet.create({
  buttonRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
  },
  expand: {
    flex: 1,
  },
  relayOff: {
    backgroundColor: "grey",
  },
  relayOn: {
    backgroundColor: "green",
  },
  disabledButton: {
    backgroundColor: "#c4c4c4",
  },
  fullWidth: {
    width: "100%",
  },
  rowWidth: {
    width: "50%",
  },
  modalButton: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    marginVertical: 5,
  },
  cancel: {
    backgroundColor: "grey",
  },
  primary: {
    backgroundColor: "blue",
  },
  danger: {
    backgroundColor: "red",
  },
  text: {
    paddingHorizontal: 5,
    color: "white",
  },
  centeredView: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // transparent color how do i make this transparent?
  },
  modalView: {
    backgroundColor: "black",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 10,
    width: "100%",
  },
  titleText: {
    fontSize: 20,
    color: "white",
    textAlign: "center",
    marginVertical: 10,
  },
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  list: {
    height: 400,
    marginBottom: 10,
  },
  message: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "grey",
    color: "white",
    fontSize: 12,
  },
});
