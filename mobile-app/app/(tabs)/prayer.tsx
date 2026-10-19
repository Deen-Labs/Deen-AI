import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getCurrentLocation } from "../../lib/location";
import { getPrayerTimes, formatTime, getNextPrayer, PrayerTimings, getCachedPrayerTimesSync } from "../../lib/prayerTimes";
import { loadSettings } from "../../lib/settings";
import { subscribeToWarmup } from "../../lib/backgroundWarmup";

interface PrayerDisplayConfig {
  arabic: string;
  icon: keyof typeof Feather.glyphMap;
  subtitle: string;
  displayName?: string;
}

const PRAYER_META: Record<string, PrayerDisplayConfig> = {
  Fajr: { arabic: "الفجر", icon: "sunrise", subtitle: "Dawn prayer" },
  Sunrise: { arabic: "الشروق", icon: "sun", subtitle: "Post-fajr sunrise" },
  Dhuhr: { arabic: "الظهر", icon: "sun", subtitle: "Noon prayer" },
  Asr: { arabic: "العصر", icon: "clock", subtitle: "Afternoon prayer" },
  Maghrib: { arabic: "المغرب", icon: "sunset", subtitle: "Sunset prayer" },
  Isha: { arabic: "العشاء", icon: "moon", subtitle: "Night prayer" },
  Midnight: { arabic: "منتصف الليل", icon: "moon", subtitle: "Islamic midnight", displayName: "Midnight" },
  Firstthird: { arabic: "الثلث الأول", icon: "star", subtitle: "First third of night", displayName: "First Third" },
  Lastthird: { arabic: "الثلث الأخير", icon: "star", subtitle: "Tahajjud / Qiyam", displayName: "Last Third" },
};

function calculateCountdown(prayerTimeStr?: string): string {
  if (!prayerTimeStr) return "";
  const [hStr, mStr] = prayerTimeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return "";

  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);

  let diff = target.getTime() - now.getTime();
  if (diff < 0) {
    diff += 24 * 60 * 60 * 1000;
  }

  const totalSecs = Math.floor(diff / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hours > 0) {
    return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
  }
  return `${minutes}m ${pad(seconds)}s`;
}

export default function PrayerTimesScreen() {
  const cached = getCachedPrayerTimesSync();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimings | null>(cached ? cached.timings : null);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"api" | "masjid">(cached ? cached.source.type : "api");
  const [countdown, setCountdown] = useState<string>("");
  const router = useRouter();

  // Clock tick every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Listen to background warm-up updates
  useEffect(() => {
    const unsubscribe = subscribeToWarmup(() => {
      const fresh = getCachedPrayerTimesSync();
      if (fresh) {
        setPrayerTimes(fresh.timings);
        setSource(fresh.source.type);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    loadPrayerTimes();
  }, []);

  const hijriEnglish = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(currentTime);
    } catch {
      return "";
    }
  }, [currentTime]);

  const hijriArabic = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(currentTime);
    } catch {
      return "";
    }
  }, [currentTime]);

  const loadPrayerTimes = async () => {
    try {
      setError(null);
      const settings = await loadSettings();
      const location = await getCurrentLocation();

      if (!location) {
        const { timings, source: pSource } = await getPrayerTimes(
          40.7128,
          -74.006,
          String(settings.calculationMethodValue)
        );
        setPrayerTimes(timings);
        setSource(pSource.type);
        setError("Using default location. Enable location for precision.");
      } else {
        const { timings, source: pSource } = await getPrayerTimes(
          location.latitude,
          location.longitude,
          String(settings.calculationMethodValue)
        );
        setPrayerTimes(timings);
        setSource(pSource.type);
      }
    } catch (err) {
      console.error("Error loading prayer times:", err);
      setError("Failed to load prayer times. Pull down to retry.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPrayerTimes();
    setRefreshing(false);
  }, []);

  const nextPrayer = useMemo(() => {
    if (!prayerTimes) return null;
    return getNextPrayer(prayerTimes, currentTime);
  }, [prayerTimes, currentTime]);

  // Live countdown to next prayer
  useEffect(() => {
    if (!nextPrayer?.time) return;
    setCountdown(calculateCountdown(nextPrayer.time));
    const timer = setInterval(() => {
      setCountdown(calculateCountdown(nextPrayer.time));
    }, 1000);
    return () => clearInterval(timer);
  }, [nextPrayer?.time]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#e2a23b" />
          <Text style={styles.loadingText}>Calculating accurate prayer times...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !prayerTimes) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPrayerTimes}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!prayerTimes) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#e2a23b"
            colors={["#e2a23b"]}
          />
        }
      >
        {/* ─── HEADER WITH GREGORIAN & HIJRI DATES ─── */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Feather name="arrow-left" size={18} color="#e2a23b" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            {/* Qibla quick shortcut */}
            <TouchableOpacity
              style={styles.qiblaBadge}
              onPress={() => router.push("/(tabs)/masjid")}
              activeOpacity={0.8}
            >
              <Feather name="compass" size={14} color="#e2a23b" />
              <Text style={styles.qiblaBadgeText}>Find Qibla</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.headerTitle}>Prayer Times</Text>
          <Text style={styles.headerSubtitle}>
            {format(currentTime, "EEEE, MMMM d, yyyy")}
          </Text>

          {/* Dual Hijri Date Badge */}
          {hijriEnglish ? (
            <View style={styles.hijriContainer}>
              <Text style={styles.hijriEnglish}>{hijriEnglish}</Text>
              {hijriArabic ? (
                <Text style={styles.hijriArabic}>{hijriArabic}</Text>
              ) : null}
            </View>
          ) : null}

          {error && <Text style={styles.headerError}>{error}</Text>}
        </View>

        {/* ─── NEXT PRAYER HERO CARD ─── */}
        {nextPrayer && (
          <View style={styles.nextPrayerCard}>
            <View style={styles.nextPrayerTop}>
              <View style={styles.nextPrayerLabelBadge}>
                <Feather name="clock" size={13} color="#e2a23b" />
                <Text style={styles.nextPrayerLabel}>UPCOMING SALAH</Text>
              </View>
              {countdown ? (
                <View style={styles.countdownBadge}>
                  <Text style={styles.countdownText}>in {countdown}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.nextPrayerMain}>
              <View>
                <Text style={styles.nextPrayerName}>{nextPrayer.name}</Text>
                {PRAYER_META[nextPrayer.name]?.arabic && (
                  <Text style={styles.nextPrayerArabic}>
                    {PRAYER_META[nextPrayer.name].arabic}
                  </Text>
                )}
              </View>
              <Text style={styles.nextPrayerTime}>
                {formatTime(nextPrayer.time)}
              </Text>
            </View>
          </View>
        )}

        {/* ─── ALL PRAYER TIMES LIST ─── */}
        <View style={styles.prayerList}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>

          {Object.entries(prayerTimes).map(([name, time]) => {
            const isNext = nextPrayer && name === nextPrayer.name;
            const meta = PRAYER_META[name] || {
              arabic: "",
              icon: "clock",
              subtitle: "",
            };
            const label = meta.displayName || name;

            return (
              <View
                key={name}
                style={[styles.prayerItem, isNext && styles.prayerItemActive]}
              >
                <View style={styles.prayerItemLeft}>
                  <View
                    style={[
                      styles.prayerIconCircle,
                      isNext && styles.prayerIconCircleActive,
                    ]}
                  >
                    <Feather
                      name={meta.icon}
                      size={18}
                      color={isNext ? "#e2a23b" : "#94a4a2"}
                    />
                  </View>
                  <View>
                    <View style={styles.prayerTitleRow}>
                      <Text
                        style={[
                          styles.prayerName,
                          isNext && styles.prayerNameActive,
                        ]}
                      >
                        {label}
                      </Text>
                      {meta.arabic ? (
                        <Text
                          style={[
                            styles.prayerArabicSmall,
                            isNext && styles.prayerArabicSmallActive,
                          ]}
                        >
                          {meta.arabic}
                        </Text>
                      ) : null}
                    </View>
                    {meta.subtitle ? (
                      <Text style={styles.prayerSubtitle}>{meta.subtitle}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.prayerItemRight}>
                  <Text
                    style={[
                      styles.prayerTime,
                      isNext && styles.prayerTimeActive,
                    ]}
                  >
                    {formatTime(time)}
                  </Text>
                  {isNext && (
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>Next</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* ─── SOURCE INFO ─── */}
        <View style={styles.sourceCard}>
          <View style={styles.sourceHeaderRow}>
            <Feather name="info" size={14} color="#e2a23b" />
            <Text style={styles.sourceLabel}>
              {source === "api" ? "Calculated Astronomical Times" : "Masjid Verified Times"}
            </Text>
          </View>
          <Text style={styles.sourceSubtext}>
            Times are precisely calculated based on your solar coordinates with offline astronomical fallback.
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1718",
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: "#94a4a2",
  },
  errorText: {
    fontSize: 15,
    color: "#ff6b6b",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#e2a23b",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#0f1718",
    fontWeight: "700",
  },

  // ─── Header ───
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backText: {
    fontSize: 15,
    color: "#e2a23b",
    fontWeight: "600",
  },
  qiblaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(226, 162, 59, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(226, 162, 59, 0.25)",
  },
  qiblaBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffdda8",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f3f7f6",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#94a4a2",
  },
  hijriContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(226, 162, 59, 0.08)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(226, 162, 59, 0.16)",
  },
  hijriEnglish: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffdda8",
  },
  hijriArabic: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffdda8",
  },
  headerError: {
    fontSize: 12,
    color: "#ffa94d",
    marginTop: 8,
  },

  // ─── Next Prayer Card ───
  nextPrayerCard: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: "#0c3033",
    borderWidth: 1,
    borderColor: "rgba(226, 162, 59, 0.35)",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#e2a23b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  nextPrayerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  nextPrayerLabelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nextPrayerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#e2a23b",
    letterSpacing: 1,
  },
  countdownBadge: {
    backgroundColor: "rgba(226, 162, 59, 0.18)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(226, 162, 59, 0.35)",
  },
  countdownText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffdda8",
    fontVariant: ["tabular-nums"],
  },
  nextPrayerMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  nextPrayerName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff4d8",
  },
  nextPrayerArabic: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255, 221, 168, 0.8)",
    marginTop: 2,
  },
  nextPrayerTime: {
    fontSize: 28,
    fontWeight: "800",
    color: "#e2a23b",
  },

  // ─── Prayer List ───
  prayerList: {
    marginHorizontal: 20,
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffdda8",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  prayerItem: {
    backgroundColor: "#0b2527",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  prayerItemActive: {
    backgroundColor: "rgba(226, 162, 59, 0.12)",
    borderColor: "rgba(226, 162, 59, 0.35)",
  },
  prayerItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  prayerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  prayerIconCircleActive: {
    backgroundColor: "rgba(226, 162, 59, 0.18)",
  },
  prayerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  prayerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#d6e2e0",
  },
  prayerNameActive: {
    color: "#ffdda8",
  },
  prayerArabicSmall: {
    fontSize: 13,
    color: "#94a4a2",
  },
  prayerArabicSmallActive: {
    color: "#ffdda8",
  },
  prayerSubtitle: {
    fontSize: 11,
    color: "#94a4a2",
    marginTop: 1,
  },
  prayerItemRight: {
    alignItems: "flex-end",
  },
  prayerTime: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f3f7f6",
  },
  prayerTimeActive: {
    color: "#e2a23b",
    fontSize: 18,
  },
  activePill: {
    backgroundColor: "#e2a23b",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 4,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0f1718",
    textTransform: "uppercase",
  },

  // ─── Source Card ───
  sourceCard: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: "#0b2527",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    padding: 14,
  },
  sourceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  sourceLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffdda8",
  },
  sourceSubtext: {
    fontSize: 12,
    color: "#94a4a2",
    lineHeight: 16,
  },
});
