import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from "react";
import { Platform } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/query-client";

interface SubscriptionContextValue {
  isPremium: boolean;
  isLoading: boolean;
  subscriptionStatus: string;
  subscriptionInterval: "monthly" | "yearly" | null;
  subscriptionExpiresAt: string | null;
  subscriptionWillRenew: boolean;
  purchaseMonthly: () => Promise<void>;
  purchaseYearly: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || "";
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || "";

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [rcConfigured, setRcConfigured] = useState(false);

  const isPremium = user?.planType === "PREMIUM";
  const subscriptionStatus = user?.subscriptionStatus || "INACTIVE";
  const subscriptionInterval = (user?.subscriptionInterval as "monthly" | "yearly" | null) || null;
  const subscriptionExpiresAt = user?.subscriptionExpiresAt || null;
  const subscriptionWillRenew = Boolean(user?.subscriptionWillRenew);

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

  const syncPlanToBackend = useCallback(async (payload: Record<string, unknown>) => {
    try {
      await apiRequest("POST", "/api/auth/sync-plan", payload);
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
    } catch (err) {
      console.error("Failed to sync plan:", err);
    }
  }, [refreshUser]);

  const syncRevenueCatState = useCallback(async (customerInfo: unknown, selectedInterval?: "monthly" | "yearly") => {
    await syncPlanToBackend({
      source: "revenuecat",
      selectedInterval,
      customerInfo,
    });
  }, [syncPlanToBackend]);

  const refreshSubscription = useCallback(async () => {
    if (Platform.OS === "web" || !rcConfigured) return;
    try {
      const Purchases = require("react-native-purchases").default;
      const customerInfo = await Purchases.getCustomerInfo();
      await syncRevenueCatState(customerInfo);
    } catch (err) {
      console.error("Failed to refresh RevenueCat subscription:", err);
    }
  }, [rcConfigured, syncRevenueCatState]);

  const purchaseMonthly = useCallback(async () => {
    setIsLoading(true);
    try {
      if (Platform.OS === "web" || !rcConfigured) {
        await syncPlanToBackend({ planType: "PREMIUM" });
        return;
      }
      const Purchases = require("react-native-purchases").default;
      const offerings = await Purchases.getOfferings();
      const monthlyPackage = offerings?.current?.monthly;
      if (!monthlyPackage) {
        throw new Error("Pacote mensal não disponível");
      }
      const purchaseResult = await Purchases.purchasePackage(monthlyPackage);
      await syncRevenueCatState(purchaseResult?.customerInfo, "monthly");
    } catch (err: any) {
      if (!err.userCancelled) {
        throw err;
      }
    } finally {
      setIsLoading(false);
    }
  }, [rcConfigured, syncPlanToBackend, syncRevenueCatState]);

  const purchaseYearly = useCallback(async () => {
    setIsLoading(true);
    try {
      if (Platform.OS === "web" || !rcConfigured) {
        await syncPlanToBackend({ planType: "PREMIUM" });
        return;
      }
      const Purchases = require("react-native-purchases").default;
      const offerings = await Purchases.getOfferings();
      const annualPackage = offerings?.current?.annual;
      if (!annualPackage) {
        throw new Error("Pacote anual não disponível");
      }
      const purchaseResult = await Purchases.purchasePackage(annualPackage);
      await syncRevenueCatState(purchaseResult?.customerInfo, "yearly");
    } catch (err: any) {
      if (!err.userCancelled) {
        throw err;
      }
    } finally {
      setIsLoading(false);
    }
  }, [rcConfigured, syncPlanToBackend, syncRevenueCatState]);

  const restorePurchases = useCallback(async () => {
    setIsLoading(true);
    try {
      if (Platform.OS === "web" || !rcConfigured) {
        return;
      }
      const Purchases = require("react-native-purchases").default;
      const customerInfo = await Purchases.restorePurchases();
      await syncRevenueCatState(customerInfo);
    } catch (err) {
      console.error("Restore failed:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [rcConfigured, syncRevenueCatState]);

  useEffect(() => {
    if (!user?.id || !rcConfigured) return;
    refreshSubscription();
  }, [user?.id, rcConfigured, refreshSubscription]);

  const value = useMemo(
    () => ({
      isPremium,
      isLoading,
      subscriptionStatus,
      subscriptionInterval,
      subscriptionExpiresAt,
      subscriptionWillRenew,
      purchaseMonthly,
      purchaseYearly,
      restorePurchases,
      refreshSubscription,
    }),
    [
      isPremium,
      isLoading,
      subscriptionStatus,
      subscriptionInterval,
      subscriptionExpiresAt,
      subscriptionWillRenew,
      purchaseMonthly,
      purchaseYearly,
      restorePurchases,
      refreshSubscription,
    ]
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
