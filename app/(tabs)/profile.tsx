import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Platform,
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
import { useTheme } from "@/lib/theme-context";
import { apiRequest } from "@/lib/query-client";
import { cardShadow } from "@/lib/shadows";

const ROLES = [
  { key: "MASTER", label: "Responsavel", icon: "shield-checkmark" },
  { key: "DEPENDENT", label: "Dependente", icon: "person" },
  { key: "CONTROLLER", label: "Controle", icon: "eye" },
] as const;

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const colors = isDark ? Colors.dark : Colors.light;

  const [rolePickerVisible, setRolePickerVisible] = useState(false);
  const [changingRole, setChangingRole] = useState(false);
  const upgrading = false;
  const [themePickerVisible, setThemePickerVisible] = useState(false);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/edit-profile");
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
      "Alterar Função",
      "Mudar sua função afeta suas permissões no app. Deseja continuar?",
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
              Alert.alert("Erro", e.message || "Não foi possível alterar a função.");
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
    router.push("/subscription");
  };

  const handleConnectionsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/connections");
  };

  const handleThemePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setThemePickerVisible(true);
  };

  const roleInfo = ROLES.find((r) => r.key === user?.role) || ROLES[0];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: colors.surface }, cardShadow(colors.cardShadow)]}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>
          </View>
          <Text style={[styles.profileName, { color: colors.text }]}>{user?.name}</Text>
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
          <Pressable onPress={handleRoleTagPress}>
            <View style={[styles.roleTag, { backgroundColor: colors.tintLight }]}>
              <Ionicons name={roleInfo.icon as any} size={14} color={colors.tint} />
              <Text style={[styles.roleTagText, { color: colors.tint }]}>{roleInfo.label}</Text>
              <Ionicons name="chevron-down" size={12} color={colors.tint} />
            </View>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Conta</Text>

          <View style={[styles.menuCard, { backgroundColor: colors.surface }, cardShadow(colors.cardShadow)]}>
            <Pressable style={styles.menuItem} onPress={handleOpenEdit}>
              <View style={[styles.menuIcon, { backgroundColor: colors.tintLight }]}>
                <Ionicons name="person-outline" size={18} color={colors.tint} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.text }]}>Editar Perfil</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>

            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

            <Pressable style={styles.menuItem} onPress={handlePlanPress} disabled={upgrading}>
              <View style={[styles.menuIcon, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="star-outline" size={18} color={colors.warning} />
              </View>
              <View style={styles.menuLabelRow}>
                <Text style={[styles.menuLabel, { color: colors.text }]}>Plano</Text>
                <View style={[styles.planBadge, user?.planType === "PREMIUM" && { backgroundColor: colors.successLight }]}>
                  {upgrading ? (
                    <ActivityIndicator size={10} color={colors.warning} />
                  ) : (
                    <Text style={[styles.planBadgeText, { color: colors.warning }, user?.planType === "PREMIUM" && { color: colors.success }]}>
                      {user?.planType || "FREE"}
                    </Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>

            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

            <Pressable style={styles.menuItem} onPress={handleConnectionsPress}>
              <View style={[styles.menuIcon, { backgroundColor: colors.tintLight }]}>
                <Ionicons name="people-outline" size={18} color={colors.tint} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.text }]}>Conexões</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Configurações</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.surface }, cardShadow(colors.cardShadow)]}>
            <Pressable style={styles.menuItem} onPress={handleThemePress}>
              <View style={[styles.menuIcon, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.15)" : "#EEF2FF" }]}>
                <Ionicons name={isDark ? "moon" : "sunny"} size={18} color={isDark ? "#818CF8" : "#F59E0B"} />
              </View>
              <View style={styles.menuLabelRow}>
                <Text style={[styles.menuLabel, { color: colors.text }]}>Tema</Text>
                <View style={[styles.themeBadge, { backgroundColor: colors.inputBg }]}>
                  <Text style={[styles.themeBadgeText, { color: colors.textSecondary }]}>
                    {isDark ? "Escuro" : "Claro"}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>

            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

            <Pressable style={styles.menuItem} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/privacy-policy"); }}>
              <View style={[styles.menuIcon, { backgroundColor: colors.inputBg }]}>
                <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.text }]}>Política de Privacidade</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Info</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.surface }, cardShadow(colors.cardShadow)]}>
            <Pressable style={styles.menuItem} onPress={handleCopyId}>
              <View style={[styles.menuIcon, { backgroundColor: colors.inputBg }]}>
                <Ionicons name="finger-print-outline" size={18} color={colors.textSecondary} />
              </View>
              <View style={styles.menuLabelRow}>
                <Text style={[styles.menuLabel, { color: colors.text }]}>Seu ID</Text>
                <Text style={[styles.idText, { color: colors.textSecondary }]}>{user?.id?.slice(0, 8)}...</Text>
              </View>
              <Ionicons name="copy-outline" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.logoutBtn, { backgroundColor: colors.dangerLight }, pressed && styles.logoutBtnPressed]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>Sair da conta</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={rolePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRolePickerVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRolePickerVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Selecionar Função</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Escolha sua função no app</Text>
            {ROLES.map((role) => {
              const isSelected = role.key === user?.role;
              return (
                <Pressable
                  key={role.key}
                  style={[styles.roleOption, { backgroundColor: colors.inputBg }, isSelected && { backgroundColor: colors.tintLight, borderWidth: 1, borderColor: colors.tint }]}
                  onPress={() => handleSelectRole(role.key)}
                  disabled={changingRole}
                >
                  <Ionicons name={role.icon as any} size={20} color={isSelected ? colors.tint : colors.textSecondary} />
                  <View style={styles.roleOptionTextContainer}>
                    <Text style={[styles.roleOptionLabel, { color: colors.text }, isSelected && { color: colors.tint }]}>
                      {role.label}
                    </Text>
                    <Text style={[styles.roleOptionKey, { color: colors.textSecondary }]}>{role.key}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.tint} />}
                  {changingRole && !isSelected && <ActivityIndicator size="small" color={colors.tint} />}
                </Pressable>
              );
            })}
            <Pressable
              style={({ pressed }) => [styles.modalCloseBtn, { backgroundColor: colors.inputBg }, pressed && { opacity: 0.8 }]}
              onPress={() => setRolePickerVisible(false)}
            >
              <Text style={[styles.modalCloseBtnText, { color: colors.textSecondary }]}>Fechar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={themePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThemePickerVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setThemePickerVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Escolher Tema</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Selecione a aparencia do app</Text>

            <Pressable
              style={[styles.roleOption, { backgroundColor: colors.inputBg }, theme === "light" && { backgroundColor: colors.tintLight, borderWidth: 1, borderColor: colors.tint }]}
              onPress={() => { setTheme("light"); Haptics.selectionAsync(); setThemePickerVisible(false); }}
            >
              <Ionicons name="sunny" size={20} color={theme === "light" ? colors.tint : colors.textSecondary} />
              <View style={styles.roleOptionTextContainer}>
                <Text style={[styles.roleOptionLabel, { color: colors.text }, theme === "light" && { color: colors.tint }]}>Claro</Text>
                <Text style={[styles.roleOptionKey, { color: colors.textSecondary }]}>Light</Text>
              </View>
              {theme === "light" && <Ionicons name="checkmark-circle" size={22} color={colors.tint} />}
            </Pressable>

            <Pressable
              style={[styles.roleOption, { backgroundColor: colors.inputBg }, theme === "dark" && { backgroundColor: colors.tintLight, borderWidth: 1, borderColor: colors.tint }]}
              onPress={() => { setTheme("dark"); Haptics.selectionAsync(); setThemePickerVisible(false); }}
            >
              <Ionicons name="moon" size={20} color={theme === "dark" ? colors.tint : colors.textSecondary} />
              <View style={styles.roleOptionTextContainer}>
                <Text style={[styles.roleOptionLabel, { color: colors.text }, theme === "dark" && { color: colors.tint }]}>Escuro</Text>
                <Text style={[styles.roleOptionKey, { color: colors.textSecondary }]}>Dark</Text>
              </View>
              {theme === "dark" && <Ionicons name="checkmark-circle" size={22} color={colors.tint} />}
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.modalCloseBtn, { backgroundColor: colors.inputBg }, pressed && { opacity: 0.8 }]}
              onPress={() => setThemePickerVisible(false)}
            >
              <Text style={[styles.modalCloseBtnText, { color: colors.textSecondary }]}>Fechar</Text>
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
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  content: {
    padding: 20,
  },
  profileCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  roleTag: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
    gap: 4,
  },
  roleTagText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  menuCard: {
    borderRadius: 16,
    overflow: "hidden",
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
  },
  menuLabelRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuDivider: {
    height: 1,
    marginLeft: 60,
  },
  planBadge: {
    backgroundColor: Colors.light.warningLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  planBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  themeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  themeBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  idText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  roleOptionTextContainer: {
    flex: 1,
  },
  roleOptionLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  roleOptionKey: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  modalCloseBtn: {
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
