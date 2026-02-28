import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  PixelRatio,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/theme-context";
import { cardShadow } from "@/lib/shadows";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string;
  singleAction?: boolean;
  dismissOnBackdrop?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  icon = "checkmark-circle",
  iconColor,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmColor,
  singleAction = false,
  dismissOnBackdrop = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();
  const colors = isDark ? Colors.dark : Colors.light;
  const accentColor = confirmColor || colors.success;
  const resolvedIconColor = iconColor || accentColor;
  const shouldStackActions = width < 360 || PixelRatio.getFontScale() > 1.15;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdropFill}
          onPress={() => {
            if (!loading && dismissOnBackdrop) onCancel();
          }}
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={styles.backdropFill}
          />
        </Pressable>
        <Animated.View
          entering={ZoomIn.duration(250).springify().damping(18).stiffness(200)}
          style={[
            styles.dialog,
            { backgroundColor: colors.surface },
            cardShadow(colors.cardShadow),
          ]}
        >
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: isDark ? `${resolvedIconColor}20` : `${resolvedIconColor}18` },
            ]}
          >
            <Ionicons name={icon} size={32} color={resolvedIconColor} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {message}
          </Text>

          <View style={[styles.actions, shouldStackActions && styles.actionsStacked]}>
            {!singleAction && (
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  styles.cancelBtn,
                  shouldStackActions && styles.stackedBtn,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={onCancel}
                disabled={loading}
              >
                <Text
                  style={[styles.btnText, { color: colors.textSecondary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {cancelLabel}
                </Text>
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.confirmBtn,
                (singleAction || shouldStackActions) && styles.singleBtn,
                shouldStackActions && styles.stackedBtn,
                { backgroundColor: accentColor },
                pressed && { opacity: 0.8 },
                loading && { opacity: 0.6 },
              ]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={[styles.btnText, { color: "#fff" }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  dialog: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: "stretch",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    alignSelf: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700" as const,
    textAlign: "center",
    marginBottom: 6,
    alignSelf: "center",
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
    alignSelf: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  actionsStacked: {
    flexDirection: "column",
  },
  btn: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: {
    borderWidth: 1,
  },
  confirmBtn: {},
  singleBtn: {
    flex: undefined,
    width: "100%",
  },
  stackedBtn: {
    flex: undefined,
    width: "100%",
  },
  btnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    textAlign: "center",
    flexShrink: 1,
    includeFontPadding: false,
  },
});
