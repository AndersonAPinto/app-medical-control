import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/subscription-context";
import { cardShadow } from "@/lib/shadows";

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
  const { user } = useAuth();
  const { isPremium, isLoading, purchaseMonthly, purchaseYearly, restorePurchases } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<PlanInterval>("yearly");
  const [restoring, setRestoring] = useState(false);

  const handleSubscribe = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (selectedPlan === "monthly") {
        await purchaseMonthly();
      } else {
        await purchaseYearly();
      }
      Alert.alert("Sucesso!", "Seu plano foi atualizado para Premium! Aproveite todos os recursos.");
      router.back();
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Não foi possível processar a assinatura.");
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restorePurchases();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Restaurado", "Suas compras foram restauradas com sucesso.");
    } catch (err: any) {
      Alert.alert("Erro", "Não foi possível restaurar as compras.");
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
              Você tem acesso a todos os recursos do MedControl Premium.
            </Text>
            <View style={styles.premiumFeaturesList}>
              {FEATURES_PREMIUM.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name={f.icon as any} size={18} color={colors.success} />
                  <Text style={[styles.featureText, { color: colors.text }]}>{f.text}</Text>
                </View>
              ))}
            </View>
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
          <Text style={[styles.heroTitle, { color: colors.text }]}>MedControl Premium</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Desbloqueie todo o potencial do MedControl
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
          onPress={handleSubscribe}
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
      </ScrollView>
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
  premiumFeaturesList: {
    alignSelf: "stretch",
    gap: 4,
  },
});
