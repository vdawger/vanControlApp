import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  KeyboardAvoidingView,
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

/** A panel that slides up from the bottom. Tap outside or press Back to close.
 *
 *  Drawn over the screen it belongs to rather than in a native Modal: on Android (new
 *  architecture) a Modal opened after a drag in Arrange was laid out squashed or off screen.
 *  So put sheets at the top level of a screen, not inside a ScrollView. */
export function Sheet({ visible, title, onClose, children }: SheetProps) {
  const slide = useRef(new Animated.Value(0)).current;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!visible) return;
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      closeRef.current();
      return true;
    });
    return () => back.remove();
  }, [visible]);

  if (!visible) return null;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.overlay}
    >
      <Animated.View style={[styles.backdrop, { opacity: slide }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }] },
        ]}
      >
        <View style={styles.grabber} />
        <Text style={[type.heading, styles.title]}>{title}</Text>
        {children}
      </Animated.View>
    </KeyboardAvoidingView>
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
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", zIndex: 100, elevation: 100 },
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
