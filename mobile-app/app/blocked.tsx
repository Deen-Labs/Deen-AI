import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import { nativeContentProtection } from "../lib/nativeContentProtection";
import { resolveAppMeta } from "../lib/focus";
import { recordContentBlocked } from "../lib/streak";

export default function BlockedScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: string;
    url?: string;
    pkg?: string;
  }>();

  const isAppBlock = params.type === "app" || (!params.type && !!params.pkg);
  const targetPkg = params.pkg || "";
  const targetUrl = params.url || "";

  React.useEffect(() => {
    // If a prohibited site or explicit keyword triggered this block screen, reset clean streak immediately
    if (!isAppBlock) {
      recordContentBlocked().catch(() => {});
    }
  }, [isAppBlock]);

  const resolvedApp = targetPkg ? resolveAppMeta(targetPkg) : null;
  const appDisplayName = resolvedApp?.name || targetPkg || "Distracting App";

  const handleGoHome = async () => {
    try {
      if (Platform.OS === "android") {
        const handled = await nativeContentProtection.goToHomeScreen();
        if (handled) return;
      }
    } catch {}
    // Fallback if not on Android or native intent didn't fire
    try {
      BackHandler.exitApp();
    } catch {
      router.replace("/(tabs)");
    }
  };

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/focus");
    }
  };

  const handleReturnToDeen = () => {
    router.replace("/(tabs)/focus");
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "bottom", "left", "right"]}
    >
      {/* Top Header Bar with Close (X) button */}
      <View style={styles.topHeader}>
        <View
          style={[
            styles.guardianPill,
            {
              backgroundColor: isDark
                ? "rgba(226, 162, 59, 0.12)"
                : "rgba(184, 121, 20, 0.1)",
              borderColor: isDark
                ? "rgba(226, 162, 59, 0.3)"
                : "rgba(184, 121, 20, 0.25)",
            },
          ]}
        >
          <MaterialCommunityIcons
            name="shield-check"
            size={14}
            color={colors.accentGold}
          />
          <Text style={[styles.guardianPillText, { color: colors.accentGold }]}>
            DEENHUB PROTECTION
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleClose}
          style={[
            styles.closeIconButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
          accessibilityLabel="Close blocked notice"
        >
          <Feather name="x" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.mainCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Top Circular Emblem */}
          <View
            style={[
              styles.iconEmblemRing,
              {
                backgroundColor: isDark
                  ? "rgba(226, 162, 59, 0.14)"
                  : "rgba(184, 121, 20, 0.12)",
                borderColor: isDark
                  ? "rgba(226, 162, 59, 0.35)"
                  : "rgba(184, 121, 20, 0.3)",
              },
            ]}
          >
            {isAppBlock ? (
              <MaterialCommunityIcons
                name="cellphone-lock"
                size={46}
                color={colors.accentGold}
              />
            ) : (
              <MaterialCommunityIcons
                name="shield-lock-outline"
                size={46}
                color={colors.accentGold}
              />
            )}
          </View>

          {/* Heading */}
          <Text style={[styles.title, { color: colors.text }]}>
            {isAppBlock
              ? "App blocked by DeenHub"
              : "Site blocked by DeenHub"}
          </Text>

          {/* Subtitle */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {isAppBlock
              ? "Opening distracting apps is restricted during active Focus Mode to protect your time and concentration."
              : "This website has been restricted to protect your digital well-being and safeguard your spiritual purity."}
          </Text>

          {/* Target App / Domain Badge */}
          {isAppBlock && appDisplayName ? (
            <View
              style={[
                styles.targetBadge,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={(resolvedApp?.icon as any) || "cellphone"}
                size={16}
                color={resolvedApp?.color || colors.accentGold}
              />
              <Text style={[styles.targetBadgeText, { color: colors.text }]}>
                {appDisplayName}
              </Text>
            </View>
          ) : !isAppBlock && targetUrl ? (
            <View
              style={[
                styles.targetBadge,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather name="globe" size={14} color={colors.accentGold} />
              <Text
                style={[styles.targetBadgeText, { color: colors.text }]}
                numberOfLines={1}
              >
                {targetUrl.replace(/^https?:\/\//i, "").slice(0, 42)}
              </Text>
            </View>
          ) : null}

          {/* Quranic Reflection Card */}
          <View
            style={[
              styles.quoteBox,
              {
                backgroundColor: isDark
                  ? "rgba(15, 23, 24, 0.7)"
                  : "rgba(244, 247, 246, 0.8)",
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <Text style={[styles.arabicVerse, { color: colors.accentGold }]}>
              {isAppBlock
                ? "وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ وَإِنَّهَا لَكَبِيرَةٌ إِلَّا عَلَى الْخَاشِعِينَ"
                : "قُل لِّلْمُؤْمِنِينَ يَغُضُّوا۟ مِنْ أَبْصَـٰرِهِمْ وَيَحْفَظُوا۟ فُرُوجَهُمْ ۚ ذَٰلِكَ أَزْكَىٰ لَهُمْ"}
            </Text>
            <Text
              style={[
                styles.verseTranslation,
                { color: colors.textSecondary },
              ]}
            >
              {isAppBlock
                ? "“And seek help through patience and prayer; and indeed, it is difficult except for the humbly submissive.”"
                : "“Tell the believing men to lower their gaze and guard their modesty; that is purer for them.”"}
            </Text>
            <Text style={[styles.verseReference, { color: colors.accentGold }]}>
              {isAppBlock ? "Surah Al-Baqarah 2:45" : "Surah An-Nur 24:30"}
            </Text>
          </View>

          {/* Primary Action Button: Go to Device Home */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: colors.accentGold },
            ]}
            onPress={handleGoHome}
            activeOpacity={0.85}
          >
            <Feather name="home" size={18} color="#0f1718" />
            <Text style={styles.primaryButtonText}>Go to Device Home</Text>
          </TouchableOpacity>

          {/* Secondary Action Button: Return to DeenHub */}
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={handleReturnToDeen}
            activeOpacity={0.8}
          >
            <Feather name="arrow-left" size={17} color={colors.text} />
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              Return to DeenHub
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  guardianPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  guardianPillText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  closeIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  mainCard: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 28,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  iconEmblemRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  targetBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 18,
    maxWidth: "92%",
  },
  targetBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  quoteBox: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 24,
    alignItems: "center",
  },
  arabicVerse: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 8,
  },
  verseTranslation: {
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 6,
  },
  verseReference: {
    fontSize: 11,
    fontWeight: "700",
  },
  primaryButton: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#0f1718",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    width: "100%",
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
