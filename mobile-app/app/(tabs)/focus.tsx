import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, AppState, Vibration, Modal, TextInput, Alert, Platform } from "react-native";
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
  BlockedApp,
  FocusSchedule,
  getFocusSchedules,
  saveFocusSchedule,
  deleteFocusSchedule,
  toggleFocusSchedule,
  KNOWN_APP_PACKAGES,
  resolveAppMeta,
  getActiveFocusSessionDetails,
} from "../../lib/focus";
import { InstalledAppInfo } from "../../lib/nativeContentProtection";
import { nativeContentProtection } from "../../lib/nativeContentProtection";
import { getStreak } from "../../lib/streak";
import { isLocked, hasPIN, setPIN, verifyPIN } from "../../lib/lock";
import PINModal from "../../components/PINModal";
import ProtectionActivationModal from "../../components/ProtectionActivationModal";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../lib/theme";
import { useLanguage } from "../../lib/i18n";
import { useResponsiveLayout } from "../../lib/responsive";

export default function FocusScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { contentContainerStyle, tableMaxWidthStyle } = useResponsiveLayout();
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
  const [isAddCustomModalVisible, setIsAddCustomModalVisible] = useState(false);
  const [customAppName, setCustomAppName] = useState("");
  const [customPackageName, setCustomPackageName] = useState("");

  // Focus Scheduler & Custom Duration & Installed App Picker states
  const [schedules, setSchedules] = useState<FocusSchedule[]>([]);
  const [isScheduleModalVisible, setIsScheduleModalVisible] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');
  const [newScheduleDays, setNewScheduleDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [newStartHour, setNewStartHour] = useState('09');
  const [newStartMinute, setNewStartMinute] = useState('00');
  const [newEndHour, setNewEndHour] = useState('17');
  const [newEndMinute, setNewEndMinute] = useState('00');
  const [newScheduleApps, setNewScheduleApps] = useState<string[]>([]);
  
  const [isCustomDurationModalVisible, setIsCustomDurationModalVisible] = useState(false);
  const [customMinutesInput, setCustomMinutesInput] = useState('30');
  
  const [isInstalledPickerVisible, setIsInstalledPickerVisible] = useState(false);
  const [installedAppsList, setInstalledAppsList] = useState<InstalledAppInfo[]>([]);
  const [installedSearchQuery, setInstalledSearchQuery] = useState('');
  const [loadingInstalledApps, setLoadingInstalledApps] = useState(false);

  // Security & PIN modal states
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinMode, setPinMode] = useState<'set' | 'verify'>('verify');
  const [pinAction, setPinAction] = useState<'toggle_swp' | 'set_before_swp' | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinExists, setPinExists] = useState(false);
  const [activationModalVisible, setActivationModalVisible] = useState(false);
  const [hasDndAccess, setHasDndAccess] = useState(true);

  const params = useLocalSearchParams();
  const router = useRouter();

  const restoreActiveFocusSession = async () => {
    try {
      const details = await getActiveFocusSessionDetails();
      if (details.isActive && details.remainingSeconds > 0) {
        targetEndTimeRef.current = details.endTimestamp;
        setTimeRemaining(details.remainingSeconds);
        setIsActive(true);
        if (!sessionStartTime) {
          const approxStart = new Date(details.endTimestamp - selectedDuration * 60 * 1000);
          setSessionStartTime(approxStart);
        }
      } else if (isActive && details.remainingSeconds === 0) {
        await completeSession(true);
      }
    } catch (e) {
      console.error("Error restoring focus session:", e);
    }
  };

  // Top-level AppState listener to resume active focus timer immediately when coming to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkSystemWideProtection();
        loadSchedules();
        restoreActiveFocusSession();
      }
    });
    return () => {
      sub.remove();
    };
  }, [selectedDuration]);

  useEffect(() => {
    loadStats();
    loadBlockingSettings();
    checkSystemWideProtection();
    loadSchedules();
    restoreActiveFocusSession();

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
    if (Platform.OS === 'android') {
      const dndGranted = await nativeContentProtection.hasNotificationPolicyAccess();
      setHasDndAccess(dndGranted);
    }
  };

  const loadStats = async () => {
    const loadedStats = await getFocusStats();
    const todayTime = await getTodayFocusTime();
    const streak = await getStreak();
    setStats(loadedStats);
    setTodayMinutes(todayTime);
    setStreakDays(streak.currentStreak);
  };

  const loadSchedules = async () => {
    const list = await getFocusSchedules();
    setSchedules(list);
  };

  const handleOpenInstalledPicker = async () => {
    setLoadingInstalledApps(true);
    setIsInstalledPickerVisible(true);
    try {
      const apps = await nativeContentProtection.getInstalledApps();
      setInstalledAppsList(apps);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInstalledApps(false);
    }
  };

  const handleSelectInstalledApp = async (item: InstalledAppInfo) => {
    const meta = resolveAppMeta(item.packageName, item.appName);
    const newApp: BlockedApp = {
      id: `installed-${Date.now()}-${item.packageName.replace(/[^a-zA-Z0-9]/g, '')}`,
      name: meta.name,
      packageName: item.packageName,
      enabled: true,
      icon: meta.icon,
      iconFamily: meta.iconFamily,
      color: meta.color,
      category: meta.category,
      isCustom: true,
    };
    const updated = {
      ...blockingSettings,
      enableAppBlocking: true,
      blockedApps: [...blockingSettings.blockedApps.filter(a => a.packageName !== item.packageName), newApp],
    };
    setBlockingSettings(updated);
    await saveBlockingSettings(updated);
    setIsInstalledPickerVisible(false);
    setIsAddCustomModalVisible(false);
    Alert.alert('App Added', `"${meta.name}" has been added to your blocked apps list.`);
  };

  const handleSaveSchedule = async () => {
    const name = newScheduleName.trim() || 'Focus Session';
    const sH = Math.min(23, Math.max(0, parseInt(newStartHour, 10) || 0));
    const sM = Math.min(59, Math.max(0, parseInt(newStartMinute, 10) || 0));
    const eH = Math.min(23, Math.max(0, parseInt(newEndHour, 10) || 0));
    const eM = Math.min(59, Math.max(0, parseInt(newEndMinute, 10) || 0));

    if (newScheduleDays.length === 0) {
      Alert.alert('Select Days', 'Please select at least one day for the schedule.');
      return;
    }

    const appsToBlock = newScheduleApps.length > 0 
      ? newScheduleApps 
      : blockingSettings.blockedApps.filter(a => a.enabled).map(a => a.packageName);

    const newSchedule: FocusSchedule = {
      id: `schedule-${Date.now()}`,
      name,
      days: newScheduleDays,
      startHour: sH,
      startMinute: sM,
      endHour: eH,
      endMinute: eM,
      blockedAppPackages: appsToBlock,
      enabled: true,
    };

    await saveFocusSchedule(newSchedule);
    await loadSchedules();
    setIsScheduleModalVisible(false);
    setNewScheduleName('');
  };

  const handleDeleteSchedule = async (id: string) => {
    await deleteFocusSchedule(id);
    await loadSchedules();
  };

  const handleToggleSchedule = async (id: string, enabled: boolean) => {
    await toggleFocusSchedule(id, enabled);
    await loadSchedules();
  };

  const handleApplyCustomDuration = () => {
    const mins = parseInt(customMinutesInput, 10);
    if (isNaN(mins) || mins <= 0 || mins > 480) {
      Alert.alert('Invalid Duration', 'Please enter a duration between 1 and 480 minutes.');
      return;
    }
    setSelectedDuration(mins);
    setTimeRemaining(mins * 60);
    setIsCustomDurationModalVisible(false);
  };

  const loadBlockingSettings = async () => {
    const settings = await getBlockingSettings();

    // Dynamically query installed packages from device so uninstalled default apps (games/media) are not listed
    let installedPackages = new Set<string>();
    if (Platform.OS === 'android') {
      try {
        const installedList = await nativeContentProtection.getInstalledApps();
        if (installedList && installedList.length > 0) {
          installedPackages = new Set(installedList.map(a => a.packageName));
        }
      } catch (e) {
        console.warn('Failed to query installed apps for blocking filter:', e);
      }
    }

    const defaultApps = getSampleApps();

    if (settings.blockedApps.length === 0) {
      // First time initialization: strictly filter default apps by what is actually installed
      if (installedPackages.size > 0) {
        settings.blockedApps = defaultApps.filter(app => installedPackages.has(app.packageName));
      } else {
        // Fallback: exclude heavy games by default
        settings.blockedApps = defaultApps.filter(app => app.category !== 'games');
      }
      await saveBlockingSettings(settings);
    } else {
      // Prune default apps that are not installed on the user's device
      if (installedPackages.size > 0) {
        const filtered = settings.blockedApps.filter(app => {
          if (app.isCustom) return true; // Keep user-added custom apps
          return installedPackages.has(app.packageName);
        });
        if (filtered.length !== settings.blockedApps.length) {
          settings.blockedApps = filtered;
          await saveBlockingSettings(settings);
        }
      }
    }
    setBlockingSettings(settings);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        if (targetEndTimeRef.current) {
          const remaining = Math.max(0, Math.round((targetEndTimeRef.current - Date.now()) / 1000));
          setTimeRemaining(remaining);
          if (remaining <= 0) {
            completeSession(true);
          }
        } else {
          setTimeRemaining((prev) => {
            if (prev <= 1) {
              completeSession(true);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else if (timeRemaining === 0 && isActive) {
      completeSession(true);
    }

    return () => {
      if (interval) clearInterval(interval);
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
      await setFocusModeActive(false, 0);
      setSessionStartTime(null);
      // Restore phone ringtone and notifications to normal mode
      await nativeContentProtection.setRingerModeNormal();
    }
  };

  const durations = [
    { label: t('focus.min15'), value: 15 },
    { label: t('focus.min25'), value: 25 },
    { label: t('focus.min45'), value: 45 },
    { label: t('focus.hour1'), value: 60 },
    { label: t('focus.customBtn'), value: -1 },
  ];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };



  const startFocus = async () => {
    if (Platform.OS === 'android') {
      const isA11yActive = await nativeContentProtection.isAccessibilityEnabled();
      if (!isA11yActive) {
        Alert.alert(
          'Accessibility Permission Required',
          'To enforce app blocking during Focus Mode, please enable "DeenHub System-Wide Protection" in Accessibility settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => nativeContentProtection.openAccessibilitySettings(),
            },
          ]
        );
        return;
      }
    }
    try {
      Vibration.vibrate(400); // Trigger vibration feedback on focus mode start
      // Put phone ringtone and notifications into Vibrate mode
      await nativeContentProtection.setRingerModeVibrate();
    } catch {}
    const endTimestamp = Date.now() + timeRemaining * 1000;
    targetEndTimeRef.current = endTimestamp;
    setIsActive(true);
    setSessionStartTime(new Date());
    await setFocusModeActive(true, endTimestamp);
  };

  const handleAddCustomApp = async () => {
    const trimmed = customAppName.trim();
    if (!trimmed) {
      Alert.alert("Invalid Name", "Please enter an app or game name.");
      return;
    }
    const cleanPkg = customPackageName.trim() || `custom.${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const newApp: BlockedApp = {
      id: `custom-${Date.now()}`,
      name: trimmed,
      packageName: cleanPkg,
      enabled: true,
      icon: 'grid',
      color: '#00ff66',
      isCustom: true,
    };
    const updated = {
      ...blockingSettings,
      enableAppBlocking: true,
      blockedApps: [...blockingSettings.blockedApps, newApp],
    };
    setBlockingSettings(updated);
    await saveBlockingSettings(updated);
    setCustomAppName("");
    setCustomPackageName("");
    setIsAddCustomModalVisible(false);
  };

  const handleDeleteCustomApp = async (appId: string) => {
    const updatedApps = blockingSettings.blockedApps.filter(a => a.id !== appId);
    const updated = {
      ...blockingSettings,
      blockedApps: updatedApps,
    };
    setBlockingSettings(updated);
    await saveBlockingSettings(updated);
  };

  const pauseFocus = async () => {
    targetEndTimeRef.current = null;
    setIsActive(false);
    await setFocusModeActive(false, 0);
    await completeSession(false);
    await nativeContentProtection.setRingerModeNormal();
  };

  const resetFocus = async () => {
    targetEndTimeRef.current = null;
    if (isActive && sessionStartTime) {
      await completeSession(false);
    }
    setIsActive(false);
    await setFocusModeActive(false, 0);
    setTimeRemaining(selectedDuration * 60);
    setSessionStartTime(null);
    await nativeContentProtection.setRingerModeNormal();
  };

  const toggleAppEnabled = async (appId: string, enabled: boolean) => {
    const updatedApps = blockingSettings.blockedApps.map(app =>
      app.id === appId ? { ...app, enabled } : app
    );
    const updatedSettings = {
      ...blockingSettings,
      enableAppBlocking: true, // Auto-enable app blocking when toggling apps
      blockedApps: updatedApps,
    };
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
    if (minutes === -1) {
      setIsCustomDurationModalVisible(true);
      return;
    }
    targetEndTimeRef.current = null;
    setSelectedDuration(minutes);
    setTimeRemaining(minutes * 60);
    setIsActive(false);
  };

  const progress = timeRemaining / (selectedDuration * 60);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={contentContainerStyle}>
        {/* Header with Title and Streak Flame Counter */}
        <View style={styles.header}>
          <View style={styles.headerTextWrapper}>
            <Text style={[styles.title, { color: colors.text }]}>{t('focus.title')}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t('focus.subtitle')}
            </Text>
          </View>
          <View style={[styles.streakBadge, { backgroundColor: colors.pill, borderColor: colors.border }]}>
            <Feather name="zap" size={14} color={colors.accentGold} />
            <Text style={[styles.streakText, { color: colors.accentGold }]}>
              {streakDays} {streakDays === 1 ? t('focus.day') : t('focus.days')}
            </Text>
          </View>
        </View>



        {/* Stats Bar */}
        <View style={[styles.statsBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{todayMinutes}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('focus.todayMin')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.completedSessions}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('focus.completed')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalMinutes}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('focus.totalMin')}</Text>
          </View>
        </View>

        {/* ─── UNIONIZED FOCUS HERO CARD ─── */}
        <View style={[styles.heroFocusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
            
            <View style={[styles.timerInner, { backgroundColor: colors.card }]}>
              <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(timeRemaining)}</Text>
              <Text style={[styles.timerLabel, { color: colors.textMuted }]}>
                {isActive ? t('focus.active', 'Focus Active') : t('focus.ready', 'Ready to Focus')}
              </Text>
            </View>
          </View>

          {/* Duration Selection Chips (seamlessly integrated inside hero) */}
          {!isActive && (
            <View style={[styles.durationPillsRow, tableMaxWidthStyle]}>
              {durations.map((duration) => {
                const isSelected = selectedDuration === duration.value;
                return (
                  <TouchableOpacity
                    key={duration.value}
                    style={[
                      styles.durationPill,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(226, 162, 59, 0.22)' : 'rgba(184, 121, 20, 0.16)')
                          : (isDark ? 'rgba(255, 255, 255, 0.04)' : colors.card),
                        borderColor: isSelected
                          ? colors.accentGold
                          : colors.border,
                        borderWidth: isSelected ? 1.5 : 1,
                      },
                    ]}
                    onPress={() => selectDuration(duration.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.durationPillText,
                        {
                          color: isSelected
                            ? (isDark ? '#ffdda8' : colors.text)
                            : colors.textSecondary,
                          fontWeight: isSelected ? '700' : '600',
                        },
                      ]}
                    >
                      {duration.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Unified Action Controls (Start / Pause / Reset) */}
          <View style={[styles.heroControlsWrapper, tableMaxWidthStyle]}>
            {!isActive ? (
              <TouchableOpacity 
                style={styles.heroStartButton} 
                onPress={startFocus} 
                activeOpacity={0.85}
              >
                <Feather name="play" size={18} color="#0f1718" style={{ marginRight: 8 }} />
                <Text style={styles.heroStartButtonText}>{t('focus.start', 'Start Focus')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.activeControls}>
                <TouchableOpacity style={styles.pauseButton} onPress={pauseFocus} activeOpacity={0.8}>
                  <Feather name="pause" size={16} color="#0f1718" style={{ marginRight: 6 }} />
                  <Text style={styles.pauseButtonText}>{t('focus.pause', 'Pause')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.resetButton} onPress={resetFocus} activeOpacity={0.8}>
                  <Feather name="rotate-ccw" size={16} color="#e2a23b" style={{ marginRight: 6 }} />
                  <Text style={styles.resetButtonText}>{t('focus.reset', 'Reset')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Content Protection Section */}
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#ffdda8' : colors.accentGold }]}>{t('focus.contentProtection')}</Text>
          
          {/* Unified System-Wide Protection & Content Blocker Card (Launches Clean Stats Hub) */}
          {systemWideAvailable && (
            <TouchableOpacity
              style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/hub/clean-stats' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.settingIconContainer, { backgroundColor: isDark ? 'rgba(226, 162, 59, 0.14)' : 'rgba(184, 121, 20, 0.12)' }]}>
                <Feather name="shield" size={20} color={systemWideActive ? (isDark ? "#10b981" : "#059669") : colors.accentGold} />
              </View>
              <View style={styles.settingContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>{t('focus.swp')}</Text>
                  <Feather name="chevron-right" size={16} color={colors.accentGold} />
                </View>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  {systemWideActive ? "Active • 24/7 web & app detox active" : "Inactive • Tap to activate protection"}
                </Text>
                <Text style={[styles.settingNote, systemWideActive && styles.settingNoteSuccess]}>
                  Clean Streak: {streakDays} {streakDays === 1 ? 'Day' : 'Days'} • Tap to Manage Protection & Stats
                </Text>
              </View>
            </TouchableOpacity>
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
              <Text style={styles.yellowButtonTitle}>{t('focus.blockApps')}</Text>
              <Text style={styles.yellowButtonSubtitle}>
                {blockingSettings.blockedApps.filter(a => a.enabled).length} {t('focus.appsSelectedSub')}
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
            <View style={[styles.appListContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.appListHeaderRow}>
                <Text style={[styles.appListTitle, { color: colors.text }]}>{t('focus.selectAppsTitle')}</Text>
              </View>
              {blockingSettings.blockedApps.map((app) => (
                <View key={app.id} style={[styles.appItem, { borderBottomColor: colors.borderSubtle }]}>
                  <View style={[styles.appIconBadge, { backgroundColor: app.color ? `${app.color}22` : (isDark ? 'rgba(226, 162, 59, 0.15)' : 'rgba(184, 121, 20, 0.12)') }]}>
                    {app.iconFamily === 'MaterialCommunityIcons' ? (
                      <MaterialCommunityIcons
                        name={(app.icon as any) || 'cellphone'}
                        size={17}
                        color={app.color || colors.accentGold}
                      />
                    ) : (
                      <Feather
                        name={(app.icon as any) || 'smartphone'}
                        size={15}
                        color={app.color || colors.accentGold}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.appName, { color: colors.text }]}>{app.name}</Text>
                    {app.isCustom && (
                      <Text style={styles.customAppTag}>Custom Added</Text>
                    )}
                  </View>
                  {app.isCustom && (
                    <TouchableOpacity
                      onPress={() => handleDeleteCustomApp(app.id)}
                      style={styles.deleteCustomBtn}
                      activeOpacity={0.7}
                    >
                      <Feather name="trash-2" size={14} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                  <Switch
                    value={app.enabled}
                    onValueChange={(enabled) => toggleAppEnabled(app.id, enabled)}
                    trackColor={{ false: isDark ? "#3e4a48" : "#d1d5db", true: isDark ? "rgba(226, 162, 59, 0.5)" : "rgba(184, 121, 20, 0.4)" }}
                    thumbColor={app.enabled ? colors.accentGold : (isDark ? "#94a4a2" : "#9ca3af")}
                  />
                </View>
              ))}

              {/* + Add Custom App & Pick Installed Buttons */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.addCustomAppBtn, { flex: 1, borderColor: colors.accentGold, backgroundColor: colors.surface }]}
                  onPress={() => setIsAddCustomModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Feather name="plus-circle" size={14} color={colors.accentGold} style={{ marginRight: 6 }} />
                  <Text style={[styles.addCustomAppBtnText, { color: colors.accentGold }]}>{t('focus.addCustom')}</Text>
                </TouchableOpacity>

                {Platform.OS === 'android' && (
                  <TouchableOpacity
                    style={[styles.addCustomAppBtn, { flex: 1, borderColor: colors.border, backgroundColor: colors.card }]}
                    onPress={handleOpenInstalledPicker}
                    activeOpacity={0.8}
                  >
                    <Feather name="list" size={14} color={colors.text} style={{ marginRight: 6 }} />
                    <Text style={[styles.addCustomAppBtnText, { color: colors.text }]}>{t('focus.installedApps')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Focus Mode Scheduler Section */}
        <View style={styles.settingsSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View>
              <Text style={[styles.sectionTitle, { color: isDark ? '#ffdda8' : colors.accentGold, marginBottom: 2 }]}>{t('focus.schedulesTitle')}</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('focus.schedulesSub')}</Text>
            </View>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.accentGold,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.accentGold,
              }}
              onPress={() => {
                setNewScheduleApps(blockingSettings.blockedApps.filter(a => a.enabled).map(a => a.packageName));
                setIsScheduleModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={13} color="#0f1718" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f1718' }}>{t('focus.planBtn')}</Text>
            </TouchableOpacity>
          </View>

          {schedules.length === 0 ? (
            <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 }]}>
              <Feather name="calendar" size={24} color={colors.textMuted} style={{ marginBottom: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{t('focus.noSchedulesTitle')}</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 2, paddingHorizontal: 20 }}>
                {t('focus.noSchedulesDesc')}
              </Text>
            </View>
          ) : (
            schedules.map((sched) => {
              const dayLabels = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
              const pad2 = (n: number) => n.toString().padStart(2, '0');
              const timeStr = `${pad2(sched.startHour)}:${pad2(sched.startMinute)} – ${pad2(sched.endHour)}:${pad2(sched.endMinute)}`;

              return (
                <View key={sched.id} style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 8 }]}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginRight: 8 }}>{sched.name}</Text>
                      <View style={{ backgroundColor: sched.enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: sched.enabled ? '#10b981' : colors.textMuted }}>
                          {sched.enabled ? 'ACTIVE' : 'PAUSED'}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accentGold, marginBottom: 6 }}>
                      {timeStr}
                    </Text>

                    {/* Day pills */}
                    <View style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>
                      {dayLabels.map((label, idx) => {
                        const isDayActive = sched.days.includes(idx);
                        return (
                          <View
                            key={label}
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: isDayActive ? colors.accentGold : (isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'),
                            }}
                          >
                            <Text style={{ fontSize: 9, fontWeight: '700', color: isDayActive ? '#0f1718' : colors.textMuted }}>
                              {label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    <Text style={{ fontSize: 11, color: colors.textMuted }}>
                      {sched.blockedAppPackages.length} app{sched.blockedAppPackages.length === 1 ? '' : 's'} blocked
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 10 }}>
                    <Switch
                      value={sched.enabled}
                      onValueChange={(val) => handleToggleSchedule(sched.id, val)}
                      trackColor={{ false: isDark ? "#3e4a48" : "#d1d5db", true: isDark ? "rgba(16, 185, 129, 0.4)" : "rgba(5, 150, 105, 0.4)" }}
                      thumbColor={sched.enabled ? (isDark ? "#10b981" : "#059669") : (isDark ? "#94a4a2" : "#9ca3af")}
                    />
                    <TouchableOpacity onPress={() => handleDeleteSchedule(sched.id)} activeOpacity={0.7}>
                      <Feather name="trash-2" size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Features Info */}
        <View style={styles.infoSection}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#ffdda8' : colors.accentGold }]}>{t('focus.duringFocus')}</Text>
          
          {Platform.OS === 'android' && !hasDndAccess && (
            <TouchableOpacity
              style={[styles.dndBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={async () => {
                await nativeContentProtection.requestNotificationPolicyAccess();
                setTimeout(async () => {
                  const granted = await nativeContentProtection.hasNotificationPolicyAccess();
                  setHasDndAccess(granted);
                }, 1200);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.dndBannerIcon, { backgroundColor: isDark ? 'rgba(226, 162, 59, 0.15)' : 'rgba(184, 121, 20, 0.12)' }]}>
                <Feather name="volume-x" size={18} color={colors.accentGold} />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.dndBannerTitle, { color: colors.text }]}>{t('focus.autoVibrateTitle')}</Text>
                <Text style={[styles.dndBannerSubtitle, { color: colors.textSecondary }]}>
                  {t('focus.autoVibrateDesc')}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.accentGold} />
            </TouchableOpacity>
          )}
          
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.infoIcon, { backgroundColor: isDark ? 'rgba(226, 162, 59, 0.14)' : 'rgba(184, 121, 20, 0.12)' }]}>
              <Feather name="bell-off" size={20} color={colors.accentGold} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>{t('focus.minimizeDistractions')}</Text>
              <Text style={[styles.infoDescription, { color: colors.textSecondary }]}>
                {t('focus.minimizeDistractionsDesc')}
              </Text>
            </View>
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.infoIcon, { backgroundColor: isDark ? 'rgba(226, 162, 59, 0.14)' : 'rgba(184, 121, 20, 0.12)' }]}>
              <Feather name="clock" size={20} color={colors.accentGold} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>{t('focus.prayerSync')}</Text>
              <Text style={[styles.infoDescription, { color: colors.textSecondary }]}>
                {t('focus.prayerSyncDesc')}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Custom Duration Modal */}
      <Modal
        visible={isCustomDurationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCustomDurationModalVisible(false)}
      >
        <View style={styles.customModalOverlay}>
          <View style={[styles.customModalBox, { backgroundColor: colors.surface, borderColor: colors.border, maxWidth: 440, width: '100%' }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.customModalHeader}>
                <View style={[styles.customModalBadge, { backgroundColor: colors.pill, borderColor: colors.border, borderWidth: 1 }]}>
                  <Feather name="clock" size={12} color={colors.accentGold} style={{ marginRight: 4 }} />
                  <Text style={[styles.customModalBadgeText, { color: colors.accentGold }]}>{t('focus.customDurationTitle')}</Text>
                </View>
                <TouchableOpacity onPress={() => setIsCustomDurationModalVisible(false)}>
                  <Feather name="x" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.customModalTitle, { color: colors.text }]}>{t('focus.customDurationTitle')}</Text>
              <Text style={[styles.customModalDesc, { color: colors.textSecondary }]}>
                {t('focus.customDurationDesc')}
              </Text>

              <View style={{ flexDirection: 'row', gap: 6, marginVertical: 10 }}>
                {[10, 30, 90, 120].map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: 'center',
                      backgroundColor: customMinutesInput === preset.toString() ? (isDark ? 'rgba(226, 162, 59, 0.22)' : 'rgba(184, 121, 20, 0.16)') : colors.card,
                    }}
                    onPress={() => setCustomMinutesInput(preset.toString())}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: customMinutesInput === preset.toString() ? colors.accentGold : colors.text }}>
                      {preset}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.customTextInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'center', fontSize: 20, fontWeight: '700' }]}
                placeholder="30"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={customMinutesInput}
                onChangeText={setCustomMinutesInput}
              />

              <View style={styles.customModalActions}>
                <TouchableOpacity
                  style={[styles.customCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setIsCustomDurationModalVisible(false)}
                >
                  <Text style={[styles.customCancelBtnText, { color: colors.textSecondary }]}>{t('focus.cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.customSaveBtn, { backgroundColor: colors.accentGold }]}
                  onPress={handleApplyCustomDuration}
                >
                  <Text style={styles.customSaveBtnText}>{t('focus.setDuration')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Plan Schedule Modal */}
      <Modal
        visible={isScheduleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsScheduleModalVisible(false)}
      >
        <View style={styles.customModalOverlay}>
          <View style={[styles.customModalBox, { backgroundColor: colors.surface, borderColor: colors.border, maxWidth: 440, width: '100%' }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.customModalHeader}>
                <View style={[styles.customModalBadge, { backgroundColor: colors.pill, borderColor: colors.border, borderWidth: 1 }]}>
                  <Feather name="calendar" size={12} color={colors.accentGold} style={{ marginRight: 4 }} />
                  <Text style={[styles.customModalBadgeText, { color: colors.accentGold }]}>{t('focus.planModalBadge')}</Text>
                </View>
                <TouchableOpacity onPress={() => setIsScheduleModalVisible(false)}>
                  <Feather name="x" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.customModalTitle, { color: colors.text }]}>{t('focus.planModalTitle')}</Text>
              <Text style={[styles.customModalDesc, { color: colors.textSecondary }]}>
                {t('focus.planModalDesc')}
              </Text>

              <Text style={[styles.customInputLabel, { color: colors.textSecondary }]}>{t('focus.sessionName')}</Text>
              <TextInput
                style={[styles.customTextInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                placeholder={t('focus.sessionNamePlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={newScheduleName}
                onChangeText={setNewScheduleName}
              />

              <Text style={[styles.customInputLabel, { color: colors.textSecondary, marginTop: 8 }]}>{t('focus.activeDays')}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4, marginBottom: 14, width: '100%' }}>
                {[
                  { label: 'Su', day: 0 },
                  { label: 'Mo', day: 1 },
                  { label: 'Tu', day: 2 },
                  { label: 'We', day: 3 },
                  { label: 'Th', day: 4 },
                  { label: 'Fr', day: 5 },
                  { label: 'Sa', day: 6 },
                ].map(({ label, day }) => {
                  const isSel = newScheduleDays.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={{
                        flex: 1,
                        aspectRatio: 1,
                        maxWidth: 40,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isSel ? colors.accentGold : colors.card,
                        borderWidth: 1,
                        borderColor: isSel ? colors.accentGold : colors.border,
                      }}
                      onPress={() => {
                        if (isSel) {
                          setNewScheduleDays(newScheduleDays.filter(d => d !== day));
                        } else {
                          setNewScheduleDays([...newScheduleDays, day].sort());
                        }
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isSel ? '#0f1718' : colors.text }}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.customInputLabel, { color: colors.textSecondary }]}>{t('focus.startTime24')}</Text>
                  <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                    <TextInput
                      style={[styles.customTextInput, { flex: 1, minWidth: 0, backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                      placeholder="09"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={newStartHour}
                      onChangeText={setNewStartHour}
                    />
                    <Text style={{ color: colors.text, fontWeight: '700' }}>:</Text>
                    <TextInput
                      style={[styles.customTextInput, { flex: 1, minWidth: 0, backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                      placeholder="00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={newStartMinute}
                      onChangeText={setNewStartMinute}
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.customInputLabel, { color: colors.textSecondary }]}>{t('focus.endTime24')}</Text>
                  <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                    <TextInput
                      style={[styles.customTextInput, { flex: 1, minWidth: 0, backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                      placeholder="17"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={newEndHour}
                      onChangeText={setNewEndHour}
                    />
                    <Text style={{ color: colors.text, fontWeight: '700' }}>:</Text>
                    <TextInput
                      style={[styles.customTextInput, { flex: 1, minWidth: 0, backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                      placeholder="00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={newEndMinute}
                      onChangeText={setNewEndMinute}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.customModalActions}>
                <TouchableOpacity
                  style={[styles.customCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setIsScheduleModalVisible(false)}
                >
                  <Text style={[styles.customCancelBtnText, { color: colors.textSecondary }]}>{t('focus.cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.customSaveBtn, { backgroundColor: colors.accentGold }]}
                  onPress={handleSaveSchedule}
                >
                  <Text style={styles.customSaveBtnText}>{t('focus.saveSchedule')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Installed Apps Picker Modal */}
      <Modal
        visible={isInstalledPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsInstalledPickerVisible(false)}
      >
        <View style={styles.customModalOverlay}>
          <View style={[styles.customModalBox, { backgroundColor: colors.surface, borderColor: colors.border, maxHeight: '80%', width: '100%', maxWidth: 500 }]}>
            <View style={styles.customModalHeader}>
              <View style={[styles.customModalBadge, { backgroundColor: colors.pill, borderColor: colors.border, borderWidth: 1 }]}>
                <Feather name="smartphone" size={12} color={colors.accentGold} style={{ marginRight: 4 }} />
                <Text style={[styles.customModalBadgeText, { color: colors.accentGold }]}>{t('focus.installedApps')}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsInstalledPickerVisible(false)}>
                <Feather name="x" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.customModalTitle, { color: colors.text }]}>Pick App to Block</Text>

            <TextInput
              style={[styles.customTextInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, marginVertical: 8 }]}
              placeholder="Search installed apps..."
              placeholderTextColor={colors.textMuted}
              value={installedSearchQuery}
              onChangeText={setInstalledSearchQuery}
            />

            {loadingInstalledApps ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Scanning installed apps...</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {installedAppsList
                  .filter(app => app.appName.toLowerCase().includes(installedSearchQuery.toLowerCase()) || app.packageName.toLowerCase().includes(installedSearchQuery.toLowerCase()))
                  .map(app => {
                    const meta = resolveAppMeta(app.packageName, app.appName);
                    return (
                      <TouchableOpacity
                        key={app.packageName}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 10,
                          paddingHorizontal: 8,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.borderSubtle,
                        }}
                        onPress={() => handleSelectInstalledApp(app)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.appIconBadge, { backgroundColor: colors.pill, borderColor: colors.borderSubtle, borderWidth: 1, marginRight: 12 }]}>
                          <Feather name="smartphone" size={16} color={colors.accentGold} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={1}>{app.appName}</Text>
                        </View>
                        <Feather name="plus" size={18} color={colors.accentGold} />
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.customCancelBtn, { borderColor: colors.border, marginTop: 12, width: '100%', alignItems: 'center' }]}
              onPress={() => setIsInstalledPickerVisible(false)}
            >
              <Text style={[styles.customCancelBtnText, { color: colors.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Custom App Modal */}
      <Modal
        visible={isAddCustomModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddCustomModalVisible(false)}
      >
        <View style={styles.customModalOverlay}>
          <View style={[styles.customModalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.customModalHeader}>
              <View style={[styles.customModalBadge, { backgroundColor: isDark ? 'rgba(0, 255, 102, 0.12)' : 'rgba(5, 150, 105, 0.1)', borderColor: isDark ? 'rgba(0, 255, 102, 0.3)' : 'rgba(5, 150, 105, 0.25)' }]}>
                <Feather name="shield" size={12} color={colors.accentGreen} style={{ marginRight: 4 }} />
                <Text style={[styles.customModalBadgeText, { color: colors.accentGreen }]}>Focus Lockdown</Text>
              </View>
              <TouchableOpacity onPress={() => setIsAddCustomModalVisible(false)}>
                <Feather name="x" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.customModalTitle, { color: colors.text }]}>Add Custom App</Text>
            <Text style={[styles.customModalDesc, { color: colors.textSecondary }]}>
              Enter any distracting app or mobile game (e.g., BGMI, Free Fire, Telegram) to block during focus sessions.
            </Text>

            <Text style={[styles.customInputLabel, { color: colors.textSecondary }]}>App or Game Name *</Text>
            <TextInput
              style={[styles.customTextInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. Battlegrounds Mobile (BGMI)"
              placeholderTextColor={colors.textMuted}
              value={customAppName}
              onChangeText={setCustomAppName}
            />

            <Text style={[styles.customInputLabel, { color: colors.textSecondary }]}>Package Name (Optional)</Text>
            <TextInput
              style={[styles.customTextInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. com.pubg.imobile (Auto-generated if blank)"
              placeholderTextColor={colors.textMuted}
              value={customPackageName}
              onChangeText={setCustomPackageName}
              autoCapitalize="none"
            />

            <View style={styles.customModalActions}>
              <TouchableOpacity
                style={[styles.customCancelBtn, { backgroundColor: colors.pill }]}
                onPress={() => setIsAddCustomModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.customCancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.customSaveBtn, { backgroundColor: colors.accentGold }]}
                onPress={handleAddCustomApp}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={14} color="#0f1718" style={{ marginRight: 4 }} />
                <Text style={[styles.customSaveBtnText, { color: '#0f1718' }]}>Add App</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  swpStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  swpStatsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  swpStatsText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
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
    justifyContent: "center",
  },
  streakFlame: {
    fontSize: 14,
  },
  streakText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffdda8",
    textAlign: "center",
    includeFontPadding: false,
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
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    marginBottom: 16,
  },
  durationPill: {
    minWidth: "30%",
    flexGrow: 1,
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  durationPillActive: {
    backgroundColor: "rgba(226, 162, 59, 0.18)",
    borderColor: "#e2a23b",
  },
  durationPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94a4a2",
    textAlign: "center",
    includeFontPadding: false,
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
    fontWeight: "500",
  },
  appIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  customAppTag: {
    fontSize: 10,
    color: '#00ff66',
    fontWeight: '600',
    marginTop: 2,
  },
  deleteCustomBtn: {
    padding: 6,
    marginRight: 6,
  },
  appListHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addCustomAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  addCustomAppBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffdda8',
  },
  customModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  customModalBox: {
    width: '100%',
    backgroundColor: '#0c2324',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1d3e40',
    padding: 20,
  },
  customModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customModalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 102, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  customModalBadgeText: {
    fontSize: 11,
    color: '#00ff66',
    fontWeight: '700',
  },
  customModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffdda8',
    marginBottom: 6,
  },
  customModalDesc: {
    fontSize: 12,
    color: '#94a4a2',
    lineHeight: 18,
    marginBottom: 16,
  },
  customInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d6e2e0',
    marginBottom: 6,
    marginTop: 4,
  },
  customTextInput: {
    backgroundColor: '#071617',
    borderWidth: 1,
    borderColor: '#244547',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
    marginBottom: 12,
  },
  customModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  customCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#162b2d',
    alignItems: 'center',
  },
  customCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a4a2',
  },
  customSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#e2a23b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f1718',
  },
  // ─── FEATURES INFO ───
  dndBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.35)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  dndBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dndBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffdda8',
    marginBottom: 2,
  },
  dndBannerSubtitle: {
    fontSize: 11,
    color: '#94a4a2',
    lineHeight: 15,
  },
  infoSection: {
    paddingHorizontal: 20,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
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
  analyticsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  analyticsIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  analyticsBannerSub: {
    fontSize: 11,
  },
});