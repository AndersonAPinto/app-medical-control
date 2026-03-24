import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/theme-context";
import { cardShadow } from "@/lib/shadows";
import { apiRequest, queryClient } from "@/lib/query-client";
import { scheduleNextDoseNotification, cancelMedicationNotifications } from "@/lib/push-notifications";

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  relatedId: string | null;
  createdAt: string;
}

interface NotificationSection {
  title: string;
  data: Notification[];
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
  return `há ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
}

function groupNotificationsByDate(notifications: Notification[]): NotificationSection[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<string, Notification[]> = {
    "Hoje": [],
    "Ontem": [],
    "Esta semana": [],
    "Anteriores": [],
  };

  for (const n of notifications) {
    const d = new Date(n.createdAt);
    d.setHours(0, 0, 0, 0);
    if (d >= today) {
      groups["Hoje"].push(n);
    } else if (d >= yesterday) {
      groups["Ontem"].push(n);
    } else if (d >= weekAgo) {
      groups["Esta semana"].push(n);
    } else {
      groups["Anteriores"].push(n);
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([title, data]) => ({ title, data }));
}

function getNotificationIcon(type: string): { name: keyof typeof Ionicons.glyphMap; colorKey: "warning" | "danger" | "tint" | "success" } {
  switch (type) {
    case "DOSE_DUE": return { name: "alarm-outline", colorKey: "tint" };
    case "DOSE_MISSED": return { name: "alert-circle-outline", colorKey: "danger" };
    case "STOCK_LOW": return { name: "cube-outline", colorKey: "warning" };
    case "STOCK_EMPTY": return { name: "cube", colorKey: "danger" };
    case "CONNECTION_REQUEST": return { name: "person-add-outline", colorKey: "tint" };
    case "CONNECTION_ACCEPTED": return { name: "checkmark-circle-outline", colorKey: "success" };
    default: return { name: "notifications-outline", colorKey: "tint" };
  }
}

function getIconBgColor(colorKey: string, colors: typeof Colors.light): string {
  switch (colorKey) {
    case "warning": return colors.warningLight;
    case "danger": return colors.dangerLight;
    case "success": return colors.successLight;
    default: return colors.tintLight;
  }
}

function NotificationCard({
  notification, colors, onPress, onTakeNow, onSkip, isTaking,
}: {
  notification: Notification;
  colors: typeof Colors.light;
  onPress: () => void;
  onTakeNow?: () => void;
  onSkip?: () => void;
  isTaking?: boolean;
}) {
  const icon = getNotificationIcon(notification.type);
  const iconColor = colors[icon.colorKey];
  const iconBg = getIconBgColor(icon.colorKey, colors);
  const isDoseAction = notification.type === "DOSE_DUE" || notification.type === "DOSE_MISSED";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: notification.read ? colors.surface : colors.tintLight },
        cardShadow(colors.cardShadow),
        !notification.read && { borderLeftWidth: 3, borderLeftColor: colors.tint },
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name={icon.name} size={22} color={iconColor} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{notification.title}</Text>
        <Text style={[styles.cardMessage, { color: colors.textSecondary }]} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={[styles.cardTime, { color: colors.textSecondary }]}>
          {formatRelativeTime(notification.createdAt)}
        </Text>
        {isDoseAction && notification.relatedId && (
          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.successLight }, pressed && { opacity: 0.7 }]}
              onPress={(e) => { e.stopPropagation(); onTakeNow?.(); }}
              disabled={isTaking}
            >
              {isTaking ? (
                <ActivityIndicator size="small" color={colors.success} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={14} color={colors.success} />
                  <Text style={[styles.actionBtnText, { color: colors.success }]}>Tomar agora</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.inputBg }, pressed && { opacity: 0.7 }]}
              onPress={(e) => { e.stopPropagation(); onSkip?.(); }}
            >
              <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Pular</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function NotificationsTabScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const [takingId, setTakingId] = React.useState<string | null>(null);

  const notificationsQuery = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const takeDoseMutation = useMutation({
    mutationFn: async ({ medId, notifId }: { medId: string; notifId: string }) => {
      await apiRequest("POST", `/api/medications/${medId}/take-dose`);
      return { medId, notifId };
    },
    onSuccess: async ({ medId, notifId }) => {
      setTakingId(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await cancelMedicationNotifications(medId);
      const nextDoseTime = Date.now() + 8 * 60 * 60 * 1000;
      await scheduleNextDoseNotification(medId, "", nextDoseTime);
      markReadMutation.mutate(notifId);
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
    },
    onError: () => setTakingId(null),
  });

  const notifications = notificationsQuery.data || [];
  const sections = groupNotificationsByDate(notifications);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notificações</Text>
        <Pressable
          style={styles.headerAction}
          onPress={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending}
          hitSlop={8}
        >
          <Text style={[styles.markAllText, { color: colors.tint }, markAllReadMutation.isPending && { opacity: 0.5 }]}>
            Marcar lidas
          </Text>
        </Pressable>
      </View>

      {notificationsQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationCard
              notification={item}
              colors={colors}
              onPress={() => { if (!item.read) markReadMutation.mutate(item.id); }}
              onTakeNow={() => {
                if (!item.relatedId) return;
                setTakingId(item.id);
                takeDoseMutation.mutate({ medId: item.relatedId, notifId: item.id });
              }}
              onSkip={() => markReadMutation.mutate(item.id)}
              isTaking={takingId === item.id}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>{section.title}</Text>
            </View>
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 100 + (Platform.OS === "web" ? 34 : 0) },
            notifications.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.inputBg }]}>
                <Ionicons name="notifications-outline" size={36} color={colors.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma notificação</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Você está em dia com tudo!</Text>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={notificationsQuery.isFetching && !notificationsQuery.isLoading}
              onRefresh={() => notificationsQuery.refetch()}
              tintColor={colors.tint}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  headerAction: {
    alignItems: "flex-end",
  },
  markAllText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 8,
  },
  emptyList: { flex: 1 },
  card: {
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: { flex: 1 },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  cardMessage: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
    lineHeight: 18,
  },
  cardTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
    textAlign: "right",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
    minHeight: 32,
  },
  actionBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
