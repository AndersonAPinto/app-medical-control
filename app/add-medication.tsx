import React, { useState, useRef } from "react";
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
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
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
import { scheduleNextDoseNotification } from "@/lib/push-notifications";

const TOTAL_STEPS = 3;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function AddMedicationScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
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

  const slideX = useSharedValue(0);
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  const medsQuery = useQuery<any[]>({
    queryKey: ["/api/medications"],
  });

  const medCount = medsQuery.data?.length || 0;
  const isFree = user?.planType === "FREE";
  const atLimit = isFree && medCount >= 10;
  const canDecrementInterval = intervalInHours > 1;
  const canIncrementInterval = intervalInHours < 24;

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
    onSuccess: async (data) => {
      if (data && data.id) {
        const nextDoseTime = Date.now() + intervalInHours * 60 * 60 * 1000;
        await scheduleNextDoseNotification(data.id, data.name, nextDoseTime);
      }
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

  const animateToStep = (nextStep: 1 | 2 | 3, direction: "forward" | "back") => {
    const offset = direction === "forward" ? SCREEN_WIDTH : -SCREEN_WIDTH;
    slideX.value = offset;
    slideX.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    setStep(nextStep);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        showInfoDialog("Campo obrigatório", "Informe o nome do medicamento", "alert-circle", colors.danger, colors.danger);
        return;
      }
      if (!dosage.trim()) {
        showInfoDialog("Campo obrigatório", "Informe a dosagem", "alert-circle", colors.danger, colors.danger);
        return;
      }
      Haptics.selectionAsync();
      animateToStep(2, "forward");
    } else if (step === 2) {
      Haptics.selectionAsync();
      animateToStep(3, "forward");
    }
  };

  const handleBack = () => {
    if (step === 2) animateToStep(1, "back");
    else if (step === 3) animateToStep(2, "back");
  };

  const handleSave = () => {
    if (atLimit) {
      showLimitDialog();
      return;
    }
    createMutation.mutate();
  };

  const stepIcons: Array<keyof typeof Ionicons.glyphMap> = ["medkit-outline", "time-outline", "cube-outline"];
  const stepTitles = ["Identificação", "Agendamento", "Estoque"];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      {/* Progress Bar */}
      <View style={[styles.progressContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.progressSteps}>
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <View style={styles.progressStepWrapper}>
                <View style={[
                  styles.progressDot,
                  { backgroundColor: s <= step ? colors.tint : colors.border },
                ]}>
                  {s < step ? (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  ) : (
                    <Text style={[styles.progressDotText, { color: s === step ? "#fff" : colors.textSecondary }]}>{s}</Text>
                  )}
                </View>
                <Text style={[styles.progressLabel, { color: s === step ? colors.tint : colors.textSecondary }]}>
                  {stepTitles[s - 1]}
                </Text>
              </View>
              {s < 3 && (
                <View style={[styles.progressLine, { backgroundColor: s < step ? colors.tint : colors.border }]} />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>

      <Animated.View style={[{ flex: 1 }, slideStyle]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Step Header */}
          <View style={styles.stepHeader}>
            <View style={[styles.stepIcon, { backgroundColor: colors.tintLight }]}>
              <Ionicons name={stepIcons[step - 1]} size={32} color={colors.tint} />
            </View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>{stepTitles[step - 1]}</Text>
            {isFree && step === 1 && (
              <View style={[styles.limitBanner, { backgroundColor: atLimit ? colors.dangerLight : colors.warningLight }]}>
                <Ionicons name={atLimit ? "alert-circle" : "information-circle"} size={16} color={atLimit ? colors.danger : colors.warning} />
                <Text style={[styles.limitText, { color: atLimit ? colors.danger : colors.warning }]}>
                  {atLimit ? "Limite de 10 medicamentos atingido" : `${medCount}/10 medicamentos (Plano Free)`}
                </Text>
              </View>
            )}
          </View>

          {/* Step 1: Nome + Dosagem */}
          {step === 1 && (
            <>
              <Text style={[styles.label, { color: colors.text }]}>Nome do medicamento</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="medkit-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Ex: Dipirona"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoFocus
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
            </>
          )}

          {/* Step 2: Intervalo */}
          {step === 2 && (
            <>
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
                  <Text style={[styles.intervalSubText, { color: colors.tint }]}>entre doses</Text>
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

              <View style={[styles.infoBox, { backgroundColor: colors.tintLight, marginTop: 20 }]}>
                <Ionicons name="information-circle-outline" size={18} color={colors.tint} />
                <Text style={[styles.infoText, { color: colors.tint }]}>
                  A cada {intervalInHours} hora{intervalInHours !== 1 ? "s" : ""} você receberá um lembrete para tomar {name || "o medicamento"}.
                </Text>
              </View>
            </>
          )}

          {/* Step 3: Estoque + Resumo */}
          {step === 3 && (
            <>
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

              <View style={[styles.infoBox, { backgroundColor: colors.tintLight, marginTop: 8 }]}>
                <Ionicons name="notifications-outline" size={18} color={colors.tint} />
                <Text style={[styles.infoText, { color: colors.tint }]}>
                  Você será alertado quando o estoque atingir {alertThreshold || "5"} unidades
                </Text>
              </View>

              {/* Resumo */}
              <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.summaryTitle, { color: colors.textSecondary }]}>Resumo do cadastro</Text>
                <View style={styles.summaryRow}>
                  <Ionicons name="medkit-outline" size={16} color={colors.tint} />
                  <Text style={[styles.summaryText, { color: colors.text }]}>{name} — {dosage}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Ionicons name="time-outline" size={16} color={colors.tint} />
                  <Text style={[styles.summaryText, { color: colors.text }]}>A cada {intervalInHours}h</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Ionicons name="cube-outline" size={16} color={colors.tint} />
                  <Text style={[styles.summaryText, { color: colors.text }]}>{currentStock || "0"} un. · Alerta: {alertThreshold || "5"} un.</Text>
                </View>
              </View>
            </>
          )}

          {/* Navigation Buttons */}
          <View style={styles.navRow}>
            {step > 1 && (
              <Pressable
                style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
                onPress={handleBack}
              >
                <Ionicons name="arrow-back" size={18} color={colors.text} />
                <Text style={[styles.backBtnText, { color: colors.text }]}>Voltar</Text>
              </Pressable>
            )}

            {step < 3 ? (
              <Pressable
                style={({ pressed }) => [styles.nextBtn, { backgroundColor: colors.tint }, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
                onPress={handleNext}
              >
                <Text style={styles.nextBtnText}>Próximo</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.nextBtn,
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
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.nextBtnText}>Salvar</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        </ScrollView>
      </Animated.View>

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
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  progressSteps: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressStepWrapper: {
    alignItems: "center",
    gap: 4,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  progressLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  progressLine: {
    flex: 1,
    height: 2,
    marginBottom: 16,
    marginHorizontal: 4,
  },
  content: {
    padding: 20,
  },
  stepHeader: {
    alignItems: "center",
    marginBottom: 28,
  },
  stepIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
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
  intervalControlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  intervalAdjustBtn: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  intervalBtnPressed: {
    opacity: 0.8,
  },
  intervalValueBox: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  intervalValueText: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  intervalSubText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
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
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    gap: 10,
  },
  summaryTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  navRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 28,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 20,
    borderWidth: 1,
    gap: 6,
  },
  backBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    height: 52,
    gap: 8,
  },
  nextBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  saveBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
});
