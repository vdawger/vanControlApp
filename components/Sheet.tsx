import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { color, radius, space, type } from "@/lib/theme";
import { Button } from "./Button";

type SheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

/** A panel that slides up from the bottom. Tap outside to close. */
export function Sheet({ visible, title, onClose, children }: SheetProps) {
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.fill}
      >
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={[type.heading, styles.title]}>{title}</Text>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type PromptSheetProps = {
  visible: boolean;
  title: string;
  hint?: string;
  initial?: string;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  submitLabel?: string;
  onSubmit: (text: string) => void;
  onClose: () => void;
};

/** A sheet with one text field. */
export function PromptSheet({
  visible,
  title,
  hint,
  initial = "",
  placeholder,
  minLength = 1,
  maxLength = 64,
  submitLabel = "Save",
  onSubmit,
  onClose,
}: PromptSheetProps) {
  const [text, setText] = useState(initial);
  useEffect(() => {
    if (visible) setText(initial);
  }, [visible, initial]);

  const value = text.trim();
  const valid = value.length >= minLength;
  const submit = () => {
    if (!valid) return;
    onSubmit(value);
    onClose();
  };

  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      {hint ? <Text style={[type.dim, styles.hint]}>{hint}</Text> : null}
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        maxLength={maxLength}
        placeholder={placeholder}
        placeholderTextColor={color.textFaint}
        autoFocus
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      {minLength > 1 && !valid ? (
        <Text style={[type.dim, styles.hint]}>
          {`${minLength - value.length} more character${
            minLength - value.length === 1 ? "" : "s"
          } needed`}
        </Text>
      ) : null}
      <Button label={submitLabel} onPress={submit} disabled={!valid} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: color.backdrop },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.lg,
    paddingBottom: space.xl + space.sm,
    maxHeight: "85%",
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: color.border,
    marginBottom: space.md,
  },
  title: { marginBottom: space.md },
  hint: { marginBottom: space.md },
  input: {
    backgroundColor: color.bg,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    color: color.text,
    fontSize: 16,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    marginBottom: space.md,
  },
});
