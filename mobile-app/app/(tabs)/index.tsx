// Module-level guard to prevent protection activation popup loop on tab switches / back navigation
let hasPromptedProtectionOnBoot = false;

export function toTitleCase(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
import { useTheme } from "../../lib/theme";
import { useLanguage } from "../../lib/i18n";
import { useResponsiveLayout } from '../../lib/responsive';
import MasjidLedBoard from '../../components/MasjidLedBoard';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Linking,
  Clipboard,
  Share,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getStreak, checkAndUpdateStreak, recordVPNDisabled } from '../../lib/streak';
import { isLocked, hasPIN, setPIN, verifyPIN } from '../../lib/lock';
import { nativeContentProtection } from '../../lib/nativeContentProtection';
import { getNextPrayer, formatTime, getPrayerTimes, PrayerSource, PrayerTimings, calculatePrayerCountdown } from '../../lib/prayerTimes';
import { formatDistance, Masjid, calculateDistance } from '../../lib/masjid';
import { getDefaultMasjidId } from '../../lib/masjidTimingSync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser, canManageMasjid, UserProfile } from '../../lib/auth';
import { formatLastUpdated, isTimingStale, getMasjidJazakCount, sendJazakAllahToUpdater, requestTimingUpdate } from '../../lib/community';
import UpdateMasjidTimingModal, { TimingFormData } from '../../components/UpdateMasjidTimingModal';
import { checkAndScheduleUpdaterReminders } from '../../lib/muazzinNotifications';
import { pushMasjidTimingToFirestore, saveLocalTimingOverride, getImamSession } from '../../lib/masjidTimingSync';
import { shareDeenContent } from '../../lib/shareHelper';
import { fetchSalahTimeMasjids } from '../../lib/salahTimeBackend';
import {
  getQuranTrackerState,
  markAyatReadToday,
  toggleQuranReminder,
  fetchAyat,
  QuranTrackerState,
  AyatData,
} from '../../lib/quranTracker';
import { getCurrentLocation, getQuickLocation, subscribeToLocationUpdates, forceRefreshLocation, Coordinates } from '../../lib/location';
import { requestNotificationPermissions, scheduleSalahNotifications } from '../../lib/salahNotifications';
import { loadSettings } from '../../lib/settings';
import { getAppLanguage, AppLanguage } from '../../lib/onboarding';
import { getFocusStats, FocusStats } from '../../lib/focus';
import PINModal from '../../components/PINModal';
import ProtectionActivationModal from '../../components/ProtectionActivationModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import {
  getDailyInspiration,
  rollNextInspiration,
  InspirationItem,
  AUTHENTIC_INSPIRATIONS,
} from '../../lib/dailyInspiration';

const PRAYER_ARABIC: Record<string, string> = {
  Fajr: "الفجر",
  Sunrise: "الشروق",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
};

export default function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { contentContainerStyle, tableMaxWidthStyle, isTablet } = useResponsiveLayout();
  // Streak state
  const [streakDays, setStreakDays] = useState(0);
  const [streakStartDate, setStreakStartDate] = useState<string | null>(null);

  // Protection state
  const [systemWideActive, setSystemWideActive] = useState(false);
  const [systemWideAvailable, setSystemWideAvailable] = useState(false);
  const [appLocked, setAppLocked] = useState(false);
  const [pinExists, setPinExists] = useState(false);
  const [activationModalVisible, setActivationModalVisible] = useState(false);

  // Focus state
  const [focusStats, setFocusStats] = useState<FocusStats>({
    totalSessions: 0,
    totalMinutes: 0,
    completedSessions: 0,
    currentStreak: 0,
  });

  // Prayer state
  const [nextPrayerInfo, setNextPrayerInfo] = useState<{ name: string; time: string } | null>(null);
  const [prayerSource, setPrayerSource] = useState<PrayerSource | null>(null);
  const [prayerCountdown, setPrayerCountdown] = useState<string>('');
  const [effectivePrayerTimes, setEffectivePrayerTimes] = useState<PrayerTimings | null>(null);

  // Quran Tracker state
  const [inspirationTab, setInspirationTab] = useState<'quran' | 'inspiration'>('quran');
  const [appLang, setAppLang] = useState<AppLanguage>('en');
  const [trackerState, setTrackerState] = useState<QuranTrackerState>({
    currentAyatNumber: 1,
    totalReadAyats: 0,
    readToday: false,
    lastReadDate: '',
    reminderEnabled: true,
  });
  const [todayAyat, setTodayAyat] = useState<AyatData | null>(null);
  const [markingAyatRead, setMarkingAyatRead] = useState(false);

  // Daily inspiration
  const [copiedInspiration, setCopiedInspiration] = useState(false);
  const [dailyInspiration, setDailyInspiration] = useState<InspirationItem>(AUTHENTIC_INSPIRATIONS[0]);

  useEffect(() => {
    getDailyInspiration().then(setDailyInspiration);
  }, []);

  const handleRollNextInspiration = async () => {
    const next = await rollNextInspiration();
    setDailyInspiration(next);
  };

  // PIN modal
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinMode, setPinMode] = useState<'set' | 'verify'>('verify');
  const [pinAction, setPinAction] = useState<'toggle_swp' | 'unlock' | 'lock' | 'set_before_swp' | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  // Refresh
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<any>(null);
  const [masjidSectionY, setMasjidSectionY] = useState(0);

  const scrollToMasjidBoard = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: Math.max(0, masjidSectionY - 10), animated: true });
    }
  };

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

    // Boot check: Silently synchronize system-wide protection status without modal pop-up ambush
    (async () => {
      try {
        if (nativeContentProtection.isAvailable()) {
          const status = await nativeContentProtection.getStatus();
          setSystemWideActive(status.active);
        }
      } catch (e) {
        console.warn('[Home] Boot protection status check error:', e);
      }
    })();

    const appStateSub = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        if (nativeContentProtection.isAvailable()) {
          const status = await nativeContentProtection.getStatus();
          setSystemWideActive(status.active);
        }
        // Refresh streak and clean days immediately upon returning to the app
        try {
          const streakData = await getStreak();
          setStreakDays(streakData.currentStreak);
        } catch {}
      }
    });

    return () => {
      appStateSub.remove();
    };
  }, []);

  const [homeMasjid, setHomeMasjid] = useState<Masjid | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [jazakCount, setJazakCount] = useState<number>(0);
  const [sendingJazak, setSendingJazak] = useState<boolean>(false);
  const [requestingUpdate, setRequestingUpdate] = useState<boolean>(false);
  const [isTimingModalVisible, setIsTimingModalVisible] = useState<boolean>(false);
  const [timingModalScope, setTimingModalScope] = useState<'all' | 'details' | 'timings'>('all');
  const [isSilentModeActive, setIsSilentModeActive] = useState<boolean>(false);
  const [isPinnedMasjid, setIsPinnedMasjid] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const allMasjidsRef = useRef<Masjid[]>([]);

  // Function to resolve closest masjid based on coordinates
  const updateClosestMasjidWithCoords = useCallback(async (coords: Coordinates, masjidsList?: Masjid[]) => {
    const list: Masjid[] = masjidsList || allMasjidsRef.current;
    if (!list || list.length === 0) return;
    try {
      const pinnedId = await getDefaultMasjidId();
      if (pinnedId) {
        const pinned = list.find((m: Masjid) => m.id === pinnedId);
        if (pinned) {
          setHomeMasjid(pinned);
          setIsPinnedMasjid(true);
          return;
        }
      }
      // Not pinned: auto-sort by distance to user GPS coords
      const sorted = [...list].map((m: Masjid) => ({
        ...m,
        distance: calculateDistance(coords.latitude, coords.longitude, m.latitude, m.longitude),
      })).sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
      if (sorted.length > 0) {
        setHomeMasjid(sorted[0]);
        setIsPinnedMasjid(false);
      }
    } catch (e) {
      console.warn('[Home] updateClosestMasjid error:', e);
    }
  }, []);

  // Real-time location subscription so closest masjid updates when user location changes
  useEffect(() => {
    return subscribeToLocationUpdates((coords) => {
      setUserCoords(coords);
      updateClosestMasjidWithCoords(coords);
    });
  }, [updateClosestMasjidWithCoords]);

  // Live countdown timer ticker using unified AM/PM & midnight rollover calculation
  useEffect(() => {
    if (!nextPrayerInfo?.time) return;
    setPrayerCountdown(calculatePrayerCountdown(nextPrayerInfo.time, nextPrayerInfo.name));
    const timer = setInterval(() => {
      setPrayerCountdown(calculatePrayerCountdown(nextPrayerInfo?.time, nextPrayerInfo?.name));
    }, 1000);
    return () => clearInterval(timer);
  }, [nextPrayerInfo?.time, nextPrayerInfo?.name]);

  const loadQuranTracker = async () => {
    try {
      const qState = await getQuranTrackerState();
      setTrackerState(qState);
      const ayat = await fetchAyat(qState.currentAyatNumber);
      setTodayAyat(ayat);
    } catch (err) {
      console.warn('Error loading Quran tracker:', err);
    }
  };

  const handleMarkAyatRead = async () => {
    if (markingAyatRead) return;
    setMarkingAyatRead(true);
    try {
      const updated = await markAyatReadToday();
      setTrackerState(updated);
      // Immediately load the next sequential verse
      const nextAyat = await fetchAyat(updated.currentAyatNumber);
      setTodayAyat(nextAyat);
      Alert.alert(
        "Alhamdulillah!",
        `Ayat read! Total Ayats completed: ${updated.totalReadAyats}. Verse [${nextAyat.surahNumber}:${nextAyat.numberInSurah}] loaded.`
      );
    } catch (err) {
      console.error('Error marking ayat read:', err);
    } finally {
      setMarkingAyatRead(false);
    }
  };

  const handleToggleReminder = async (val: boolean) => {
    try {
      const updated = await toggleQuranReminder(val);
      setTrackerState(updated);
    } catch (err) {
      console.warn('Error toggling reminder:', err);
    }
  };

  const handleShareAyat = async () => {
    if (!todayAyat) return;
    await shareDeenContent({
      title: `Ayat [${todayAyat.surahNumber}:${todayAyat.numberInSurah}] (${todayAyat.surahNameEnglish})`,
      arabic: todayAyat.arabicText,
      translation: todayAyat.englishTranslation,
      source: `Holy Quran — Surah ${todayAyat.surahNameEnglish}`,
    });
  };

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


  const handleToggleSilentMode = async (val: boolean) => {
    setIsSilentModeActive(val);
    await AsyncStorage.setItem('@deen_auto_silent_masjid', String(val)).catch(() => {});
    if (val) {
      if (nativeContentProtection.setRingerModeVibrate) {
        await nativeContentProtection.setRingerModeVibrate();
      }
      Alert.alert(
        'Masjid Vibrate Mode Enabled',
        'Ringtone has been muted and vibration activated for peaceful prayer.'
      );
    } else {
      if (nativeContentProtection.setRingerModeNormal) {
        await nativeContentProtection.setRingerModeNormal();
      }
    }
  };

  const handleSendJazakAllah = async () => {
    if (!homeMasjid) return;
    setSendingJazak(true);
    try {
      const res = await sendJazakAllahToUpdater(
        homeMasjid.id,
        homeMasjid.name,
        homeMasjid.updatedBy,
        homeMasjid.updatedByUid
      );
      if (res.success) {
        setJazakCount(res.newCount);
        Alert.alert('🤲 JazakAllahu Khairan!', res.message);
      } else {
        Alert.alert('Cooldown Active', res.message);
      }
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Could not send JazakAllah.');
    } finally {
      setSendingJazak(false);
    }
  };

  const handleRequestTimingUpdate = async () => {
    if (!homeMasjid) return;
    setRequestingUpdate(true);
    try {
      const res = await requestTimingUpdate(homeMasjid.id, homeMasjid.name);
      Alert.alert('Request Submitted', res.message);
    } catch {
      Alert.alert('Notice', 'Unable to submit update request. Please check internet connection.');
    } finally {
      setRequestingUpdate(false);
    }
  };

  const handleTimingModalSubmit = async (formData: TimingFormData) => {
    if (!homeMasjid) return;
    const session = await getImamSession();
    let pointsMsg = '';
    if (session) {
      const pushRes = await pushMasjidTimingToFirestore(homeMasjid, formData, session, timingModalScope);
      if (pushRes?.pointsResult?.awarded) {
        pointsMsg = `\n\n🌟 ${pushRes.pointsResult.reason} Total Points: ${pushRes.pointsResult.newTotalPoints}`;
      } else if (pushRes?.pointsResult?.reason) {
        pointsMsg = `\n\n🛡️ ${pushRes.pointsResult.reason}`;
      }
    } else {
      await saveLocalTimingOverride({
        masjidId: homeMasjid.id,
        name: homeMasjid.name,
        address: homeMasjid.address,
        athanTimes: formData.athanTimes,
        iqamahTimes: formData.iqamahTimes,
        jummah: formData.jummah,
        jummahAthan: formData.jummahAthan,
        sunrise: formData.sunrise,
        sahar: formData.sahar,
        iftar: formData.iftar,
        notes: formData.notes,
        announcements: formData.notes || '',
        updatedBy: currentUser?.name || 'Local User',
        updatedByUid: currentUser?.uid || '',
        muazzinPasscode: formData.muazzinPasscode,
        isMuazzinVerified: true,
        updatedAt: Date.now(),
        syncStatus: 'synced',
      });
    }
    setIsTimingModalVisible(false);
    Alert.alert('Timings Updated', `Official timings for ${homeMasjid.name} have been updated.${pointsMsg}`);
    loadAllData();
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

      const lang = await getAppLanguage();
      setAppLang(lang);

      // Load pinned or closest home masjid
      let activeM: Masjid | null = null;
      let pinned = false;
      try {
        const pinnedId = await getDefaultMasjidId();
        const masjids = await fetchSalahTimeMasjids();
        allMasjidsRef.current = masjids;
        if (pinnedId) {
          const found = masjids.find(m => m.id === pinnedId);
          if (found) {
            activeM = found;
            pinned = true;
          }
        }
        if (!activeM && masjids.length > 0) {
          const loc = userCoords || (await getQuickLocation());
          const userLat = loc?.latitude ?? 17.385044;
          const userLng = loc?.longitude ?? 78.486671;
          const sorted = [...masjids].map(m => ({
            ...m,
            distance: calculateDistance(userLat, userLng, m.latitude, m.longitude),
          })).sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
          activeM = sorted[0];
          pinned = false;
        }
        setHomeMasjid(activeM);
        setIsPinnedMasjid(pinned);
        if (activeM) {
          getMasjidJazakCount(activeM.id).then(c => setJazakCount(c)).catch(() => {});
        }
        getCurrentUser().then(u => {
          setCurrentUser(u);
          getImamSession().then(sess => {
            checkAndScheduleUpdaterReminders(u, sess, activeM).catch(() => {});
          }).catch(() => {});
        }).catch(() => {});
        AsyncStorage.getItem('@deen_auto_silent_masjid').then(val => {
          if (val !== null) setIsSilentModeActive(val === 'true');
        }).catch(() => {});

        // Fetch fresh high-accuracy GPS in background and update closest masjid & prayer times
        getCurrentLocation().then(async (freshLoc) => {
          if (freshLoc) {
            setUserCoords(freshLoc);
            await updateClosestMasjidWithCoords(freshLoc, masjids);
          }
        }).catch(() => {});
      } catch (masjidErr) {
        console.warn('Error loading home masjid for dashboard:', masjidErr);
      }

      // Load prayer times synchronized with active masjid
      await loadNextPrayer(activeM);

      // Load Quran sequential tracker
      await loadQuranTracker();
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  const loadNextPrayer = async (masjidOverride?: Masjid | null) => {
    try {
      const activeMasjid = masjidOverride !== undefined ? masjidOverride : homeMasjid;
      const settings = await loadSettings();
      const location = await getQuickLocation();
      const lat = location?.latitude ?? 17.385044;
      const lng = location?.longitude ?? 78.486671;
      const { timings, source } = await getPrayerTimes(lat, lng, String(settings.calculationMethodValue));
      setPrayerSource(source);

      // Robust Sanitization: Never leak '--:--' or unupdated timings
      const isVal = (v?: string | null) => {
        if (!v) return false;
        const s = v.trim();
        return s !== '' && s !== '--:--' && s.toLowerCase() !== 'sunset' && s !== 'null' && s !== 'undefined';
      };

      const pickTime = (jamaat?: string, athan?: string, solar?: string, failsafe: string = '12:00') => {
        if (isVal(jamaat)) return jamaat!.trim();
        if (isVal(athan)) return athan!.trim();
        if (isVal(solar)) return solar!.trim();
        return failsafe;
      };

      let effectiveTimings = timings;
      if (activeMasjid && (activeMasjid.iqamahTimes || activeMasjid.athanTimes)) {
        const iq = activeMasjid.iqamahTimes;
        const at = activeMasjid.athanTimes;
        const maghribTime = isVal(iq?.Maghrib)
          ? iq!.Maghrib!.trim()
          : (isVal(timings.Maghrib) ? timings.Maghrib : '17:55');

        effectiveTimings = {
          Fajr: pickTime(iq?.Fajr, at?.Fajr, timings.Fajr, '05:15'),
          Sunrise: timings.Sunrise || '06:15',
          Dhuhr: pickTime(iq?.Dhuhr, at?.Dhuhr, timings.Dhuhr, '12:30'),
          Asr: pickTime(iq?.Asr, at?.Asr, timings.Asr, '16:15'),
          Maghrib: maghribTime,
          Isha: pickTime(iq?.Isha, at?.Isha, timings.Isha, '19:45'),
        };
      }

      setEffectivePrayerTimes(effectiveTimings);
      const next = getNextPrayer(effectiveTimings);
      setNextPrayerInfo(next);

      // Schedule salah notifications based on synchronized timings
      const hasPermission = await requestNotificationPermissions();
      if (hasPermission) {
        await scheduleSalahNotifications(effectiveTimings);
      }

      // Revalidate with fresh GPS in background if available
      getCurrentLocation().then(async (freshLoc) => {
        if (freshLoc && (Math.abs(freshLoc.latitude - lat) > 0.05 || Math.abs(freshLoc.longitude - lng) > 0.05)) {
          const freshData = await getPrayerTimes(freshLoc.latitude, freshLoc.longitude, String(settings.calculationMethodValue));
          let freshEffective = freshData.timings;
          if (activeMasjid && (activeMasjid.iqamahTimes || activeMasjid.athanTimes)) {
            const iq = activeMasjid.iqamahTimes;
            const at = activeMasjid.athanTimes;
            freshEffective = {
              Fajr: iq?.Fajr || at?.Fajr || freshData.timings.Fajr,
              Sunrise: freshData.timings.Sunrise || '06:15',
              Dhuhr: iq?.Dhuhr || at?.Dhuhr || freshData.timings.Dhuhr,
              Asr: iq?.Asr || at?.Asr || freshData.timings.Asr,
              Maghrib: (iq?.Maghrib && iq.Maghrib !== '--:--' && iq.Maghrib.toLowerCase() !== 'sunset') ? iq.Maghrib : freshData.timings.Maghrib,
              Isha: iq?.Isha || at?.Isha || freshData.timings.Isha,
            };
          }
          setPrayerSource(freshData.source);
          const updatedNext = getNextPrayer(freshEffective);
          setNextPrayerInfo(updatedNext);
          if (hasPermission) {
            await scheduleSalahNotifications(freshEffective);
          }
        }
      }).catch(() => {});
    } catch {
      // Silently fail — prayer card will show fallback or hide
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await forceRefreshLocation();
    await loadAllData();
    setRefreshing(false);
  }, []);

  // --- PIN & Protection Flow ---
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
        await recordVPNDisabled();
        const streakData = await getStreak();
        setStreakDays(streakData.currentStreak);
      }
    } else {
      const exists = await hasPIN();
      setPinExists(exists);
      setActivationModalVisible(true);
    }
  };

  const handleStatusBadgePress = async () => {
    if (!systemWideActive) {
      const exists = await hasPIN();
      setPinExists(exists);
      setActivationModalVisible(true);
    } else {
      handleSetLock();
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
    if (pinAction === 'set_before_swp' && pinMode === 'set') {
      const success = await setPIN(pin);
      if (success) {
        const { setLockEnabled } = require('../../lib/lock');
        await setLockEnabled(true);
        setAppLocked(true);
        setPinExists(true);
        setPinModalVisible(false);
        // Start protection now that mandatory PIN is set!
        const started = await nativeContentProtection.start();
        setSystemWideActive(started);
      } else {
        setPinError('Failed to set PIN. Please try again.');
      }
    } else if (pinAction === 'lock' && pinMode === 'set') {
      const success = await setPIN(pin);
      if (success) {
        setPinModalVisible(false);
        setAppLocked(true);
        setPinExists(true);
        Alert.alert(
          'Protection Locked',
          'Your protection settings are now locked. Only someone with the PIN can disable them.',
          [{ text: 'Great' }]
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
          Alert.alert('Settings Unlocked', 'Protection settings are now unlocked.');
        }
      } else {
        setPinError('Wrong PIN. Try again.');
      }
    }
  };

  const handleCopyInspiration = async () => {
    await shareDeenContent({
      title: `Daily ${dailyInspiration.type}`,
      arabic: dailyInspiration.arabic,
      translation: dailyInspiration.translation,
      source: dailyInspiration.source,
    });
    setCopiedInspiration(true);
    setTimeout(() => setCopiedInspiration(false), 2000);
  };

  const getStreakMessage = () => {
    if (streakDays === 0) return 'Start your pure journey today';
    if (streakDays < 3) return 'Every day counts, keep going!';
    if (streakDays < 7) return 'MashaAllah, building momentum!';
    if (streakDays < 14) return 'SubhanAllah, one week strong!';
    if (streakDays < 30) return 'AlhamduLillah, amazing discipline!';
    if (streakDays < 90) return 'You are a warrior of faith!';
    return 'Legendary. May Allah reward your steadfastness!';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accentGold}
            colors={[colors.accentGold]}
          />
        }
      >
        {/* ─── HEADER WITH SETTINGS & SHIELD PILL ─── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerTitleRow}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>DeenHub</Text>
              <TouchableOpacity
                style={[
                  styles.statusBadge,
                  systemWideActive ? styles.statusBadgeActive : styles.statusBadgeInactive,
                ]}
                onPress={handleStatusBadgePress}
                activeOpacity={0.7}
                accessibilityLabel={systemWideActive ? "Device Protected. Tap to manage PIN lock" : "Offline. Tap to enable protection"}
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
                  {systemWideActive ? t('common.protected', 'PROTECTED') : t('common.offline', 'OFFLINE')}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{t('home.subtitle', 'Masjid & SalahTime Companion')}</Text>
          </View>

          {/* Community Activity & Notifications Bell */}
          <TouchableOpacity
            style={[styles.settingsIconButton, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
            onPress={() => router.push('/hub/community-feedback' as any)}
            activeOpacity={0.7}
            accessibilityLabel="Community Activity & Notifications"
          >
            <Feather name="bell" size={20} color={colors.accentGold} />
          </TouchableOpacity>
        </View>

        {/* ─── 0. COMPACT SYMMETRICAL HIJRI DATE + SAHAR & IFTAR STRIP ─── */}
        <View style={[styles.hijriSaharStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.hijriDateCol}>
            <Feather name="moon" size={13} color={colors.accentGold} style={{ marginRight: 6 }} />
            <Text style={[styles.hijriDateText, { color: colors.text }]}>
              {(() => {
                try {
                  return new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
                } catch {
                  return '1448 Hijri';
                }
              })()}
            </Text>
          </View>
          <View style={styles.saharIftarCol}>
            <View style={styles.fastingTimeItem}>
              <Text style={[styles.fastingLabel, { color: colors.textMuted }]}>Sahar</Text>
              <Text style={[styles.fastingValue, { color: colors.accentGold }]}>
                {formatTime(homeMasjid?.suhoor || effectivePrayerTimes?.Fajr || '05:12 AM', 'Fajr')}
              </Text>
            </View>
            <View style={[styles.fastingDivider, { backgroundColor: colors.borderSubtle }]} />
            <View style={styles.fastingTimeItem}>
              <Text style={[styles.fastingLabel, { color: colors.textMuted }]}>Iftar</Text>
              <Text style={[styles.fastingValue, { color: colors.accentGold }]}>
                {formatTime(homeMasjid?.iftar || effectivePrayerTimes?.Maghrib || '06:04 PM', 'Maghrib')}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── 1. SELECTED HOME MASJID CARD (PRIMARY FOCUS AT TOP) ─── */}
        <Animated.View style={[styles.homeMasjidSection, { opacity: cardFade }]} onLayout={(e) => setMasjidSectionY(e.nativeEvent.layout.y)}>
          <View style={[styles.homeMasjidCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Top Row: Default Masjid Badge & Distance */}
            <View style={styles.homeMasjidTopRow}>
              <View style={[styles.homeMasjidBadge, { backgroundColor: colors.pill, borderColor: isPinnedMasjid ? 'rgba(16, 185, 129, 0.4)' : colors.border }]}>
                <Feather
                  name={isPinnedMasjid ? 'bookmark' : 'navigation'}
                  size={11}
                  color={isPinnedMasjid ? colors.accentGreen : colors.accentGold}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.homeMasjidBadgeText, { color: isPinnedMasjid ? colors.accentGreen : colors.accentGold }]}>
                  {isPinnedMasjid ? t('home.defaultMasjid', 'Default Masjid') : t('home.closestMasjid', 'Closest Masjid (Auto-GPS)')}
                </Text>
              </View>

              {homeMasjid?.distance !== undefined && (
                <View style={[styles.homeMasjidDistanceBadge, { backgroundColor: colors.pill, borderColor: colors.border }]}>
                  <Feather name="map-pin" size={10} color={colors.accentGold} style={{ marginRight: 3 }} />
                  <Text style={[styles.homeMasjidDistanceText, { color: colors.accentGold }]}>{formatDistance(homeMasjid.distance)}</Text>
                </View>
              )}
            </View>

            {/* Masjid Name Row */}
            <View style={styles.homeMasjidNameRow}>
              <Text style={[styles.homeMasjidName, { color: colors.text }]} numberOfLines={1}>
                {homeMasjid ? homeMasjid.name : 'Historic Makkah Masjid'}
              </Text>
            </View>

            {/* Address */}
            <Text style={[styles.homeMasjidAddress, { color: colors.textSecondary }]} numberOfLines={2}>
              {homeMasjid ? [homeMasjid.address, homeMasjid.famousArea].filter(Boolean).join(', ') : 'Near Charminar, Old City, Hyderabad'}
            </Text>

            {/* Centered Change Default Masjid Button */}
            <TouchableOpacity
              style={[styles.changeDefaultMasjidBtnCenter, { backgroundColor: colors.pill, borderColor: colors.border }]}
              onPress={() => router.push('/(tabs)/masjid')}
              activeOpacity={0.8}
            >
              <Feather name="bookmark" size={12} color={colors.accentGold} style={{ marginRight: 6 }} />
              <Text style={[styles.changeDefaultMasjidBtnCenterText, { color: colors.accentGold }]}>
                {t('home.changeDefaultMasjid', 'Change Default Masjid')}
              </Text>
            </TouchableOpacity>

            {/* Mahmood Watch Co. Style Digital LED Board */}
            <MasjidLedBoard
              masjid={homeMasjid}
              effectivePrayerTimes={effectivePrayerTimes}
              nextPrayerName={nextPrayerInfo?.name}
              nextPrayerCountdown={prayerCountdown}
              isFallback={Boolean(!homeMasjid || !homeMasjid.iqamahTimes?.Fajr || homeMasjid.iqamahTimes.Fajr === '--:--' || homeMasjid.id?.startsWith('fallback-'))}
              compact={false}
              containerStyle={{ marginTop: 8, marginBottom: 8 }}
            />

            {/* Status Badges: Ladies Section & President (Pushed below LED board) */}
            <View style={styles.masjidStatusBadgesRow}>
              {homeMasjid?.ladiesSection ? (
                <View style={[styles.statusBadgeAvailable, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.35)' }]}>
                  <Feather name="check-circle" size={11} color="#10b981" style={{ marginRight: 4 }} />
                  <Text style={[styles.ladiesStatusBadgeText, { color: '#10b981' }]}>Ladies Section: Available</Text>
                </View>
              ) : (
                <View style={[styles.statusBadgeUnavailable, { backgroundColor: colors.pill, borderColor: colors.borderSubtle }]}>
                  <Feather name="x-circle" size={11} color={colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.ladiesStatusBadgeText, { color: colors.textMuted }]}>Ladies Section: Not Available</Text>
                </View>
              )}

              {homeMasjid?.presidentName ? (
                <View style={[styles.metaMiniBadge, { backgroundColor: colors.pill, borderColor: colors.border }]}>
                  <Feather name="user" size={10} color={colors.accentGold} style={{ marginRight: 3 }} />
                  <Text style={[styles.metaMiniBadgeText, { color: colors.textSecondary }]}>{t('home.president', 'President')}: {toTitleCase(homeMasjid.presidentName)}</Text>
                </View>
              ) : null}
            </View>

            {/* Updated By & JazakAllah Card Row (Pushed below LED board) */}
            <View style={[styles.updaterCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <View style={styles.updaterInfoCol}>
                <View style={styles.updaterHeaderLine}>
                  <Feather name="user-check" size={12} color={colors.accentGold} style={{ marginRight: 5 }} />
                  <Text style={[styles.updaterNameText, { color: colors.text }]}>
                    Updated by: <Text style={{ color: colors.accentGold, fontWeight: '700' }}>{homeMasjid?.updatedBy || 'Masjid Committee'}</Text>
                  </Text>
                  <Text style={[styles.updaterTimeText, { color: colors.textMuted }]}>
                    • {formatLastUpdated(homeMasjid?.updatedAt)}
                  </Text>
                </View>

                <View style={styles.updaterActionsRow}>
                  <View style={[styles.jazakBadge, { backgroundColor: colors.pill, borderColor: colors.border }]}>
                    <Text style={{ fontSize: 11, marginRight: 4 }}>🤲</Text>
                    <Text style={[styles.jazakBadgeText, { color: colors.accentGold }]}>{jazakCount} JazakAllah</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.sendJazakBtn, { backgroundColor: colors.accentGoldBg }]}
                    onPress={handleSendJazakAllah}
                    disabled={sendingJazak}
                    activeOpacity={0.8}
                  >
                    {sendingJazak ? (
                      <ActivityIndicator size="small" color="#0f1718" />
                    ) : (
                      <>
                        <Text style={{ fontSize: 12, marginRight: 4 }}>🤲</Text>
                        <Text style={styles.sendJazakBtnText}>Send JazakAllahu Khairan</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Stale Timing Alert Banner OR Timings Up-to-Date + Want to Contact Banner */}
            {isTimingStale(homeMasjid?.updatedAt) ? (
              <View style={[styles.staleAlertBanner, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                <View style={styles.staleAlertLeft}>
                  <Feather name="alert-triangle" size={13} color="#ef4444" style={{ marginRight: 6 }} />
                  <Text style={styles.staleAlertText}>
                    Timings not updated recently (10d+ old)
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.requestUpdateBtn}
                  onPress={handleRequestTimingUpdate}
                  disabled={requestingUpdate}
                  activeOpacity={0.8}
                >
                  {requestingUpdate ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.requestUpdateBtnText}>Request Update</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.upToDateBanner, { backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.25)' }]}>
                <View style={styles.upToDateLeft}>
                  <Feather name="check-circle" size={13} color="#10b981" style={{ marginRight: 6 }} />
                  <Text style={[styles.upToDateText, { color: '#10b981' }]}>✓ Timings Up to Date</Text>
                </View>
                <TouchableOpacity
                  style={[styles.contactPillBtn, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
                  onPress={() => router.push({ pathname: '/hub/community-feedback', params: { tab: '2' } } as any)}
                  activeOpacity={0.8}
                >
                  <Feather name="message-square" size={11} color={colors.accentGold} style={{ marginRight: 4 }} />
                  <Text style={[styles.contactPillBtnText, { color: colors.accentGold }]}>Want to Contact</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Announcements & About Masjid Box */}
            {(homeMasjid?.announcements || homeMasjid?.about || homeMasjid?.notes) ? (
              <View style={[styles.announcementsBox, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <View style={styles.announcementsHeader}>
                  <Feather name="volume-2" size={12} color={colors.accentGold} style={{ marginRight: 5 }} />
                  <Text style={[styles.announcementsTitle, { color: colors.accentGold }]}>Announcements & Information</Text>
                </View>
                <Text style={[styles.announcementsContent, { color: colors.textSecondary }]}>
                  {homeMasjid.announcements || homeMasjid.about || homeMasjid.notes}
                </Text>
              </View>
            ) : null}

            {/* Default Masjid 'Silent UI' Auto-Vibrate Live Toggle Bar (Only when isPinnedMasjid is true) */}
            {isPinnedMasjid ? (
            <View style={[styles.silentToggleBar, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <View style={styles.silentToggleLeft}>
                <View style={[styles.silentToggleIconCircle, { backgroundColor: isSilentModeActive ? 'rgba(16, 185, 129, 0.15)' : colors.pill }]}>
                  <Feather
                    name={isSilentModeActive ? 'volume-x' : 'bell'}
                    size={14}
                    color={isSilentModeActive ? '#10b981' : colors.accentGold}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.silentToggleTitle, { color: colors.text }]}>Silent / Vibrate in Masjid</Text>
                  <Text style={[styles.silentToggleSub, { color: colors.textMuted }]}>Auto-silence device during Jama'at</Text>
                </View>
              </View>
              <Switch
                value={isSilentModeActive}
                onValueChange={handleToggleSilentMode}
                trackColor={{ false: isDark ? '#334155' : '#e2e8f0', true: isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.3)' }}
                thumbColor={isSilentModeActive ? '#10b981' : (isDark ? '#94a3b8' : '#9ca3af')}
                style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
              />
            </View>
            ) : null}

            {/* Quick Action Buttons: Role-Based Edit Masjid Timings, Edit Masjid Details & Directions */}
            <View style={styles.masjidActionButtonsRow}>
              {canManageMasjid(currentUser, homeMasjid?.id) && (
                <>
                  <TouchableOpacity
                    style={[styles.editTimingsBtn, { backgroundColor: colors.accentGoldBg }]}
                    onPress={() => {
                      setTimingModalScope('timings');
                      setIsTimingModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Feather name="clock" size={13} color="#0f1718" style={{ marginRight: 5 }} />
                    <Text style={styles.editTimingsBtnText}>Edit Timings</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.editDetailsBtn, { backgroundColor: colors.pill, borderColor: colors.border }]}
                    onPress={() => {
                      setTimingModalScope('details');
                      setIsTimingModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Feather name="edit-2" size={13} color={colors.accentGold} style={{ marginRight: 5 }} />
                    <Text style={[styles.editDetailsBtnText, { color: colors.accentGold }]}>Edit Masjid</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={[styles.directionsBtn, { backgroundColor: colors.pill, borderColor: colors.border }]}
                onPress={() => {
                  if (!homeMasjid) return;
                  const url = Platform.select({
                    ios: `maps:0,0?q=${homeMasjid.latitude},${homeMasjid.longitude}(${encodeURIComponent(homeMasjid.name)})`,
                    android: `geo:0,0?q=${homeMasjid.latitude},${homeMasjid.longitude}?q=${encodeURIComponent(homeMasjid.name)}`,
                  }) || `https://www.google.com/maps/search/?api=1&query=${homeMasjid.latitude},${homeMasjid.longitude}`;
                  Linking.openURL(url).catch(() => {
                    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(homeMasjid.name + ' ' + homeMasjid.address)}`);
                  });
                }}
                activeOpacity={0.8}
              >
                <Feather name="navigation" size={13} color={colors.accentGold} style={{ marginRight: 6 }} />
                <Text style={[styles.directionsBtnText, { color: colors.accentGold }]}>{t('home.directions', 'Directions')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* ─── DEEN HUB BENTO GRID ─── */}
        <Animated.View style={[styles.hubSection, { opacity: cardFade }]}>
          <View style={styles.hubHeaderRow}>
            <View>
              <Text style={[styles.hubSectionTitle, { color: colors.text }]}>Content Blocker</Text>
              <Text style={[styles.hubSectionSubtitle, { color: colors.textMuted }]}>
                Real-time Protection & Clean Living
              </Text>
            </View>
            <View style={[styles.hubBadge, { backgroundColor: colors.pill, borderColor: colors.border }]}>
              <Text style={[styles.hubBadgeText, { color: colors.accentGold }]}>Protection Panel</Text>
            </View>
          </View>

          {/* ─── 3-TILE BENTO BUTTON: CLEAN STREAK & DIGITAL PURITY ─── */}
          <View style={[styles.bentoPurityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Tile 1: Clean Days Streak (Clickable to Clean Stats) */}
            <TouchableOpacity
              style={[styles.bentoTile, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
              onPress={() => router.push('/hub/clean-stats' as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.bentoTileIconCircle, { backgroundColor: 'rgba(0, 255, 102, 0.12)' }]}>
                <Feather name="shield" size={16} color={colors.accentGreen} />
              </View>
              <Text style={[styles.bentoTileValue, { color: colors.text }]}>{streakDays}</Text>
              <Text style={[styles.bentoTileLabel, { color: colors.accentSoft }]}>{streakDays === 1 ? t('home.dayClean', 'Day Clean') : t('home.daysClean', 'Days Clean')}</Text>
              <Text style={[styles.bentoTileSub, { color: colors.accentGold }]}>View Stats →</Text>
            </TouchableOpacity>

            {/* Tile 2: Protection Status */}
            <TouchableOpacity
              style={[styles.bentoTile, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
              onPress={handleStatusBadgePress}
              activeOpacity={0.7}
            >
              <View style={[styles.bentoTileIconCircle, { backgroundColor: systemWideActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                <Feather name={systemWideActive ? "check-circle" : "slash"} size={16} color={systemWideActive ? "#10b981" : "#ef4444"} />
              </View>
              <Text style={[styles.bentoTileValue, { fontSize: 13, color: systemWideActive ? "#10b981" : "#ef4444" }]}>
                {systemWideActive ? t('common.active', 'ACTIVE') : t('common.offline', 'OFFLINE')}
              </Text>
              <Text style={[styles.bentoTileLabel, { color: colors.accentSoft }]}>{t('home.deviceShield', 'Device Shield')}</Text>
              <Text style={[styles.bentoTileSub, { color: colors.textMuted }]}>{systemWideActive ? t('home.tapToChange', 'Tap to change') : t('home.tapToShield', 'Tap to shield')}</Text>
            </TouchableOpacity>

            {/* Tile 3: Uninstall PIN Lock */}
            <TouchableOpacity
              style={[styles.bentoTile, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
              onPress={handleSetLock}
              activeOpacity={0.7}
            >
              <View style={[styles.bentoTileIconCircle, { backgroundColor: 'rgba(226, 162, 59, 0.15)' }]}>
                <Feather name={appLocked ? "lock" : "unlock"} size={16} color={colors.accentGold} />
              </View>
              <Text style={[styles.bentoTileValue, { fontSize: 13, color: appLocked ? colors.accentGold : colors.text }]}>
                {appLocked ? t('home.locked', 'LOCKED') : (pinExists ? t('home.pinSet', 'PIN SET') : t('home.setPin', 'SET PIN'))}
              </Text>
              <Text style={[styles.bentoTileLabel, { color: colors.accentSoft }]}>{t('home.safetyPin', 'Safety PIN')}</Text>
              <Text style={[styles.bentoTileSub, { color: colors.textMuted }]}>{t('home.uninstallLock', 'Uninstall Lock')}</Text>
            </TouchableOpacity>
          </View>

          {/* Explore All Deen Hub Tools & Qibla Pill */}
          <TouchableOpacity
            style={[
              styles.exploreHubPillBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => router.push('/(tabs)/more')}
            activeOpacity={0.8}
          >
            <View style={styles.exploreHubLeftRow}>
              <View style={[styles.exploreHubIconCircle, { backgroundColor: colors.accentGoldBg }]}>
                <Feather name="grid" size={16} color="#0f1718" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exploreHubTitle, { color: colors.text }]}>{t('home.exploreHubTitle', 'Explore All Deen Hub Tools & Qibla')}</Text>
                <Text style={[styles.exploreHubSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                  {t('home.exploreHubSub', 'Qibla Compass, Azkar, 99 Names, Quran Explorer & Settings')}
                </Text>
              </View>
            </View>
            <View style={[styles.exploreHubArrowCircle, { backgroundColor: colors.pill }]}>
              <Feather name="arrow-right" size={14} color={colors.accentGold} />
            </View>
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
            ? 'PIN Required'
            : pinAction === 'unlock'
            ? 'Enter PIN to Unlock'
            : pinAction === 'set_before_swp'
            ? 'Set 4-Digit Security PIN'
            : 'Set Protection PIN'
        }
        subtitle={
          pinAction === 'toggle_swp'
            ? 'Enter PIN to disable System-Wide Protection'
            : pinAction === 'unlock'
            ? 'Enter your PIN to unlock settings'
            : pinAction === 'set_before_swp'
            ? 'You must set a 4-digit PIN before enabling protection'
            : 'Give this PIN to a trusted accountability partner'
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

      {/* Update Masjid Timing Modal for authorized updaters */}
      <UpdateMasjidTimingModal
        visible={isTimingModalVisible}
        masjid={homeMasjid}
        mode="update"
        editScope={timingModalScope}
        currentLocation={userCoords}
        onClose={() => setIsTimingModalVisible(false)}
        onSubmit={handleTimingModalSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  changeDefaultMasjidBtnCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 6,
    alignSelf: 'center',
    width: '94%',
  },
  changeDefaultMasjidBtnCenterText: {
    fontSize: 12.5,
    fontWeight: '700',
  },

  hijriSaharStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  hijriDateCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.1,
  },
  hijriDateText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  saharIftarCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fastingTimeItem: {
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  fastingLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    marginBottom: 1,
    textTransform: 'uppercase',
  },
  fastingValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  fastingDivider: {
    width: 1,
    height: 18,
    marginHorizontal: 4,
  },
  upToDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  upToDateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upToDateText: {
    fontSize: 12,
    fontWeight: '700',
  },
  contactPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  contactPillBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  editDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
  },
  editDetailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  masjidStatusBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  statusBadgeAvailable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeUnavailable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  ladiesStatusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  updaterCard: {
    marginTop: 10,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  updaterInfoCol: {
    gap: 8,
  },
  updaterHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  updaterNameText: {
    fontSize: 12,
  },
  updaterTimeText: {
    fontSize: 11,
  },
  updaterActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  jazakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
  },
  jazakBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sendJazakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
  },
  sendJazakBtnText: {
    color: '#0f1718',
    fontSize: 11,
    fontWeight: '700',
  },
  staleAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 6,
  },
  staleAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  staleAlertText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  requestUpdateBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  requestUpdateBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  announcementsBox: {
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  announcementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  announcementsTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  announcementsContent: {
    fontSize: 12,
    lineHeight: 18,
  },
  silentToggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  silentToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 8,
  },
  silentToggleIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  silentToggleTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  silentToggleSub: {
    fontSize: 11,
    marginTop: 1,
  },
  editTimingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  editTimingsBtnText: {
    color: '#0f1718',
    fontSize: 12,
    fontWeight: '700',
  },

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
    justifyContent: 'center',
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
    textAlign: 'center',
    includeFontPadding: false,
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
  // ─── HOME MASJID HERO (TOP OF DASHBOARD) ───
  homeMasjidSection: {
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 12,
  },
  homeMasjidCard: {
    backgroundColor: '#0c2729',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.25)',
  },
  homeMasjidTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  homeMasjidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
  },
  homeMasjidBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
    textTransform: 'uppercase',
    textAlign: 'center',
    includeFontPadding: false,
  },
  changeMasjidPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
  },
  changeMasjidPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e2a23b',
    marginRight: 2,
  },
  homeMasjidNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  homeMasjidName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffdda8',
    flex: 1,
    marginRight: 8,
  },
  homeMasjidDistanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    justifyContent: 'center',
  },
  homeMasjidDistanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e2a23b',
    textAlign: 'center',
    includeFontPadding: false,
  },
  homeMasjidAddress: {
    fontSize: 12,
    color: '#94a4a2',
    marginBottom: 10,
  },
  jamaatBadgeRow: {
    backgroundColor: 'rgba(7, 31, 33, 0.6)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.15)',
    marginTop: 4,
  },
  jamaatGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jamaatChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  jamaatChipName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e2a23b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  jamaatChipTime: {
    fontSize: 11,
    color: '#f1f5f9',
    fontWeight: '700',
  },

  // ─── UPCOMING SALAH HERO CARD ───
  nextPrayerHeroCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    backgroundColor: '#0a3538',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e2a23b',
  },
  nextPrayerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  nextPrayerLabelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    justifyContent: 'center',
  },
  nextPrayerLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#e2a23b',
    letterSpacing: 0.8,
    textAlign: 'center',
    includeFontPadding: false,
  },
  nextPrayerCountdownBadge: {
    backgroundColor: '#00ff66',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextPrayerCountdownText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#071617',
    textAlign: 'center',
    includeFontPadding: false,
  },
  nextPrayerMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextPrayerNameText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  nextPrayerArabicText: {
    fontSize: 15,
    color: '#e2a23b',
    fontWeight: '600',
    marginTop: 2,
  },
  nextPrayerTimeBox: {
    alignItems: 'flex-end',
  },
  nextPrayerTimeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#e2a23b',
  },
  viewSchedulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  syncAthanJamaatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 31, 33, 0.7)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.2)',
  },
  syncAthanJamaatText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffdda8',
  },
  viewScheduleText: {
    fontSize: 11,
    color: '#ffdda8',
    fontWeight: '600',
    marginRight: 2,
  },

  // ─── 3-TILE BENTO: CLEAN STREAK & DIGITAL PURITY ───
  bentoPurityCard: {
    flexDirection: 'row',
    backgroundColor: '#072022',
    borderRadius: 14,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.2)',
    gap: 8,
  },
  bentoTile: {
    flex: 1,
    backgroundColor: '#0a2e30',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  bentoTileIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  bentoTileValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 2,
  },
  bentoTileLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffdda8',
    marginBottom: 1,
  },
  bentoTileSub: {
    fontSize: 9,
    color: '#7a8a88',
    fontWeight: '500',
  },
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
    justifyContent: 'center',
  },
  copyButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffdda8',
    textAlign: 'center',
    includeFontPadding: false,
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
  masjidNextAzanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 3,
    gap: 6,
  },
  masjidNextAzanName: {
    fontSize: 11,
    color: '#ffdda8',
    fontWeight: '600',
    flexShrink: 1,
  },
  jamaatBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  jamaatBadgePillLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  jamaatBadgePillTime: {
    fontSize: 10,
    color: '#fbbf24',
    fontWeight: '700',
  },
  segmentedTabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  segmentedTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  segmentedTabBtnActive: {
    backgroundColor: '#e2a23b',
  },
  segmentedTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  segmentedTabTextActive: {
    color: '#0f172a',
  },
  quranHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  surahBadge: {
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.35)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahBadgeText: {
    color: '#ffdda8',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  totalReadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    justifyContent: 'center',
  },
  totalReadPillText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  quranControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.4)',
  },
  readCheckboxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2a23b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    justifyContent: 'center',
  },
  readCheckboxBtnLoading: {
    opacity: 0.7,
  },
  readCheckboxBtnDone: {
    backgroundColor: '#e2a23b',
  },
  readCheckboxText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    includeFontPadding: false,
  },
  readCheckboxTextDone: {
    color: '#0f172a',
  },
  quranShareBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: '#334155',
  },
  reminderToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderToggleLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginRight: 2,
  },
  // ─── Deen Hub Bento Grid ───
  hubSection: {
    paddingHorizontal: 20,
    marginTop: 18,
  },
  hubHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hubSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffdda8',
  },
  hubSectionSubtitle: {
    fontSize: 11,
    color: '#94a4a2',
    marginTop: 1,
  },
  hubBadge: {
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e2a23b',
    textAlign: 'center',
    includeFontPadding: false,
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  hubCard: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: '#0b2527',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.18)',
    alignItems: 'center',
  },
  hubIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  hubCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f3f7f6',
    textAlign: 'center',
    marginBottom: 2,
  },
  hubCardDesc: {
    fontSize: 9,
    color: '#94a4a2',
    textAlign: 'center',
    lineHeight: 12,
  },
  homeSchoolBadge: {
    backgroundColor: 'rgba(226, 162, 59, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.25)',
  },
  homeSchoolBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffdda8',
  },
  metaMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
  },
  metaMiniBadgeText: {
    fontSize: 10,
    color: '#cbd5e1',
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
  },
  detailedTimingsCard: {
    backgroundColor: '#0c3033',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  timingHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 6,
    marginBottom: 4,
  },
  timingColHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  timingGridRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  timingPrayerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f3f7f6',
  },
  timingAthanTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00ff66',
  },
  timingJamaatTime: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffdda8',
  },
  masjidActionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  changeDefaultMasjidBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.12)',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
  },
  changeDefaultMasjidBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e2a23b',
  },
  directionsBtn: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2a23b',
    paddingVertical: 9,
    borderRadius: 8,
  },
  directionsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f1718',
  },
  exploreHubPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
  },
  exploreHubLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  exploreHubIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreHubTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  exploreHubSubtitle: {
    fontSize: 11,
  },
  exploreHubArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});