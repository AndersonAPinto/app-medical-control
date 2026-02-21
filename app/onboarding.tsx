import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ONBOARDING_KEY = "onboarding_completed";

interface OnboardingSlide {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  features: { icon: keyof typeof Ionicons.glyphMap; text: string }[];
}

const slides: OnboardingSlide[] = [
  {
    icon: "medkit",
    iconBg: "#CCFBF1",
    iconColor: "#0D9488",
    title: "Seus Remédios\nno Controle",
    description: "Cadastre todos os seus medicamentos e nunca mais se preocupe com o estoque.",
    features: [
      { icon: "add-circle-outline", text: "Cadastre medicamentos com nome e dosagem" },
      { icon: "cube-outline", text: "Acompanhe o estoque em tempo real" },
      { icon: "notifications-outline", text: "Receba alertas quando estiver acabando" },
    ],
  },
  {
    icon: "time",
    iconBg: "#DBEAFE",
    iconColor: "#2563EB",
    title: "Nunca Perca\num Horário",
    description: "Registre cada dose tomada e acompanhe seu histórico completo de medicação.",
    features: [
      { icon: "checkmark-circle-outline", text: "Confirme doses com um toque" },
      { icon: "calendar-outline", text: "Veja seu histórico de doses tomadas" },
      { icon: "trending-up-outline", text: "Acompanhe sua rotina de medicação" },
    ],
  },
  {
    icon: "people",
    iconBg: "#FCE7F3",
    iconColor: "#DB2777",
    title: "Cuide de Quem\nVocê Ama",
    description: "Conecte-se com familiares e monitore a medicação de quem precisa de ajuda.",
    features: [
      { icon: "link-outline", text: "Conecte responsáveis e dependentes" },
      { icon: "eye-outline", text: "Monitore doses e estoque à distância" },
      { icon: "alert-circle-outline", text: "Receba alertas sobre seus dependentes" },
    ],
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < slides.length - 1) {
      scrollRef.current?.scrollTo({ x: SCREEN_WIDTH * (currentIndex + 1), animated: true });
    } else {
      finishOnboarding();
    }
  };

  const skip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    finishOnboarding();
  };

  const finishOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/login");
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#F0FDFA", "#FFFFFF"]}
        style={[styles.bgGradient, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}
      >
        <View style={styles.topBar}>
          <View style={{ width: 60 }} />
          <View style={styles.dots}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
          {currentIndex < slides.length - 1 ? (
            <Pressable onPress={skip} hitSlop={12}>
              <Text style={styles.skipText}>Pular</Text>
            </Pressable>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
        >
          {slides.map((slide, index) => (
            <View key={index} style={[styles.slide, { width: SCREEN_WIDTH }]}>
              <View style={[styles.iconCircle, { backgroundColor: slide.iconBg }]}>
                <Ionicons name={slide.icon} size={56} color={slide.iconColor} />
              </View>

              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.description}>{slide.description}</Text>

              <View style={styles.featuresContainer}>
                {slide.features.map((feature, fi) => (
                  <View key={fi} style={styles.featureRow}>
                    <View style={[styles.featureIconCircle, { backgroundColor: slide.iconBg }]}>
                      <Ionicons name={feature.icon} size={20} color={slide.iconColor} />
                    </View>
                    <Text style={styles.featureText}>{feature.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.bottomSection, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24 }]}>
          <Pressable
            onPress={goNext}
            style={({ pressed }) => [styles.nextButton, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={[Colors.palette.teal600, Colors.palette.teal400]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>
                {currentIndex === slides.length - 1 ? "Começar" : "Próximo"}
              </Text>
              <Ionicons
                name={currentIndex === slides.length - 1 ? "checkmark-circle" : "arrow-forward"}
                size={20}
                color="#fff"
              />
            </LinearGradient>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0FDFA",
  },
  bgGradient: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.palette.teal600,
  },
  dotInactive: {
    width: 8,
    backgroundColor: Colors.palette.slate300,
  },
  skipText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.palette.slate500,
    width: 60,
    textAlign: "right",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.palette.slate900,
    textAlign: "center",
    lineHeight: 36,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.palette.slate500,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  featuresContainer: {
    width: "100%",
    gap: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  featureIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.palette.slate700,
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  nextButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  nextButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
