import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Página não encontrada" }} />
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={56} color="#999" />
        <Text style={styles.title}>Esta página não existe.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Voltar para o inicio</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold" as const,
    marginTop: 4,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: "#2e78b7",
  },
});
