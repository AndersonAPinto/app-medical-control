import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from "react";
import { Platform } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/query-client";

interface SubscriptionContextValue {
  isPremium: boolean;
  isLoading: boolean;
  purchaseMonthly: () => Promise<void>;
  purchaseYearly: () => Promise<void>;
  restorePurchases: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || "";
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || "";

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [rcConfigured, setRcConfigured] = useState(false);

  const isPremium = user?.planType === "PREMIUM";

  useEffect(() => {
    const initRevenueCat = async () => {
      if (Platform.OS === "web") return;
      try {
        const Purchases = require("react-native-purchases").default;
        const apiKey = Platform.OS === "android" ? REVENUECAT_API_KEY_ANDROID : REVENUECAT_API_KEY_IOS;
        if (!apiKey) return;
        Purchases.configure({ apiKey });
        if (user?.id) {
          await Purchases.logIn(user.id);
        }
        setRcConfigured(true);
      } catch (err) {
        console.log("RevenueCat init skipped:", err);
      }
    };
    initRevenueCat();
  }, [user?.id]);

  const syncPlanToBackend = useCallback(async (planType: string) => {
    try {
      await apiRequest("POST", "/api/auth/sync-plan", { planType });
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
    } catch (err) {
      console.error("Failed to sync plan:", err);
    }
  }, [refreshUser]);

  const purchaseMonthly = useCallback(async () => {
    setIsLoading(true);
    try {
      if (Platform.OS === "web" || !rcConfigured) {
        await syncPlanToBackend("PREMIUM");
        return;
      }
      const Purchases = require("react-native-purchases").default;
      const offerings = await Purchases.getOfferings();
      const monthlyPackage = offerings?.current?.monthly;
      if (!monthlyPackage) {
        throw new Error("Pacote mensal não disponível");
      }
      await Purchases.purchasePackage(monthlyPackage);
      await syncPlanToBackend("PREMIUM");
    } catch (err: any) {
      if (!err.userCancelled) {
        throw err;
      }
    } finally {
      setIsLoading(false);
    }
  }, [rcConfigured, syncPlanToBackend]);

  const purchaseYearly = useCallback(async () => {
    setIsLoading(true);
    try {
      if (Platform.OS === "web" || !rcConfigured) {
        await syncPlanToBackend("PREMIUM");
        return;
      }
      const Purchases = require("react-native-purchases").default;
      const offerings = await Purchases.getOfferings();
      const annualPackage = offerings?.current?.annual;
      if (!annualPackage) {
        throw new Error("Pacote anual não disponível");
      }
      await Purchases.purchasePackage(annualPackage);
      await syncPlanToBackend("PREMIUM");
    } catch (err: any) {
      if (!err.userCancelled) {
        throw err;
      }
    } finally {
      setIsLoading(false);
    }
  }, [rcConfigured, syncPlanToBackend]);

  const restorePurchases = useCallback(async () => {
    setIsLoading(true);
    try {
      if (Platform.OS === "web" || !rcConfigured) {
        return;
      }
      const Purchases = require("react-native-purchases").default;
      const customerInfo = await Purchases.restorePurchases();
      const hasActive = Object.keys(customerInfo.entitlements.active).length > 0;
      if (hasActive) {
        await syncPlanToBackend("PREMIUM");
      }
    } catch (err) {
      console.error("Restore failed:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [rcConfigured, syncPlanToBackend]);

  const value = useMemo(
    () => ({ isPremium, isLoading, purchaseMonthly, purchaseYearly, restorePurchases }),
    [isPremium, isLoading, purchaseMonthly, purchaseYearly, restorePurchases]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
