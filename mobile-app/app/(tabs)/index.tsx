import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Animated,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getStreak, checkAndUpdateStreak, recordVPNDisabled } from '../../lib/streak';
import { isLocked, hasPIN, setPIN, verifyPIN } from '../../lib/lock';
import { nativeContentProtection } from '../../lib/nativeContentProtection';
import { getNextPrayer, formatTime, getPrayerTimes, PrayerTimings } from '../../lib/prayerTimes';
import { getCurrentLocation } from '../../lib/location';
import { requestNotificationPermissions, scheduleSalahNotifications } from '../../lib/salahNotifications';
import { loadSettings } from '../../lib/settings';
import {
  setFocusModeActive,
  getBlockingSettings,
  saveBlockingSettings,
  getFocusStats,
  FocusStats,
} from '../../lib/focus';
import PINModal from '../../components/PINModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DashboardScreen() {
  // Streak state
  const [streakDays, setStreakDays] = useState(0);
  const [streakStartDate, setStreakStartDate] = useState<string | null>(null);

  // Protection state
  const [systemWideActive, setSystemWideActive] = useState(false);
  const [systemWideAvailable, setSystemWideAvailable] = useState(false);
  const [appLocked, setAppLocked] = useState(false);
  const [pinExists, setPinExists] = useState(false);

  // Focus state
  const [focusActive, setFocusActive] = useState(false);
  const [focusStats, setFocusStats] = useState<FocusStats>({
    totalSessions: 0,
    totalMinutes: 0,
    completedSessions: 0,
    currentStreak: 0,
  });

  // Prayer state
  const [nextPrayerInfo, setNextPrayerInfo] = useState<{ name: string; time: string } | null>(null);

  // PIN modal
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinMode, setPinMode] = useState<'set' | 'verify'>('verify');
  const [pinAction, setPinAction] = useState<'toggle_swp' | 'unlock' | 'lock' | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  // Refresh
  const [refreshing, setRefreshing] = useState(false);

  // Dev tap counter
  const devTapCount = React.useRef(0);
  const devTapTimer = React.useRef<NodeJS.Timeout | null>(null);

  // Animations
  const streakScale = React.useRef(new Animated.Value(0)).current;
  const cardFade = React.useRef(new Animated.Value(0)).current;

  const router = useRouter();

  useEffect(() => {
    loadAllData();
    animateEntrance();
  }, []);

  const animateEntrance = () => {
    Animated.parallel([
      Animated.spring(streakScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
        delay: 200,
      }),
      Animated.timing(cardFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        delay: 400,
      }),
    ]).start();
  };

  const loadAllData = async () => {
    try {
      // Load streak
      await checkAndUpdateStreak();
      const streakData = await getStreak();
      setStreakDays(streakData.currentStreak);
      setStreakStartDate(streakData.startDate);

      // Load lock state
      const locked = await isLocked();
      const hasPin = await hasPIN();
      setAppLocked(locked);
      setPinExists(hasPin);

      // Load SWP status
      const available = nativeContentProtection.isAvailable();
      setSystemWideAvailable(available);
      if (available) {
        const status = await nativeContentProtection.getStatus();
        setSystemWideActive(status.active);
      }

      // Load focus stats
      const stats = await getFocusStats();
      setFocusStats(stats);

      // Load prayer times
      await loadNextPrayer();
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  const loadNextPrayer = async () => {
    try {
      const settings = await loadSettings();
      const location = await getCurrentLocation();
      const lat = location?.latitude ?? 40.7128;
      const lng = location?.longitude ?? -74.006;
      const { timings } = await getPrayerTimes(lat, lng, String(settings.calculationMethodValue));
      const next = getNextPrayer(timings);
      setNextPrayerInfo(next);

      // Schedule salah notifications
      const hasPermission = await requestNotificationPermissions();
      if (hasPermission) {
        await scheduleSalahNotifications(timings);
      }
    } catch {
      // Silently fail — prayer card just won't show
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, []);

  // --- PIN Flow ---
  const handleToggleSWP = async (enabled: boolean) => {
    if (!enabled) {
      // Trying to DISABLE protection
      const locked = await isLocked();
      if (locked) {
        setPinAction('toggle_swp');
        setPinMode('verify');
        setPinError(null);
        setPinModalVisible(true);
        return;
      }
      // Not locked, disable directly
      const stopped = await nativeContentProtection.stop();
      if (stopped) {
        setSystemWideActive(false);
        await recordVPNDisabled();
        const streakData = await getStreak();
        setStreakDays(streakData.currentStreak);
      }
    } else {
      // Enable protection
      const started = await nativeContentProtection.start();
      setSystemWideActive(started);
    }
  };

  const handleSetLock = () => {
    if (pinExists && appLocked) {
      // Unlock flow
      setPinAction('unlock');
      setPinMode('verify');
      setPinError(null);
      setPinModalVisible(true);
    } else {
      // Set PIN flow
      setPinAction('lock');
      setPinMode('set');
      setPinError(null);
      setPinModalVisible(true);
    }
  };

  const handlePINSubmit = async (pin: string) => {
    if (pinAction === 'lock' && pinMode === 'set') {
      const success = await setPIN(pin);
      if (success) {
        setPinModalVisible(false);
        setAppLocked(true);
        setPinExists(true);
        Alert.alert(
          '🔒 Protection Locked',
          'Your protection settings are now locked. Only someone with the PIN can disable them.',
          [{ text: 'Great!' }]
        );
      } else {
        setPinError('Failed to set PIN. Please try again.');
      }
    } else if (pinAction === 'unlock' || pinAction === 'toggle_swp') {
      const valid = await verifyPIN(pin);
      if (valid) {
        setPinModalVisible(false);

        if (pinAction === 'toggle_swp') {
          const stopped = await nativeContentProtection.stop();
          if (stopped) {
            setSystemWideActive(false);
            await recordVPNDisabled();
            const streakData = await getStreak();
            setStreakDays(streakData.currentStreak);
          }
        } else if (pinAction === 'unlock') {
          const { setLockEnabled } = require('../../lib/lock');
          await setLockEnabled(false);
          setAppLocked(false);
          Alert.alert('🔓 Unlocked', 'Protection settings are now unlocked.');
        }
      } else {
        setPinError('Wrong PIN. Try again.');
      }
    }
  };

  // --- Streak ring calculation ---
  const getStreakMessage = () => {
    if (streakDays === 0) return 'Start your journey today';
    if (streakDays < 3) return 'Every day counts, keep going!';
    if (streakDays < 7) return 'MashaAllah, building momentum!';
    if (streakDays < 14) return 'SubhanAllah, one week strong! 💪';
    if (streakDays < 30) return 'AlhamduLillah, amazing discipline!';
    if (streakDays < 90) return 'You are a warrior of faith! 🏆';
    return 'Legendary. May Allah reward you! 🌟';
  };

  const getStreakEmoji = () => {
    if (streakDays === 0) return '🌱';
    if (streakDays < 3) return '🔥';
    if (streakDays < 7) return '⭐';
    if (streakDays < 14) return '🌟';
    if (streakDays < 30) return '💎';
    if (streakDays < 90) return '🏆';
    return '👑';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#e2a23b"
            colors={['#e2a23b']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Deen AI</Text>
          <Text style={styles.headerSubtitle}>Your Islamic Digital Guardian</Text>
        </View>

        {/* ─── STREAK HERO SECTION ─── */}
        <Animated.View
          style={[
            styles.streakHero,
            { transform: [{ scale: streakScale }] },
          ]}
        >
          <TouchableOpacity 
            style={styles.streakCircle}
            activeOpacity={0.9}
            onPress={() => {
              devTapCount.current += 1;
              if (devTapTimer.current) clearTimeout(devTapTimer.current);
              devTapTimer.current = setTimeout(() => {
                devTapCount.current = 0;
              }, 1000);
              
              if (devTapCount.current >= 7) {
                devTapCount.current = 0;
                Alert.prompt(
                  "Developer Tools",
                  "Enter new streak days manually:",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Update", onPress: async (val) => {
                        const num = parseInt(val || "0");
                        if (!isNaN(num)) {
                          const { saveStreak } = require('../../lib/streak');
                          await saveStreak({
                            currentStreak: num,
                            lastResetDate: new Date().toISOString(),
                            vpnDisabledCount: 0
                          });
                          setStreakDays(num);
                        }
                      }
                    }
                  ]
                );
              }
            }}
          >
            <Text style={styles.streakEmoji}>{getStreakEmoji()}</Text>
            <Text style={styles.streakNumber}>{streakDays}</Text>
            <Text style={styles.streakLabel}>
              {streakDays === 1 ? 'Day Clean' : 'Days Clean'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.streakMessage}>{getStreakMessage()}</Text>
        </Animated.View>

        {/* ─── SYSTEM-WIDE PROTECTION CARD ─── */}
        <Animated.View style={[styles.swpCard, { opacity: cardFade }]}>
          <View style={styles.swpHeader}>
            <View style={styles.swpIconContainer}>
              <Text style={styles.swpIcon}>🛡️</Text>
            </View>
            <View style={styles.swpInfo}>
              <Text style={styles.swpTitle}>System-Wide Protection</Text>
              <Text style={[styles.swpStatus, systemWideActive && styles.swpStatusActive]}>
                {systemWideActive ? '✅ Active — Device Protected' : '⚠️ Inactive — Device Exposed'}
              </Text>
            </View>
            <Switch
              value={systemWideActive}
              onValueChange={handleToggleSWP}
              trackColor={{ false: '#3e4a48', true: 'rgba(76, 175, 80, 0.5)' }}
              thumbColor={systemWideActive ? '#4caf50' : '#94a4a2'}
            />
          </View>

          {/* Lock Button */}
          <TouchableOpacity
            style={[styles.lockButton, appLocked && styles.lockButtonLocked]}
            onPress={handleSetLock}
            activeOpacity={0.7}
          >
            <Text style={styles.lockButtonText}>
              {appLocked ? '🔒 PIN Locked — Tap to Unlock' : '🔓 Tap to Set Uninstall PIN'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ─── NEXT PRAYER CARD ─── */}
        {nextPrayerInfo && (
          <Animated.View style={[styles.prayerCard, { opacity: cardFade }]}>
            <TouchableOpacity
              style={styles.prayerCardInner}
              onPress={() => router.push('/(tabs)/prayer')}
              activeOpacity={0.8}
            >
              <View style={styles.prayerIconContainer}>
                <Text style={styles.prayerIcon}>🕌</Text>
              </View>
              <View style={styles.prayerInfo}>
                <Text style={styles.prayerLabel}>NEXT PRAYER</Text>
                <Text style={styles.prayerName}>{nextPrayerInfo.name}</Text>
                <Text style={{fontSize: 10, color: '#94a4a2', marginTop: 4}}>Tap for more details</Text>
              </View>
              <Text style={styles.prayerTime}>{formatTime(nextPrayerInfo.time)}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ─── QUICK ACTION CARDS ─── */}
        <Animated.View style={[styles.quickActions, { opacity: cardFade }]}>
          {/* Focus Mode */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/focus')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>🎯</Text>
            <Text style={styles.actionTitle}>Focus Mode</Text>
            <Text style={styles.actionStat}>
              {focusStats.totalMinutes} min total
            </Text>
            <Text style={{fontSize: 10, color: '#94a4a2', marginTop: 6, textAlign: 'center'}}>Tap for more details</Text>
          </TouchableOpacity>

          {/* Masjid */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/masjid')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>🕋</Text>
            <Text style={styles.actionTitle}>Masjid</Text>
            <Text style={styles.actionStat}>Find nearby</Text>
            <Text style={{fontSize: 10, color: '#94a4a2', marginTop: 6, textAlign: 'center'}}>Tap for more details</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ─── SETTINGS ROW ─── */}
        <Animated.View style={[styles.settingsRow, { opacity: cardFade }]}>
          <TouchableOpacity
            style={styles.settingsCard}
            onPress={() => router.push('/(tabs)/settings')}
            activeOpacity={0.8}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsTitle}>Settings</Text>
              <Text style={styles.settingsSubtitle}>
                Prayer calc, DNS, location
              </Text>
            </View>
            <Text style={styles.settingsArrow}>›</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom spacer for floating button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ─── FLOATING IMAM AI BUTTON ─── */}
      <View style={styles.floatingButtonContainer}>
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => router.push('/(tabs)/chat')}
          activeOpacity={0.85}
        >
          <View style={styles.floatingButtonInner}>
            <Text style={styles.floatingButtonIcon}>🤖</Text>
            <Text style={styles.floatingButtonText}>Imam AI</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* PIN Modal */}
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
            ? '🔒 PIN Required'
            : pinAction === 'unlock'
            ? '🔓 Enter PIN to Unlock'
            : '🔐 Set Protection PIN'
        }
        subtitle={
          pinAction === 'toggle_swp'
            ? 'Enter PIN to disable System-Wide Protection'
            : pinAction === 'unlock'
            ? 'Enter your PIN to unlock settings'
            : 'Give this PIN to a friend or family member'
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1718',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f3f7f6',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a4a2',
  },

  // ─── Streak Hero ───
  streakHero: {
    alignItems: 'center',
    paddingVertical: 28,
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: '#0b2527',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.15)',
  },
  streakCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#0c3033',
    borderWidth: 4,
    borderColor: '#e2a23b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#e2a23b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  streakEmoji: {
    fontSize: 28,
    marginBottom: 2,
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: '#e2a23b',
    lineHeight: 52,
  },
  streakLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffdda8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  streakMessage: {
    fontSize: 14,
    color: '#94a4a2',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // ─── SWP Card ───
  swpCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#0b2527',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
  },
  swpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swpIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(226, 162, 59, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  swpIcon: {
    fontSize: 22,
  },
  swpInfo: {
    flex: 1,
    marginRight: 12,
  },
  swpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f3f7f6',
    marginBottom: 2,
  },
  swpStatus: {
    fontSize: 12,
    color: '#ff6b6b',
    fontWeight: '600',
  },
  swpStatusActive: {
    color: '#4caf50',
  },
  lockButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(226, 162, 59, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.25)',
    alignItems: 'center',
  },
  lockButtonLocked: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.25)',
  },
  lockButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffdda8',
  },

  // ─── Prayer Card ───
  prayerCard: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  prayerCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.2)',
    padding: 16,
  },
  prayerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(226, 162, 59, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  prayerIcon: {
    fontSize: 22,
  },
  prayerInfo: {
    flex: 1,
  },
  prayerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a4a2',
    letterSpacing: 1,
    marginBottom: 2,
  },
  prayerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffdda8',
  },
  prayerTime: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e2a23b',
  },

  // ─── Quick Actions ───
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#0b2527',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f3f7f6',
    marginBottom: 4,
  },
  actionStat: {
    fontSize: 12,
    color: '#94a4a2',
  },

  // ─── Settings Row ───
  settingsRow: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b2527',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
  },
  settingsIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  settingsInfo: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f7f6',
  },
  settingsSubtitle: {
    fontSize: 12,
    color: '#94a4a2',
    marginTop: 2,
  },
  settingsArrow: {
    fontSize: 24,
    color: '#94a4a2',
    fontWeight: '300',
  },

  // ─── Floating Imam AI Button ───
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 8,
  },
  floatingButton: {
    width: 140,
    height: 60,
    borderTopLeftRadius: 70,
    borderTopRightRadius: 70,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: '#e2a23b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#e2a23b',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  floatingButtonInner: {
    alignItems: 'center',
    paddingTop: 6,
  },
  floatingButtonIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  floatingButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f1718',
  },
});
