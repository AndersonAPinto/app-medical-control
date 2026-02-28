import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import ConfirmDialog from "@/components/ConfirmDialog";

const intervals = [
  { label: "4h", value: 4 },
  { label: "6h", value: 6 },
  { label: "8h", value: 8 },
  { label: "12h", value: 12 },
  { label: "24h", value: 24 },
];

export default function AddMedicationScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [currentStock, setCurrentStock] = useState("");
  const [alertThreshold, setAlertThreshold] = useState("5");
  const [intervalInHours, setIntervalInHours] = useState(8);
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmColor?: string;
    singleAction?: boolean;
    onConfirm?: () => void;
  } | null>(null);

  const medsQuery = useQuery<any[]>({
    queryKey: ["/api/medications"],
  });

  const medCount = medsQuery.data?.length || 0;
  const isFree = user?.planType === "FREE";
  const atLimit = isFree && medCount >= 10;

  const showInfoDialog = (
    title: string,
    message: string,
    icon: keyof typeof Ionicons.glyphMap = "information-circle",
    iconColor: string = colors.tint,
    confirmColor: string = colors.tint
  ) => {
    setDialog({
      title,
      message,
      icon,
      iconColor,
      confirmLabel: "OK",
      confirmColor,
      singleAction: true,
      onConfirm: () => setDialog(null),
    });
  };

  const showLimitDialog = () => {
    setDialog({
      title: "Limite Atingido",
      message: "Você atingiu o limite de 10 medicamentos do plano Free. Assine o Premium para adicionar medicamentos ilimitados.",
      icon: "star",
      iconColor: colors.warning,
      confirmLabel: "Ver Planos",
      cancelLabel: "Cancelar",
      confirmColor: colors.warning,
      onConfirm: () => {
        setDialog(null);
        router.back();
        router.push("/subscription");
      },
    });
  };

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
      const msg = err.message || "";
      if (msg.includes("requiresUpgrade") || msg.includes("Limite")) {
        showLimitDialog();
      } else {
        showInfoDialog("Não foi possível salvar", msg || "Falha ao salvar medicamento", "alert-circle", colors.danger, colors.danger);
      }
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      showInfoDialog("Campo obrigatório", "Informe o nome do medicamento", "alert-circle", colors.danger, colors.danger);
      return;
    }
    if (!dosage.trim()) {
      showInfoDialog("Campo obrigatório", "Informe a dosagem", "alert-circle", colors.danger, colors.danger);
      return;
    }
    if (atLimit) {
      showLimitDialog();
      return;
    }
    createMutation.mutate();
  };

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
            <Ionicons name="medical" size={36} color={colors.tint} />
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Adicione os detalhes do medicamento</Text>
          {isFree && (
            <View style={[styles.limitBanner, { backgroundColor: atLimit ? colors.dangerLight : colors.warningLight }]}>
              <Ionicons name={atLimit ? "alert-circle" : "information-circle"} size={16} color={atLimit ? colors.danger : colors.warning} />
              <Text style={[styles.limitText, { color: atLimit ? colors.danger : colors.warning }]}>
                {atLimit ? "Limite de 10 medicamentos atingido" : `${medCount}/10 medicamentos (Plano Free)`}
              </Text>
            </View>
          )}
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
        <View style={styles.intervalRow}>
          {intervals.map((i) => (
            <Pressable
              key={i.value}
              style={[
                styles.intervalChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
                intervalInHours === i.value && { borderColor: colors.tint, backgroundColor: colors.tintLight },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setIntervalInHours(i.value);
              }}
            >
              <Text style={[styles.intervalText, { color: colors.textSecondary }, intervalInHours === i.value && { color: colors.tint }]}>
                {i.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.stockRow}>
          <View style={styles.stockField}>
            <Text style={[styles.label, { color: colors.text }]}>Estoque atual</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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

      <ConfirmDialog
        visible={!!dialog}
        title={dialog?.title || ""}
        message={dialog?.message || ""}
        icon={dialog?.icon}
        iconColor={dialog?.iconColor}
        confirmLabel={dialog?.confirmLabel}
        cancelLabel={dialog?.cancelLabel}
        confirmColor={dialog?.confirmColor}
        singleAction={dialog?.singleAction}
        onConfirm={() => {
          if (dialog?.onConfirm) {
            dialog.onConfirm();
            return;
          }
          setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  limitBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    gap: 6,
  },
  limitText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
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
  intervalRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  intervalChip: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  intervalText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
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
