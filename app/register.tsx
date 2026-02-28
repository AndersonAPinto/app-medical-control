import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import ConfirmDialog from "@/components/ConfirmDialog";

const roles = [
  { key: "MASTER", label: "Responsavel", icon: "shield-checkmark-outline" as const, desc: "Monitora dependentes" },
  { key: "DEPENDENT", label: "Dependente", icon: "person-outline" as const, desc: "Toma medicamentos" },
  { key: "CONTROLLER", label: "Controle", icon: "eye-outline" as const, desc: "Recebe alertas" },
];

export default function RegisterScreen() {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("DEPENDENT");
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  const showError = (message: string) => {
    setDialog({ title: "Não foi possível cadastrar", message });
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      showError("Preencha todos os campos");
      return;
    }
    if (password.length < 6) {
      showError("Senha deve ter no minimo 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, role);
      router.replace("/(tabs)");
    } catch (err: any) {
      showError(err.message || "Falha ao cadastrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.palette.teal600, Colors.palette.teal400]}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 20 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Criar Conta</Text>
        <Text style={styles.headerSubtitle}>Junte-se ao Toma Aí</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.formContainer}
      >
        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>Tipo de perfil</Text>
          <View style={styles.roleRow}>
            {roles.map((r) => (
              <Pressable
                key={r.key}
                style={[styles.roleCard, role === r.key && styles.roleCardActive]}
                onPress={() => setRole(r.key)}
              >
                <Ionicons
                  name={r.icon}
                  size={22}
                  color={role === r.key ? Colors.light.tint : Colors.light.textSecondary}
                />
                <Text style={[styles.roleLabel, role === r.key && styles.roleLabelActive]}>
                  {r.label}
                </Text>
                <Text style={styles.roleDesc}>{r.desc}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color={Colors.light.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nome completo"
              placeholderTextColor={Colors.light.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={Colors.light.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.light.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.light.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Senha (min. 6 caracteres)"
              placeholderTextColor={Colors.light.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.registerBtn, pressed && styles.btnPressed, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerBtnText}>Cadastrar</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>Já tem conta? </Text>
            <Text style={styles.loginLinkBold}>Entrar</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={!!dialog}
        title={dialog?.title || ""}
        message={dialog?.message || ""}
        icon="alert-circle"
        iconColor={Colors.light.danger}
        confirmLabel="OK"
        confirmColor={Colors.light.danger}
        singleAction
        onConfirm={() => setDialog(null)}
        onCancel={() => setDialog(null)}
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
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  roleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  roleCard: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.light.border,
    gap: 4,
  },
  roleCardActive: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tintLight,
  },
  roleLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  roleLabelActive: {
    color: Colors.light.tint,
  },
  roleDesc: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center" as const,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.inputBg,
    borderRadius: 14,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
  },
  registerBtn: {
    backgroundColor: Colors.light.tint,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  btnDisabled: {
    opacity: 0.6,
  },
  registerBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  loginLink: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  loginLinkText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  loginLinkBold: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.tint,
  },
});
