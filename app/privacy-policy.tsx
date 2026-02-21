import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/theme-context";

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, { backgroundColor: colors.inputBg }]}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Política de Privacidade</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdate, { color: colors.textSecondary }]}>Última atualização: Fevereiro 2026</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Informações que Coletamos</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          O Toma Aí coleta as seguintes informações para fornecer nossos serviços:
        </Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Nome, e-mail e senha para criação de conta</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Informações sobre medicamentos (nome, dosagem, estoque)</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Registros de doses tomadas</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Conexões entre usuários (responsáveis e dependentes)</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Como Usamos suas Informações</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Utilizamos suas informações exclusivamente para:
        </Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Gerenciar seus medicamentos e horários de doses</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Enviar alertas de estoque baixo e lembretes de doses</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Permitir que responsáveis monitorem dependentes</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Processar assinaturas e pagamentos</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Compartilhamento de Dados</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Não vendemos nem compartilhamos seus dados pessoais com terceiros para fins comerciais. Seus dados de medicamentos são compartilhados apenas com os usuários que você conectou (responsáveis e dependentes).
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Segurança dos Dados</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações, incluindo criptografia de senhas e comunicação segura via HTTPS.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Armazenamento</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Seus dados são armazenados em servidores seguros enquanto sua conta estiver ativa. Você pode solicitar a exclusão de seus dados a qualquer momento.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Seus Direitos</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
        </Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Acessar seus dados pessoais</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Corrigir dados incorretos</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Solicitar exclusão de seus dados</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Revogar consentimento a qualquer momento</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>7. Assinaturas e Pagamentos</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Os pagamentos são processados através do Google Play (Android) ou Apple App Store (iOS). Não armazenamos informações de cartão de crédito. As assinaturas são gerenciadas diretamente pelas lojas de aplicativos.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>8. Alterações nesta Política</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas através do aplicativo.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>9. Contato</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Para dúvidas sobre privacidade ou seus dados, entre em contato pelo e-mail: suporte@tomaai.app
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
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
  content: {
    padding: 20,
  },
  lastUpdate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginTop: 20,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginBottom: 8,
  },
  bullet: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    paddingLeft: 8,
    marginBottom: 4,
  },
});
