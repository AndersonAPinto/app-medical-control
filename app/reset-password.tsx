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
import Colors from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string; success?: boolean } | null>(null);

  const handleSubmit = async () => {
    if (!code.trim() || !newPassword || !confirmPassword) {
      setDialog({ title: "Campos obrigatórios", message: "Preencha todos os campos." });
      return;
    }
    if (newPassword.length < 6) {
      setDialog({ title: "Senha curta", message: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setDialog({ title: "Senhas diferentes", message: "As senhas não coincidem." });
      return;
    }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/reset-password", { code: code.trim(), newPassword });
      setDialog({
        title: "Senha redefinida!",
        message: "Sua senha foi alterada com sucesso. Faça login com a nova senha.",
        success: true,
      });
    } catch (err: any) {
      setDialog({ title: "Erro", message: err.message || "Código inválido ou expirado." });
    } finally {
      setLoading(false);
    }
  };

  const handleDialogConfirm = () => {
    if (dialog?.success) {
      setDialog(null);
      router.replace("/login");
    } else {
      setDialog(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.light.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: Colors.light.text }]}>Nova senha</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.iconContainer}>
            <Ionicons name="key-outline" size={48} color={Colors.light.tint} />
          </View>

          <Text style={[styles.title, { color: Colors.light.text }]}>Criar nova senha</Text>
          <Text style={[styles.subtitle, { color: Colors.light.textSecondary }]}>
            Digite o código de 6 dígitos recebido por email e escolha sua nova senha.
          </Text>

          <View style={[styles.inputWrapper, { backgroundColor: Colors.light.inputBg, borderColor: Colors.light.border }]}>
            <Ionicons name="keypad-outline" size={20} color={Colors.light.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: Colors.light.text }]}
              placeholder="Código de 6 dígitos"
              placeholderTextColor={Colors.light.textSecondary}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          <View style={[styles.inputWrapper, { backgroundColor: Colors.light.inputBg, borderColor: Colors.light.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.light.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: Colors.light.text }]}
              placeholder="Nova senha"
              placeholderTextColor={Colors.light.textSecondary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.light.textSecondary} />
            </Pressable>
          </View>

          <View style={[styles.inputWrapper, { backgroundColor: Colors.light.inputBg, borderColor: Colors.light.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.light.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: Colors.light.text }]}
              placeholder="Confirmar nova senha"
              placeholderTextColor={Colors.light.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: Colors.light.tint },
              pressed && styles.btnPressed,
              loading && styles.btnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Redefinir senha</Text>
            )}
          </Pressable>

          <Pressable style={styles.backLink} onPress={() => router.push("/forgot-password")}>
            <Text style={[styles.backLinkText, { color: Colors.light.tint }]}>Não recebi o código</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={!!dialog}
        title={dialog?.title || ""}
        message={dialog?.message || ""}
        icon={dialog?.success ? "checkmark-circle" : "alert-circle"}
        iconColor={dialog?.success ? Colors.light.success : Colors.light.danger}
        confirmLabel="OK"
        confirmColor={dialog?.success ? Colors.light.tint : Colors.light.danger}
        singleAction
        onConfirm={handleDialogConfirm}
        onCancel={handleDialogConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 8 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  content: {
    padding: 24,
    paddingTop: 16,
    alignItems: "center",
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.light.tintLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    width: "100%",
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  eyeBtn: { padding: 6 },
  submitBtn: {
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 8,
  },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  backLink: {
    marginTop: 20,
    padding: 8,
  },
  backLinkText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
