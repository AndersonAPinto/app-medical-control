import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
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
}: {
  item: Connection;
  userId: string | undefined;
  onDelete: (id: string) => void;
  onAccept: (id: string) => void;
  deletingId: string | null;
  acceptingId: string | null;
}) {
  const isPending = item.status === "PENDING";
  const canAccept = isPending && item.dependentId === userId;

  return (
    <View style={styles.connectionCard}>
      <View style={styles.connectionAvatar}>
        <Text style={styles.connectionAvatarText}>
          {item.linkedName?.charAt(0)?.toUpperCase() || "?"}
        </Text>
      </View>
      <View style={styles.connectionInfo}>
        <Text style={styles.connectionName}>{item.linkedName}</Text>
        <Text style={styles.connectionEmail}>{item.linkedEmail}</Text>
        <View style={styles.connectionMeta}>
          <View style={[styles.statusBadge, isPending ? styles.statusPending : styles.statusAccepted]}>
            <Text style={[styles.statusText, isPending ? styles.statusTextPending : styles.statusTextAccepted]}>
              {isPending ? "Pendente" : "Aceita"}
            </Text>
          </View>
          <Text style={styles.roleText}>
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
              <ActivityIndicator size={16} color={Colors.light.success} />
            ) : (
              <Ionicons name="checkmark-circle" size={24} color={Colors.light.success} />
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
            <ActivityIndicator size={16} color={Colors.light.danger} />
          ) : (
            <Ionicons name="trash-outline" size={20} color={Colors.light.danger} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default function ConnectionsScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

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
      if (msg.includes("403") && msg.includes("requiresUpgrade")) {
        showUpgradeDialog();
      } else {
        try {
          const parsed = JSON.parse(msg.split(": ").slice(1).join(": "));
          if (parsed.requiresUpgrade) {
            showUpgradeDialog();
            return;
          }
        } catch {}
        Alert.alert("Erro", "Nao foi possivel criar a conexao.");
      }
    },
  });

  const showUpgradeDialog = () => {
    Alert.alert(
      "Limite do Plano Free",
      "Voce atingiu o limite de conexoes do plano gratuito. Faca upgrade para Premium para conexoes ilimitadas.",
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
              Alert.alert("Erro", e.message || "Nao foi possivel realizar o upgrade.");
            }
          },
        },
      ]
    );
  };

  const handleSearch = async () => {
    const identifier = searchText.trim();
    if (!identifier) {
      Alert.alert("Erro", "Informe um ID ou email para buscar.");
      return;
    }
    setSearching(true);
    try {
      const res = await apiRequest("GET", `/api/users/search/${encodeURIComponent(identifier)}`);
      const foundUser: SearchedUser = await res.json();

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      Alert.alert(
        "Conectar",
        `Deseja conectar-se com ${foundUser.name}?\n\nFuncao: ${ROLE_LABELS[foundUser.role] || foundUser.role}\nEmail: ${foundUser.email}`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Conectar",
            onPress: () => addMutation.mutate(foundUser.id),
          },
        ]
      );
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("404")) {
        Alert.alert("Nao encontrado", "Nenhum usuario encontrado com esse ID ou email.");
      } else {
        Alert.alert("Erro", "Nao foi possivel buscar o usuario.");
      }
    } finally {
      setSearching(false);
    }
  };

  const handleDelete = (connectionId: string) => {
    Alert.alert(
      "Remover Conexao",
      "Deseja realmente remover esta conexao?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            setDeletingId(connectionId);
            try {
              await apiRequest("DELETE", `/api/connections/${connectionId}`);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
            } catch (e: any) {
              Alert.alert("Erro", e.message || "Nao foi possivel remover a conexao.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleAccept = (connectionId: string) => {
    Alert.alert(
      "Aceitar Conexao",
      "Deseja aceitar esta conexao?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aceitar",
          onPress: async () => {
            setAcceptingId(connectionId);
            try {
              await apiRequest("PATCH", `/api/connections/${connectionId}/accept`);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
            } catch (e: any) {
              Alert.alert("Erro", e.message || "Nao foi possivel aceitar a conexao.");
            } finally {
              setAcceptingId(null);
            }
          },
        },
      ]
    );
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
    />
  );

  const renderEmpty = () => {
    if (connectionsQuery.isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="people-outline" size={40} color={Colors.light.textSecondary} />
        </View>
        <Text style={styles.emptyTitle}>Nenhuma conexao</Text>
        <Text style={styles.emptySubtitle}>
          Busque por ID ou email para adicionar uma conexao
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Conexoes</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={18} color={Colors.light.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por ID ou email..."
              placeholderTextColor={Colors.light.textSecondary}
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
            tintColor={Colors.light.tint}
            colors={[Colors.light.tint]}
          />
        }
        ListHeaderComponent={
          connectionsQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.light.tint} />
              <Text style={styles.loadingText}>Carregando conexoes...</Text>
            </View>
          ) : connections.length > 0 ? (
            <Text style={styles.sectionLabel}>
              {connections.length} {connections.length === 1 ? "conexao" : "conexoes"}
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
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
    backgroundColor: Colors.light.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.inputBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
  },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingLeft: 4,
  },
  connectionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  connectionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.light.tintLight,
    alignItems: "center",
    justifyContent: "center",
  },
  connectionAvatarText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.light.tint,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  connectionEmail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
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
  statusPending: {
    backgroundColor: Colors.light.warningLight,
  },
  statusAccepted: {
    backgroundColor: Colors.light.successLight,
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  statusTextPending: {
    color: Colors.light.warning,
  },
  statusTextAccepted: {
    color: Colors.light.success,
  },
  roleText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
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
    backgroundColor: Colors.light.inputBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
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
    color: Colors.light.textSecondary,
  },
});
