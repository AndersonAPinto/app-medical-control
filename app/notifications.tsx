import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/theme-context";
import { cardShadow } from "@/lib/shadows";
import { apiRequest, queryClient } from "@/lib/query-client";

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

function getNotificationIcon(type: string): { name: keyof typeof Ionicons.glyphMap; colorKey: "warning" | "danger" | "tint" | "success" } {
  switch (type) {
    case "DOSE_DUE":
      return { name: "alarm-outline", colorKey: "tint" };
    case "DOSE_MISSED":
      return { name: "alert-circle-outline", colorKey: "danger" };
    case "STOCK_LOW":
      return { name: "cube-outline", colorKey: "warning" };
    case "STOCK_EMPTY":
      return { name: "cube", colorKey: "danger" };
    case "CONNECTION_REQUEST":
      return { name: "person-add-outline", colorKey: "tint" };
    case "CONNECTION_ACCEPTED":
      return { name: "checkmark-circle-outline", colorKey: "success" };
    default:
      return { name: "notifications-outline", colorKey: "tint" };
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
  notification,
  colors,
  onPress,
}: {
  notification: Notification;
  colors: typeof Colors.light;
  onPress: () => void;
}) {
  const icon = getNotificationIcon(notification.type);
  const iconColor = colors[icon.colorKey];
  const iconBg = getIconBgColor(icon.colorKey, colors);

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
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

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

  const notifications = notificationsQuery.data || [];

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-outline" size={56} color={colors.border} />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhuma notificação</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12,
          },
        ]}
      >
        <Pressable style={styles.headerSideBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          Notificações
        </Text>
        <Pressable
          style={styles.headerAction}
          onPress={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending}
          hitSlop={8}
        >
          <Text
            style={[styles.markAllText, { color: colors.tint }, markAllReadMutation.isPending && { opacity: 0.5 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            Marcar como lidas
          </Text>
        </Pressable>
      </View>

      {notificationsQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationCard
              notification={item}
              colors={colors}
              onPress={() => handleNotificationPress(item)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 20 + (Platform.OS === "web" ? 34 : 0) },
            notifications.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerSideBtn: {
    width: 28,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    marginHorizontal: 10,
  },
  headerAction: {
    minWidth: 110,
    maxWidth: "45%",
    alignItems: "flex-end",
  },
  markAllText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  emptyList: {
    flex: 1,
  },
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
  cardContent: {
    flex: 1,
  },
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
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
