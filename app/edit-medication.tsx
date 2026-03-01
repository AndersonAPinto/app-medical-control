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
import { useTheme } from "@/lib/theme-context";
import ConfirmDialog from "@/components/ConfirmDialog";

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
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [currentStock, setCurrentStock] = useState("");
  const [alertThreshold, setAlertThreshold] = useState("");
  const [intervalInHours, setIntervalInHours] = useState(8);
  const [loaded, setLoaded] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);
  const canDecrementInterval = intervalInHours > 1;
  const canIncrementInterval = intervalInHours < 24;

  const showError = (message: string) => {
    setDialog({ title: "Não foi possível atualizar", message });
  };

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
      showError(err.message || "Falha ao atualizar medicamento");
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      showError("Informe o nome do medicamento");
      return;
    }
    if (!dosage.trim()) {
      showError("Informe a dosagem");
      return;
    }
    updateMutation.mutate();
  };

  const handleAddStock = () => {
    Haptics.selectionAsync();
    const current = parseInt(currentStock, 10) || 0;
    if (Alert.prompt) {
      Alert.prompt(
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
      );
      return;
    }

    setCurrentStock(String(current + 10));
  };

  if (medQuery.isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconHeader}>
          <View style={[styles.bigIcon, { backgroundColor: colors.tintLight }]}>
            <Ionicons name="create" size={36} color={colors.tint} />
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Edite os detalhes do medicamento</Text>
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Nome do medicamento</Text>
        <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="medkit-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Ex: Dipirona"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Dosagem</Text>
        <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="flask-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Ex: 500mg, 1 comprimido"
            placeholderTextColor={colors.textSecondary}
            value={dosage}
            onChangeText={setDosage}
          />
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Intervalo entre doses</Text>
        <View style={styles.intervalControlRow}>
          <Pressable
            style={({ pressed }) => [
              styles.intervalAdjustBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              !canDecrementInterval && { opacity: 0.5 },
              pressed && canDecrementInterval && styles.intervalBtnPressed,
            ]}
            disabled={!canDecrementInterval}
            onPress={() => {
              if (!canDecrementInterval) return;
              Haptics.selectionAsync();
              setIntervalInHours((prev) => Math.max(1, prev - 1));
            }}
          >
            <Ionicons name="remove" size={20} color={colors.text} />
          </Pressable>

          <View style={[styles.intervalValueBox, { backgroundColor: colors.tintLight, borderColor: colors.tint }]}>
            <Text style={[styles.intervalValueText, { color: colors.tint }]}>{intervalInHours}h</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.intervalAdjustBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              !canIncrementInterval && { opacity: 0.5 },
              pressed && canIncrementInterval && styles.intervalBtnPressed,
            ]}
            disabled={!canIncrementInterval}
            onPress={() => {
              if (!canIncrementInterval) return;
              Haptics.selectionAsync();
              setIntervalInHours((prev) => Math.min(24, prev + 1));
            }}
          >
            <Ionicons name="add" size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.stockRow}>
          <View style={styles.stockField}>
            <Text style={[styles.label, { color: colors.text }]}>Estoque atual</Text>
            <View style={styles.stockInputRow}>
              <View style={[styles.inputWrapper, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="cube-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={currentStock}
                  onChangeText={setCurrentStock}
                  keyboardType="number-pad"
                />
              </View>
              <Pressable
                style={({ pressed }) => [styles.addStockBtn, { backgroundColor: colors.tintLight, borderColor: colors.tint }, pressed && { opacity: 0.7 }]}
                onPress={handleAddStock}
              >
                <Ionicons name="add" size={22} color={colors.tint} />
              </Pressable>
            </View>
          </View>

          <View style={styles.stockField}>
            <Text style={[styles.label, { color: colors.text }]}>Alerta em</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="notifications-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="5"
                placeholderTextColor={colors.textSecondary}
                value={alertThreshold}
                onChangeText={setAlertThreshold}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.tintLight }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.tint} />
          <Text style={[styles.infoText, { color: colors.tint }]}>
            Você será alertado quando o estoque atingir {alertThreshold || "5"} unidades
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: colors.tint },
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
              <Text style={styles.saveBtnText}>Salvar Alterações</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      <ConfirmDialog
        visible={!!dialog}
        title={dialog?.title || ""}
        message={dialog?.message || ""}
        icon="alert-circle"
        iconColor={colors.danger}
        confirmLabel="OK"
        confirmColor={colors.danger}
        singleAction
        onConfirm={() => setDialog(null)}
        onCancel={() => setDialog(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
    marginTop: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  intervalControlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  intervalAdjustBtn: {
    width: 52,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  intervalBtnPressed: {
    opacity: 0.8,
  },
  intervalValueBox: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  intervalValueText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
