import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../lib/theme";
import { useLanguage } from "../../lib/i18n";
import { useResponsiveLayout } from "../../lib/responsive";
import { getCommunityNetworkStats, CommunityNetworkStats } from "../../lib/community";

export default function CommunityNetworkScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { contentContainerStyle, tableMaxWidthStyle } = useResponsiveLayout();
  const router = useRouter();

  const [stats, setStats] = useState<CommunityNetworkStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await getCommunityNetworkStats();
      setStats(data);
    } catch (err) {
      console.warn("[CommunityNetwork] Error loading stats:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join the SalahTime Community Network: Connecting 140+ Masjids and thousands of Musallis with verified prayer & Iqamah timings!`,
      });
    } catch {}
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentGold} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={tableMaxWidthStyle}>
          {/* ─── HERO HEADER BANNER ─── */}
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.heroTopRow}>
              <View style={[styles.liveBadge, { backgroundColor: "rgba(16, 185, 129, 0.15)", borderColor: "rgba(16, 185, 129, 0.35)" }]}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live Network</Text>
              </View>
            </View>

            <Text style={[styles.heroTitle, { color: colors.text }]}>SalahTime Community Network</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              A decentralized, crowdsourced ecosystem of believers, muazzins, and community leaders verifying exact Salah & Iqamah timings across masjids.
            </Text>

            {/* ─── 6-CELL NETWORK METRIC GRID (SYMMETRICAL 2x3 LAYOUT) ─── */}
            <View style={styles.metricGrid}>
              <View style={styles.metricRow}>
                <View style={[styles.metricCell, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                  <Feather name="map-pin" size={16} color={colors.accentGold} style={{ marginBottom: 4 }} />
                  <Text style={[styles.metricVal, { color: colors.text }]}>{stats?.connectedMasjids || "140+"}</Text>
                  <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Connected Masjids</Text>
                </View>
                <View style={[styles.metricCell, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                  <Feather name="users" size={16} color="#10b981" style={{ marginBottom: 4 }} />
                  <Text style={[styles.metricVal, { color: colors.text }]}>{stats ? stats.registeredMusallis.toLocaleString() : "2,800+"}</Text>
                  <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Active Musallis</Text>
                </View>
              </View>

              <View style={styles.metricRow}>
                <View style={[styles.metricCell, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                  <Feather name="heart" size={16} color="#ef4444" style={{ marginBottom: 4 }} />
                  <Text style={[styles.metricVal, { color: colors.text }]}>{stats ? stats.jazakAllahSent.toLocaleString() : "480+"}</Text>
                  <Text style={[styles.metricLbl, { color: colors.textMuted }]}>JazakAllah Sent</Text>
                </View>
                <View style={[styles.metricCell, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                  <Feather name="award" size={16} color={colors.accentGold} style={{ marginBottom: 4 }} />
                  <Text style={[styles.metricVal, { color: colors.text }]}>38</Text>
                  <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Verified Updaters</Text>
                </View>
              </View>

              <View style={styles.metricRow}>
                <View style={[styles.metricCell, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                  <Feather name="shield" size={16} color="#00ff66" style={{ marginBottom: 4 }} />
                  <Text style={[styles.metricVal, { color: colors.text }]}>99.4%</Text>
                  <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Verification Freshness</Text>
                </View>
                <View style={[styles.metricCell, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                  <Feather name="globe" size={16} color="#38bdf8" style={{ marginBottom: 4 }} />
                  <Text style={[styles.metricVal, { color: colors.text }]}>12</Text>
                  <Text style={[styles.metricLbl, { color: colors.textMuted }]}>City Clusters</Text>
                </View>
              </View>
            </View>
          </View>


          {/* ─── SECTION 2: ACTIVE REGIONAL HUBS ─── */}
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Active Regional Clusters</Text>

          <View style={[styles.clusterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.clusterRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.clusterCity, { color: colors.text }]}>Hyderabad & Secunderabad</Text>
                <Text style={[styles.clusterDetail, { color: colors.textMuted }]}>Old City, Charminar, Mehdipatnam, Tolichowki, Banjara Hills</Text>
              </View>
              <View style={[styles.clusterPill, { backgroundColor: colors.pill }]}>
                <Text style={[styles.clusterPillText, { color: colors.accentGold }]}>78 Masjids</Text>
              </View>
            </View>

            <View style={styles.clusterDivider} />

            <View style={styles.clusterRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.clusterCity, { color: colors.text }]}>Cyberabad & Western Corridor</Text>
                <Text style={[styles.clusterDetail, { color: colors.textMuted }]}>Hitec City, Gachibowli, Kondapur, Madhapur, Kukatpally</Text>
              </View>
              <View style={[styles.clusterPill, { backgroundColor: colors.pill }]}>
                <Text style={[styles.clusterPillText, { color: colors.accentGold }]}>42 Masjids</Text>
              </View>
            </View>

            <View style={styles.clusterDivider} />

            <View style={styles.clusterRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.clusterCity, { color: colors.text }]}>Secunderabad & Northern Zone</Text>
                <Text style={[styles.clusterDetail, { color: colors.textMuted }]}>Marredpally, Cantonment, Alwal, Bowenpally, Malkajgiri</Text>
              </View>
              <View style={[styles.clusterPill, { backgroundColor: colors.pill }]}>
                <Text style={[styles.clusterPillText, { color: colors.accentGold }]}>20+ Masjids</Text>
              </View>
            </View>
          </View>

          {/* ─── SECTION 3: QUICK COMMUNITY ACTIONS ─── */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: colors.accentGold }]}
              onPress={() => router.push("/(tabs)/masjid")}
              activeOpacity={0.8}
            >
              <Feather name="map-pin" size={16} color="#0f1718" style={{ marginRight: 8 }} />
              <Text style={styles.primaryActionText}>Explore Masjids Directory</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push("/hub/community-feedback")}
              activeOpacity={0.8}
            >
              <Feather name="award" size={16} color={colors.accentGold} style={{ marginRight: 8 }} />
              <Text style={[styles.secondaryActionText, { color: colors.text }]}>View Contributor Leaderboard</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
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
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
  },
  liveText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#10b981",
  },
  shareBtn: {
    padding: 6,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  metricGrid: {
    width: "100%",
    gap: 10,
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  metricCell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  metricVal: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
  },
  metricLbl: {
    fontSize: 9.5,
    textAlign: "center",
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 4,
  },
  featureCard: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    alignItems: "center",
  },
  featureIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  clusterCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  clusterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  clusterCity: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  clusterDetail: {
    fontSize: 11,
  },
  clusterPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clusterPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  clusterDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 8,
  },
  actionsContainer: {
    gap: 10,
    marginTop: 6,
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 14,
  },
  primaryActionText: {
    color: "#0f1718",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
