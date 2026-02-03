import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { getCurrentLocation } from "../../lib/location";
import { getPrayerTimes, formatTime, getNextPrayer, PrayerTimings } from "../../lib/prayerTimes";
import { loadSettings } from "../../lib/settings";

export default function PrayerTimesScreen() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'api' | 'masjid'>('api');
  const [calculationMethod, setCalculationMethod] = useState<number>(2);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadPrayerTimes();
  }, []);

  const loadPrayerTimes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load settings to get calculation method
      const settings = await loadSettings();
      setCalculationMethod(settings.calculationMethodValue);
      
      const location = await getCurrentLocation();
      
      if (!location) {
        // Use default location (e.g., New York) if permission denied
        const { timings, source } = await getPrayerTimes(40.7128, -74.0060, settings.calculationMethodValue);
        setPrayerTimes(timings);
        setSource(source.type);
        setError("Using default location. Enable location for accurate times.");
      } else {
        const { timings, source } = await getPrayerTimes(
          location.latitude,
          location.longitude,
          settings.calculationMethodValue
        );
        setPrayerTimes(timings);
        setSource(source.type);
      }
    } catch (err) {
      console.error("Error loading prayer times:", err);
      setError("Failed to load prayer times. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#e2a23b" />
          <Text style={styles.loadingText}>Loading prayer times...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !prayerTimes) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!prayerTimes) {
    return null;
  }

  const nextPrayer = getNextPrayer(prayerTimes, currentTime);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Prayer Times</Text>
          <Text style={styles.headerSubtitle}>
            {format(currentTime, "EEEE, MMMM d, yyyy")}
          </Text>
          {error && (
            <Text style={styles.headerError}>{error}</Text>
          )}
        </View>

        {/* Current Time */}
        <View style={styles.currentTimeCard}>
          <Text style={styles.currentTimeLabel}>Current Time</Text>
          <Text style={styles.currentTime}>
            {format(currentTime, "h:mm a")}
          </Text>
        </View>

        {/* Next Prayer */}
        {nextPrayer && (
          <View style={styles.nextPrayerCard}>
            <Text style={styles.nextPrayerLabel}>Next Prayer</Text>
            <Text style={styles.nextPrayerName}>{nextPrayer.name}</Text>
            <Text style={styles.nextPrayerTime}>{formatTime(nextPrayer.time)}</Text>
          </View>
        )}

        {/* All Prayer Times */}
        <View style={styles.prayerList}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          {Object.entries(prayerTimes)
            .filter(([name]) => name !== 'Sunrise')
            .map(([name, time]) => (
              <View
                key={name}
                style={[
                  styles.prayerItem,
                  nextPrayer && name === nextPrayer.name && styles.prayerItemActive,
                ]}>
                <Text
                  style={[
                    styles.prayerName,
                    nextPrayer && name === nextPrayer.name && styles.prayerNameActive,
                  ]}>
                  {name}
                </Text>
                <Text
                  style={[
                    styles.prayerTime,
                    nextPrayer && name === nextPrayer.name && styles.prayerTimeActive,
                  ]}>
                  {formatTime(time)}
                </Text>
              </View>
            ))}
        </View>

        {/* Source Info */}
        <View style={styles.sourceCard}>
          <Text style={styles.sourceLabel}>
            {source === 'api' ? 'Calculated Times' : 'Masjid Times'}
          </Text>
          <Text style={styles.sourceSubtext}>
            {source === 'api' 
              ? 'Based on your location' 
              : 'Updated 2 hours ago'}
          </Text>
        </View>
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
    fontSize: 16,
    color: "#94a4a2",
  },
  errorText: {
    fontSize: 16,
    color: "#ff6b6b",
    textAlign: "center",
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#f3f7f6",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#94a4a2",
  },
  headerError: {
    fontSize: 12,
    color: "#ffa94d",
    marginTop: 8,
  },
  currentTimeCard: {
    margin: 20,
    marginTop: 10,
    backgroundColor: "#0c3033",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  currentTimeLabel: {
    fontSize: 14,
    color: "#94a4a2",
    marginBottom: 8,
  },
  currentTime: {
    fontSize: 48,
    fontWeight: "700",
    color: "#f3f7f6",
  },
  nextPrayerCard: {
    margin: 20,
    marginTop: 0,
    backgroundColor: "rgba(226, 162, 59, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(226, 162, 59, 0.3)",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  nextPrayerLabel: {
    fontSize: 12,
    color: "#ffdda8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  nextPrayerName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff4d8",
    marginBottom: 4,
  },
  nextPrayerTime: {
    fontSize: 32,
    fontWeight: "700",
    color: "#e2a23b",
  },
  prayerList: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffdda8",
    marginBottom: 12,
  },
  prayerItem: {
    backgroundColor: "#0b2527",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  prayerItemActive: {
    backgroundColor: "rgba(226, 162, 59, 0.1)",
    borderColor: "rgba(226, 162, 59, 0.3)",
  },
  prayerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#d6e2e0",
  },
  prayerNameActive: {
    color: "#ffdda8",
  },
  prayerTime: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f3f7f6",
  },
  prayerTimeActive: {
    color: "#e2a23b",
  },
  sourceCard: {
    margin: 20,
    marginTop: 0,
    marginBottom: 30,
    backgroundColor: "#0b2527",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 16,
  },
  sourceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffdda8",
    marginBottom: 4,
  },
  sourceSubtext: {
    fontSize: 12,
    color: "#94a4a2",
  },
});
