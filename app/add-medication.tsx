import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { apiRequest, queryClient } from "@/lib/query-client";

const intervals = [
  { label: "4h", value: 4 },
  { label: "6h", value: 6 },
  { label: "8h", value: 8 },
  { label: "12h", value: 12 },
  { label: "24h", value: 24 },
];

export default function AddMedicationScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [currentStock, setCurrentStock] = useState("");
  const [alertThreshold, setAlertThreshold] = useState("5");
  const [intervalInHours, setIntervalInHours] = useState(8);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/medications", {
        name: name.trim(),
        dosage: dosage.trim(),
        currentStock: parseInt(currentStock, 10) || 0,
        alertThreshold: parseInt(alertThreshold, 10) || 5,
        intervalInHours,
      });
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert("Erro", err.message || "Falha ao salvar medicamento");
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Erro", "Informe o nome do medicamento");
      return;
    }
    if (!dosage.trim()) {
      Alert.alert("Erro", "Informe a dosagem");
      return;
    }
    createMutation.mutate();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconHeader}>
          <View style={styles.bigIcon}>
            <Ionicons name="medical" size={36} color={Colors.light.tint} />
          </View>
          <Text style={styles.subtitle}>Adicione os detalhes do medicamento</Text>
        </View>

        <Text style={styles.label}>Nome do medicamento</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="medkit-outline" size={18} color={Colors.light.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Ex: Dipirona"
            placeholderTextColor={Colors.light.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        <Text style={styles.label}>Dosagem</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="flask-outline" size={18} color={Colors.light.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Ex: 500mg, 1 comprimido"
            placeholderTextColor={Colors.light.textSecondary}
            value={dosage}
            onChangeText={setDosage}
          />
        </View>

        <Text style={styles.label}>Intervalo entre doses</Text>
        <View style={styles.intervalRow}>
          {intervals.map((i) => (
            <Pressable
              key={i.value}
              style={[styles.intervalChip, intervalInHours === i.value && styles.intervalChipActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setIntervalInHours(i.value);
              }}
            >
              <Text style={[styles.intervalText, intervalInHours === i.value && styles.intervalTextActive]}>
                {i.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.stockRow}>
          <View style={styles.stockField}>
            <Text style={styles.label}>Estoque atual</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="cube-outline" size={18} color={Colors.light.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={Colors.light.textSecondary}
                value={currentStock}
                onChangeText={setCurrentStock}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.stockField}>
            <Text style={styles.label}>Alerta em</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="notifications-outline" size={18} color={Colors.light.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="5"
                placeholderTextColor={Colors.light.textSecondary}
                value={alertThreshold}
                onChangeText={setAlertThreshold}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.light.tint} />
          <Text style={styles.infoText}>
            Voce sera alertado quando o estoque atingir {alertThreshold || "5"} unidades
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && styles.saveBtnPressed,
            createMutation.isPending && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={22} color="#fff" />
              <Text style={styles.saveBtnText}>Salvar Medicamento</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 20,
  },
  iconHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  bigIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.light.tintLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
    marginBottom: 6,
    marginTop: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
  },
  intervalRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  intervalChip: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
  intervalChipActive: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tintLight,
  },
  intervalText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
  },
  intervalTextActive: {
    color: Colors.light.tint,
  },
  stockRow: {
    flexDirection: "row",
    gap: 12,
  },
  stockField: {
    flex: 1,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.tintLight,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.tint,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.tint,
    borderRadius: 14,
    height: 52,
    marginTop: 24,
    gap: 8,
  },
  saveBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
