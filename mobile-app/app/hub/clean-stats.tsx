import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../lib/theme";
import { useLanguage } from "../../lib/i18n";
import { useResponsiveLayout } from "../../lib/responsive";
import { getCleanAnalyticsStats, CleanAnalyticsStats, checkAndUpdateStreak, recordVPNDisabled } from "../../lib/streak";
import { hasPIN, verifyPIN, isLocked, setPIN, setLockEnabled, removePIN } from "../../lib/lock";
import PINModal from "../../components/PINModal";
import ProtectionActivationModal from "../../components/ProtectionActivationModal";
import { nativeContentProtection } from "../../lib/nativeContentProtection";

export default function CleanStatsScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { contentContainerStyle, tableMaxWidthStyle } = useResponsiveLayout();
  const router = useRouter();

  const [stats, setStats] = useState<CleanAnalyticsStats>({
    currentStreak: 0,
    maxStreak: 0,
    averageStreak: 0,
    totalRelapses: 0,
    startDate: null,
    lastResetReason: null,
    history: [],
  });
  const [isProtectionActive, setIsProtectionActive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activationModalVisible, setActivationModalVisible] = useState(false);
  const [rulesModalVisible, setRulesModalVisible] = useState(false);
  
  // Security & PIN modal states
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinMode, setPinMode] = useState<'verify' | 'set'>('verify');
  const [pinAction, setPinAction] = useState<'toggle_off' | 'set_before_swp'>('toggle_off');
  const [pinExists, setPinExists] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const handleToggleProtection = async (val: boolean) => {
    if (!val) {
      // User is attempting to turn off protection
      const locked = await isLocked();
      const pinSet = await hasPIN();
      if (locked && pinSet) {
        setPinAction('toggle_off');
        setPinMode('verify');
        setPinError(null);
        setPinModalVisible(true);
        return;
      }

      Alert.alert(
        "Turn Off Protection?",
        "Disabling system-wide protection leaves your device unshielded and pauses your days clean streak. Are you sure?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Turn Off",
            style: "destructive",
            onPress: async () => {
              const stopped = await nativeContentProtection.stop();
              if (stopped) {
                setIsProtectionActive(false);
                await recordVPNDisabled();
                await loadData();
              }
            },
          },
        ]
      );
    } else {
      // User is turning protection on
      const isA11y = await nativeContentProtection.isAccessibilityEnabled();
      if (!isA11y) {
        const pinSet = await hasPIN();
        setPinExists(pinSet);
        setActivationModalVisible(true);
      } else {
        const started = await nativeContentProtection.start();
        setIsProtectionActive(started);
        await loadData();
      }
    }
  };

  const handlePinSubmit = async (attempt: string) => {
    if (pinAction === 'set_before_swp' && pinMode === 'set') {
      const success = await setPIN(attempt);
      if (success) {
        await setLockEnabled(true);
        setPinExists(true);
        setPinModalVisible(false);
        const started = await nativeContentProtection.start();
        setIsProtectionActive(started);
        await loadData();
      } else {
        setPinError("Failed to set PIN. Please try again.");
      }
    } else {
      const valid = await verifyPIN(attempt);
      if (valid) {
        setPinModalVisible(false);
        setPinError(null);
        const stopped = await nativeContentProtection.stop();
        if (stopped) {
          setIsProtectionActive(false);
          await recordVPNDisabled();
          await loadData();
        }
      } else {
        setPinError("Incorrect PIN. Please try again.");
      }
    }
  };

  const loadData = useCallback(async () => {
    try {
      await checkAndUpdateStreak();
      const data = await getCleanAnalyticsStats();
      setStats(data);
      if (nativeContentProtection.isAvailable()) {
        const status = await nativeContentProtection.getStatus();
        setIsProtectionActive(status.active);
      }
      const pinSet = await hasPIN();
      setPinExists(pinSet);
    } catch (err) {
      console.warn("[CleanStats] Error loading stats:", err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleShareStreak = async () => {
    try {
      await Share.share({
        message: `Alhamdulillah! I am on a ${stats.currentStreak}-day clean streak with DeenHub Protection. Purity is part of Faith!`,
      });
    } catch {}
  };

  const formatReason = (reason?: string | null) => {
    if (!reason) return "New Journey";
    if (reason === "content_blocked") return "Prohibited Site Intercepted";
    if (reason === "vpn_disabled") return "Protection Disabled";
    return reason;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Just started";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentGold} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={tableMaxWidthStyle}>
          {/* ─── HERO CARD: CURRENT DAYS CLEAN WITH INTEGRATED PROTECTION TOGGLE ─── */}
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.heroTopRow}>
              {/* Left Side: Days Clean Counter */}
              <View style={styles.heroLeftCol}>
                <View style={styles.counterRow}>
                  <Text style={[styles.streakBigNumber, { color: colors.text }]}>{stats.currentStreak}</Text>
                  <View style={styles.counterLabelCol}>
                    <Text style={[styles.streakUnit, { color: colors.accentGold }]}>
                      {stats.currentStreak === 1 ? "DAY" : "DAYS"}
                    </Text>
                    <Text style={[styles.streakSubUnit, { color: colors.textSecondary }]}>CLEAN & PURE</Text>
                  </View>
                </View>
              </View>

              {/* Right Side: Square Protection Toggle Button */}
              <TouchableOpacity
                style={[
                  styles.protectionSquareBtn,
                  {
                    backgroundColor: isProtectionActive
                      ? (isDark ? "rgba(16, 185, 129, 0.14)" : "rgba(16, 185, 129, 0.10)")
                      : (isDark ? "rgba(239, 68, 68, 0.16)" : "rgba(239, 68, 68, 0.12)"),
                    borderColor: isProtectionActive
                      ? (isDark ? "rgba(16, 185, 129, 0.45)" : "#10b981")
                      : (isDark ? "rgba(239, 68, 68, 0.45)" : "#ef4444"),
                  },
                ]}
                onPress={() => handleToggleProtection(!isProtectionActive)}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons
                  name={isProtectionActive ? "shield-check" : "shield-remove"}
                  size={32}
                  color={isProtectionActive ? "#10b981" : "#ef4444"}
                />
                <Text
                  style={[
                    styles.protectionSquareLetter,
                    { color: isProtectionActive ? "#10b981" : "#ef4444" },
                  ]}
                >
                  {isProtectionActive ? "ONLINE" : "OFFLINE"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.heroSummary, { color: colors.textMuted }]}>
              {stats.currentStreak > 0
                ? `Started on ${formatDate(stats.startDate)}. Every moment of restraint is written with your Lord.`
                : "Your journey starts today. Seek forgiveness and take the first step towards a clean heart."}
            </Text>

            <View style={styles.heroActionsRow}>
              <TouchableOpacity
                style={[styles.heroActionBtn, { backgroundColor: colors.accentGold }]}
                onPress={handleShareStreak}
                activeOpacity={0.8}
              >
                <Feather name="share-2" size={14} color="#0f1718" style={{ marginRight: 6 }} />
                <Text style={styles.heroActionBtnText}>Share Milestone</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.heroActionBtnSec, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setRulesModalVisible(true)}
                activeOpacity={0.8}
              >
                <Feather name="shield" size={14} color={colors.text} style={{ marginRight: 6 }} />
                <Text style={[styles.heroActionBtnSecText, { color: colors.text }]}>Protection Rules</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── 3-TILE ANALYTICS METRICS GRID ─── */}
          <View style={styles.metricsRow}>
            {/* Tile 1: Max Days Clean */}
            <View style={[styles.metricTile, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <View style={[styles.metricIconCircle, { backgroundColor: "rgba(226, 162, 59, 0.12)" }]}>
                <Feather name="award" size={16} color={colors.accentGold} />
              </View>
              <Text style={[styles.metricValue, { color: colors.text }]}>{stats.maxStreak}</Text>
              <Text style={[styles.metricLabel, { color: colors.accentGold }]}>Max Clean Days</Text>
              <Text style={[styles.metricDesc, { color: colors.textMuted }]}>Personal Best</Text>
            </View>

            {/* Tile 2: Average Clean Days */}
            <View style={[styles.metricTile, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <View style={[styles.metricIconCircle, { backgroundColor: "rgba(16, 185, 129, 0.12)" }]}>
                <Feather name="trending-up" size={16} color="#10b981" />
              </View>
              <Text style={[styles.metricValue, { color: colors.text }]}>{stats.averageStreak}</Text>
              <Text style={[styles.metricLabel, { color: "#10b981" }]}>Average Streak</Text>
              <Text style={[styles.metricDesc, { color: colors.textMuted }]}>Days per cycle</Text>
            </View>

            {/* Tile 3: Total Relapses / Blocks */}
            <View style={[styles.metricTile, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <View style={[styles.metricIconCircle, { backgroundColor: "rgba(239, 68, 68, 0.12)" }]}>
                <Feather name="shield-off" size={16} color="#ef4444" />
              </View>
              <Text style={[styles.metricValue, { color: colors.text }]}>{stats.totalRelapses}</Text>
              <Text style={[styles.metricLabel, { color: "#ef4444" }]}>Blocks Recorded</Text>
              <Text style={[styles.metricDesc, { color: colors.textMuted }]}>Shielded temptations</Text>
            </View>
          </View>

          {/* ─── SPIRITUAL REMINDER & TAUBAH CARD ─── */}
          <View style={[styles.hadithCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.hadithHeader}>
              <MaterialCommunityIcons name="book-open-variant" size={16} color={colors.accentGold} />
              <Text style={[styles.hadithTitle, { color: colors.accentGold }]}>Virtue of Renewal & Taubah</Text>
            </View>
            <Text style={[styles.hadithArabic, { color: colors.text }]}>
              إِنَّ ٱللَّهَ يُحِبُّ ٱلتَّوَّابِينَ وَيُحِبُّ ٱلْمُتَطَهِّرِينَ
            </Text>
            <Text style={[styles.hadithTranslation, { color: colors.textSecondary }]}>
              "Indeed, Allah loves those who are constantly repentant and loves those who purify themselves." (Surah Al-Baqarah: 222)
            </Text>
          </View>

          {/* ─── STREAK & RELAPSE TIMELINE ─── */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Purity Journey History</Text>
            <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
              {stats.history.length} {stats.history.length === 1 ? "entry" : "entries"}
            </Text>
          </View>

          {stats.history.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <Feather name="check-circle" size={28} color={colors.accentGreen} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Clean Record</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                No past relapses recorded. Keep going strong and maintain your digital purity.
              </Text>
            </View>
          ) : (
            stats.history.slice(0, 10).map((item, idx) => (
              <View key={idx} style={[styles.historyItemCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <View style={[styles.historyIconCircle, { backgroundColor: "rgba(239, 68, 68, 0.12)" }]}>
                  <Feather name="rotate-ccw" size={14} color="#ef4444" />
                </View>
                <View style={styles.historyInfoCol}>
                  <Text style={[styles.historyReason, { color: colors.text }]}>{formatReason(item.resetReason)}</Text>
                  <Text style={[styles.historyDate, { color: colors.textMuted }]}>{formatDate(item.date)}</Text>
                </View>
                <View style={styles.historyStreakBadge}>
                  <Text style={[styles.historyStreakVal, { color: colors.accentGold }]}>{item.streak}</Text>
                  <Text style={[styles.historyStreakUnit, { color: colors.textMuted }]}>Days Clean</Text>
                </View>
              </View>
            ))
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* ─── SECURITY PIN MODAL ─── */}
      <PINModal
        visible={pinModalVisible}
        onClose={() => {
          setPinModalVisible(false);
          setPinError(null);
        }}
        onSubmit={handlePinSubmit}
        onForgotPin={async () => {
          await removePIN();
          setPinExists(false);
          setPinModalVisible(false);
          setPinError(null);
          Alert.alert("PIN Cleared", "Your security PIN has been successfully cleared.");
        }}
        mode={pinMode}
        title={pinMode === 'set' ? "Set Protection PIN" : "Protection PIN Required"}
        subtitle={
          pinMode === 'set'
            ? "Create a 4-digit PIN to safeguard and lock your content protection"
            : "Enter your 4-digit PIN to turn off system-wide protection"
        }
        error={pinError}
      />

      {/* ─── SYSTEM WIDE PROTECTION ACTIVATION MODAL ─── */}
      <ProtectionActivationModal
        visible={activationModalVisible}
        onClose={() => setActivationModalVisible(false)}
        onConfirm={async () => {
          setActivationModalVisible(false);
          const started = await nativeContentProtection.start();
          setIsProtectionActive(started);
          await loadData();
        }}
        hasPin={pinExists}
        onRequirePin={() => {
          setActivationModalVisible(false);
          setPinAction('set_before_swp');
          setPinMode('set');
          setPinError(null);
          setPinModalVisible(true);
        }}
      />

      {/* ─── PROTECTION RULES MODAL ─── */}
      <Modal
        visible={rulesModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRulesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.rulesModalContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.rulesModalHeader}>
              <View style={styles.rulesHeaderLeft}>
                <View style={[styles.rulesHeaderIcon, { backgroundColor: isDark ? 'rgba(226, 162, 59, 0.15)' : 'rgba(184, 121, 20, 0.12)' }]}>
                  <Feather name="shield" size={20} color={colors.accentGold} />
                </View>
                <View>
                  <Text style={[styles.rulesModalTitle, { color: colors.text }]}>Protection Rules</Text>
                  <Text style={[styles.rulesModalSubtitle, { color: colors.textMuted }]}>
                    Active Spiritual & Digital Safeguards
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setRulesModalVisible(false)}
                style={[styles.rulesModalCloseBtn, { backgroundColor: colors.surface }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.rulesList} showsVerticalScrollIndicator={false}>
              {/* Rule 1 */}
              <View style={[styles.ruleCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <View style={[styles.ruleIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                  <MaterialCommunityIcons name="shield-alert" size={18} color="#ef4444" />
                </View>
                <View style={styles.ruleContent}>
                  <View style={styles.ruleTitleRow}>
                    <Text style={[styles.ruleTitle, { color: colors.text }]}>Adult & Explicit Web Block</Text>
                    <View style={[styles.rulePill, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Text style={[styles.rulePillText, { color: '#10b981' }]}>ENFORCED</Text>
                    </View>
                  </View>
                  <Text style={[styles.ruleDesc, { color: colors.textSecondary }]}>
                    Blocks 10,000+ known adult, tube, and explicit domains system-wide across Chrome, Samsung Internet, Edge, and other browsers.
                  </Text>
                </View>
              </View>

              {/* Rule 2 */}
              <View style={[styles.ruleCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <View style={[styles.ruleIconCircle, { backgroundColor: 'rgba(226, 162, 59, 0.12)' }]}>
                  <Feather name="search" size={18} color={colors.accentGold} />
                </View>
                <View style={styles.ruleContent}>
                  <View style={styles.ruleTitleRow}>
                    <Text style={[styles.ruleTitle, { color: colors.text }]}>Safe Search Enforcement</Text>
                    <View style={[styles.rulePill, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Text style={[styles.rulePillText, { color: '#10b981' }]}>ACTIVE</Text>
                    </View>
                  </View>
                  <Text style={[styles.ruleDesc, { color: colors.textSecondary }]}>
                    Sanitizes search engines (Google, Bing, DuckDuckGo) to prevent explicit image and video results from surfacing.
                  </Text>
                </View>
              </View>

              {/* Rule 3 */}
              <View style={[styles.ruleCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <View style={[styles.ruleIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                  <Feather name="lock" size={18} color="#3b82f6" />
                </View>
                <View style={styles.ruleContent}>
                  <View style={styles.ruleTitleRow}>
                    <Text style={[styles.ruleTitle, { color: colors.text }]}>Tamper & Uninstall Guard</Text>
                    <View style={[styles.rulePill, { backgroundColor: pinExists ? 'rgba(16, 185, 129, 0.15)' : 'rgba(226, 162, 59, 0.15)' }]}>
                      <Text style={[styles.rulePillText, { color: pinExists ? '#10b981' : colors.accentGold }]}>
                        {pinExists ? 'PIN LOCKED' : 'PIN READY'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.ruleDesc, { color: colors.textSecondary }]}>
                    When PIN lock is configured, stopping protection or uninstalling the app requires your 4-digit security PIN. Tip: Have a trusted family member or friend set this PIN for true accountability.
                  </Text>
                </View>
              </View>

              {/* Rule 4 */}
              <View style={[styles.ruleCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <View style={[styles.ruleIconCircle, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
                  <Feather name="clock" size={18} color="#a855f7" />
                </View>
                <View style={styles.ruleContent}>
                  <View style={styles.ruleTitleRow}>
                    <Text style={[styles.ruleTitle, { color: colors.text }]}>Purity Streak Reset</Text>
                    <View style={[styles.rulePill, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Text style={[styles.rulePillText, { color: '#10b981' }]}>STRICT</Text>
                    </View>
                  </View>
                  <Text style={[styles.ruleDesc, { color: colors.textSecondary }]}>
                    Any prohibited content intercept resets your Days Clean counter to 0 to maintain absolute spiritual honesty and sincerity.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.rulesDismissBtn, { backgroundColor: colors.accentGold }]}
              onPress={() => setRulesModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.rulesDismissBtnText}>Close Rules</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  heroCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  heroLeftCol: {
    flex: 1,
    paddingRight: 12,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    gap: 6,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  streakBigNumber: {
    fontSize: 54,
    fontWeight: "800",
    lineHeight: 56,
  },
  counterLabelCol: {
    paddingBottom: 6,
  },
  streakUnit: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  streakSubUnit: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  protectionSquareBtn: {
    width: 76,
    height: 76,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  protectionSquareLetter: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 4,
  },
  heroSummary: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  heroActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  heroActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 12,
  },
  heroActionBtnText: {
    color: "#0f1718",
    fontSize: 13,
    fontWeight: "700",
  },
  heroActionBtnSec: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  heroActionBtnSecText: {
    fontSize: 13,
    fontWeight: "600",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  metricTile: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  metricIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  metricDesc: {
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
  },
  hadithCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  hadithHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  hadithTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  hadithArabic: {
    fontSize: 17,
    fontFamily: "Amiri",
    textAlign: "right",
    lineHeight: 28,
    marginBottom: 8,
  },
  hadithTranslation: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: "italic",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  sectionCount: {
    fontSize: 12,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  historyItemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  historyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  historyInfoCol: {
    flex: 1,
  },
  historyReason: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 11,
  },
  historyStreakBadge: {
    alignItems: "flex-end",
  },
  historyStreakVal: {
    fontSize: 16,
    fontWeight: "800",
  },
  historyStreakUnit: {
    fontSize: 10,
  },

  /* ─── Rules Modal Styles ─── */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  rulesModalContainer: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  rulesModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150, 150, 150, 0.15)",
  },
  rulesHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  rulesHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rulesModalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  rulesModalSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  rulesModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  rulesList: {
    marginBottom: 16,
  },
  ruleCard: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  ruleIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  ruleContent: {
    flex: 1,
  },
  ruleTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  ruleTitle: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
    paddingRight: 6,
  },
  rulePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rulePillText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  ruleDesc: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  rulesDismissBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rulesDismissBtnText: {
    color: "#0f1718",
    fontSize: 13.5,
    fontWeight: "700",
  },
});
