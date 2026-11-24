import { StyleSheet } from "react-native";

export const buttonStyles = StyleSheet.create({
  buttonRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
  },
  spaceAfter: {
    marginBottom: 10,
  },
  expand: {
    // makes relay buttons take up all available space
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
  twoButtonsInARow: {
    width: "50%",
  },
  button: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 1,
    alignContent: "center",
  },
  relayIcon: {
    width: 50,
    alignContent: "center",
    justifyContent: "center",
    marginRight: 5,
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
    color: "white",
  },
  modalAtBottomOfScreen: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    backgroundColor: "black",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 10,
    width: "100%",
  },
  input: {
    borderWidth: 1,
    borderColor: "grey",
    borderRadius: 10,
    color: "white",
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: "grey",
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
  },
  smallButton: {
    paddingHorizontal: 10,
    height: 40,
    marginRight: 6,
    marginTop: 6,
  },
  wrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dimText: {
    color: "#bbbbbb",
  },
  titleText: {
    fontSize: 20,
    color: "white",
    textAlign: "center",
    marginVertical: 10,
  },
  messageList: {
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
