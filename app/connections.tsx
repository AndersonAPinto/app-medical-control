import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { cardShadow } from "@/lib/shadows";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Connection {
  id: string;
  masterId: string;
  dependentId: string;
  status: "PENDING" | "ACCEPTED";
  linkedName: string;
  linkedEmail: string;
  linkedRole: string;
}

interface SearchedUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  MASTER: "Responsavel",
  DEPENDENT: "Dependente",
  CONTROLLER: "Controle",
};

function ConnectionItem({
  item,
  userId,
  onDelete,
  onAccept,
  deletingId,
  acceptingId,
  colors,
}: {
  item: Connection;
  userId: string | undefined;
  onDelete: (id: string) => void;
  onAccept: (id: string) => void;
  deletingId: string | null;
  acceptingId: string | null;
  colors: typeof Colors.light;
}) {
  const isPending = item.status === "PENDING";
  const canAccept = isPending && item.dependentId === userId;

  return (
    <View style={[styles.connectionCard, { backgroundColor: colors.surface }, cardShadow(colors.cardShadow)]}>
      <View style={[styles.connectionAvatar, { backgroundColor: colors.tintLight }]}>
        <Text style={[styles.connectionAvatarText, { color: colors.tint }]}>
          {item.linkedName?.charAt(0)?.toUpperCase() || "?"}
        </Text>
      </View>
      <View style={styles.connectionInfo}>
        <Text style={[styles.connectionName, { color: colors.text }]}>{item.linkedName}</Text>
        <Text style={[styles.connectionEmail, { color: colors.textSecondary }]}>{item.linkedEmail}</Text>
        <View style={styles.connectionMeta}>
          <View style={[styles.statusBadge, { backgroundColor: isPending ? colors.warningLight : colors.successLight }]}>
            <Text style={[styles.statusText, { color: isPending ? colors.warning : colors.success }]}>
              {isPending ? "Pendente" : "Aceita"}
            </Text>
          </View>
          <Text style={[styles.roleText, { color: colors.textSecondary }]}>
            {ROLE_LABELS[item.linkedRole] || item.linkedRole}
          </Text>
        </View>
      </View>
      <View style={styles.connectionActions}>
        {canAccept && (
          <Pressable
            style={styles.acceptBtn}
            onPress={() => onAccept(item.id)}
            disabled={acceptingId === item.id}
            hitSlop={8}
          >
            {acceptingId === item.id ? (
              <ActivityIndicator size={16} color={colors.success} />
            ) : (
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            )}
          </Pressable>
        )}
        <Pressable
          style={styles.deleteBtn}
          onPress={() => onDelete(item.id)}
          disabled={deletingId === item.id}
          hitSlop={8}
        >
          {deletingId === item.id ? (
            <ActivityIndicator size={16} color={colors.danger} />
          ) : (
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default function ConnectionsScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmColor?: string;
    singleAction?: boolean;
    loading?: boolean;
    onConfirm?: () => void;
  } | null>(null);

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

  const connectionsQuery = useQuery<Connection[]>({
    queryKey: ["/api/connections"],
  });

  const addMutation = useMutation({
    mutationFn: async (targetId: string) => {
      const res = await apiRequest("POST", "/api/connections", { targetId });
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      setSearchText("");
    },
    onError: (err: any) => {
      const msg = err.message || "";
      if (msg.includes("requiresUpgrade") || msg.includes("Limite")) {
        showUpgradeDialog();
      } else {
        showInfoDialog("Não foi possível criar conexão", "Não foi possível criar a conexão.", "alert-circle", colors.danger, colors.danger);
      }
    },
  });

  const showUpgradeDialog = () => {
    setDialog({
      title: "Limite do Plano Free",
      message: "Você atingiu o limite de conexões do plano gratuito. Faça upgrade para Premium para conexões ilimitadas.",
      icon: "star",
      iconColor: colors.warning,
      confirmLabel: "Fazer Upgrade",
      cancelLabel: "Cancelar",
      confirmColor: colors.warning,
      onConfirm: async () => {
        setDialog((prev) => (prev ? { ...prev, loading: true } : prev));
        try {
          await apiRequest("POST", "/api/auth/upgrade");
          await refreshUser();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showInfoDialog("Sucesso", "Plano atualizado para Premium!", "checkmark-circle", colors.success, colors.success);
        } catch (e: any) {
          showInfoDialog("Não foi possível fazer upgrade", e.message || "Não foi possível realizar o upgrade.", "alert-circle", colors.danger, colors.danger);
        }
      },
    });
  };

  const handleSearch = async () => {
    const identifier = searchText.trim();
    if (!identifier) {
      showInfoDialog("Campo obrigatório", "Informe um ID ou email para buscar.", "alert-circle", colors.danger, colors.danger);
      return;
    }
    setSearching(true);
    try {
      const res = await apiRequest("GET", `/api/users/search/${encodeURIComponent(identifier)}`);
      const foundUser: SearchedUser = await res.json();

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      setDialog({
        title: "Conectar",
        message: `Deseja conectar-se com ${foundUser.name}?\n\nFunção: ${ROLE_LABELS[foundUser.role] || foundUser.role}\nEmail: ${foundUser.email}`,
        icon: "link",
        iconColor: colors.tint,
        confirmLabel: "Conectar",
        cancelLabel: "Cancelar",
        confirmColor: colors.tint,
        onConfirm: () => {
          setDialog(null);
          addMutation.mutate(foundUser.id);
        },
      });
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("404")) {
        showInfoDialog("Não encontrado", "Nenhum usuário encontrado com esse ID ou email.", "search", colors.warning, colors.warning);
      } else {
        showInfoDialog("Não foi possível buscar", "Não foi possível buscar o usuário.", "alert-circle", colors.danger, colors.danger);
      }
    } finally {
      setSearching(false);
    }
  };

  const handleDelete = (connectionId: string) => {
    setDialog({
      title: "Remover Conexao",
      message: "Deseja realmente remover esta conexão?",
      icon: "trash-outline",
      iconColor: colors.danger,
      confirmLabel: "Remover",
      cancelLabel: "Cancelar",
      confirmColor: colors.danger,
      onConfirm: async () => {
        setDialog((prev) => (prev ? { ...prev, loading: true } : prev));
        setDeletingId(connectionId);
        try {
          await apiRequest("DELETE", `/api/connections/${connectionId}`);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
          setDialog(null);
        } catch (e: any) {
          showInfoDialog("Não foi possível remover", e.message || "Não foi possível remover a conexão.", "alert-circle", colors.danger, colors.danger);
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const handleAccept = (connectionId: string) => {
    setDialog({
      title: "Aceitar Conexao",
      message: "Deseja aceitar esta conexão?",
      icon: "checkmark-circle",
      iconColor: colors.success,
      confirmLabel: "Aceitar",
      cancelLabel: "Cancelar",
      confirmColor: colors.success,
      onConfirm: async () => {
        setDialog((prev) => (prev ? { ...prev, loading: true } : prev));
        setAcceptingId(connectionId);
        try {
          await apiRequest("PATCH", `/api/connections/${connectionId}/accept`);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
          setDialog(null);
        } catch (e: any) {
          showInfoDialog("Não foi possível aceitar", e.message || "Não foi possível aceitar a conexão.", "alert-circle", colors.danger, colors.danger);
        } finally {
          setAcceptingId(null);
        }
      },
    });
  };

  const connections = connectionsQuery.data || [];

  const renderItem = ({ item }: { item: Connection }) => (
    <ConnectionItem
      item={item}
      userId={user?.id}
      onDelete={handleDelete}
      onAccept={handleAccept}
      deletingId={deletingId}
      acceptingId={acceptingId}
      colors={colors}
    />
  );

  const renderEmpty = () => {
    if (connectionsQuery.isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="people-outline" size={40} color={colors.textSecondary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma conexão</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Busque por ID ou email para adicionar uma conexão
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, { backgroundColor: colors.inputBg }]}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Conexões</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <View style={[styles.searchSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.searchRow}>
          <View style={[styles.searchInputWrapper, { backgroundColor: colors.inputBg }]}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Buscar por ID ou email..."
              placeholderTextColor={colors.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              editable={!searching && !addMutation.isPending}
            />
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.searchBtn,
              { backgroundColor: colors.tint },
              pressed && { opacity: 0.85 },
              (searching || addMutation.isPending) && { opacity: 0.6 },
            ]}
            onPress={handleSearch}
            disabled={searching || addMutation.isPending}
          >
            {searching || addMutation.isPending ? (
              <ActivityIndicator size={18} color="#fff" />
            ) : (
              <Ionicons name="person-add" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>

      <FlatList
        data={connections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24 },
          connections.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={connectionsQuery.isRefetching}
            onRefresh={() => connectionsQuery.refetch()}
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        }
        ListHeaderComponent={
          connectionsQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando conexões...</Text>
            </View>
          ) : connections.length > 0 ? (
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {connections.length} {connections.length === 1 ? "conexão" : "conexões"}
            </Text>
          ) : null
        }
      />

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
        loading={dialog?.loading}
        onConfirm={() => {
          if (dialog?.onConfirm) {
            dialog.onConfirm();
            return;
          }
          setDialog(null);
        }}
        onCancel={() => {
          if (!dialog?.loading) setDialog(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
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
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
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
  connectionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  connectionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  connectionAvatarText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  connectionEmail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  connectionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  roleText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  connectionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  acceptBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
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
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
