import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from "react-native";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { cardShadow, smallShadow } from "@/lib/shadows";
import { apiRequest, queryClient } from "@/lib/query-client";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  currentStock: number;
  alertThreshold: number;
  intervalInHours: number;
  ownerId: string;
}

interface Schedule {
  id: string;
  medId: string;
  timeMillis: number;
  status: string;
  confirmedAt: number | null;
}

interface DependentSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  takenToday: number;
  missedToday: number;
  totalMeds: number;
}

function MedicationCard({ med, onConfirmDose, colors }: { med: Medication; onConfirmDose: (med: Medication) => void; colors: typeof Colors.light }) {
  const isLowStock = med.currentStock <= med.alertThreshold;
  const isOutOfStock = med.currentStock === 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.medCard, { backgroundColor: colors.surface }, cardShadow(colors.cardShadow), pressed && styles.cardPressed]}
      onPress={() => {}}
    >
      <View style={styles.medCardLeft}>
        <View style={[styles.medIcon, { backgroundColor: colors.tintLight }, isOutOfStock && { backgroundColor: colors.dangerLight }, isLowStock && !isOutOfStock && { backgroundColor: colors.warningLight }]}>
          <Ionicons
            name="medical"
            size={22}
            color={isOutOfStock ? colors.danger : isLowStock ? colors.warning : colors.tint}
          />
        </View>
        <View style={styles.medInfo}>
          <Text style={[styles.medName, { color: colors.text }]}>{med.name}</Text>
          <Text style={[styles.medDosage, { color: colors.textSecondary }]}>{med.dosage}</Text>
          <View style={styles.medMeta}>
            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.medMetaText, { color: colors.textSecondary }]}>A cada {med.intervalInHours}h</Text>
            <View style={[styles.metaDot, { backgroundColor: colors.textSecondary }]} />
            <Ionicons
              name="cube-outline"
              size={12}
              color={isLowStock ? colors.warning : colors.textSecondary}
            />
            <Text style={[styles.medMetaText, { color: colors.textSecondary }, isLowStock && { color: colors.warning, fontFamily: "Inter_600SemiBold" }]}>
              {med.currentStock} un.
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.confirmBtn, { backgroundColor: colors.success }, pressed && styles.confirmBtnPressed]}
        onPress={() => onConfirmDose(med)}
      >
        <Ionicons name="checkmark" size={22} color="#fff" />
      </Pressable>
    </Pressable>
  );
}

function DependentCard({ dep, colors }: { dep: DependentSummary; colors: typeof Colors.light }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.depCard, { backgroundColor: colors.surface }, cardShadow(colors.cardShadow), pressed && styles.cardPressed]}
      onPress={() => router.push({ pathname: "/dependent-detail", params: { id: dep.id, name: dep.name } })}
    >
      <View style={styles.depCardLeft}>
        <View style={[styles.depAvatar, { backgroundColor: colors.tintLight }]}>
          <Text style={[styles.depAvatarText, { color: colors.tint }]}>
            {dep.name?.charAt(0)?.toUpperCase() || "?"}
          </Text>
        </View>
        <View style={styles.depInfo}>
          <Text style={[styles.depName, { color: colors.text }]}>{dep.name}</Text>
          <Text style={[styles.depEmail, { color: colors.textSecondary }]}>{dep.email}</Text>
          <View style={styles.depStats}>
            <View style={styles.depStatItem}>
              <Ionicons name="medkit-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.depStatText, { color: colors.textSecondary }]}>{dep.totalMeds} remédios</Text>
            </View>
            <View style={[styles.metaDot, { backgroundColor: colors.textSecondary }]} />
            <View style={styles.depStatItem}>
              <Ionicons name="checkmark-circle-outline" size={12} color={colors.success} />
              <Text style={[styles.depStatText, { color: colors.success }]}>{dep.takenToday} hoje</Text>
            </View>
            {dep.missedToday > 0 && (
              <>
                <View style={[styles.metaDot, { backgroundColor: colors.textSecondary }]} />
                <View style={styles.depStatItem}>
                  <Ionicons name="close-circle-outline" size={12} color={colors.danger} />
                  <Text style={[styles.depStatText, { color: colors.danger }]}>{dep.missedToday} atrasos</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

export default function DashboardScreen() {
  const { user, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const isMaster = user?.role === "MASTER";
  const [activeTab, setActiveTab] = useState<"meds" | "deps">("meds");
  const [confirmMed, setConfirmMed] = useState<Medication | null>(null);

  const medsQuery = useQuery<Medication[]>({
    queryKey: ["/api/medications"],
  });

  const dependentsQuery = useQuery<DependentSummary[]>({
    queryKey: ["/api/dependents"],
    enabled: isMaster,
  });

  const confirmMutation = useMutation({
    mutationFn: async (med: Medication) => {
      await apiRequest("POST", `/api/medications/${med.id}/take-dose`);
    },
    onSuccess: () => {
      setConfirmMed(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/history"] });
      if (isMaster) {
        queryClient.invalidateQueries({ queryKey: ["/api/dependents"] });
      }
    },
    onError: () => {
      setConfirmMed(null);
    },
  });

  const handleDosePress = useCallback((med: Medication) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConfirmMed(med);
  }, []);

  const medications = medsQuery.data || [];
  const dependents = dependentsQuery.data || [];
  const lowStockMeds = medications.filter((m) => m.currentStock <= m.alertThreshold && m.currentStock > 0);
  const outOfStockMeds = medications.filter((m) => m.currentStock === 0);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const handleAddDependent = () => {
    if (user?.planType === "FREE" && dependents.length >= 1) {
      Alert.alert(
        "Limite do Plano Free",
        "Você atingiu o limite de 1 dependente do plano gratuito. Faça upgrade para Premium para monitorar dependentes ilimitados.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Fazer Upgrade",
            onPress: async () => {
              try {
                await apiRequest("POST", "/api/auth/upgrade");
                await refreshUser();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert("Sucesso", "Plano atualizado para Premium!");
              } catch (e: any) {
                Alert.alert("Erro", e.message || "Não foi possível realizar o upgrade.");
              }
            },
          },
        ]
      );
      return;
    }
    router.push("/connections");
  };

  const renderMedsContent = () => {
    if (medsQuery.isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      );
    }
    if (medications.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="medkit-outline" size={56} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum remédio cadastrado</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Adicione seu primeiro medicamento</Text>
          <Pressable
            style={({ pressed }) => [styles.emptyBtn, { backgroundColor: colors.tint }, pressed && styles.cardPressed]}
            onPress={() => router.push("/add-medication")}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.emptyBtnText}>Adicionar</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <FlatList
        data={medications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MedicationCard med={item} onConfirmDose={handleDosePress} colors={colors} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={medsQuery.isFetching}
            onRefresh={() => medsQuery.refetch()}
            tintColor={colors.tint}
          />
        }
      />
    );
  };

  const renderDepsContent = () => {
    if (dependentsQuery.isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      );
    }
    if (dependents.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={56} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum dependente</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Adicione um dependente para monitorar</Text>
          <Pressable
            style={({ pressed }) => [styles.emptyBtn, { backgroundColor: colors.tint }, pressed && styles.cardPressed]}
            onPress={handleAddDependent}
          >
            <Ionicons name="person-add" size={20} color="#fff" />
            <Text style={styles.emptyBtnText}>Adicionar</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <FlatList
        data={dependents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DependentCard dep={item} colors={colors} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={dependentsQuery.isFetching}
            onRefresh={() => dependentsQuery.refetch()}
            tintColor={colors.tint}
          />
        }
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[Colors.palette.teal600, Colors.palette.teal500]}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.userName}>{user?.name || "Usuário"}</Text>
          </View>
          <View style={styles.roleChip}>
            <Text style={styles.roleChipText}>
              {user?.role === "MASTER" ? "Responsavel" : user?.role === "DEPENDENT" ? "Dependente" : "Controle"}
            </Text>
          </View>
        </View>

        {(lowStockMeds.length > 0 || outOfStockMeds.length > 0) && (
          <View style={styles.alertBanner}>
            <Ionicons name="warning" size={16} color={colors.warning} />
            <Text style={styles.alertText}>
              {outOfStockMeds.length > 0
                ? `${outOfStockMeds.length} remédio(s) sem estoque`
                : `${lowStockMeds.length} remédio(s) com estoque baixo`}
            </Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }, cardShadow(colors.cardShadow)]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{medications.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Remédios</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }, cardShadow(colors.cardShadow)]}>
          <Text style={[styles.statValue, { color: colors.success }]}>{medications.filter(m => m.currentStock > m.alertThreshold).length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Estoque OK</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }, cardShadow(colors.cardShadow)]}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{lowStockMeds.length + outOfStockMeds.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Alertas</Text>
        </View>
      </View>

      {isMaster && (
        <View style={[styles.segmentControl, { backgroundColor: colors.inputBg }]}>
          <Pressable
            style={[styles.segmentBtn, activeTab === "meds" && [styles.segmentBtnActive, { backgroundColor: colors.surface }, smallShadow(colors.cardShadow)]]}
            onPress={() => { Haptics.selectionAsync(); setActiveTab("meds"); }}
          >
            <Ionicons name="medkit-outline" size={16} color={activeTab === "meds" ? colors.tint : colors.textSecondary} />
            <Text style={[styles.segmentText, { color: activeTab === "meds" ? colors.tint : colors.textSecondary }, activeTab === "meds" && styles.segmentTextActive]}>
              Meus Remédios
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, activeTab === "deps" && [styles.segmentBtnActive, { backgroundColor: colors.surface }, smallShadow(colors.cardShadow)]]}
            onPress={() => { Haptics.selectionAsync(); setActiveTab("deps"); }}
          >
            <Ionicons name="people-outline" size={16} color={activeTab === "deps" ? colors.tint : colors.textSecondary} />
            <Text style={[styles.segmentText, { color: activeTab === "deps" ? colors.tint : colors.textSecondary }, activeTab === "deps" && styles.segmentTextActive]}>
              Meus Dependentes
            </Text>
          </Pressable>
        </View>
      )}

      {(!isMaster || activeTab === "meds") && (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isMaster ? "" : "Seus Remédios"}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.tintLight }, pressed && { opacity: 0.7 }]}
            onPress={() => router.push("/add-medication")}
          >
            <Ionicons name="add" size={22} color={colors.tint} />
          </Pressable>
        </View>
      )}

      {activeTab === "deps" && isMaster && (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{""}</Text>
          <Pressable
            style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.tintLight }, pressed && { opacity: 0.7 }]}
            onPress={handleAddDependent}
          >
            <Ionicons name="person-add" size={18} color={colors.tint} />
          </Pressable>
        </View>
      )}

      {(!isMaster || activeTab === "meds") ? renderMedsContent() : renderDepsContent()}

      <ConfirmDialog
        visible={!!confirmMed}
        title="Confirmar Dose"
        message={confirmMed ? `Registrar dose de ${confirmMed.name} (${confirmMed.dosage})?\n\nEstoque atual: ${confirmMed.currentStock} un.` : ""}
        icon="medical"
        iconColor={colors.success}
        confirmLabel="Tomei"
        cancelLabel="Cancelar"
        confirmColor={colors.success}
        loading={confirmMutation.isPending}
        onConfirm={() => { if (confirmMed) confirmMutation.mutate(confirmMed); }}
        onCancel={() => { if (!confirmMutation.isPending) setConfirmMed(null); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greeting: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  userName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginTop: 2,
  },
  roleChip: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  roleChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 10,
    marginTop: 14,
    gap: 8,
  },
  alertText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#fff",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginTop: -1,
    paddingTop: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  segmentControl: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  segmentBtnActive: {},
  segmentText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  segmentTextActive: {
    fontFamily: "Inter_600SemiBold",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 10,
  },
  medCard: {
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  medCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  medIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  medDosage: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  medMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  medMetaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  confirmBtn: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  depCard: {
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  depCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  depAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  depAvatarText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  depInfo: {
    flex: 1,
  },
  depName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  depEmail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  depStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
    flexWrap: "wrap",
  },
  depStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  depStatText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center" as const,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 6,
    marginTop: 12,
  },
  emptyBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
