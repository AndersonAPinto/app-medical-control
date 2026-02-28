import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/theme-context";
import { useSubscription } from "@/lib/subscription-context";
import { cardShadow } from "@/lib/shadows";
import ConfirmDialog from "@/components/ConfirmDialog";

type PlanInterval = "monthly" | "yearly";

const FEATURES_FREE = [
  { icon: "medkit-outline", text: "Até 10 medicamentos" },
  { icon: "person-outline", text: "1 dependente" },
  { icon: "link-outline", text: "1 conexão" },
  { icon: "notifications-outline", text: "Alertas de estoque" },
];

const FEATURES_PREMIUM = [
  { icon: "medkit", text: "Medicamentos ilimitados" },
  { icon: "people", text: "Dependentes ilimitados" },
  { icon: "link", text: "Conexões ilimitadas" },
  { icon: "notifications", text: "Alertas de estoque" },
  { icon: "star", text: "Suporte prioritário" },
];

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const {
    isPremium,
    isLoading,
    subscriptionStatus,
    subscriptionInterval,
    subscriptionExpiresAt,
    subscriptionWillRenew,
    purchaseMonthly,
    purchaseYearly,
    restorePurchases,
  } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<PlanInterval>("yearly");
  const [restoring, setRestoring] = useState(false);
  const [confirmUpgradeVisible, setConfirmUpgradeVisible] = useState(false);
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    confirmColor?: string;
    onConfirm?: () => void;
  } | null>(null);

  const showInfoDialog = (
    title: string,
    message: string,
    icon: keyof typeof Ionicons.glyphMap = "information-circle",
    iconColor: string = colors.tint,
    confirmColor: string = colors.tint,
    onConfirm?: () => void
  ) => {
    setDialog({ title, message, icon, iconColor, confirmColor, onConfirm });
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "Não informado";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Não informado";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const handleOpenCancelLink = async () => {
    const cancelUrl = "https://play.google.com/store/account/subscriptions";
    try {
      const canOpen = await Linking.canOpenURL(cancelUrl);
      if (!canOpen) {
        showInfoDialog("Atenção", "Não foi possível abrir o link de cancelamento.", "alert-circle", colors.danger, colors.danger);
        return;
      }
      await Linking.openURL(cancelUrl);
    } catch {
      showInfoDialog("Atenção", "Não foi possível abrir o link de cancelamento.", "alert-circle", colors.danger, colors.danger);
    }
  };

  const handleSubscribe = async () => {
    setConfirmUpgradeVisible(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (selectedPlan === "monthly") {
        await purchaseMonthly();
      } else {
        await purchaseYearly();
      }
      showInfoDialog(
        "Sucesso!",
        "Seu plano foi atualizado para Premium! Aproveite todos os recursos.",
        "checkmark-circle",
        colors.success,
        colors.success,
        () => {
          setDialog(null);
          router.back();
        }
      );
    } catch (err: any) {
      showInfoDialog("Não foi possível assinar", err.message || "Não foi possível processar a assinatura.", "alert-circle", colors.danger, colors.danger);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restorePurchases();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showInfoDialog("Restaurado", "Suas compras foram restauradas com sucesso.", "checkmark-circle", colors.success, colors.success);
    } catch {
      showInfoDialog("Não foi possível restaurar", "Não foi possível restaurar as compras.", "alert-circle", colors.danger, colors.danger);
    } finally {
      setRestoring(false);
    }
  };

  if (isPremium) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, { backgroundColor: colors.inputBg }]}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Assinatura</Text>
            <View style={{ width: 36 }} />
          </View>
        </View>
        <View style={styles.premiumActiveContainer}>
          <View style={[styles.premiumActiveCard, { backgroundColor: colors.surface }, cardShadow(colors.cardShadow)]}>
            <View style={[styles.premiumIconCircle, { backgroundColor: colors.successLight }]}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            </View>
            <Text style={[styles.premiumActiveTitle, { color: colors.text }]}>Plano Premium Ativo</Text>
            <Text style={[styles.premiumActiveSubtitle, { color: colors.textSecondary }]}>
              Você tem acesso a todos os recursos do Toma Aí Premium.
            </Text>
            <View style={[styles.subscriptionMetaCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <View style={styles.subscriptionMetaRow}>
                <Text style={[styles.subscriptionMetaLabel, { color: colors.textSecondary }]}>Ciclo</Text>
                <Text style={[styles.subscriptionMetaValue, { color: colors.text }]}>
                  {subscriptionInterval === "monthly" ? "Mensal" : subscriptionInterval === "yearly" ? "Anual" : "Não informado"}
                </Text>
              </View>
              <View style={styles.subscriptionMetaRow}>
                <Text style={[styles.subscriptionMetaLabel, { color: colors.textSecondary }]}>Status</Text>
                <Text style={[styles.subscriptionMetaValue, { color: colors.text }]}>
                  {subscriptionStatus}
                </Text>
              </View>
              <View style={styles.subscriptionMetaRow}>
                <Text style={[styles.subscriptionMetaLabel, { color: colors.textSecondary }]}>Expira em</Text>
                <Text style={[styles.subscriptionMetaValue, { color: colors.text }]}>
                  {formatDate(subscriptionExpiresAt)}
                </Text>
              </View>
              <View style={styles.subscriptionMetaRow}>
                <Text style={[styles.subscriptionMetaLabel, { color: colors.textSecondary }]}>Renovação automática</Text>
                <Text style={[styles.subscriptionMetaValue, { color: colors.text }]}>
                  {subscriptionWillRenew ? "Ativa" : "Cancelada no fim do período"}
                </Text>
              </View>
            </View>
            <View style={styles.premiumFeaturesList}>
              {FEATURES_PREMIUM.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name={f.icon as any} size={18} color={colors.success} />
                  <Text style={[styles.featureText, { color: colors.text }]}>{f.text}</Text>
                </View>
              ))}
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.manageSubscriptionBtn,
                { backgroundColor: colors.inputBg, borderColor: colors.border },
                pressed && { opacity: 0.8 },
              ]}
              onPress={handleOpenCancelLink}
            >
              <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.manageSubscriptionText, { color: colors.textSecondary }]}>
                Gerenciar ou cancelar na Google Play
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, { backgroundColor: colors.inputBg }]}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Premium</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={[styles.heroIcon, { backgroundColor: "#FEF3C7" }]}>
            <Ionicons name="star" size={40} color="#F59E0B" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Toma Aí Premium</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Desbloqueie todo o potencial do Toma Aí
          </Text>
        </View>

        <View style={styles.planCards}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setSelectedPlan("yearly"); }}
            style={[
              styles.planCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              cardShadow(colors.cardShadow),
              selectedPlan === "yearly" && { borderColor: colors.tint, borderWidth: 2 },
            ]}
          >
            <View style={[styles.discountBadge, { backgroundColor: colors.success }]}>
              <Text style={styles.discountBadgeText}>-33%</Text>
            </View>
            <View style={styles.planCardContent}>
              <Text style={[styles.planName, { color: colors.text }]}>Anual</Text>
              <View style={styles.priceRow}>
                <Text style={[styles.priceCurrency, { color: colors.tint }]}>R$</Text>
                <Text style={[styles.priceValue, { color: colors.tint }]}>240</Text>
                <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>/ano</Text>
              </View>
              <Text style={[styles.pricePerMonth, { color: colors.textSecondary }]}>
                R$ 20,00/mês
              </Text>
              <View style={[styles.savingsPill, { backgroundColor: colors.successLight }]}>
                <Ionicons name="trending-down" size={14} color={colors.success} />
                <Text style={[styles.savingsText, { color: colors.success }]}>Economia de R$ 58,80/ano</Text>
              </View>
            </View>
            {selectedPlan === "yearly" && (
              <View style={[styles.checkCircle, { backgroundColor: colors.tint }]}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={() => { Haptics.selectionAsync(); setSelectedPlan("monthly"); }}
            style={[
              styles.planCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              cardShadow(colors.cardShadow),
              selectedPlan === "monthly" && { borderColor: colors.tint, borderWidth: 2 },
            ]}
          >
            <View style={styles.planCardContent}>
              <Text style={[styles.planName, { color: colors.text }]}>Mensal</Text>
              <View style={styles.priceRow}>
                <Text style={[styles.priceCurrency, { color: colors.tint }]}>R$</Text>
                <Text style={[styles.priceValue, { color: colors.tint }]}>24,90</Text>
                <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>/mês</Text>
              </View>
              <Text style={[styles.pricePerMonth, { color: colors.textSecondary }]}>
                Cobrança mensal
              </Text>
            </View>
            {selectedPlan === "monthly" && (
              <View style={[styles.checkCircle, { backgroundColor: colors.tint }]}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
            )}
          </Pressable>
        </View>

        <View style={[styles.featuresCard, { backgroundColor: colors.surface }, cardShadow(colors.cardShadow)]}>
          <Text style={[styles.featuresTitle, { color: colors.text }]}>O que você recebe</Text>
          {FEATURES_PREMIUM.map((f, i) => (
            <View key={i} style={[styles.featureItem, i < FEATURES_PREMIUM.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={[styles.featureIconCircle, { backgroundColor: colors.tintLight }]}>
                <Ionicons name={f.icon as any} size={18} color={colors.tint} />
              </View>
              <Text style={[styles.featureItemText, { color: colors.text }]}>{f.text}</Text>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            </View>
          ))}
        </View>

        <View style={[styles.comparisonCard, { backgroundColor: colors.surface }, cardShadow(colors.cardShadow)]}>
          <Text style={[styles.featuresTitle, { color: colors.text }]}>Plano Free</Text>
          {FEATURES_FREE.map((f, i) => (
            <View key={i} style={[styles.featureItem, i < FEATURES_FREE.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={[styles.featureIconCircle, { backgroundColor: colors.inputBg }]}>
                <Ionicons name={f.icon as any} size={18} color={colors.textSecondary} />
              </View>
              <Text style={[styles.featureItemText, { color: colors.textSecondary }]}>{f.text}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.subscribeBtn,
            { backgroundColor: colors.tint },
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            isLoading && { opacity: 0.6 },
          ]}
          onPress={() => setConfirmUpgradeVisible(true)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="star" size={20} color="#fff" />
              <Text style={styles.subscribeBtnText}>
                Assinar Premium - {selectedPlan === "monthly" ? "R$ 24,90/mês" : "R$ 240,00/ano"}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.restoreBtn, pressed && { opacity: 0.7 }]}
          onPress={handleRestore}
          disabled={restoring}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Text style={[styles.restoreBtnText, { color: colors.textSecondary }]}>Restaurar compras</Text>
          )}
        </Pressable>

        <Text style={[styles.legalText, { color: colors.textSecondary }]}>
          A assinatura é renovada automaticamente. Você pode cancelar a qualquer momento nas configurações da Google Play Store.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.restoreBtn, pressed && { opacity: 0.7 }]}
          onPress={handleOpenCancelLink}
        >
          <Text style={[styles.restoreBtnText, { color: colors.textSecondary }]}>
            Abrir link de cancelamento
          </Text>
        </Pressable>
      </ScrollView>

      <ConfirmDialog
        visible={confirmUpgradeVisible}
        title="Confirmar assinatura"
        message={`Você está prestes a assinar o plano ${selectedPlan === "monthly" ? "mensal" : "anual"}. O cancelamento pode ser feito na Google Play e o acesso Premium permanece até o fim do período contratado.`}
        icon="star"
        iconColor={colors.warning}
        confirmLabel="Continuar"
        cancelLabel="Voltar"
        confirmColor={colors.tint}
        loading={isLoading}
        onConfirm={handleSubscribe}
        onCancel={() => setConfirmUpgradeVisible(false)}
      />

      <ConfirmDialog
        visible={!!dialog}
        title={dialog?.title || ""}
        message={dialog?.message || ""}
        icon={dialog?.icon}
        iconColor={dialog?.iconColor}
        confirmLabel="OK"
        confirmColor={dialog?.confirmColor}
        singleAction
        onConfirm={() => {
          if (dialog?.onConfirm) {
            dialog.onConfirm();
            return;
          }
          setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  content: { padding: 20 },
  heroSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  planCards: { gap: 12, marginBottom: 24 },
  planCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  planCardContent: { flex: 1 },
  discountBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  discountBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  planName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  priceCurrency: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  priceValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  pricePeriod: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginLeft: 2,
  },
  pricePerMonth: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  savingsPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
    gap: 4,
  },
  savingsText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  featuresCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  comparisonCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 14,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  featureIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  featureItemText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  featureText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  subscribeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    height: 54,
    gap: 8,
  },
  subscribeBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  restoreBtn: {
    alignItems: "center",
    padding: 14,
    marginTop: 4,
  },
  restoreBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textDecorationLine: "underline",
  },
  legalText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 16,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  premiumActiveContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  premiumActiveCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
  },
  premiumIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  premiumActiveTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  premiumActiveSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  subscriptionMetaCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  subscriptionMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  subscriptionMetaLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  subscriptionMetaValue: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  premiumFeaturesList: {
    alignSelf: "stretch",
    gap: 4,
  },
  manageSubscriptionBtn: {
    marginTop: 14,
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  manageSubscriptionText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
