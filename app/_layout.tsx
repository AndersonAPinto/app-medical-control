import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider } from "@/lib/auth-context";
import { SubscriptionProvider } from "@/lib/subscription-context";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import Colors from "@/constants/colors";

const REVENUECAT_ANDROID_API_KEY = "goog_ieyHTSlFYWXokTJsvLmpHdolMew";
//const REVENUECAT_ANDROID_API_KEY = "test_klZXlxvdfQdnoaXBSnMSNEBmoeG";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="add-medication"
        options={{
          presentation: "modal",
          headerShown: true,
          headerTitle: "Novo Medicamento",
          headerTintColor: colors.tint,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text },
        }}
      />
      <Stack.Screen
        name="edit-medication"
        options={{
          presentation: "modal",
          headerShown: true,
          headerTitle: "Editar Medicamento",
          headerTintColor: colors.tint,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text },
        }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{
          presentation: "modal",
          headerShown: true,
          headerTitle: "Editar Perfil",
          headerTintColor: colors.tint,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text },
        }}
      />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="connections" />
      <Stack.Screen name="dependent-detail" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="subscription" />
      <Stack.Screen name="privacy-policy" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    if (Platform.OS !== "android") {
      return;
    }

    Purchases.configure({ apiKey: REVENUECAT_ANDROID_API_KEY });
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView>
          <KeyboardProvider>
            <ThemeProvider>
              <AuthProvider>
                <SubscriptionProvider>
                  <RootLayoutNav />
                </SubscriptionProvider>
              </AuthProvider>
            </ThemeProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
