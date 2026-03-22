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

export default function TermsOfServiceScreen() {
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Termos de Uso</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdate, { color: colors.textSecondary }]}>Última atualização: Março 2026</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Aceitação dos Termos</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Ao utilizar o aplicativo Toma Aí, você concorda com estes Termos de Uso. Caso não concorde, não utilize o aplicativo.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Descrição do Serviço</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          O Toma Aí é um aplicativo de gerenciamento de medicamentos que permite cadastrar medicamentos, controlar estoques, receber lembretes de doses e monitorar dependentes. O aplicativo não substitui orientação médica profissional.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Conta do Usuário</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Você é responsável por manter a confidencialidade de sua conta e senha. Todas as atividades realizadas em sua conta são de sua responsabilidade. Você deve ter pelo menos 18 anos para criar uma conta.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Planos e Assinaturas</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          O Toma Aí oferece um plano gratuito com funcionalidades limitadas e um plano Premium com recursos ilimitados.
        </Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• O plano gratuito permite até 10 medicamentos e 1 dependente.</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• O plano Premium oferece medicamentos, dependentes e conexões ilimitados.</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Assinaturas Premium são processadas via Google Play.</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• A assinatura é renovada automaticamente no final de cada período até ser cancelada.</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Você pode cancelar a qualquer momento nas configurações da Google Play Store.</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Não há reembolso para o período parcial já pago.</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Uso Adequado</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Você concorda em utilizar o Toma Aí apenas para fins legítimos de gerenciamento de medicamentos. É proibido:
        </Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Usar o aplicativo para fins ilegais ou não autorizados.</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Tentar acessar contas de outros usuários sem autorização.</Text>
        <Text style={[styles.bullet, { color: colors.textSecondary }]}>• Interferir no funcionamento do aplicativo ou seus servidores.</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Isenção de Responsabilidade Médica</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          O Toma Aí é uma ferramenta de organização e não fornece aconselhamento médico. Sempre consulte seu médico ou profissional de saúde antes de iniciar, alterar ou interromper qualquer medicamento. Não nos responsabilizamos por decisões médicas tomadas com base nas informações do aplicativo.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>7. Limitação de Responsabilidade</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          O Toma Aí é fornecido "como está". Não garantimos que o serviço será ininterrupto ou livre de erros. Não nos responsabilizamos por danos diretos ou indiretos decorrentes do uso do aplicativo, incluindo falhas em notificações ou lembretes.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>8. Encerramento de Conta</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Você pode encerrar sua conta a qualquer momento. Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos. Em caso de encerramento, seus dados serão excluídos conforme nossa Política de Privacidade.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>9. Alterações nos Termos</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Podemos atualizar estes termos periodicamente. Notificaremos sobre mudanças significativas através do aplicativo. O uso continuado após as alterações constitui aceitação dos novos termos.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>10. Legislação Aplicável</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será resolvida no foro da comarca do domicílio do usuário.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>11. Contato</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Para dúvidas sobre estes termos, entre em contato pelo e-mail: contato@apptomaai.com.br
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
