import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/theme-context";
import { cardShadow } from "@/lib/shadows";

function SkeletonRect({ width, height, borderRadius = 6 }: { width: number | string; height: number; borderRadius?: number }) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: colors.border },
        animStyle,
      ]}
    />
  );
}

export default function SkeletonCard() {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, cardShadow(colors.cardShadow)]}>
      <SkeletonRect width={44} height={44} borderRadius={13} />
      <View style={styles.content}>
        <SkeletonRect width="70%" height={14} borderRadius={7} />
        <View style={{ marginTop: 8 }}>
          <SkeletonRect width="45%" height={11} borderRadius={6} />
        </View>
        <View style={{ marginTop: 6 }}>
          <SkeletonRect width="55%" height={10} borderRadius={5} />
        </View>
      </View>
      <SkeletonRect width={52} height={52} borderRadius={16} />
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  content: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 20,
    gap: 10,
    paddingTop: 8,
  },
});
