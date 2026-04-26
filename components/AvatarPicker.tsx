import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/theme-context";
import { apiRequest } from "@/lib/query-client";

interface AvatarPickerProps {
  avatarUrl?: string | null;
  name?: string | null;
  onUpload: () => Promise<void>;
}

export default function AvatarPicker({ avatarUrl, name, onUpload }: AvatarPickerProps) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const [uploading, setUploading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const initial = name?.charAt(0)?.toUpperCase() || "U";

  async function pickAndUpload(source: "gallery" | "camera") {
    setMenuVisible(false);

    let result: ImagePicker.ImagePickerResult;

    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão necessária", "Permita o acesso à câmera nas configurações do dispositivo.");
        return;
      }
      result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão necessária", "Permita o acesso à galeria nas configurações do dispositivo.");
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8, mediaTypes: "images" });
    }

    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 200, height: 200 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!manipulated.base64) throw new Error("Falha ao processar imagem");

      const dataUri = `data:image/jpeg;base64,${manipulated.base64}`;

      await apiRequest("PATCH", "/api/auth/avatar", { avatarUrl: dataUri });
      await onUpload();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erro", e.message || "Não foi possível atualizar a foto.");
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    setMenuVisible(false);
    setUploading(true);
    try {
      await apiRequest("PATCH", "/api/auth/avatar", { avatarUrl: null });
      await onUpload();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Não foi possível remover a foto.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <TouchableOpacity
        style={styles.wrapper}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuVisible(true); }}
        disabled={uploading}
        activeOpacity={0.8}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.initials, { backgroundColor: colors.tint }]}>
            <Text style={styles.initialsText}>{initial}</Text>
          </View>
        )}

        <View style={[styles.badge, { backgroundColor: colors.tint, borderColor: colors.surface }]}>
          {uploading ? (
            <ActivityIndicator size={10} color="#fff" />
          ) : (
            <Ionicons name="camera" size={12} color="#fff" />
          )}
        </View>
      </TouchableOpacity>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={[styles.menu, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>Foto de perfil</Text>

            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={() => pickAndUpload("gallery")}>
              <Ionicons name="images-outline" size={20} color={colors.tint} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Escolher da galeria</Text>
            </TouchableOpacity>

            {Platform.OS !== "web" && (
              <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={() => pickAndUpload("camera")}>
                <Ionicons name="camera-outline" size={20} color={colors.tint} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Tirar foto</Text>
              </TouchableOpacity>
            )}

            {avatarUrl && (
              <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={removeAvatar}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                <Text style={[styles.menuItemText, { color: colors.danger }]}>Remover foto</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setMenuVisible(false)}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 72,
    height: 72,
    position: "relative",
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  initials: {
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  badge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  menu: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 36,
    paddingHorizontal: 20,
  },
  menuTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
    textAlign: "center",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  cancelBtn: {
    paddingTop: 16,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
