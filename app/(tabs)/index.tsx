import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  FadeIn,
  FadeOut,
  Easing,
} from "react-native-reanimated";
import ConfirmDialog from "@/components/ConfirmDialog";
import { SkeletonList } from "@/components/SkeletonCard";
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
import { cancelMedicationNotifications, scheduleNextDoseNotification } from "@/lib/push-notifications";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  currentStock: number;
  alertThreshold: number;
  intervalInHours: number;
  ownerId: string;
  lastDoseAt?: number | null;
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

function MedicationCard({ med, onConfirmDose, colors, isOverdue, justTaken }: { med: Medication; onConfirmDose: (med: Medication) => void; colors: typeof Colors.light; isOverdue?: boolean; justTaken?: boolean }) {
  const isLowStock = med.currentStock <= med.alertThreshold;
  const isOutOfStock = med.currentStock === 0;

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!med.lastDoseAt) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, [med.lastDoseAt]);

  const nextDoseTime = med.lastDoseAt ? med.lastDoseAt + med.intervalInHours * 3600000 : null;
  const canTakeDose = nextDoseTime ? now >= nextDoseTime - 300000 : true;

  const pulseOpacity = useSharedValue(1);
  useEffect(() => {
    if (isOverdue) {
      pulseOpacity.value = withRepeat(
        withTiming(0.45, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [isOverdue]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const takenScale = useSharedValue(0);
  const takenOpacity = useSharedValue(0);
  useEffect(() => {
    if (justTaken) {
      takenScale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.back(1.5)) });
      takenOpacity.value = withTiming(1, { duration: 200 });
    } else {
      takenScale.value = withTiming(0, { duration: 200 });
      takenOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [justTaken]);

  const takenStyle = useAnimatedStyle(() => ({
    transform: [{ scale: takenScale.value }],
    opacity: takenOpacity.value,
  }));

  return (
    <Pressable
      style={({ pressed }) => [styles.medCard, { backgroundColor: colors.surface }, isOverdue && { borderWidth: 1, borderColor: colors.danger + "40" }, justTaken && { borderWidth: 1, borderColor: colors.success + "60" }, cardShadow(colors.cardShadow), pressed && styles.cardPressed]}
      onPress={() => {}}
    >
      <View style={styles.medCardLeft}>
        <View style={{ position: "relative" }}>
          <Animated.View style={[styles.medIcon, { backgroundColor: justTaken ? colors.successLight : isOverdue ? colors.dangerLight : colors.tintLight }, isOutOfStock && !justTaken && { backgroundColor: colors.dangerLight }, isLowStock && !isOutOfStock && !isOverdue && !justTaken && { backgroundColor: colors.warningLight }, isOverdue && !justTaken && pulseStyle]}>
            <Ionicons
              name={justTaken ? "checkmark-circle" : isOverdue ? "alert-circle" : "medical"}
              size={22}
              color={justTaken ? colors.success : isOverdue ? colors.danger : isOutOfStock ? colors.danger : isLowStock ? colors.warning : colors.tint}
            />
          </Animated.View>
          <Animated.View style={[{ position: "absolute", top: 0, left: 0, width: 44, height: 44, borderRadius: 13, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" }, takenStyle]}>
            <Ionicons name="checkmark" size={24} color="#fff" />
          </Animated.View>
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
          {isOverdue && (
            <Text style={[styles.medMetaText, { color: colors.danger, marginTop: 4, fontSize: 11, fontFamily: "Inter_600SemiBold" }]}>
              ⚠ Dose atrasada
            </Text>
          )}
          {!canTakeDose && !isOverdue && nextDoseTime && (
            <Text style={[styles.medMetaText, { color: colors.warning, marginTop: 4, fontSize: 11 }]}>
              Próxima dose: {new Date(nextDoseTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.confirmBtn, 
          { backgroundColor: canTakeDose ? colors.success : colors.border }, 
          pressed && canTakeDose && styles.confirmBtnPressed,
          !canTakeDose && { opacity: 0.6 }
        ]}
        onPress={() => canTakeDose && onConfirmDose(med)}
        disabled={!canTakeDose}
      >
        <Ionicons name={canTakeDose ? "checkmark" : "time"} size={22} color="#fff" />
      </Pressable>
    </Pressable>
  );
}

function DependentCard({ dep, index, colors, isDark }: { dep: DependentSummary; index: number; colors: typeof Colors.light; isDark: boolean }) {
  const depColors = isDark ? Colors.dependentColorsDark : Colors.dependentColors;
  const colorSet = depColors[index % depColors.length];

  return (
    <Pressable
      style={({ pressed }) => [styles.depCard, { backgroundColor: colors.surface, borderLeftWidth: 4, borderLeftColor: colorSet.accent }, cardShadow(colors.cardShadow), pressed && styles.cardPressed]}
      onPress={() => router.push({ pathname: "/dependent-detail", params: { id: dep.id, name: dep.name } })}
    >
      <View style={styles.depCardLeft}>
        <View style={[styles.depAvatar, { backgroundColor: colorSet.bg }]}>
          <Text style={[styles.depAvatarText, { color: colorSet.text }]}>
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
          </View>
          <View style={[
            styles.depStatusBadge,
            { backgroundColor: dep.missedToday > 0 ? colors.dangerLight : colors.successLight }
          ]}>
            <Ionicons
              name={dep.missedToday > 0 ? "alert-circle-outline" : "checkmark-circle-outline"}
              size={12}
              color={dep.missedToday > 0 ? colors.danger : colors.success}
            />
            <Text style={[styles.depStatusText, { color: dep.missedToday > 0 ? colors.danger : colors.success }]}>
              {dep.missedToday > 0
                ? `${dep.missedToday} dose${dep.missedToday > 1 ? "s" : ""} atrasada${dep.missedToday > 1 ? "s" : ""}`
                : "Em dia"}
            </Text>
          </View>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color={colorSet.accent} />
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
  const [showDepsLimitDialog, setShowDepsLimitDialog] = useState(false);
  const [showQuickDoseModal, setShowQuickDoseModal] = useState(false);
  const [lastTakenMedId, setLastTakenMedId] = useState<string | null>(null);

  const medsQuery = useQuery<Medication[]>({
    queryKey: ["/api/medications"],
  });

  const unreadQuery = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000,
  });

  const dependentsQuery = useQuery<DependentSummary[]>({
    queryKey: ["/api/dependents"],
    enabled: isMaster,
  });

  const confirmMutation = useMutation({
    mutationFn: async (med: Medication) => {
      await apiRequest("POST", `/api/medications/${med.id}/take-dose`);
      return med;
    },
    onSuccess: async (med: Medication) => {
      setConfirmMed(null);
      setLastTakenMedId(med.id);
      setTimeout(() => setLastTakenMedId(null), 1800);

      await cancelMedicationNotifications(med.id);
      const nextDoseTime = Date.now() + med.intervalInHours * 60 * 60 * 1000;
      await scheduleNextDoseNotification(med.id, med.name, nextDoseTime);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
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
      setShowDepsLimitDialog(true);
      return;
    }
    router.push("/connections");
  };

  const availableMeds = medications.filter((med) => {
    const nowTs = Date.now();
    if (!med.lastDoseAt) return true;
    const nextDoseTime = med.lastDoseAt + med.intervalInHours * 3600000;
    return nowTs >= nextDoseTime - 300000;
  });

  const getMedUrgency = (med: Medication): { priority: number; isOverdue: boolean } => {
    const nowTs = Date.now();
    if (!med.lastDoseAt) return { priority: 1, isOverdue: false }; // never taken → available
    const nextDoseTime = med.lastDoseAt + med.intervalInHours * 3600000;
    const isOverdue = nowTs > nextDoseTime + 300000; // 5+ min past due
    const isAvailable = nowTs >= nextDoseTime - 300000 && !isOverdue;
    if (isOverdue) return { priority: 0, isOverdue: true };
    if (isAvailable) return { priority: 1, isOverdue: false };
    return { priority: 2, isOverdue: false };
  };

  const sortedMedications = [...medications].sort((a, b) => {
    const ua = getMedUrgency(a);
    const ub = getMedUrgency(b);
    if (ua.priority !== ub.priority) return ua.priority - ub.priority;
    // within same priority, sort overdue by how long overdue (most first)
    if (ua.isOverdue && ub.isOverdue) {
      const nextA = a.lastDoseAt! + a.intervalInHours * 3600000;
      const nextB = b.lastDoseAt! + b.intervalInHours * 3600000;
      return nextA - nextB;
    }
    // upcoming: sort by next dose time ascending
    if (ua.priority === 2 && ub.priority === 2) {
      const nextA = a.lastDoseAt! + a.intervalInHours * 3600000;
      const nextB = b.lastDoseAt! + b.intervalInHours * 3600000;
      return nextA - nextB;
    }
    return 0;
  });

  const renderMedsContent = () => {
    if (medsQuery.isLoading) {
      return <SkeletonList count={3} />;
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
        data={sortedMedications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const { isOverdue } = getMedUrgency(item);
          return <MedicationCard med={item} onConfirmDose={handleDosePress} colors={colors} isOverdue={isOverdue} justTaken={lastTakenMedId === item.id} />;
        }}
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
      return <SkeletonList count={2} />;
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
        renderItem={({ item, index }) => <DependentCard dep={item} index={index} colors={colors} isDark={isDark} />}
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
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.userName}>{user?.name || "Usuário"}</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => router.push("/notifications")}
              style={({ pressed }) => [styles.bellBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              {(unreadQuery.data?.count ?? 0) > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {(unreadQuery.data?.count ?? 0) > 99 ? "99+" : unreadQuery.data?.count}
                  </Text>
                </View>
              )}
            </Pressable>
            <View style={styles.roleChip}>
              <Text style={styles.roleChipText}>
                {user?.role === "MASTER" ? "Responsavel" : user?.role === "DEPENDENT" ? "Dependente" : "Controle"}
              </Text>
            </View>
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

      <ConfirmDialog
        visible={showDepsLimitDialog}
        title="Limite do Plano Free"
        message="Você atingiu o limite de 1 dependente do plano gratuito. Assine o Premium para monitorar dependentes ilimitados."
        icon="people"
        iconColor={colors.warning}
        confirmLabel="Ver Planos"
        cancelLabel="Cancelar"
        confirmColor={colors.warning}
        onConfirm={() => {
          setShowDepsLimitDialog(false);
          router.push("/subscription");
        }}
        onCancel={() => setShowDepsLimitDialog(false)}
      />

      {availableMeds.length > 0 && activeTab === "meds" && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.fab}>
          <Pressable
            style={({ pressed }) => [styles.fabBtn, { backgroundColor: colors.tint }, pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (availableMeds.length === 1) {
                handleDosePress(availableMeds[0]);
              } else {
                setShowQuickDoseModal(true);
              }
            }}
          >
            <Ionicons name="checkmark" size={28} color="#fff" />
          </Pressable>
        </Animated.View>
      )}

      <Modal
        visible={showQuickDoseModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowQuickDoseModal(false)}
      >
        <Pressable style={styles.quickDoseBackdrop} onPress={() => setShowQuickDoseModal(false)}>
          <View style={[styles.quickDoseSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.quickDoseHandle} />
            <Text style={[styles.quickDoseTitle, { color: colors.text }]}>Registrar Dose Rápida</Text>
            <Text style={[styles.quickDoseSubtitle, { color: colors.textSecondary }]}>Selecione o medicamento que tomou:</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {availableMeds.map((med) => (
                <Pressable
                  key={med.id}
                  style={({ pressed }) => [styles.quickDoseItem, { borderBottomColor: colors.border }, pressed && { backgroundColor: colors.inputBg }]}
                  onPress={() => {
                    setShowQuickDoseModal(false);
                    handleDosePress(med);
                  }}
                >
                  <View style={[styles.quickDoseIcon, { backgroundColor: colors.tintLight }]}>
                    <Ionicons name="medical" size={18} color={colors.tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.quickDoseName, { color: colors.text }]}>{med.name}</Text>
                    <Text style={[styles.quickDoseDosage, { color: colors.textSecondary }]}>{med.dosage}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bellBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute" as const,
    top: 2,
    right: 2,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
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
    width: 48,
    height: 48,
    borderRadius: 14,
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
    width: 52,
    height: 52,
    borderRadius: 16,
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
  depStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  depStatusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
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
  fab: {
    position: "absolute",
    bottom: 100,
    right: 20,
  },
  fabBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  quickDoseBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  quickDoseSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  quickDoseHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(100,116,139,0.3)",
    alignSelf: "center",
    marginBottom: 16,
  },
  quickDoseTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  quickDoseSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
  },
  quickDoseItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
  },
  quickDoseIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quickDoseName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  quickDoseDosage: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
});
