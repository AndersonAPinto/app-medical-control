import React from "react";
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

interface Medication {
  id: string;
  name: string;
  dosage: string;
  currentStock: number;
  alertThreshold: number;
  intervalInHours: number;
  ownerId: string;
}

function MedicationDetailCard({ med, onDelete }: { med: Medication; onDelete: (id: string) => void }) {
  const isLowStock = med.currentStock <= med.alertThreshold;
  const isOutOfStock = med.currentStock === 0;
  const stockPercentage = med.alertThreshold > 0
    ? Math.min((med.currentStock / (med.alertThreshold * 3)) * 100, 100)
    : 100;

  return (
    <View style={styles.detailCard}>
      <View style={styles.detailHeader}>
        <View style={[styles.medIcon, isOutOfStock && styles.medIconDanger, isLowStock && !isOutOfStock && styles.medIconWarning]}>
          <Ionicons
            name="medical"
            size={22}
            color={isOutOfStock ? Colors.light.danger : isLowStock ? Colors.light.warning : Colors.light.tint}
          />
        </View>
        <View style={styles.detailInfo}>
          <Text style={styles.detailName}>{med.name}</Text>
          <Text style={styles.detailDosage}>{med.dosage}</Text>
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
          <Ionicons name="trash-outline" size={20} color={Colors.light.danger} />
        </Pressable>
      </View>

      <View style={styles.detailStats}>
        <View style={styles.detailStat}>
          <Ionicons name="time-outline" size={16} color={Colors.light.textSecondary} />
          <Text style={styles.detailStatText}>A cada {med.intervalInHours}h</Text>
        </View>
        <View style={styles.detailStat}>
          <Ionicons name="cube-outline" size={16} color={Colors.light.textSecondary} />
          <Text style={styles.detailStatText}>{med.currentStock} unidades</Text>
        </View>
        <View style={styles.detailStat}>
          <Ionicons name="notifications-outline" size={16} color={Colors.light.textSecondary} />
          <Text style={styles.detailStatText}>Alerta: {med.alertThreshold} un.</Text>
        </View>
      </View>

      <View style={styles.stockBarContainer}>
        <View style={styles.stockBarBg}>
          <View
            style={[
              styles.stockBarFill,
              {
                width: `${stockPercentage}%`,
                backgroundColor: isOutOfStock
                  ? Colors.light.danger
                  : isLowStock
                  ? Colors.light.warning
                  : Colors.light.success,
              },
            ]}
          />
        </View>
        <Text style={[styles.stockLabel, isLowStock && styles.stockLabelWarning]}>
          {isOutOfStock ? "Sem estoque" : isLowStock ? "Estoque baixo" : "Estoque adequado"}
        </Text>
      </View>
    </View>
  );
}

export default function MedicationsScreen() {
  const insets = useSafeAreaInsets();

  const medsQuery = useQuery<Medication[]>({
    queryKey: ["/api/medications"],
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

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8 }]}>
        <Text style={styles.headerTitle}>Medicamentos</Text>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
          onPress={() => router.push("/add-medication")}
        >
          <Ionicons name="add" size={24} color={Colors.light.tint} />
        </Pressable>
      </View>

      {medsQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      ) : medications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="medkit-outline" size={56} color={Colors.light.border} />
          <Text style={styles.emptyTitle}>Lista vazia</Text>
          <Text style={styles.emptyText}>Cadastre seus medicamentos para acompanhar estoque e horarios</Text>
        </View>
      ) : (
        <FlatList
          data={medications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MedicationDetailCard med={item} onDelete={(id) => deleteMutation.mutate(id)} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={medsQuery.isFetching}
              onRefresh={() => medsQuery.refetch()}
              tintColor={Colors.light.tint}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.tintLight,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
    gap: 14,
  },
  detailCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 18,
    padding: 16,
    shadowColor: Colors.light.cardShadow,
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
    backgroundColor: Colors.light.tintLight,
    alignItems: "center",
    justifyContent: "center",
  },
  medIconDanger: {
    backgroundColor: Colors.light.dangerLight,
  },
  medIconWarning: {
    backgroundColor: Colors.light.warningLight,
  },
  detailInfo: {
    flex: 1,
  },
  detailName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  detailDosage: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
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
    color: Colors.light.textSecondary,
  },
  stockBarContainer: {
    marginTop: 14,
  },
  stockBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.inputBg,
    overflow: "hidden",
  },
  stockBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  stockLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.light.success,
    marginTop: 6,
  },
  stockLabelWarning: {
    color: Colors.light.warning,
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
    color: Colors.light.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center" as const,
  },
});
