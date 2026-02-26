import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
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
  BlockedApp,
  getSampleApps,
} from "../../lib/focus";
import { nativeContentProtection } from "../../lib/nativeContentProtection";

export default function FocusScreen() {
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // 25 minutes in seconds
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [stats, setStats] = useState<FocusStats>({
    totalSessions: 0,
    totalMinutes: 0,
    completedSessions: 0,
    currentStreak: 0,
  });
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [blockingSettings, setBlockingSettings] = useState<BlockingSettings>({
    enableAppBlocking: false,
    enableNSFWBlocking: true,
    blockedApps: [],
  });
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [systemWideActive, setSystemWideActive] = useState(false);
  const [systemWideAvailable, setSystemWideAvailable] = useState(false);

  useEffect(() => {
    loadStats();
    loadBlockingSettings();
    checkSystemWideProtection();
  }, []);

  const checkSystemWideProtection = async () => {
    const available = nativeContentProtection.isAvailable();
    setSystemWideAvailable(available);
    
    if (available) {
      const status = await nativeContentProtection.getStatus();
      setSystemWideActive(status.active);
    }
  };

  const loadStats = async () => {
    const loadedStats = await getFocusStats();
    const todayTime = await getTodayFocusTime();
    setStats(loadedStats);
    setTodayMinutes(todayTime);
  };

  const loadBlockingSettings = async () => {
    const settings = await getBlockingSettings();
    // Merge with sample apps if no apps are configured yet
    if (settings.blockedApps.length === 0) {
      settings.blockedApps = getSampleApps();
    }
    setBlockingSettings(settings);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((time) => time - 1);
      }, 1000);
    } else if (timeRemaining === 0 && isActive) {
      // Session completed
      completeSession(true);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeRemaining]);

  const completeSession = async (completed: boolean) => {
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
    setIsActive(true);
    setSessionStartTime(new Date());
    await setFocusModeActive(true);
  };

  const pauseFocus = async () => {
    setIsActive(false);
    await setFocusModeActive(false);
    // Save as incomplete session
    await completeSession(false);
  };

  const resetFocus = async () => {
    if (isActive && sessionStartTime) {
      await completeSession(false);
    }
    setIsActive(false);
    await setFocusModeActive(false);
    setTimeRemaining(selectedDuration * 60);
    setSessionStartTime(null);
  };

  const toggleAppBlocking = async (enabled: boolean) => {
    const updatedSettings = { ...blockingSettings, enableAppBlocking: enabled };
    setBlockingSettings(updatedSettings);
    await saveBlockingSettings(updatedSettings);
  };

  const toggleNSFWBlocking = async (enabled: boolean) => {
    const updatedSettings = { ...blockingSettings, enableNSFWBlocking: enabled };
    setBlockingSettings(updatedSettings);
    await saveBlockingSettings(updatedSettings);
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

  const toggleSystemWideProtection = async (enabled: boolean) => {
    if (enabled) {
      const started = await nativeContentProtection.start();
      setSystemWideActive(started);
    } else {
      const stopped = await nativeContentProtection.stop();
      setSystemWideActive(!stopped);
    }
  };

  const selectDuration = (minutes: number) => {
    setSelectedDuration(minutes);
    setTimeRemaining(minutes * 60);
    setIsActive(false);
  };

  const progress = timeRemaining / (selectedDuration * 60);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Content Calm</Text>
          <Text style={styles.subtitle}>
            Focus mode to minimize distractions
          </Text>
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{todayMinutes}</Text>
            <Text style={styles.statLabel}>Today (min)</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.currentStreak}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalMinutes}</Text>
            <Text style={styles.statLabel}>Total (min)</Text>
          </View>
        </View>

        {/* Timer Circle */}
        <View style={styles.timerSection}>
          <View style={styles.timerCircle}>
            {/* Background ring */}
            <View style={styles.progressRing} />
            
            {/* Progress arc - starts full and degrades */}
            {progress > 0 && (
              <View style={styles.progressContainer}>
                {/* Left half - always shows when progress > 0 */}
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
                {/* Right half - shows when progress > 0.5 (more than half time remaining) */}
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
        </View>

        {/* Duration Selection */}
        {!isActive && (
          <View style={styles.durationSection}>
            <Text style={styles.sectionTitle}>Duration</Text>
            <View style={styles.durationButtons}>
              {durations.map((duration) => (
                <TouchableOpacity
                  key={duration.value}
                  style={[
                    styles.durationButton,
                    selectedDuration === duration.value && styles.durationButtonActive,
                  ]}
                  onPress={() => selectDuration(duration.value)}>
                  <Text
                    style={[
                      styles.durationButtonText,
                      selectedDuration === duration.value && styles.durationButtonTextActive,
                    ]}>
                    {duration.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.controlsSection}>
          {!isActive ? (
            <TouchableOpacity style={styles.startButton} onPress={startFocus}>
              <Text style={styles.startButtonText}>Start Focus</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.activeControls}>
              <TouchableOpacity style={styles.pauseButton} onPress={pauseFocus}>
                <Text style={styles.pauseButtonText}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetButton} onPress={resetFocus}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Features Info */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>During Focus Mode</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>🔕</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Minimize Distractions</Text>
              <Text style={styles.infoDescription}>
                Stay mindful and present during prayer times
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>⏰</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Prayer Time Sync</Text>
              <Text style={styles.infoDescription}>
                Auto-start before prayer times (coming soon)
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>📊</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Track Your Progress</Text>
              <Text style={styles.infoDescription}>
                See your focus time statistics (coming soon)
              </Text>
            </View>
          </View>
        </View>

        {/* Content Protection Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Content Protection</Text>
          
          {/* System-Wide Protection Toggle (Android Only) */}
          {systemWideAvailable && (
            <View style={styles.settingCard}>
              <View style={styles.settingIconContainer}>
                <Text style={styles.settingIcon}>🌐</Text>
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>System-Wide Protection (VPN)</Text>
                <Text style={styles.settingDescription}>
                  Block NSFW content in ALL apps - Chrome, Safari, any browser. Uses VPN for device-wide filtering.
                </Text>
                <Text style={[styles.settingNote, systemWideActive && styles.settingNoteSuccess]}>
                  {systemWideActive 
                    ? '✅ Active - Your entire device is protected' 
                    : '⚠️ Requires VPN permission'}
                </Text>
              </View>
              <Switch
                value={systemWideActive}
                onValueChange={async (enabled) => {
                  if (enabled) {
                    const started = await nativeContentProtection.start();
                    setSystemWideActive(started);
                  } else {
                    const stopped = await nativeContentProtection.stop();
                    setSystemWideActive(!stopped);
                  }
                }}
                trackColor={{ false: "#3e4a48", true: "rgba(76, 175, 80, 0.5)" }}
                thumbColor={systemWideActive ? "#4caf50" : "#94a4a2"}
              />
            </View>
          )}
          
          {/* NSFW Blocking Toggle */}
          <View style={styles.settingCard}>
            <View style={styles.settingIconContainer}>
              <Text style={styles.settingIcon}>🛡️</Text>
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Block NSFW Content</Text>
              <Text style={styles.settingDescription}>
                Automatically detect and block inappropriate content. Protected by DEEN AI.
              </Text>
              <Text style={styles.settingNote}>
                Note: Requires device permissions for full protection
              </Text>
            </View>
            <Switch
              value={blockingSettings.enableNSFWBlocking}
              onValueChange={toggleNSFWBlocking}
              trackColor={{ false: "#3e4a48", true: "rgba(226, 162, 59, 0.5)" }}
              thumbColor={blockingSettings.enableNSFWBlocking ? "#e2a23b" : "#94a4a2"}
            />
          </View>

          {/* App Blocking Toggle */}
          <View style={styles.settingCard}>
            <View style={styles.settingIconContainer}>
              <Text style={styles.settingIcon}>📱</Text>
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Block Distracting Apps</Text>
              <Text style={styles.settingDescription}>
                Temporarily block selected apps during Focus Mode
              </Text>
            </View>
            <Switch
              value={blockingSettings.enableAppBlocking}
              onValueChange={toggleAppBlocking}
              trackColor={{ false: "#3e4a48", true: "rgba(226, 162, 59, 0.5)" }}
              thumbColor={blockingSettings.enableAppBlocking ? "#e2a23b" : "#94a4a2"}
            />
          </View>

          {/* Configure Apps Button */}
          {blockingSettings.enableAppBlocking && (
            <TouchableOpacity 
              style={styles.configureButton}
              onPress={() => setShowAppSettings(!showAppSettings)}
            >
              <Text style={styles.configureButtonText}>
                {showAppSettings ? "Hide" : "Configure"} Blocked Apps
              </Text>
              <Text style={styles.configureButtonIcon}>
                {showAppSettings ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>
          )}

          {/* App Selection List */}
          {showAppSettings && blockingSettings.enableAppBlocking && (
            <View style={styles.appListContainer}>
              <Text style={styles.appListTitle}>Select apps to block:</Text>
              {blockingSettings.blockedApps.map((app) => (
                <View key={app.id} style={styles.appItem}>
                  <Text style={styles.appIcon}>📱</Text>
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

        <View style={{ height: 30 }} />
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
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#f3f7f6",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#94a4a2",
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: "#0b2527",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#e2a23b",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#94a4a2",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginHorizontal: 8,
  },
  timerSection: {
    alignItems: "center",
    paddingVertical: 40,
  },
  timerCircle: {
    width: 260,
    height: 260,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  progressRing: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 8,
    borderColor: "rgba(226, 162, 59, 0.15)",
  },
  progressContainer: {
    position: "absolute",
    width: 260,
    height: 260,
  },
  progressLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 130,
    height: 260,
    borderTopLeftRadius: 130,
    borderBottomLeftRadius: 130,
    borderLeftWidth: 8,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderColor: "#e2a23b",
    borderRightWidth: 0,
    transformOrigin: "right center",
  },
  progressRight: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 130,
    height: 260,
    borderTopRightRadius: 130,
    borderBottomRightRadius: 130,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderColor: "#e2a23b",
    borderLeftWidth: 0,
    transformOrigin: "left center",
  },
  timerInner: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#0c3033",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  timerText: {
    fontSize: 48,
    fontWeight: "700",
    color: "#f3f7f6",
    marginBottom: 8,
  },
  timerLabel: {
    fontSize: 14,
    color: "#94a4a2",
  },
  durationSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffdda8",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  durationButtons: {
    flexDirection: "row",
    gap: 12,
  },
  durationButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#0b2527",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    alignItems: "center",
  },
  durationButtonActive: {
    backgroundColor: "rgba(226, 162, 59, 0.16)",
    borderColor: "rgba(226, 162, 59, 0.3)",
  },
  durationButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#d6e2e0",
  },
  durationButtonTextActive: {
    color: "#ffdda8",
  },
  controlsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  startButton: {
    backgroundColor: "#e2a23b",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f1718",
  },
  activeControls: {
    flexDirection: "row",
    gap: 12,
  },
  pauseButton: {
    flex: 1,
    backgroundColor: "#ffdda8",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  pauseButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f1718",
  },
  resetButton: {
    flex: 1,
    backgroundColor: "#0b2527",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f3f7f6",
  },
  infoSection: {
    paddingHorizontal: 20,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#0b2527",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(226, 162, 59, 0.16)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoIconText: {
    fontSize: 20,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f3f7f6",
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    color: "#94a4a2",
    lineHeight: 18,
  },
  settingsSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  settingCard: {
    flexDirection: "row",
    backgroundColor: "#0b2527",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(226, 162, 59, 0.16)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingIcon: {
    fontSize: 20,
  },
  settingContent: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f3f7f6",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: "#94a4a2",
    lineHeight: 18,
    marginBottom: 4,
  },
  settingNote: {
    fontSize: 11,
    color: "#e2a23b",
    fontStyle: "italic",
    marginTop: 4,
  },
  settingNoteSuccess: {
    color: "#4caf50",
  },
  configureButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0c3033",
    borderWidth: 1,
    borderColor: "rgba(226, 162, 59, 0.3)",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  configureButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffdda8",
  },
  configureButtonIcon: {
    fontSize: 12,
    color: "#ffdda8",
  },
  appListContainer: {
    backgroundColor: "#0c3033",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  appListTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94a4a2",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  appItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  appIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  appName: {
    flex: 1,
    fontSize: 15,
    color: "#d6e2e0",
  },
});
