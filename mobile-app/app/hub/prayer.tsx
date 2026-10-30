import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getCurrentLocation, getQuickLocation, subscribeToLocationUpdates, Coordinates } from "../../lib/location";
import {
  fetchPrayerTimes,
  getLocalPrayerTimes,
  formatTime,
  getNextPrayer,
  PrayerTimings,
  calculatePrayerCountdown,
  getCachedPrayerTimesSync,
  setMemoryPrayerCache,
  getPrayerEndTime,
} from "../../lib/prayerTimes";
import { loadSettings, saveSettings } from "../../lib/settings";
import { fetchSalahTimeJuma, SalahTimeJuma, getNearestUpdatedJumaKhutbah } from "../../lib/salahTimeBackend";
import { getPinnedMasjidId } from "../../lib/masjidTimingSync";
import { fetchSalahTimeMasjids } from "../../lib/salahTimeBackend";
import { Masjid } from "../../lib/masjid";
import QiblaCompassModal from "../../components/QiblaCompassModal";
import { useTheme } from "../../lib/theme";
import { useLanguage } from "../../lib/i18n";
import { useResponsiveLayout } from "../../lib/responsive";

interface PrayerRowConfig {
  key: string;
  name: string;
  arabic: string;
  icon: keyof typeof Feather.glyphMap;
  subtitle: string;
  timeKey: keyof PrayerTimings;
}

// 8 Distinct Astronomical Prayers with Merged Maghrib (Sunset)
const PRAYER_ROWS: PrayerRowConfig[] = [
  { key: 'Fajr', name: 'Fajr', arabic: 'الفجر', icon: 'sunrise', subtitle: 'Dawn twilight prayer', timeKey: 'Fajr' },
  { key: 'Sunrise', name: 'Sunrise', arabic: 'الشروق', icon: 'sun', subtitle: 'Post-Fajr sunrise (Shuruq)', timeKey: 'Sunrise' },
  { key: 'Dhuhr', name: 'Dhuhr', arabic: 'الظهر', icon: 'sun', subtitle: 'Solar midday prayer', timeKey: 'Dhuhr' },
  { key: 'Asr', name: 'Asr', arabic: 'العصر', icon: 'clock', subtitle: 'Afternoon prayer', timeKey: 'Asr' },
  { key: 'Maghrib', name: 'Maghrib (Sunset)', arabic: 'المغرب', icon: 'sunset', subtitle: 'Sunset prayer & Iftar time', timeKey: 'Maghrib' },
  { key: 'Isha', name: 'Isha', arabic: 'العشاء', icon: 'moon', subtitle: 'Night twilight prayer', timeKey: 'Isha' },
  { key: 'Midnight', name: 'Midnight', arabic: 'منتصف الليل', icon: 'moon', subtitle: 'Islamic solar midnight', timeKey: 'Midnight' },
  { key: 'Lastthird', name: 'Last Third', arabic: 'الثلث الأخير', icon: 'star', subtitle: 'Tahajjud / Qiyam al-Layl', timeKey: 'Lastthird' },
];

interface CityOption {
  id: string;
  name: string;
  label: string;
  lat: number;
  lng: number;
}

const CITY_OPTIONS: CityOption[] = [
  { id: 'auto', name: 'Auto (GPS)', label: 'Auto (Current Device GPS)', lat: 0, lng: 0 },
  { id: 'hyd', name: 'Hyderabad', label: 'Hyderabad, Telangana', lat: 17.385044, lng: 78.486671 },
  { id: 'makkah', name: 'Makkah', label: 'Makkah, Saudi Arabia', lat: 21.422487, lng: 39.826206 },
  { id: 'madinah', name: 'Madinah', label: 'Madinah, Saudi Arabia', lat: 24.467216, lng: 39.610851 },
  { id: 'karachi', name: 'Karachi', label: 'Karachi, Pakistan', lat: 24.860734, lng: 67.001136 },
  { id: 'cairo', name: 'Cairo', label: 'Cairo, Egypt', lat: 30.044420, lng: 31.235712 },
  { id: 'london', name: 'London', label: 'London, United Kingdom', lat: 51.507351, lng: -0.127758 },
  { id: 'ny', name: 'New York', label: 'New York, USA', lat: 40.712776, lng: -74.005974 },
];

const CALC_METHODS = [
  { id: 'KARACHI', name: 'University of Islamic Sciences, Karachi (Hanafi)', shortName: 'Karachi (Hanafi)', value: 1 },
  { id: 'MAKKAH', name: 'Umm Al-Qura University, Makkah', shortName: 'Umm al-Qura', value: 4 },
  { id: 'ISNA', name: 'Islamic Society of North America (ISNA)', shortName: 'ISNA', value: 2 },
  { id: 'MWL', name: 'Muslim World League (MWL)', shortName: 'MWL', value: 3 },
  { id: 'EGYPT', name: 'Egyptian General Authority of Survey', shortName: 'Egyptian', value: 5 },
];

const STORAGE_CITY_KEY = '@deen_prayer_city_id_pref';
const STORAGE_METHOD_KEY = '@deen_prayer_calc_method_pref';

export default function PrayerTimesScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { contentContainerStyle } = useResponsiveLayout();
  const router = useRouter();

  // Instant zero-delay memory cache resolution (0ms boot)
  const initialCached = getCachedPrayerTimesSync();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimings | null>(initialCached ? initialCached.timings : null);
  // Never show full-screen loading spinner because we seed from instant cache!
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"aladhan_api" | "local_astronomical">("aladhan_api");
  const [countdown, setCountdown] = useState<string>("");
  const [qiblaModalVisible, setQiblaModalVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [jumaList, setJumaList] = useState<SalahTimeJuma[]>([]);
  const [allMasjids, setAllMasjids] = useState<Masjid[]>([]);
  const [homeMasjid, setHomeMasjid] = useState<Masjid | null>(null);

  // Default is 'auto' (Auto GPS) as requested
  const [selectedCityId, setSelectedCityId] = useState<string>('auto');
  const [selectedMethodVal, setSelectedMethodVal] = useState<number>(1);
  const [tempCityId, setTempCityId] = useState<string>('auto');
  const [tempMethodVal, setTempMethodVal] = useState<number>(1);
  const [currentLocationName, setCurrentLocationName] = useState<string>('Hyderabad, Telangana');
  const [hijriCustomStr, setHijriCustomStr] = useState<string>('');

  // Location listener
  useEffect(() => {
    return subscribeToLocationUpdates((coords) => {
      setUserCoords(coords);
    });
  }, []);

  // Clock tick every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Load saved preferences & warm cache on mount
  useEffect(() => {
    const initPreferences = async () => {
      try {
        const [savedCity, savedMethod, settings, warmDataRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_CITY_KEY),
          AsyncStorage.getItem(STORAGE_METHOD_KEY),
          loadSettings(),
          AsyncStorage.getItem('@deen_warm_aladhan_cache'),
        ]);

        const city = savedCity || 'auto';
        const method = savedMethod ? parseInt(savedMethod, 10) : (settings.calculationMethodValue || 1);

        setSelectedCityId(city);
        setSelectedMethodVal(method);
        setTempCityId(city);
        setTempMethodVal(method);

        // Instant seed from warm storage cache if available
        if (warmDataRaw) {
          try {
            const parsed = JSON.parse(warmDataRaw);
            if (parsed.timings) {
              setPrayerTimes(parsed.timings);
              if (parsed.date?.readable) {
                const h = parsed.date?.hijri;
                if (h) setHijriCustomStr(`${h.day || ''} ${h.month?.en || ''} ${h.year || ''} AH`);
              }
            }
          } catch {}
        }

        await loadPrayerTimesWith(method, city, false);
      } catch {
        await loadPrayerTimesWith(1, 'auto', false);
      }
    };

    initPreferences();
    fetchSalahTimeJuma().then(setJumaList).catch(() => {});
    fetchSalahTimeMasjids().then(setAllMasjids).catch(() => {});
    getPinnedMasjidId().then((pinnedId) => {
      if (pinnedId) {
        fetchSalahTimeMasjids().then((masjids) => {
          const found = masjids.find((m) => m.id === pinnedId);
          if (found) setHomeMasjid(found);
        }).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  // Core Al-Adhaan API Fetcher (with instant mathematical fallback if network is unreachable)
  const loadPrayerTimesWith = async (methodVal: number, cityId: string, showIndicator: boolean = true) => {
    try {
      setError(null);
      if (showIndicator) setLoading(true);

      let lat = 17.385044;
      let lng = 78.486671;
      let label = 'Auto (GPS Location)';

      if (cityId === 'auto') {
        const location = userCoords || (await getQuickLocation());
        if (location && location.latitude && location.longitude) {
          lat = location.latitude;
          lng = location.longitude;
          label = 'Current Device Location';
        } else {
          // Explicit default to Hyderabad, Telangana if auto GPS fails or isn't granted
          lat = 17.385044;
          lng = 78.486671;
          label = 'Hyderabad, Telangana';
        }
      } else {
        const found = CITY_OPTIONS.find((c) => c.id === cityId);
        if (found) {
          lat = found.lat;
          lng = found.lng;
          label = found.label;
        }
      }

      setCurrentLocationName(label);

      // Call Al-Adhaan API
      try {
        const apiData = await fetchPrayerTimes(lat, lng, methodVal);
        if (apiData && apiData.timings) {
          setPrayerTimes(apiData.timings);
          setSource("aladhan_api");
          setMemoryPrayerCache(apiData.timings, lat, lng, methodVal);
          if (apiData.date?.hijri) {
            const h = apiData.date.hijri as any;
            const mName = h.month?.en || h.month?.ar || '';
            setHijriCustomStr(`${h.day || ''} ${mName} ${h.year || ''} AH`);
          }
          setLoading(false);
          return;
        }
      } catch (apiErr) {
        console.warn('[PrayerScreen] Al-Adhaan API network call failed, applying zero-dependency solar math:', apiErr);
      }

      // Mathematical local fallback
      const localTimings = getLocalPrayerTimes(lat, lng, new Date(), 'hanafi');
      setPrayerTimes(localTimings);
      setSource("local_astronomical");
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading prayer times:", err);
      setError("Failed to load prayer times. Pull down to retry.");
      setLoading(false);
    }
  };

  const handleApplyFilters = async () => {
    setIsFilterModalVisible(false);
    setSelectedCityId(tempCityId);
    setSelectedMethodVal(tempMethodVal);

    // Save preferences
    await Promise.all([
      AsyncStorage.setItem(STORAGE_CITY_KEY, tempCityId),
      AsyncStorage.setItem(STORAGE_METHOD_KEY, String(tempMethodVal)),
      saveSettings({ ...(await loadSettings()), calculationMethodValue: tempMethodVal }),
    ]).catch(() => {});

    await loadPrayerTimesWith(tempMethodVal, tempCityId, true);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPrayerTimesWith(selectedMethodVal, selectedCityId, false);
    setRefreshing(false);
  }, [selectedMethodVal, selectedCityId]);

  // Pure Al-Adhaan API Astronomical Solar Timings
  const effectivePrayerTimes = useMemo(() => {
    return prayerTimes || {
      Fajr: '05:00',
      Sunrise: '06:13',
      Dhuhr: '12:00',
      Asr: '15:20',
      Maghrib: '17:47',
      Isha: '19:00',
    };
  }, [prayerTimes]);

  const nextPrayer = useMemo(() => {
    return getNextPrayer(effectivePrayerTimes, currentTime);
  }, [effectivePrayerTimes, currentTime]);

  // Live countdown to next prayer
  useEffect(() => {
    if (!nextPrayer?.time) return;
    setCountdown(calculatePrayerCountdown(nextPrayer.time, nextPrayer.name));
    const timer = setInterval(() => {
      setCountdown(calculatePrayerCountdown(nextPrayer?.time, nextPrayer?.name));
    }, 1000);
    return () => clearInterval(timer);
  }, [nextPrayer?.time, nextPrayer?.name]);

  const nearestKhutbah = useMemo(() => {
    if (!jumaList || jumaList.length === 0) return null;
    return getNearestUpdatedJumaKhutbah(userCoords, allMasjids, jumaList, homeMasjid);
  }, [userCoords, allMasjids, jumaList, homeMasjid]);

  const hijriEnglish = useMemo(() => {
    if (hijriCustomStr) return hijriCustomStr;
    try {
      return new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(currentTime);
    } catch {
      return "17 Jumada I, 1448 AH";
    }
  }, [hijriCustomStr, currentTime]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={contentContainerStyle}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accentGold}
            colors={[colors.accentGold]}
          />
        }
      >
        {/* ─── HEADER: BACK | TITLE | QIBLA ─── */}
        <View style={styles.header}>
          <View style={styles.headerTopNavRow}>
            <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/more'))} style={styles.backButton}>
              <Feather name="arrow-left" size={18} color={colors.accentGold} />
              <Text style={[styles.backText, { color: colors.accentGold }]}>{t('common.back', 'Back')}</Text>
            </TouchableOpacity>

            <Text style={[styles.headerTitleCentered, { color: colors.text }]}>Prayer Times (API)</Text>

            <TouchableOpacity
              style={[styles.qiblaBadge, { backgroundColor: colors.pill, borderColor: colors.border }]}
              onPress={() => setQiblaModalVisible(true)}
              activeOpacity={0.8}
            >
              <Feather name="compass" size={14} color={colors.accentGold} />
              <Text style={[styles.qiblaBadgeText, { color: colors.accentGold }]}>Qibla</Text>
            </TouchableOpacity>
          </View>

          {/* ─── 100% SYMMETRICAL DUAL-CELL DATE CARD ─── */}
          <View style={[styles.unifiedDateCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <View style={styles.dateCell}>
              <Feather name="calendar" size={13} color={colors.accentGold} style={{ marginRight: 6 }} />
              <Text style={[styles.dateCellText, { color: colors.text }]} numberOfLines={1}>
                {format(currentTime, "EEE, dd MMM yyyy")}
              </Text>
            </View>
            <View style={[styles.dateCellDivider, { backgroundColor: colors.borderSubtle }]} />
            <View style={styles.dateCell}>
              <Feather name="moon" size={13} color={colors.accentGold} style={{ marginRight: 6 }} />
              <Text style={[styles.dateCellText, { color: colors.accentGold }]} numberOfLines={1}>
                {hijriEnglish}
              </Text>
            </View>
          </View>

          {/* ─── ACTIVE FILTER STATUS BAR & FILTER BUTTON ─── */}
          <View style={[styles.activeFilterBar, { backgroundColor: colors.pill, borderColor: colors.borderSubtle }]}>
            <View style={styles.activeFilterLeft}>
              <Feather name="map-pin" size={11} color={colors.accentGold} style={{ marginRight: 5 }} />
              <Text style={[styles.activeFilterCity, { color: colors.text }]} numberOfLines={1}>
                {selectedCityId === 'auto' ? 'Auto (GPS)' : CITY_OPTIONS.find(c => c.id === selectedCityId)?.name || 'Custom'}
              </Text>
              <Text style={[styles.activeFilterMethod, { color: colors.textMuted }]} numberOfLines={1}>
                • {CALC_METHODS.find(m => m.value === selectedMethodVal)?.shortName || 'Karachi'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.filterTriggerBtn, { backgroundColor: colors.accentGoldBg }]}
              onPress={() => {
                setTempCityId(selectedCityId);
                setTempMethodVal(selectedMethodVal);
                setIsFilterModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Feather name="sliders" size={11} color="#0f1718" style={{ marginRight: 4 }} />
              <Text style={styles.filterTriggerText}>Filter</Text>
            </TouchableOpacity>
          </View>

          {/* Live API / Solar Math Pill */}
          <View style={[styles.apiStatusBanner, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <View style={[styles.apiStatusDot, { backgroundColor: source === 'aladhan_api' ? '#10b981' : '#e2a23b' }]} />
            <Text style={[styles.apiStatusText, { color: colors.textSecondary }]}>
              {source === 'aladhan_api' ? 'Live Al-Adhaan API' : 'Astronomical Solar Engine'}
              {' • '}
              <Text style={{ color: colors.accentGold, fontWeight: '700' }}>{currentLocationName}</Text>
            </Text>
          </View>

          {error && <Text style={styles.headerError}>{error}</Text>}
        </View>

        {/* ─── UPCOMING PRAYER HERO CARD ─── */}
        {nextPrayer && (
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.accentGold }]}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroLabelBadge}>
                <Feather name="clock" size={12} color="#e2a23b" style={{ marginRight: 5 }} />
                <Text style={styles.heroLabelText}>UPCOMING SOLAR SALAH</Text>
              </View>
              {countdown ? (
                <View style={styles.heroCountdownBadge}>
                  <Text style={styles.heroCountdownText}>in {countdown}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.heroMainRow}>
              <View>
                <Text style={[styles.heroPrayerName, { color: colors.text }]}>
                  {nextPrayer.name === 'Maghrib' ? 'Maghrib (Sunset)' : nextPrayer.name}
                </Text>
                <Text style={[styles.heroArabicText, { color: colors.accentGold }]}>
                  {PRAYER_ROWS.find(p => p.timeKey === nextPrayer.name)?.arabic || 'الصلاة'}
                </Text>
              </View>

              <View style={styles.heroTimeBox}>
                <Text style={[styles.heroPrayerTime, { color: colors.accentGold }]}>
                  {formatTime(nextPrayer.time, nextPrayer.name)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ─── PRAYER TIMES LIST (WITH MERGED SUNSET & MAGHRIB) ─── */}
        <View style={styles.prayersListContainer}>
          {PRAYER_ROWS.map((row) => {
            const rawTime = effectivePrayerTimes[row.timeKey] || (row.timeKey === 'Maghrib' ? effectivePrayerTimes.Sunset : undefined);
            if (!rawTime || rawTime === '--:--') return null;

            const isNext = nextPrayer && (nextPrayer.name === row.timeKey || (row.timeKey === 'Maghrib' && nextPrayer.name === 'Sunset'));
            const endTime = getPrayerEndTime(effectivePrayerTimes, row.name);
            const timeRangeStr = endTime
              ? `${formatTime(rawTime, row.name)} - ${formatTime(endTime, row.name)}`
              : null;

            return (
              <View
                key={row.key}
                style={[
                  styles.prayerItem,
                  { backgroundColor: colors.card, borderColor: isNext ? colors.accentGold : colors.border },
                  isNext && { backgroundColor: isDark ? 'rgba(226, 162, 59, 0.12)' : 'rgba(226, 162, 59, 0.08)' },
                ]}
              >
                <View style={styles.prayerLeft}>
                  <View
                    style={[
                      styles.prayerIconCircle,
                      { backgroundColor: colors.pill },
                      isNext && { backgroundColor: colors.accentGold },
                    ]}
                  >
                    <Feather
                      name={row.icon}
                      size={16}
                      color={isNext ? '#0f1718' : colors.accentGold}
                    />
                  </View>
                  <View>
                    <Text style={[styles.prayerName, { color: colors.text }]}>
                      {row.name}
                    </Text>
                    <Text style={[styles.prayerSubtitle, { color: colors.textMuted }]}>
                      {row.subtitle}
                    </Text>
                  </View>
                </View>

                <View style={styles.prayerRight}>
                  <Text style={[styles.prayerArabic, { color: colors.accentGold }]}>
                    {row.arabic}
                  </Text>
                  <Text style={[styles.prayerTimeText, { color: isNext ? colors.accentGold : colors.text }]}>
                    {formatTime(rawTime, row.name)}
                  </Text>
                  {timeRangeStr && (
                    <Text style={[styles.prayerRangeText, { color: isNext ? colors.accentGold : colors.textMuted }]}>
                      {timeRangeStr}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* ─── RAMADHAN 30-DAY CALENDAR SHORTCUT ─── */}
        <TouchableOpacity
          style={[styles.ramadhanCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/hub/ramadhan')}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="moon" size={16} color={colors.accentGold} style={{ marginRight: 10 }} />
            <View>
              <Text style={[styles.ramadhanCardTitle, { color: colors.text }]}>Hijri Fasting Calendar</Text>
              <Text style={[styles.ramadhanCardSub, { color: colors.textMuted }]}>Sahar & Iftar Schedule</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={16} color={colors.accentGold} />
        </TouchableOpacity>

        {/* ─── JUMU'AH TOPICS PREVIEW ─── */}
        {nearestKhutbah && (
          <TouchableOpacity
            style={[styles.khutbahCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/friday-topics')}
            activeOpacity={0.85}
          >
            <View style={styles.khutbahCardHeader}>
              <View style={[styles.khutbahBadge, { backgroundColor: colors.pill, borderColor: colors.border }]}>
                <Feather name="book-open" size={11} color={colors.accentGold} style={{ marginRight: 4 }} />
                <Text style={[styles.khutbahBadgeText, { color: colors.accentGold }]}>This Week's Khutbah</Text>
              </View>
              <View style={styles.khutbahViewAllRow}>
                <Text style={[styles.khutbahViewAllText, { color: colors.accentGold }]}>View All Topics</Text>
                <Feather name="chevron-right" size={12} color={colors.accentGold} />
              </View>
            </View>

            <Text style={[styles.khutbahTopicTitle, { color: colors.text }]}>{nearestKhutbah.topic.topicName}</Text>
            <View style={styles.khutbahMetaRow}>
              <Feather name="user" size={11} color={colors.accentGold} style={{ marginRight: 4 }} />
              <Text style={[styles.khutbahSpeakerText, { color: colors.textSecondary }]}>
                {nearestKhutbah.topic.speakerName} • {nearestKhutbah.masjidName}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ─── CITY & CALCULATION METHOD FILTER MODAL ─── */}
      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="sliders" size={16} color={colors.accentGold} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Prayer Times Filter</Text>
              </View>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* City / Region Options */}
              <Text style={[styles.modalSectionLabel, { color: colors.accentGold }]}>
                1. Select City / Region
              </Text>
              <View style={styles.filterOptionsGrid}>
                {CITY_OPTIONS.map((c) => {
                  const isSelected = tempCityId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.filterOptionChip,
                        {
                          backgroundColor: isSelected ? colors.accentGold : colors.pill,
                          borderColor: isSelected ? colors.accentGold : colors.border,
                        },
                      ]}
                      onPress={() => setTempCityId(c.id)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.filterOptionChipText,
                          { color: isSelected ? '#0f1718' : colors.text },
                          isSelected && { fontWeight: '700' },
                        ]}
                      >
                        {c.name}
                      </Text>
                      {isSelected && <Feather name="check" size={13} color="#0f1718" style={{ marginLeft: 4 }} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Calculation Method Options */}
              <Text style={[styles.modalSectionLabel, { color: colors.accentGold, marginTop: 16 }]}>
                2. Calculation Method
              </Text>
              <View style={{ gap: 6 }}>
                {CALC_METHODS.map((m) => {
                  const isSelected = tempMethodVal === m.value;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.methodListItem,
                        {
                          backgroundColor: isSelected ? (isDark ? 'rgba(226, 162, 59, 0.18)' : 'rgba(226, 162, 59, 0.12)') : colors.pill,
                          borderColor: isSelected ? colors.accentGold : colors.borderSubtle,
                        },
                      ]}
                      onPress={() => setTempMethodVal(m.value)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.methodListName, { color: colors.text }, isSelected && { color: colors.accentGold, fontWeight: '700' }]}>
                          {m.name}
                        </Text>
                      </View>
                      {isSelected && <Feather name="check-circle" size={15} color={colors.accentGold} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Apply & Save Preferences Button */}
            <TouchableOpacity
              style={[styles.applyFilterBtn, { backgroundColor: colors.accentGold }]}
              onPress={handleApplyFilters}
              activeOpacity={0.85}
            >
              <Text style={styles.applyFilterBtnText}>Apply & Save Preferences</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Qibla Compass Modal */}
      <QiblaCompassModal visible={qiblaModalVisible} onClose={() => setQiblaModalVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTopNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 12,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  headerTitleCentered: {
    fontSize: 17,
    fontWeight: '700',
  },
  qiblaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  qiblaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  unifiedDateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  dateCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCellDivider: {
    width: 1,
    height: 18,
    marginHorizontal: 8,
  },
  dateCellText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  activeFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  activeFilterLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  activeFilterCity: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeFilterMethod: {
    fontSize: 11,
    marginLeft: 2,
    flexShrink: 1,
  },
  filterTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  filterTriggerText: {
    color: '#0f1718',
    fontSize: 11,
    fontWeight: '700',
  },
  apiStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  apiStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  apiStatusText: {
    fontSize: 11,
  },
  headerError: {
    color: '#ef4444',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
    marginTop: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroLabelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroLabelText: {
    color: '#e2a23b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroCountdownBadge: {
    backgroundColor: 'rgba(226, 162, 59, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroCountdownText: {
    color: '#e2a23b',
    fontSize: 11,
    fontWeight: '700',
  },
  heroMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroPrayerName: {
    fontSize: 20,
    fontWeight: '800',
  },
  heroArabicText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  heroTimeBox: {
    alignItems: 'flex-end',
  },
  heroPrayerTime: {
    fontSize: 22,
    fontWeight: '800',
  },
  prayersListContainer: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  prayerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  prayerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prayerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prayerName: {
    fontSize: 15,
    fontWeight: '700',
  },
  prayerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  prayerRight: {
    alignItems: 'flex-end',
  },
  prayerArabic: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  prayerRangeText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'right',
  },
  prayerTimeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  ramadhanCard: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  ramadhanCardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  ramadhanCardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  khutbahCard: {
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  khutbahCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  khutbahBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  khutbahBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  khutbahViewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  khutbahViewAllText: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 2,
  },
  khutbahTopicTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  khutbahMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  khutbahSpeakerText: {
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterOptionChipText: {
    fontSize: 12,
  },
  methodListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  methodListName: {
    fontSize: 12,
  },
  applyFilterBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 18,
  },
  applyFilterBtnText: {
    color: '#0f1718',
    fontSize: 13,
    fontWeight: '700',
  },
});
