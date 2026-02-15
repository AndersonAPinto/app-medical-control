import React, { useState, useEffect } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
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

interface Medication {
  id: string;
  name: string;
  dosage: string;
  currentStock: number;
  alertThreshold: number;
  intervalInHours: number;
  ownerId: string;
}

export default function EditMedicationScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [currentStock, setCurrentStock] = useState("");
  const [alertThreshold, setAlertThreshold] = useState("");
  const [intervalInHours, setIntervalInHours] = useState(8);
  const [loaded, setLoaded] = useState(false);

  const medQuery = useQuery<Medication>({
    queryKey: ["/api/medications", id],
    enabled: !!id,
  });

  useEffect(() => {
    if (medQuery.data && !loaded) {
      const med = medQuery.data;
      setName(med.name);
      setDosage(med.dosage);
      setCurrentStock(String(med.currentStock));
      setAlertThreshold(String(med.alertThreshold));
      setIntervalInHours(med.intervalInHours);
      setLoaded(true);
    }
  }, [medQuery.data, loaded]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/medications/${id}`, {
        name: name.trim(),
        dosage: dosage.trim(),
        currentStock: parseInt(currentStock, 10) || 0,
        alertThreshold: parseInt(alertThreshold, 10) || 0,
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
      Alert.alert("Erro", err.message || "Falha ao atualizar medicamento");
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
    updateMutation.mutate();
  };

  const handleAddStock = () => {
    Haptics.selectionAsync();
    const current = parseInt(currentStock, 10) || 0;
    Alert.prompt
      ? Alert.prompt(
          "Adicionar estoque",
          "Quantas unidades deseja adicionar?",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Adicionar",
              onPress: (val: string | undefined) => {
                const add = parseInt(val || "0", 10);
                if (add > 0) setCurrentStock(String(current + add));
              },
            },
          ],
          "plain-text",
          "",
          "number-pad"
        )
      : setCurrentStock(String(current + 10));
  };

  if (medQuery.isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

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
            <Ionicons name="create" size={36} color={Colors.light.tint} />
          </View>
          <Text style={styles.subtitle}>Edite os detalhes do medicamento</Text>
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
            <View style={styles.stockInputRow}>
              <View style={[styles.inputWrapper, { flex: 1 }]}>
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
              <Pressable
                style={({ pressed }) => [styles.addStockBtn, pressed && { opacity: 0.7 }]}
                onPress={handleAddStock}
              >
                <Ionicons name="add" size={22} color={Colors.light.tint} />
              </Pressable>
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
            updateMutation.isPending && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={22} color="#fff" />
              <Text style={styles.saveBtnText}>Salvar Alteracoes</Text>
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
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
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
  stockInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addStockBtn: {
    width: 44,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.light.tintLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.tint,
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
