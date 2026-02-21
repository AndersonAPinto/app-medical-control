import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/lib/auth-context";
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/theme-context";

const ONBOARDING_KEY = "onboarding_completed";

export default function IndexScreen() {
  const { user, isLoading } = useAuth();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkFlow = async () => {
      if (isLoading) return;

      const onboardingDone = await AsyncStorage.getItem(ONBOARDING_KEY);

      if (!onboardingDone) {
        router.replace("/onboarding");
        return;
      }

      if (user) {
        router.replace("/(tabs)");
      } else {
        router.replace("/login");
      }
      setCheckingOnboarding(false);
    };

    checkFlow();
  }, [user, isLoading]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.tint} />
    </View>
  );
}
