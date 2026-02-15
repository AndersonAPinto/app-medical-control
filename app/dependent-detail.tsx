import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Pressable,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/theme-context";

interface HistoryEntry {
  id: string;
  medId: string;
  timeMillis: number;
  status: string;
  confirmedAt: number | null;
  medicationName: string;
  medicationDosage: string;
}

function HistoryItem({ item, colors }: { item: HistoryEntry; colors: typeof Colors.light }) {
  const isTaken = item.status === "TAKEN";
  const date = new Date(item.confirmedAt || item.timeMillis);
  const day = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <View style={[styles.historyCard, { backgroundColor: colors.surface, shadowColor: colors.cardShadow }]}>
      <View style={[styles.historyIcon, { backgroundColor: isTaken ? colors.successLight : colors.dangerLight }]}>
        <Ionicons
          name={isTaken ? "checkmark-circle" : "close-circle"}
          size={22}
          color={isTaken ? colors.success : colors.danger}
        />
      </View>
      <View style={styles.historyInfo}>
        <Text style={[styles.historyMedName, { color: colors.text }]}>{item.medicationName}</Text>
        <Text style={[styles.historyDosage, { color: colors.textSecondary }]}>{item.medicationDosage}</Text>
        <View style={styles.historyMeta}>
          <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
          <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>{day}</Text>
          <View style={[styles.metaDot, { backgroundColor: colors.textSecondary }]} />
          <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
          <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>{time}</Text>
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: isTaken ? colors.successLight : colors.dangerLight }]}>
        <Text style={[styles.statusText, { color: isTaken ? colors.success : colors.danger }]}>
          {isTaken ? "Tomou" : "Perdeu"}
        </Text>
      </View>
    </View>
  );
}

export default function DependentDetailScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();

  const historyQuery = useQuery<HistoryEntry[]>({
    queryKey: ["/api/dependents", id, "history"],
    enabled: !!id,
  });

  const medsQuery = useQuery({
    queryKey: ["/api/dependents", id, "medications"],
    enabled: !!id,
  });

  const history = historyQuery.data || [];
  const meds = (medsQuery.data as any[]) || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, { backgroundColor: colors.inputBg }]}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{name || "Dependente"}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Historico de doses</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, shadowColor: colors.cardShadow }]}>
          <Ionicons name="medkit" size={20} color={colors.tint} />
          <Text style={[styles.summaryValue, { color: colors.text }]}>{meds.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Remedios</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, shadowColor: colors.cardShadow }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={[styles.summaryValue, { color: colors.success }]}>{history.filter(h => h.status === "TAKEN").length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Tomadas</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, shadowColor: colors.cardShadow }]}>
          <Ionicons name="close-circle" size={20} color={colors.danger} />
          <Text style={[styles.summaryValue, { color: colors.danger }]}>{history.filter(h => h.status === "MISSED").length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Perdidas</Text>
        </View>
      </View>

      {historyQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando historico...</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <HistoryItem item={item} colors={colors} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24 },
            history.length === 0 && { flex: 1 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={historyQuery.isRefetching}
              onRefresh={() => {
                historyQuery.refetch();
                medsQuery.refetch();
              }}
              tintColor={colors.tint}
            />
          }
          ListHeaderComponent={
            history.length > 0 ? (
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {history.length} {history.length === 1 ? "registro" : "registros"}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.inputBg }]}>
                <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum registro</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Este dependente ainda nao possui historico de doses
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    paddingTop: 16,
    paddingBottom: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  listContent: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingLeft: 4,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
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
  historyMedName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  historyDosage: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  historyMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  historyMetaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
