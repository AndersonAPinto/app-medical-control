import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/query-client";

const ROLES = [
  { key: "MASTER", label: "Responsavel", icon: "shield-checkmark" },
  { key: "DEPENDENT", label: "Dependente", icon: "person" },
  { key: "CONTROLLER", label: "Controle", icon: "eye" },
] as const;

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();

  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const [rolePickerVisible, setRolePickerVisible] = useState(false);
  const [changingRole, setChangingRole] = useState(false);

  const [upgrading, setUpgrading] = useState(false);

  const handleLogout = () => {
    Alert.alert("Sair", "Deseja realmente sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const handleCopyId = async () => {
    if (!user?.id) return;
    await Clipboard.setStringAsync(user.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copiado", "Seu ID foi copiado para a area de transferencia.");
  };

  const handleOpenEdit = () => {
    setEditName(user?.name || "");
    setEditEmail(user?.email || "");
    setEditVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      Alert.alert("Erro", "Nome e email sao obrigatorios.");
      return;
    }
    setSaving(true);
    try {
      await apiRequest("PATCH", "/api/auth/profile", {
        name: editName.trim(),
        email: editEmail.trim(),
      });
      await refreshUser();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditVisible(false);
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Nao foi possivel salvar o perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleTagPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRolePickerVisible(true);
  };

  const handleSelectRole = (roleKey: string) => {
    if (roleKey === user?.role) {
      setRolePickerVisible(false);
      return;
    }
    Alert.alert(
      "Alterar Funcao",
      "Mudar sua funcao afeta suas permissoes no app. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            setChangingRole(true);
            try {
              await apiRequest("PATCH", "/api/auth/role", { role: roleKey });
              await refreshUser();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setRolePickerVisible(false);
            } catch (e: any) {
              Alert.alert("Erro", e.message || "Nao foi possivel alterar a funcao.");
            } finally {
              setChangingRole(false);
            }
          },
        },
      ]
    );
  };

  const handlePlanPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (user?.planType === "PREMIUM") {
      Alert.alert("Plano Premium", "Voce ja e um usuario Premium!");
      return;
    }
    Alert.alert(
      "Upgrade para Premium",
      "Desbloqueie recursos ilimitados, conexoes e muito mais por R$9,90/mes.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Fazer Upgrade",
          onPress: async () => {
            setUpgrading(true);
            try {
              await apiRequest("POST", "/api/auth/upgrade");
              await refreshUser();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Sucesso", "Parabens! Seu plano foi atualizado para Premium.");
            } catch (e: any) {
              Alert.alert("Erro", e.message || "Nao foi possivel realizar o upgrade.");
            } finally {
              setUpgrading(false);
            }
          },
        },
      ]
    );
  };

  const handleConnectionsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/connections");
  };

  const roleInfo = ROLES.find((r) => r.key === user?.role) || ROLES[0];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8 }]}>
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>
          </View>
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <Pressable onPress={handleRoleTagPress}>
            <View style={styles.roleTag}>
              <Ionicons name={roleInfo.icon as any} size={14} color={Colors.light.tint} />
              <Text style={styles.roleTagText}>{roleInfo.label}</Text>
              <Ionicons name="chevron-down" size={12} color={Colors.light.tint} />
            </View>
          </Pressable>
        </View>

        {editVisible && (
          <View style={styles.editCard}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Editar Perfil</Text>
              <Pressable onPress={() => setEditVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={Colors.light.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.inputLabel}>Nome</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Seu nome"
              placeholderTextColor={Colors.light.textSecondary}
              autoCapitalize="words"
            />
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="Seu email"
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Pressable
              style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Salvar</Text>
              )}
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conta</Text>

          <View style={styles.menuCard}>
            <Pressable style={styles.menuItem} onPress={handleOpenEdit}>
              <View style={[styles.menuIcon, { backgroundColor: Colors.palette.teal100 }]}>
                <Ionicons name="person-outline" size={18} color={Colors.light.tint} />
              </View>
              <Text style={styles.menuLabel}>Editar Perfil</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.light.textSecondary} />
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable style={styles.menuItem} onPress={handlePlanPress} disabled={upgrading}>
              <View style={[styles.menuIcon, { backgroundColor: Colors.light.warningLight }]}>
                <Ionicons name="star-outline" size={18} color={Colors.light.warning} />
              </View>
              <View style={styles.menuLabelRow}>
                <Text style={styles.menuLabel}>Plano</Text>
                <View style={[styles.planBadge, user?.planType === "PREMIUM" && styles.planBadgePremium]}>
                  {upgrading ? (
                    <ActivityIndicator size={10} color={Colors.light.warning} />
                  ) : (
                    <Text style={[styles.planBadgeText, user?.planType === "PREMIUM" && styles.planBadgeTextPremium]}>
                      {user?.planType || "FREE"}
                    </Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.light.textSecondary} />
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable style={styles.menuItem} onPress={handleConnectionsPress}>
              <View style={[styles.menuIcon, { backgroundColor: Colors.palette.teal100 }]}>
                <Ionicons name="people-outline" size={18} color={Colors.light.tint} />
              </View>
              <Text style={styles.menuLabel}>Conexoes</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.light.textSecondary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Info</Text>
          <View style={styles.menuCard}>
            <Pressable style={styles.menuItem} onPress={handleCopyId}>
              <View style={[styles.menuIcon, { backgroundColor: Colors.light.inputBg }]}>
                <Ionicons name="finger-print-outline" size={18} color={Colors.light.textSecondary} />
              </View>
              <View style={styles.menuLabelRow}>
                <Text style={styles.menuLabel}>Seu ID</Text>
                <Text style={styles.idText}>{user?.id?.slice(0, 8)}...</Text>
              </View>
              <Ionicons name="copy-outline" size={16} color={Colors.light.textSecondary} />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.light.danger} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={rolePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRolePickerVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRolePickerVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Selecionar Funcao</Text>
            <Text style={styles.modalSubtitle}>Escolha sua funcao no app</Text>
            {ROLES.map((role) => {
              const isSelected = role.key === user?.role;
              return (
                <Pressable
                  key={role.key}
                  style={[styles.roleOption, isSelected && styles.roleOptionSelected]}
                  onPress={() => handleSelectRole(role.key)}
                  disabled={changingRole}
                >
                  <Ionicons name={role.icon as any} size={20} color={isSelected ? Colors.light.tint : Colors.light.textSecondary} />
                  <View style={styles.roleOptionTextContainer}>
                    <Text style={[styles.roleOptionLabel, isSelected && styles.roleOptionLabelSelected]}>
                      {role.label}
                    </Text>
                    <Text style={styles.roleOptionKey}>{role.key}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={22} color={Colors.light.tint} />}
                  {changingRole && !isSelected && <ActivityIndicator size="small" color={Colors.light.tint} />}
                </Pressable>
              );
            })}
            <Pressable
              style={({ pressed }) => [styles.modalCloseBtn, pressed && { opacity: 0.8 }]}
              onPress={() => setRolePickerVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Fechar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  content: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  profileName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  roleTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.tintLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
    gap: 4,
  },
  roleTagText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.tint,
  },
  editCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.light.tintLight,
  },
  editHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  editTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.light.inputBg,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  menuCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
  },
  menuLabelRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginLeft: 60,
  },
  planBadge: {
    backgroundColor: Colors.light.warningLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  planBadgePremium: {
    backgroundColor: Colors.light.successLight,
  },
  planBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.light.warning,
  },
  planBadgeTextPremium: {
    color: Colors.light.success,
  },
  idText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.dangerLight,
    borderRadius: 14,
    padding: 14,
    marginTop: 32,
    gap: 8,
  },
  logoutBtnPressed: {
    opacity: 0.8,
  },
  logoutText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: 20,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.light.inputBg,
    gap: 12,
  },
  roleOptionSelected: {
    backgroundColor: Colors.light.tintLight,
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  roleOptionTextContainer: {
    flex: 1,
  },
  roleOptionLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  roleOptionLabelSelected: {
    color: Colors.light.tint,
  },
  roleOptionKey: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 1,
  },
  modalCloseBtn: {
    backgroundColor: Colors.light.inputBg,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
});
