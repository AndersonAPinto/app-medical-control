import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

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

  const roleLabel =
    user?.role === "MASTER"
      ? "Responsavel"
      : user?.role === "DEPENDENT"
      ? "Dependente"
      : "Controle";

  const roleIcon =
    user?.role === "MASTER"
      ? "shield-checkmark"
      : user?.role === "DEPENDENT"
      ? "person"
      : "eye";

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
          <View style={styles.roleTag}>
            <Ionicons name={roleIcon as any} size={14} color={Colors.light.tint} />
            <Text style={styles.roleTagText}>{roleLabel}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conta</Text>

          <View style={styles.menuCard}>
            <Pressable style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: Colors.palette.teal100 }]}>
                <Ionicons name="person-outline" size={18} color={Colors.light.tint} />
              </View>
              <Text style={styles.menuLabel}>Editar Perfil</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.light.textSecondary} />
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: Colors.light.warningLight }]}>
                <Ionicons name="star-outline" size={18} color={Colors.light.warning} />
              </View>
              <View style={styles.menuLabelRow}>
                <Text style={styles.menuLabel}>Plano</Text>
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>{user?.planType || "FREE"}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.light.textSecondary} />
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable style={styles.menuItem}>
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
            <View style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: Colors.light.inputBg }]}>
                <Ionicons name="finger-print-outline" size={18} color={Colors.light.textSecondary} />
              </View>
              <View style={styles.menuLabelRow}>
                <Text style={styles.menuLabel}>Seu ID</Text>
                <Text style={styles.idText}>{user?.id?.slice(0, 8)}...</Text>
              </View>
            </View>
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
  planBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.light.warning,
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
});
