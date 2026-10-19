import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Platform,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getStreak, checkAndUpdateStreak, recordVPNDisabled } from '../../lib/streak';
import { isLocked, hasPIN, setPIN, verifyPIN } from '../../lib/lock';
import { nativeContentProtection } from '../../lib/nativeContentProtection';
import { getNextPrayer, formatTime, getPrayerTimes } from '../../lib/prayerTimes';
import { getCurrentLocation } from '../../lib/location';
import { requestNotificationPermissions, scheduleSalahNotifications } from '../../lib/salahNotifications';
import { loadSettings } from '../../lib/settings';
import { getFocusStats, FocusStats } from '../../lib/focus';
import PINModal from '../../components/PINModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DailyInspiration {
  arabic: string;
  translation: string;
  source: string;
  type: 'Ayah' | 'Hadith';
}

const DAILY_INSPIRATIONS: DailyInspiration[] = [
  {
    type: 'Ayah',
    arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا • إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    translation: 'For indeed, with hardship [will be] ease. Indeed, with hardship [will be] ease.',
    source: 'Surah Ash-Sharh (94:5-6)',
  },
  {
    type: 'Ayah',
    arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',
    translation: 'O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.',
    source: 'Surah Al-Baqarah (2:153)',
  },
  {
    type: 'Ayah',
    arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    translation: 'Unquestionably, by the remembrance of Allah hearts are assured.',
    source: 'Surah Ar-Ra’d (13:28)',
  },
  {
    type: 'Ayah',
    arabic: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ',
    translation: 'And whoever fears Allah — He will make for him a way out and will provide for him from where he does not expect.',
    source: 'Surah At-Talaq (65:2-3)',
  },
  {
    type: 'Hadith',
    arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى',
    translation: 'Actions are judged by intentions, and every person will be rewarded according to what they intended.',
    source: 'Sahih al-Bukhari 1',
  },
  {
    type: 'Hadith',
    arabic: 'مَنْ تَرَكَ شَيْئاً لِلَّهِ عَوَّضَهُ اللَّهُ خَيْراً مِنْهُ',
    translation: 'Whoever leaves something for the sake of Allah, Allah will replace it with something far better.',
    source: 'Musnad Ahmad',
  },
  {
    type: 'Hadith',
    arabic: 'احْفَظِ اللَّهَ يَحْفَظْكَ، احْفَظِ اللَّهَ تَجِدْهُ تُجَاهَكَ',
    translation: 'Be mindful of Allah and He will protect you. Be mindful of Allah and you will find Him before you.',
    source: 'Jami` at-Tirmidhi 2516',
  },
];

function calculateCountdown(prayerTimeStr?: string): string {
  if (!prayerTimeStr) return '';
  const [hStr, mStr] = prayerTimeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return '';

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

  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) {
    return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
  }
  return `${minutes}m ${pad(seconds)}s`;
}

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
  const [focusStats, setFocusStats] = useState<FocusStats>({
    totalSessions: 0,
    totalMinutes: 0,
    completedSessions: 0,
    currentStreak: 0,
  });

  // Prayer state
  const [nextPrayerInfo, setNextPrayerInfo] = useState<{ name: string; time: string } | null>(null);
  const [prayerCountdown, setPrayerCountdown] = useState<string>('');

  // Daily inspiration
  const [copiedInspiration, setCopiedInspiration] = useState(false);
  const dailyInspiration = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const day = Math.floor(diff / oneDay);
    return DAILY_INSPIRATIONS[day % DAILY_INSPIRATIONS.length];
  }, []);

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

  // Live countdown timer ticker
  useEffect(() => {
    if (!nextPrayerInfo?.time) return;
    setPrayerCountdown(calculateCountdown(nextPrayerInfo.time));
    const timer = setInterval(() => {
      setPrayerCountdown(calculateCountdown(nextPrayerInfo?.time));
    }, 1000);
    return () => clearInterval(timer);
  }, [nextPrayerInfo?.time]);

  const animateEntrance = () => {
    const useNative = Platform.OS !== 'web';
    Animated.parallel([
      Animated.spring(streakScale, {
        toValue: 1,
        useNativeDriver: useNative,
        tension: 50,
        friction: 7,
        delay: 150,
      }),
      Animated.timing(cardFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: useNative,
        delay: 300,
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
      // Silently fail — prayer card will show fallback or hide
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
      const locked = await isLocked();
      if (locked) {
        setPinAction('toggle_swp');
        setPinMode('verify');
        setPinError(null);
        setPinModalVisible(true);
        return;
      }
      const stopped = await nativeContentProtection.stop();
      if (stopped) {
        setSystemWideActive(false);
        await recordVPNDisabled();
        const streakData = await getStreak();
        setStreakDays(streakData.currentStreak);
      }
    } else {
      const started = await nativeContentProtection.start();
      setSystemWideActive(started);
    }
  };

  const handleSetLock = () => {
    if (pinExists && appLocked) {
      setPinAction('unlock');
      setPinMode('verify');
      setPinError(null);
      setPinModalVisible(true);
    } else {
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

  const handleCopyInspiration = () => {
    Clipboard.setString(`"${dailyInspiration.translation}" — ${dailyInspiration.source}`);
    setCopiedInspiration(true);
    setTimeout(() => setCopiedInspiration(false), 2000);
  };

  const getStreakMessage = () => {
    if (streakDays === 0) return 'Start your pure journey today';
    if (streakDays < 3) return 'Every day counts, keep going!';
    if (streakDays < 7) return 'MashaAllah, building momentum!';
    if (streakDays < 14) return 'SubhanAllah, one week strong! 💪';
    if (streakDays < 30) return 'AlhamduLillah, amazing discipline!';
    if (streakDays < 90) return 'You are a warrior of faith! 🏆';
    return 'Legendary. May Allah reward your steadfastness! 🌟';
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
        {/* ─── HEADER WITH SETTINGS & SHIELD PILL ─── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Deen AI</Text>
              <View
                style={[
                  styles.statusBadge,
                  systemWideActive ? styles.statusBadgeActive : styles.statusBadgeInactive,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    systemWideActive ? styles.statusDotActive : styles.statusDotInactive,
                  ]}
                />
                <Text
                  style={[
                    styles.statusBadgeText,
                    systemWideActive ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive,
                  ]}
                >
                  {systemWideActive ? 'PROTECTED' : 'OFFLINE'}
                </Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>Your Islamic Digital Guardian</Text>
          </View>

          <TouchableOpacity
            style={styles.settingsIconButton}
            onPress={() => router.push('/(tabs)/settings')}
            activeOpacity={0.7}
            accessibilityLabel="Settings"
          >
            <Feather name="settings" size={20} color="#ffdda8" />
          </TouchableOpacity>
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
                const handleUpdate = (val?: string) => {
                  const num = parseInt(val || '0');
                  if (!isNaN(num)) {
                    const { setStreakOverride } = require('../../lib/streak');
                    setStreakOverride(num).then(() => {
                      setStreakDays(num);
                    });
                  }
                };

                if (Platform.OS === 'web') {
                  const val = window.prompt('Developer Tools\nEnter new streak days manually:');
                  if (val !== null) handleUpdate(val);
                } else if (Platform.OS === 'ios') {
                  Alert.prompt('Developer Tools', 'Enter new streak days manually:', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Update', onPress: handleUpdate },
                  ]);
                } else {
                  Alert.alert(
                    'Developer Tools',
                    'Dev override quick actions:',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Reset to 0', onPress: () => handleUpdate('0') },
                      { text: 'Add 10 Days', onPress: () => handleUpdate(String(streakDays + 10)) },
                    ]
                  );
                }
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
        <Animated.View
          style={[
            styles.swpCard,
            systemWideActive && styles.swpCardActive,
            { opacity: cardFade },
          ]}
        >
          <View style={styles.swpHeader}>
            <View
              style={[
                styles.swpIconContainer,
                systemWideActive && styles.swpIconContainerActive,
              ]}
            >
              <Feather
                name="shield"
                size={22}
                color={systemWideActive ? '#10b981' : '#e2a23b'}
              />
            </View>
            <View style={styles.swpInfo}>
              <Text style={styles.swpTitle}>System-Wide Protection</Text>
              <Text style={[styles.swpStatus, systemWideActive && styles.swpStatusActive]}>
                {systemWideActive ? 'Active — Device Protected' : 'Inactive — Device Exposed'}
              </Text>
            </View>
            <Switch
              value={systemWideActive}
              onValueChange={handleToggleSWP}
              trackColor={{ false: '#3e4a48', true: 'rgba(16, 185, 129, 0.4)' }}
              thumbColor={systemWideActive ? '#10b981' : '#94a4a2'}
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

        {/* ─── NEXT PRAYER & LIVE COUNTDOWN CARD ─── */}
        {nextPrayerInfo && (
          <Animated.View style={[styles.prayerCard, { opacity: cardFade }]}>
            <TouchableOpacity
              style={styles.prayerCardInner}
              onPress={() => router.push('/(tabs)/prayer')}
              activeOpacity={0.8}
            >
              <View style={styles.prayerTopRow}>
                <View style={styles.prayerBadge}>
                  <Feather name="clock" size={14} color="#e2a23b" />
                  <Text style={styles.prayerBadgeText}>NEXT AZAN</Text>
                </View>
                {prayerCountdown ? (
                  <View style={styles.countdownBadge}>
                    <Text style={styles.countdownBadgeText}>in {prayerCountdown}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.prayerContentRow}>
                <View style={styles.prayerInfo}>
                  <Text style={styles.prayerName}>{nextPrayerInfo.name}</Text>
                  <Text style={styles.prayerTime}>{formatTime(nextPrayerInfo.time)}</Text>
                </View>
                <View style={styles.prayerActionPill}>
                  <Text style={styles.prayerActionPillText}>Schedule</Text>
                  <Feather name="chevron-right" size={16} color="#e2a23b" />
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ─── DAILY INSPIRATION (AYAH / HADITH) ─── */}
        <Animated.View style={[styles.inspirationCard, { opacity: cardFade }]}>
          <View style={styles.inspirationHeader}>
            <View style={styles.inspirationTypeRow}>
              <Feather name="book-open" size={15} color="#e2a23b" />
              <Text style={styles.inspirationTypeTitle}>
                Daily {dailyInspiration.type}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyInspiration}
              activeOpacity={0.7}
            >
              <Feather
                name={copiedInspiration ? 'check' : 'copy'}
                size={14}
                color={copiedInspiration ? '#10b981' : '#ffdda8'}
              />
              <Text
                style={[
                  styles.copyButtonText,
                  copiedInspiration && { color: '#10b981' },
                ]}
              >
                {copiedInspiration ? 'Copied' : 'Share'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inspirationArabic}>{dailyInspiration.arabic}</Text>
          <Text style={styles.inspirationTranslation}>
            "{dailyInspiration.translation}"
          </Text>
          <Text style={styles.inspirationSource}>— {dailyInspiration.source}</Text>
        </Animated.View>

        {/* ─── QUICK ACTION TILES ─── */}
        <Animated.View style={[styles.quickActions, { opacity: cardFade }]}>
          {/* Focus Mode */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/focus')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconContainer}>
              <Feather name="target" size={24} color="#e2a23b" />
            </View>
            <Text style={styles.actionTitle}>Focus Mode</Text>
            <Text style={styles.actionStat}>
              {focusStats.totalMinutes} min tracked
            </Text>
          </TouchableOpacity>

          {/* Masjid Finder */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/masjid')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconContainer}>
              <Feather name="map-pin" size={24} color="#e2a23b" />
            </View>
            <Text style={styles.actionTitle}>Masjid & Qibla</Text>
            <Text style={styles.actionStat}>Nearby locator</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ─── QUICK IMAM AI PROMPT BANNER ─── */}
        <Animated.View style={[styles.imamPromptBanner, { opacity: cardFade }]}>
          <TouchableOpacity
            style={styles.imamPromptInner}
            onPress={() => router.push('/(tabs)/chat')}
            activeOpacity={0.8}
          >
            <View style={styles.imamIconCircle}>
              <Feather name="message-circle" size={22} color="#0f1718" />
            </View>
            <View style={styles.imamPromptTextWrapper}>
              <Text style={styles.imamPromptTitle}>Have a spiritual question?</Text>
              <Text style={styles.imamPromptSubtitle}>
                Ask Imam AI with Internet Archive verified citations
              </Text>
            </View>
            <Feather name="arrow-right" size={18} color="#e2a23b" />
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom spacer for comfortable scrolling above the tab bar */}
        <View style={{ height: 24 }} />
      </ScrollView>

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
            : 'Give this PIN to a trusted accountability partner'
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
    paddingBottom: 24,
  },

  // ─── Header ───
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f3f7f6',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94a4a2',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  statusBadgeInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusDotActive: {
    backgroundColor: '#10b981',
  },
  statusDotInactive: {
    backgroundColor: '#ef4444',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusBadgeTextActive: {
    color: '#10b981',
  },
  statusBadgeTextInactive: {
    color: '#ef4444',
  },
  settingsIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0c3033',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Streak Hero ───
  streakHero: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#0b2527',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.18)',
  },
  streakCircle: {
    width: 154,
    height: 154,
    borderRadius: 77,
    backgroundColor: '#0c3033',
    borderWidth: 4,
    borderColor: '#e2a23b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#e2a23b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  streakEmoji: {
    fontSize: 26,
    marginBottom: 2,
  },
  streakNumber: {
    fontSize: 46,
    fontWeight: '800',
    color: '#e2a23b',
    lineHeight: 50,
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffdda8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  streakMessage: {
    fontSize: 13,
    color: '#d6e2e0',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // ─── SWP Card ───
  swpCard: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: '#0b2527',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
  },
  swpCardActive: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(11, 37, 39, 0.95)',
  },
  swpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swpIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(226, 162, 59, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  swpIconContainerActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  swpInfo: {
    flex: 1,
    marginRight: 12,
  },
  swpTitle: {
    fontSize: 15,
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
    color: '#10b981',
  },
  lockButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(226, 162, 59, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.22)',
    alignItems: 'center',
  },
  lockButtonLocked: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  lockButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffdda8',
  },

  // ─── Prayer Card ───
  prayerCard: {
    marginHorizontal: 20,
    marginTop: 14,
  },
  prayerCardInner: {
    backgroundColor: '#0c3033',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.25)',
    padding: 16,
  },
  prayerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  prayerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prayerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e2a23b',
    letterSpacing: 1,
  },
  countdownBadge: {
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
  },
  countdownBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffdda8',
    fontVariant: ['tabular-nums'],
  },
  prayerContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prayerInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  prayerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f3f7f6',
  },
  prayerTime: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e2a23b',
  },
  prayerActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  prayerActionPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d6e2e0',
  },

  // ─── Daily Inspiration ───
  inspirationCard: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: '#0b2527',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
  },
  inspirationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inspirationTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inspirationTypeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffdda8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  copyButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffdda8',
  },
  inspirationArabic: {
    fontSize: 20,
    lineHeight: 34,
    color: '#ffdda8',
    textAlign: 'right',
    marginBottom: 10,
    fontWeight: '600',
  },
  inspirationTranslation: {
    fontSize: 13,
    lineHeight: 20,
    color: '#d6e2e0',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  inspirationSource: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a4a2',
    textAlign: 'right',
  },

  // ─── Quick Actions ───
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 14,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#0b2527',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(226, 162, 59, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f3f7f6',
    marginBottom: 2,
  },
  actionStat: {
    fontSize: 11,
    color: '#94a4a2',
  },

  // ─── Imam AI Banner ───
  imamPromptBanner: {
    marginHorizontal: 20,
    marginTop: 14,
  },
  imamPromptInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c3033',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.2)',
    padding: 14,
  },
  imamIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2a23b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  imamPromptTextWrapper: {
    flex: 1,
    marginRight: 8,
  },
  imamPromptTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f3f7f6',
    marginBottom: 2,
  },
  imamPromptSubtitle: {
    fontSize: 11,
    color: '#94a4a2',
  },
});
