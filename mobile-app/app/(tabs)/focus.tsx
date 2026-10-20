import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, AppState } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useRef } from "react";
import { 
  saveFocusSession, 
  getFocusStats, 
  getTodayFocusTime, 
  FocusStats,
  setFocusModeActive,
  getBlockingSettings,
  saveBlockingSettings,
  updateBlockedApp,
  BlockingSettings,
  getSampleApps,
} from "../../lib/focus";
import { nativeContentProtection } from "../../lib/nativeContentProtection";
import { getStreak } from "../../lib/streak";
import { isLocked, hasPIN, setPIN, verifyPIN } from "../../lib/lock";
import PINModal from "../../components/PINModal";
import ProtectionActivationModal from "../../components/ProtectionActivationModal";
import { useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";

export default function FocusScreen() {
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // 25 minutes in seconds
  const targetEndTimeRef = useRef<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [stats, setStats] = useState<FocusStats>({
    totalSessions: 0,
    totalMinutes: 0,
    completedSessions: 0,
    currentStreak: 0,
  });
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [blockingSettings, setBlockingSettings] = useState<BlockingSettings>({
    enableAppBlocking: true,
    enableNSFWBlocking: true,
    blockedApps: [],
  });
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [systemWideActive, setSystemWideActive] = useState(false);
  const [systemWideAvailable, setSystemWideAvailable] = useState(false);

  // Security & PIN modal states
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinMode, setPinMode] = useState<'set' | 'verify'>('verify');
  const [pinAction, setPinAction] = useState<'toggle_swp' | 'set_before_swp' | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinExists, setPinExists] = useState(false);
  const [activationModalVisible, setActivationModalVisible] = useState(false);

  const params = useLocalSearchParams();

  useEffect(() => {
    loadStats();
    loadBlockingSettings();
    checkSystemWideProtection();

    if (params.autoStart === 'true') {
      if (params.duration) {
        const mins = parseInt(params.duration as string);
        if (!isNaN(mins) && mins > 0) {
          selectDuration(mins);
        }
      }
      setTimeout(() => {
        startFocus();
      }, 300);
    }
  }, [params.autoStart, params.duration]);

  const checkSystemWideProtection = async () => {
    const available = nativeContentProtection.isAvailable();
    setSystemWideAvailable(available);
    
    if (available) {
      const status = await nativeContentProtection.getStatus();
      setSystemWideActive(status.active);
    }
    const hasPin = await hasPIN();
    setPinExists(hasPin);
  };

  const loadStats = async () => {
    const loadedStats = await getFocusStats();
    const todayTime = await getTodayFocusTime();
    const streak = await getStreak();
    setStats(loadedStats);
    setTodayMinutes(todayTime);
    setStreakDays(streak.currentStreak);
  };

  const loadBlockingSettings = async () => {
    const settings = await getBlockingSettings();
    if (settings.blockedApps.length === 0) {
      settings.blockedApps = getSampleApps();
    }
    setBlockingSettings(settings);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let appStateSubscription: { remove: () => void } | null = null;

    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        const remaining = targetEndTimeRef.current
          ? Math.max(0, Math.round((targetEndTimeRef.current - Date.now()) / 1000))
          : 0;
        setTimeRemaining(remaining);
      }, 1000);

      appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active' && targetEndTimeRef.current) {
          const remaining = Math.max(0, Math.round((targetEndTimeRef.current - Date.now()) / 1000));
          setTimeRemaining(remaining);
        }
      });
    } else if (timeRemaining === 0 && isActive) {
      completeSession(true);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (appStateSubscription) appStateSubscription.remove();
    };
  }, [isActive, timeRemaining]);

  const completeSession = async (completed: boolean) => {
    targetEndTimeRef.current = null;
    if (sessionStartTime) {
      await saveFocusSession({
        id: Date.now().toString(),
        startTime: sessionStartTime,
        endTime: new Date(),
        duration: selectedDuration,
        completed,
      });
      
      await loadStats();
      setIsActive(false);
      await setFocusModeActive(false);
      setSessionStartTime(null);
    }
  };

  const durations = [
    { label: "15 min", value: 15 },
    { label: "25 min", value: 25 },
    { label: "45 min", value: 45 },
    { label: "1 hour", value: 60 },
  ];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startFocus = async () => {
    targetEndTimeRef.current = Date.now() + timeRemaining * 1000;
    setIsActive(true);
    setSessionStartTime(new Date());
    await setFocusModeActive(true);
  };

  const pauseFocus = async () => {
    targetEndTimeRef.current = null;
    setIsActive(false);
    await setFocusModeActive(false);
    await completeSession(false);
  };

  const resetFocus = async () => {
    targetEndTimeRef.current = null;
    if (isActive && sessionStartTime) {
      await completeSession(false);
    }
    setIsActive(false);
    await setFocusModeActive(false);
    setTimeRemaining(selectedDuration * 60);
    setSessionStartTime(null);
  };

  const toggleAppEnabled = async (appId: string, enabled: boolean) => {
    const updatedApps = blockingSettings.blockedApps.map(app =>
      app.id === appId ? { ...app, enabled } : app
    );
    const updatedSettings = { ...blockingSettings, blockedApps: updatedApps };
    setBlockingSettings(updatedSettings);
    
    const app = updatedApps.find(a => a.id === appId);
    if (app) {
      await updateBlockedApp(app);
    }
  };

  const handleToggleSWP = async (enabled: boolean) => {
    if (!enabled) {
      const locked = await isLocked();
      if (locked || pinExists) {
        setPinAction('toggle_swp');
        setPinMode('verify');
        setPinError(null);
        setPinModalVisible(true);
        return;
      }
      const stopped = await nativeContentProtection.stop();
      if (stopped) {
        setSystemWideActive(false);
      }
    } else {
      const exists = await hasPIN();
      setPinExists(exists);
      setActivationModalVisible(true);
    }
  };

  const handleConfirmActivation = async () => {
    setActivationModalVisible(false);
    const started = await nativeContentProtection.start();
    setSystemWideActive(started);
  };

  const handleRequirePin = () => {
    setPinAction('set_before_swp');
    setPinMode('set');
    setPinError(null);
    setPinModalVisible(true);
  };

  const handlePINSubmit = async (pin: string) => {
    if (pinAction === 'set_before_swp' && pinMode === 'set') {
      const success = await setPIN(pin);
      if (success) {
        const { setLockEnabled } = require('../../lib/lock');
        await setLockEnabled(true);
        setPinExists(true);
        setPinModalVisible(false);
        const started = await nativeContentProtection.start();
        setSystemWideActive(started);
      } else {
        setPinError('Failed to set PIN. Try again.');
      }
    } else if (pinAction === 'toggle_swp') {
      const valid = await verifyPIN(pin);
      if (valid) {
        setPinModalVisible(false);
        const stopped = await nativeContentProtection.stop();
        if (stopped) {
          setSystemWideActive(false);
        }
      } else {
        setPinError('Wrong PIN. Try again.');
      }
    }
  };

  const selectDuration = (minutes: number) => {
    targetEndTimeRef.current = null;
    setSelectedDuration(minutes);
    setTimeRemaining(minutes * 60);
    setIsActive(false);
  };

  const progress = timeRemaining / (selectedDuration * 60);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with Title and Streak Flame Counter */}
        <View style={styles.header}>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.title}>Content Calm</Text>
            <Text style={styles.subtitle}>
              Focus mode to minimize distractions
            </Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakFlame}>🔥</Text>
            <Text style={styles.streakText}>
              {streakDays} {streakDays === 1 ? 'Day' : 'Days'}
            </Text>
          </View>
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{todayMinutes}</Text>
            <Text style={styles.statLabel}>Today (min)</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.completedSessions}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalMinutes}</Text>
            <Text style={styles.statLabel}>Total (min)</Text>
          </View>
        </View>

        {/* ─── UNIONIZED FOCUS HERO CARD ─── */}
        <View style={styles.heroFocusCard}>
          {/* Circular Progress Timer Dial */}
          <View style={styles.timerCircle}>
            <View style={styles.progressRing} />
            {progress > 0 && (
              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressLeft,
                    {
                      transform: [
                        { rotate: `${Math.min(progress * 2, 1) * 180}deg` }
                      ],
                    },
                  ]}
                />
                {progress > 0.5 && (
                  <View
                    style={[
                      styles.progressRight,
                      {
                        transform: [
                          { rotate: `${(progress - 0.5) * 2 * 180}deg` }
                        ],
                      },
                    ]}
                  />
                )}
              </View>
            )}
            
            <View style={styles.timerInner}>
              <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
              <Text style={styles.timerLabel}>
                {isActive ? "Focus Active" : "Ready to Focus"}
              </Text>
            </View>
          </View>

          {/* Duration Selection Chips (seamlessly integrated inside hero) */}
          {!isActive && (
            <View style={styles.durationPillsRow}>
              {durations.map((duration) => (
                <TouchableOpacity
                  key={duration.value}
                  style={[
                    styles.durationPill,
                    selectedDuration === duration.value && styles.durationPillActive,
                  ]}
                  onPress={() => selectDuration(duration.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.durationPillText,
                      selectedDuration === duration.value && styles.durationPillTextActive,
                    ]}
                  >
                    {duration.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Unified Action Controls (Start / Pause / Reset) */}
          <View style={styles.heroControlsWrapper}>
            {!isActive ? (
              <TouchableOpacity 
                style={styles.heroStartButton} 
                onPress={startFocus} 
                activeOpacity={0.85}
              >
                <Feather name="play" size={18} color="#0f1718" style={{ marginRight: 8 }} />
                <Text style={styles.heroStartButtonText}>Start Focus</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.activeControls}>
                <TouchableOpacity style={styles.pauseButton} onPress={pauseFocus} activeOpacity={0.8}>
                  <Feather name="pause" size={16} color="#0f1718" style={{ marginRight: 6 }} />
                  <Text style={styles.pauseButtonText}>Pause</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.resetButton} onPress={resetFocus} activeOpacity={0.8}>
                  <Feather name="rotate-ccw" size={16} color="#e2a23b" style={{ marginRight: 6 }} />
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Content Protection Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Content Protection</Text>
          
          {/* Single Unified System-Wide Protection Toggle */}
          {systemWideAvailable && (
            <View style={styles.settingCard}>
              <View style={styles.settingIconContainer}>
                <Feather name="shield" size={20} color={systemWideActive ? "#10b981" : "#e2a23b"} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>System-Wide Protection</Text>
                <Text style={styles.settingDescription}>
                  Filters explicit and harmful content across all browsers and apps on this device.
                </Text>
                <Text style={[styles.settingNote, systemWideActive && styles.settingNoteSuccess]}>
                  {systemWideActive 
                    ? 'Active — Device Protected' 
                    : 'Inactive — Tap toggle to enable'}
                </Text>
              </View>
              <Switch
                value={systemWideActive}
                onValueChange={handleToggleSWP}
                trackColor={{ false: "#3e4a48", true: "rgba(16, 185, 129, 0.4)" }}
                thumbColor={systemWideActive ? "#10b981" : "#94a4a2"}
              />
            </View>
          )}

          {/* Yellow Block Distracting Apps Button */}
          <TouchableOpacity 
            style={styles.yellowBlockAppsButton}
            onPress={() => setShowAppSettings(!showAppSettings)}
            activeOpacity={0.85}
          >
            <View style={styles.yellowButtonIconCircle}>
              <Feather name="slash" size={18} color="#0f1718" />
            </View>
            <View style={styles.yellowButtonTextWrapper}>
              <Text style={styles.yellowButtonTitle}>Block Distracting Apps</Text>
              <Text style={styles.yellowButtonSubtitle}>
                {blockingSettings.blockedApps.filter(a => a.enabled).length} apps selected for focus lockdown
              </Text>
            </View>
            <Feather 
              name={showAppSettings ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#0f1718" 
            />
          </TouchableOpacity>

          {/* App Selection List (Expanded) */}
          {showAppSettings && (
            <View style={styles.appListContainer}>
              <Text style={styles.appListTitle}>Select apps to block during Focus Mode:</Text>
              {blockingSettings.blockedApps.map((app) => (
                <View key={app.id} style={styles.appItem}>
                  <Feather name="smartphone" size={16} color="#94a4a2" style={styles.appIcon} />
                  <Text style={styles.appName}>{app.name}</Text>
                  <Switch
                    value={app.enabled}
                    onValueChange={(enabled) => toggleAppEnabled(app.id, enabled)}
                    trackColor={{ false: "#3e4a48", true: "rgba(226, 162, 59, 0.5)" }}
                    thumbColor={app.enabled ? "#e2a23b" : "#94a4a2"}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Features Info */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>During Focus Mode</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Feather name="bell-off" size={20} color="#e2a23b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Minimize Distractions</Text>
              <Text style={styles.infoDescription}>
                Stay mindful and present during prayer times and dhikr.
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Feather name="clock" size={20} color="#e2a23b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Prayer Time Sync</Text>
              <Text style={styles.infoDescription}>
                Reminders notify you 7 minutes before each obligatory prayer.
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* PIN Verification / Setup Modal */}
      <PINModal
        visible={pinModalVisible}
        onClose={() => {
          setPinModalVisible(false);
          setPinError(null);
        }}
        onSubmit={handlePINSubmit}
        mode={pinMode}
        error={pinError}
        title={
          pinAction === 'toggle_swp'
            ? 'PIN Required'
            : 'Set 4-Digit Security PIN'
        }
        subtitle={
          pinAction === 'toggle_swp'
            ? 'Enter PIN to disable System-Wide Protection'
            : 'You must set a 4-digit PIN before enabling protection'
        }
      />

      {/* Protection Activation Modal */}
      <ProtectionActivationModal
        visible={activationModalVisible}
        onClose={() => setActivationModalVisible(false)}
        onConfirm={handleConfirmActivation}
        hasPin={pinExists}
        onRequirePin={handleRequirePin}
      />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTextWrapper: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#f3f7f6",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#94a4a2",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(226, 162, 59, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(226, 162, 59, 0.3)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  streakFlame: {
    fontSize: 14,
  },
  streakText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffdda8",
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: "#0b2527",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e2a23b",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#94a4a2",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginHorizontal: 4,
  },
  // ─── UNIONIZED HERO FOCUS CARD ───
  heroFocusCard: {
    backgroundColor: "#0b2527",
    borderWidth: 1,
    borderColor: "rgba(226, 162, 59, 0.18)",
    borderRadius: 20,
    marginHorizontal: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  timerCircle: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginBottom: 16,
  },
  progressRing: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 7,
    borderColor: "rgba(226, 162, 59, 0.15)",
  },
  progressContainer: {
    position: "absolute",
    width: 200,
    height: 200,
  },
  progressLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 100,
    height: 200,
    borderTopLeftRadius: 100,
    borderBottomLeftRadius: 100,
    borderLeftWidth: 7,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderColor: "#e2a23b",
    borderRightWidth: 0,
    transformOrigin: "right center",
  },
  progressRight: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 100,
    height: 200,
    borderTopRightRadius: 100,
    borderBottomRightRadius: 100,
    borderRightWidth: 7,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderColor: "#e2a23b",
    borderLeftWidth: 0,
    transformOrigin: "left center",
  },
  timerInner: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "#0c3033",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  timerText: {
    fontSize: 38,
    fontWeight: "700",
    color: "#f3f7f6",
    marginBottom: 4,
  },
  timerLabel: {
    fontSize: 12,
    color: "#94a4a2",
    fontWeight: "500",
  },
  durationPillsRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    marginBottom: 16,
  },
  durationPill: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    alignItems: "center",
  },
  durationPillActive: {
    backgroundColor: "rgba(226, 162, 59, 0.18)",
    borderColor: "#e2a23b",
  },
  durationPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a4a2",
  },
  durationPillTextActive: {
    color: "#ffdda8",
    fontWeight: "700",
  },
  heroControlsWrapper: {
    width: "100%",
  },
  heroStartButton: {
    backgroundColor: "#e2a23b",
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#e2a23b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  heroStartButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f1718",
  },
  activeControls: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  pauseButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#ffdda8",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pauseButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f1718",
  },
  resetButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#0c3033",
    borderWidth: 1,
    borderColor: "rgba(226, 162, 59, 0.3)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#e2a23b",
  },
  // ─── SETTINGS SECTION ───
  settingsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffdda8",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  settingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b2527",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(226, 162, 59, 0.14)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
    marginRight: 8,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f3f7f6",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: "#94a4a2",
    lineHeight: 16,
  },
  settingNote: {
    fontSize: 11,
    color: "#7a8a88",
    marginTop: 4,
    fontWeight: "500",
  },
  settingNoteSuccess: {
    color: "#10b981",
  },
  // ─── YELLOW BLOCK APPS BUTTON ───
  yellowBlockAppsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e2a23b",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#e2a23b",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  yellowButtonIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 24, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  yellowButtonTextWrapper: {
    flex: 1,
  },
  yellowButtonTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f1718",
  },
  yellowButtonSubtitle: {
    fontSize: 12,
    color: "rgba(15, 23, 24, 0.75)",
    marginTop: 1,
  },
  appListContainer: {
    backgroundColor: "#071b1c",
    borderWidth: 1,
    borderColor: "rgba(226, 162, 59, 0.2)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  appListTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffdda8",
    marginBottom: 12,
  },
  appItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  appIcon: {
    marginRight: 10,
  },
  appName: {
    flex: 1,
    fontSize: 14,
    color: "#d6e2e0",
  },
  // ─── FEATURES INFO ───
  infoSection: {
    paddingHorizontal: 20,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#0b2527",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(226, 162, 59, 0.14)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f3f7f6",
    marginBottom: 2,
  },
  infoDescription: {
    fontSize: 12,
    color: "#94a4a2",
    lineHeight: 16,
  },
});
