import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useTheme } from "@/lib/theme-context";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  currentStock: number;
  alertThreshold: number;
  intervalInHours: number;
  ownerId: string;
}

interface HistoryEntry {
  id: string;
  medId: string;
  timeMillis: number;
  status: string;
  confirmedAt: string;
  medicationName: string;
  medicationDosage: string;
}

function MedicationDetailCard({ med, onDelete, onEdit, colors }: { med: Medication; onDelete: (id: string) => void; onEdit: (id: string) => void; colors: typeof Colors.light }) {
  const isLowStock = med.currentStock <= med.alertThreshold;
  const isOutOfStock = med.currentStock === 0;
  const stockPercentage = med.alertThreshold > 0
    ? Math.min((med.currentStock / (med.alertThreshold * 3)) * 100, 100)
    : 100;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onEdit(med.id);
      }}
      style={({ pressed }) => [styles.detailCard, { backgroundColor: colors.surface, shadowColor: colors.cardShadow }, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.detailHeader}>
        <View style={[styles.medIcon, { backgroundColor: colors.tintLight }, isOutOfStock && { backgroundColor: colors.dangerLight }, isLowStock && !isOutOfStock && { backgroundColor: colors.warningLight }]}>
          <Ionicons
            name="medical"
            size={22}
            color={isOutOfStock ? colors.danger : isLowStock ? colors.warning : colors.tint}
          />
        </View>
        <View style={styles.detailInfo}>
          <Text style={[styles.detailName, { color: colors.text }]}>{med.name}</Text>
          <Text style={[styles.detailDosage, { color: colors.textSecondary }]}>{med.dosage}</Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Alert.alert(
              "Remover",
              `Deseja remover ${med.name}?`,
              [
                { text: "Cancelar", style: "cancel" },
                { text: "Remover", style: "destructive", onPress: () => onDelete(med.id) },
              ]
            );
          }}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </Pressable>
      </View>

      <View style={styles.detailStats}>
        <View style={styles.detailStat}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.detailStatText, { color: colors.textSecondary }]}>A cada {med.intervalInHours}h</Text>
        </View>
        <View style={styles.detailStat}>
          <Ionicons name="cube-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.detailStatText, { color: colors.textSecondary }]}>{med.currentStock} unidades</Text>
        </View>
        <View style={styles.detailStat}>
          <Ionicons name="notifications-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.detailStatText, { color: colors.textSecondary }]}>Alerta: {med.alertThreshold} un.</Text>
        </View>
      </View>

      <View style={styles.stockBarContainer}>
        <View style={[styles.stockBarBg, { backgroundColor: colors.inputBg }]}>
          <View
            style={[
              styles.stockBarFill,
              {
                width: `${stockPercentage}%`,
                backgroundColor: isOutOfStock
                  ? colors.danger
                  : isLowStock
                  ? colors.warning
                  : colors.success,
              },
            ]}
          />
        </View>
        <Text style={[styles.stockLabel, { color: colors.success }, isLowStock && { color: colors.warning }]}>
          {isOutOfStock ? "Sem estoque" : isLowStock ? "Estoque baixo" : "Estoque adequado"}
        </Text>
      </View>
    </Pressable>
  );
}

function HistoryItem({ entry, colors }: { entry: HistoryEntry; colors: typeof Colors.light }) {
  const confirmedDate = entry.confirmedAt ? new Date(entry.confirmedAt) : new Date(entry.timeMillis);
  const formattedDate = confirmedDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const formattedTime = confirmedDate.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={[styles.historyCard, { backgroundColor: colors.surface, shadowColor: colors.cardShadow }]}>
      <View style={[styles.historyIcon, { backgroundColor: colors.successLight }]}>
        <Ionicons name="checkmark-circle" size={22} color={colors.success} />
      </View>
      <View style={styles.historyInfo}>
        <Text style={[styles.historyName, { color: colors.text }]}>{entry.medicationName}</Text>
        <Text style={[styles.historyDosage, { color: colors.textSecondary }]}>{entry.medicationDosage}</Text>
      </View>
      <View style={styles.historyTime}>
        <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{formattedDate}</Text>
        <Text style={[styles.historyHour, { color: colors.text }]}>{formattedTime}</Text>
      </View>
    </View>
  );
}

export default function MedicationsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"remedios" | "historico">("remedios");
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const medsQuery = useQuery<Medication[]>({
    queryKey: ["/api/medications"],
  });

  const historyQuery = useQuery<HistoryEntry[]>({
    queryKey: ["/api/schedules/history"],
    enabled: activeTab === "historico",
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/medications/${id}`);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
    },
  });

  const medications = medsQuery.data || [];
  const history = historyQuery.data || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Medicamentos</Text>
        <Pressable
          style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.tintLight }, pressed && { opacity: 0.7 }]}
          onPress={() => router.push("/add-medication")}
        >
          <Ionicons name="add" size={24} color={colors.tint} />
        </Pressable>
      </View>

      <View style={[styles.segmentContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.segmentControl, { backgroundColor: colors.inputBg }]}>
          <Pressable
            style={[styles.segmentBtn, activeTab === "remedios" && [styles.segmentBtnActive, { backgroundColor: colors.surface, shadowColor: colors.cardShadow }]]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("remedios");
            }}
          >
            <Text style={[styles.segmentText, { color: colors.textSecondary }, activeTab === "remedios" && [styles.segmentTextActive, { color: colors.text }]]}>
              Remedios
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, activeTab === "historico" && [styles.segmentBtnActive, { backgroundColor: colors.surface, shadowColor: colors.cardShadow }]]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("historico");
            }}
          >
            <Text style={[styles.segmentText, { color: colors.textSecondary }, activeTab === "historico" && [styles.segmentTextActive, { color: colors.text }]]}>
              Historico
            </Text>
          </Pressable>
        </View>
      </View>

      {activeTab === "remedios" ? (
        <>
          {medsQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : medications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="medkit-outline" size={56} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Lista vazia</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Cadastre seus medicamentos para acompanhar estoque e horarios</Text>
            </View>
          ) : (
            <FlatList
              data={medications}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <MedicationDetailCard
                  med={item}
                  colors={colors}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onEdit={(id) => router.push(`/edit-medication?id=${id}`)}
                />
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
          )}
        </>
      ) : (
        <>
          {historyQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={56} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma dose registrada</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>O historico de doses confirmadas aparecera aqui</Text>
            </View>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <HistoryItem entry={item} colors={colors} />}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={historyQuery.isFetching}
                  onRefresh={() => historyQuery.refetch()}
                  tintColor={colors.tint}
                />
              }
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  segmentControl: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  segmentTextActive: {
    fontFamily: "Inter_600SemiBold",
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
    gap: 14,
  },
  detailCard: {
    borderRadius: 18,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  medIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  detailInfo: {
    flex: 1,
  },
  detailName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  detailDosage: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  detailStats: {
    flexDirection: "row",
    marginTop: 14,
    gap: 16,
  },
  detailStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailStatText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  stockBarContainer: {
    marginTop: 14,
  },
  stockBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  stockBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  stockLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 6,
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
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  historyDosage: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  historyTime: {
    alignItems: "flex-end",
  },
  historyDate: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  historyHour: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
});
