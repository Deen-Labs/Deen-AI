import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Linking,
  BackHandler,
  Platform,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import { getStreak, recordContentBlocked } from "../lib/streak";
import { hasPIN, verifyPIN, isLocked } from "../lib/lock";
import PINModal from "./PINModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface MindfulBarrierModalProps {
  visible: boolean;
  blockedUrl?: string;
  onClose: () => void;
}

export default function MindfulBarrierModal({
  visible,
  blockedUrl = "",
  onClose,
}: MindfulBarrierModalProps) {
  const { colors, isDark } = useTheme();

  const [countdown, setCountdown] = useState(10);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      setCountdown(10);
      setPinError(null);
      setShowPinModal(false);

      // Load user streak
      getStreak().then((res) => {
        setCurrentStreak(res.currentStreak);
      }).catch(() => {});

      // Start countdown
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Soft pulse animation on shield
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Intercept Android hardware back button so users cannot trivially dismiss during countdown
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          // If countdown is finished, back button behaves as "Turn Back"
          handleTurnBack();
          return true;
        }
      );

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        backHandler.remove();
      };
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [visible]);

  const handleTurnBack = () => {
    // User chose spiritual restraint: zero infractions recorded, streak preserved
    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
  };

  const handleProceedPress = async () => {
    const locked = await isLocked();
    const pinSet = await hasPIN();

    if (locked && pinSet) {
      // Require PIN verification
      setShowPinModal(true);
    } else {
      // No PIN: confirm relapse reset
      await executeRelapseAndExit();
    }
  };

  const handlePinSubmit = async (pin: string) => {
    const valid = await verifyPIN(pin);
    if (valid) {
      setShowPinModal(false);
      setPinError(null);
      await executeRelapseAndExit();
    } else {
      setPinError("Incorrect PIN. Please try again.");
    }
  };

  const executeRelapseAndExit = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    await recordContentBlocked();
    onClose();

    if (blockedUrl && blockedUrl.startsWith("http")) {
      try {
        await Linking.openURL(blockedUrl);
      } catch {}
    }
  };

  if (!visible) return null;

  const formattedCountdown =
    countdown > 0
      ? `Wait (00:${countdown.toString().padStart(2, "0")}s)...`
      : "Turn Back & Preserve Streak";

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleTurnBack}
    >
      <View style={[styles.container, { backgroundColor: isDark ? "#090d0e" : "#f8faf9" }]}>
        {/* Glow ambient background element */}
        <View style={styles.glowRing} />

        <View style={styles.contentContainer}>
          {/* Header Icon Ring */}
          <Animated.View
            style={[
              styles.shieldRing,
              {
                backgroundColor: isDark ? "rgba(226, 162, 59, 0.12)" : "rgba(184, 121, 20, 0.1)",
                borderColor: isDark ? "rgba(226, 162, 59, 0.35)" : "rgba(184, 121, 20, 0.3)",
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <MaterialCommunityIcons name="shield-alert" size={48} color="#e2a23b" />
          </Animated.View>

          {/* Badge */}
          <View
            style={[
              styles.barrierBadge,
              {
                backgroundColor: isDark ? "rgba(226, 162, 59, 0.15)" : "rgba(184, 121, 20, 0.12)",
                borderColor: isDark ? "rgba(226, 162, 59, 0.3)" : "rgba(184, 121, 20, 0.25)",
              },
            ]}
          >
            <Feather name="pause-circle" size={13} color="#e2a23b" style={{ marginRight: 6 }} />
            <Text style={styles.barrierBadgeText}>MINDFUL GATEWAY</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>Moment of Reflection</Text>

          {/* Quranic Verse */}
          <View
            style={[
              styles.verseCard,
              {
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "#ffffff",
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <Text style={[styles.verseArabic, { color: colors.text }]}>
              أَلَمْ يَعْلَم بِأَنَّ ٱللَّهَ يَرَىٰ
            </Text>
            <Text style={[styles.verseEnglish, { color: colors.textSecondary }]}>
              "Do you not know that Allah sees?"
            </Text>
            <Text style={styles.verseRef}>Surah Al-Alaq (96:14)</Text>
          </View>

          {/* Impact Indicator (Streak at stake) */}
          <View
            style={[
              styles.impactCard,
              {
                backgroundColor: isDark ? "rgba(16, 185, 129, 0.08)" : "rgba(16, 185, 129, 0.06)",
                borderColor: isDark ? "rgba(16, 185, 129, 0.25)" : "rgba(16, 185, 129, 0.2)",
              },
            ]}
          >
            <View style={styles.impactIconCol}>
              <MaterialCommunityIcons name="shield-check" size={24} color="#10b981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.impactTitle, { color: colors.text }]}>
                {currentStreak} {currentStreak === 1 ? "Day" : "Days"} Clean Streak at Stake
              </Text>
              <Text style={[styles.impactSub, { color: colors.textMuted }]}>
                Every moment of conscious restraint is beloved to Allah and strengthens your will.
              </Text>
            </View>
          </View>

          {/* Primary Action Button: Countdown / Turn Back */}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              countdown > 0
                ? { backgroundColor: isDark ? "#242d2d" : "#e2e8e5", opacity: 0.7 }
                : { backgroundColor: "#e2a23b" },
            ]}
            onPress={handleTurnBack}
            disabled={countdown > 0}
            activeOpacity={0.85}
          >
            <Feather
              name={countdown > 0 ? "clock" : "shield"}
              size={17}
              color={countdown > 0 ? (isDark ? "#94a3b8" : "#64748b") : "#0f1718"}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[
                styles.primaryBtnText,
                { color: countdown > 0 ? (isDark ? "#94a3b8" : "#64748b") : "#0f1718" },
              ]}
            >
              {formattedCountdown}
            </Text>
          </TouchableOpacity>

          {/* Secondary Action Button: Proceed Anyway (Resets streak) */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleProceedPress}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>
              Proceed anyway (Resets streak to 0)
            </Text>
          </TouchableOpacity>
        </View>

        {/* PIN Verification Modal */}
        <PINModal
          visible={showPinModal}
          onClose={() => setShowPinModal(false)}
          onSubmit={handlePinSubmit}
          title="Protection PIN Required"
          subtitle="Enter your 4-digit PIN to proceed past the Mindful Gateway"
          error={pinError}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  glowRing: {
    position: "absolute",
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_WIDTH * 0.9,
    borderRadius: (SCREEN_WIDTH * 0.9) / 2,
    backgroundColor: "rgba(226, 162, 59, 0.04)",
    top: "15%",
  },
  contentContainer: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  shieldRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  barrierBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  barrierBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#e2a23b",
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
  },
  verseCard: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 14,
  },
  verseArabic: {
    fontSize: 22,
    fontFamily: "Amiri",
    textAlign: "center",
    lineHeight: 36,
    marginBottom: 8,
  },
  verseEnglish: {
    fontSize: 13.5,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 6,
  },
  verseRef: {
    fontSize: 11,
    fontWeight: "700",
    color: "#e2a23b",
    letterSpacing: 0.5,
  },
  impactCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  impactIconCol: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  impactTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  impactSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  primaryBtn: {
    width: "100%",
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
