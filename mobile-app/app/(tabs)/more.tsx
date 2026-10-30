import { getCommunityNetworkStats, CommunityNetworkStats } from '../../lib/community';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Clipboard,
  Platform,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { useResponsiveLayout } from '../../lib/responsive';
import { getCurrentUser, UserProfile, getDisplayRoleLabel } from '../../lib/auth';
import { getAppLanguage, setAppLanguage, AppLanguage } from '../../lib/onboarding';
import { useLanguage } from '../../lib/i18n';
import { loadSettings, saveSettings, CALCULATION_METHODS, AppSettings } from '../../lib/settings';
import { scheduleSalahNotifications } from '../../lib/salahNotifications';
import QiblaCompassModal from '../../components/QiblaCompassModal';
import FirstTimeWalkthroughModal from '../../components/FirstTimeWalkthroughModal';

export default function MoreScreen() {
  const { themeMode, setThemeMode, colors, isDark } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { contentContainerStyle } = useResponsiveLayout();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [networkStats, setNetworkStats] = useState<CommunityNetworkStats | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [qiblaModalVisible, setQiblaModalVisible] = useState(false);
  const [walkthroughVisible, setWalkthroughVisible] = useState(false);
  const [walkthroughMode, setWalkthroughMode] = useState<'general' | 'masjid_onboarding'>('masjid_onboarding');
  const [copiedDns, setCopiedDns] = useState(false);
  const [appLang, setAppLang] = useState<AppLanguage>('en');

  const [settings, setSettings] = useState<AppSettings>({
    notificationsEnabled: true,
    notifyAtAthan: true,
    notifyBeforeJamaat: true,
    beforeJamaatMinutes: 15,
    perPrayerEnabled: {
      Fajr: true,
      Dhuhr: true,
      Asr: true,
      Maghrib: true,
      Isha: true,
      Jummah: true,
    },
    autoLocation: true,
    calculationMethod: 'KARACHI',
    calculationMethodValue: 1,
  });

  const fetchUserData = useCallback(async () => {
    getCommunityNetworkStats().then(s => setNetworkStats(s)).catch(() => {});
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch {
      // Ignored
    } finally {
      setLoadingUser(false);
    }
  }, []);

  const fetchSettingsData = useCallback(async () => {
    try {
      const loaded = await loadSettings();
      setSettings(loaded);
      const lang = await getAppLanguage();
      setAppLang(lang);
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    fetchUserData();
    fetchSettingsData();
  }, [fetchUserData, fetchSettingsData]);

  const handleCopyDns = () => {
    Clipboard.setString('dns.adguard-family.com');
    setCopiedDns(true);
    setTimeout(() => setCopiedDns(false), 2000);
  };

  const openDNSSettings = async () => {
    if (Platform.OS === 'android') {
      const intentsToTry = [
        'android.settings.PRIVATE_DNS_SETTINGS',
        'android.settings.WIRELESS_SETTINGS',
        'android.settings.SETTINGS',
      ];
      for (const intent of intentsToTry) {
        try {
          await Linking.sendIntent(intent);
          return;
        } catch (err) {
          console.warn(`DeenAI: Setting intent ${intent} not supported:`, err);
        }
      }
      Alert.alert(
        'Open Settings Manually',
        'Please go to Phone Settings -> Connections -> More Connection Settings -> Private DNS.',
        [{ text: 'OK' }]
      );
    } else {
      Linking.openURL('App-Prefs:root=WIFI').catch(() => {
        Linking.openSettings();
      });
    }
  };

  const handleToggleNotifications = async (val: boolean) => {
    const updated = { ...settings, notificationsEnabled: val };
    setSettings(updated);
    await saveSettings(updated);
    if (val) {
      await scheduleSalahNotifications();
    }
  };

  const handleSelectCalcMethod = async (methodId: string, methodVal: number) => {
    const updated = {
      ...settings,
      calculationMethod: methodId,
      calculationMethodValue: methodVal,
    };
    setSettings(updated);
    await saveSettings(updated);
    await scheduleSalahNotifications();
  };

  const handleToggleLanguage = async (newLang: AppLanguage) => {
    setAppLang(newLang);
    await setLanguage(newLang);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('more.title', 'Deen Hub & More')}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{t('more.subtitle', 'Spiritual companion, community tools & localized settings')}</Text>
        </View>

        {/* ─── TOP SECTION: ACCOUNT & ONBOARDING BANNER ─── */}
        <View style={[styles.accountBannerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.accountTopRow}>
            <View style={styles.accountAvatarGroup}>
              <View style={[styles.accountAvatarCircle, { backgroundColor: colors.accentGoldBg }]}>
                <Feather name="user" size={18} color="#0f1718" />
              </View>
              <View style={styles.accountTextWrapper}>
                <View style={styles.accountNameRoleRow}>
                  <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
                    {currentUser?.name || (loadingUser ? t('common.loading', 'Loading account...') : t('more.guestTitle', 'Guest Brother / Sister'))}
                  </Text>
                  {currentUser?.role ? (
                    <View style={[styles.roleBadge, { backgroundColor: 'rgba(226, 162, 59, 0.15)', borderColor: colors.accentGold }]}>
                      <Text style={[styles.roleBadgeText, { color: colors.accentGold }]}>{getDisplayRoleLabel(currentUser)}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.accountEmail, { color: colors.textMuted }]} numberOfLines={1}>
                  {currentUser?.email || t('more.guestSub', 'Connect your local masjid & earn Sadaqah Jariyah')}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.accountActionButtonsRow}>
            <TouchableOpacity
              style={[styles.accountProfileBtn, { backgroundColor: colors.pill, borderColor: colors.borderSubtle }]}
              onPress={() => {
                if (currentUser) {
                  router.push('/auth/profile');
                } else {
                  router.push('/auth/login');
                }
              }}
              activeOpacity={0.8}
            >
              <Feather name={currentUser ? "user-check" : "log-in"} size={13} color={colors.accentGold} style={{ marginRight: 6 }} />
              <Text style={[styles.accountProfileBtnText, { color: colors.accentGold }]}>
                {currentUser ? t('more.accountProfile', 'Account Profile') : t('more.signInRegister', 'Sign In / Register')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.guideBtn, { backgroundColor: colors.accentGoldBg }]}
              onPress={() => {
                setWalkthroughMode('masjid_onboarding');
                setWalkthroughVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Feather name="help-circle" size={13} color="#0f1718" style={{ marginRight: 6 }} />
              <Text style={styles.guideBtnText}>{t('more.guideAddMasjid', 'Guide: Add Masjid')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── SALAHTIME COMMUNITY NETWORK DASHBOARD CARD ─── */}
        <TouchableOpacity
          style={[styles.networkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/hub/community-network' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.networkHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="globe" size={14} color={colors.accentGold} style={{ marginRight: 6 }} />
              <Text style={[styles.networkCardTitle, { color: colors.text }]}>SalahTime Community Network</Text>
            </View>
            <View style={[styles.networkLiveBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.35)' }]}>
              <View style={styles.networkLiveDot} />
              <Text style={styles.networkLiveText}>Live Network</Text>
            </View>
          </View>

          <View style={styles.networkCountersRow}>
            {/* Counter 1: Connected Masjids */}
            <View style={[styles.networkCounterItem, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <View style={[styles.networkCounterIcon, { backgroundColor: 'rgba(226, 162, 59, 0.12)' }]}>
                <Feather name="map-pin" size={13} color={colors.accentGold} />
              </View>
              <Text style={[styles.networkCounterVal, { color: colors.text }]}>
                {networkStats ? networkStats.connectedMasjids : '140+'}
              </Text>
              <Text style={[styles.networkCounterLabel, { color: colors.textMuted }]}>
                Connected Masjids
              </Text>
            </View>

            {/* Counter 2: Registered Musallis */}
            <View style={[styles.networkCounterItem, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <View style={[styles.networkCounterIcon, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <Feather name="users" size={13} color="#10b981" />
              </View>
              <Text style={[styles.networkCounterVal, { color: colors.text }]}>
                {networkStats ? networkStats.registeredMusallis.toLocaleString() : '2,800+'}
              </Text>
              <Text style={[styles.networkCounterLabel, { color: colors.textMuted }]}>
                Active Musallis
              </Text>
            </View>

            {/* Counter 3: JazakAllah Sent */}
            <View style={[styles.networkCounterItem, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <View style={[styles.networkCounterIcon, { backgroundColor: 'rgba(226, 162, 59, 0.12)' }]}>
                <Text style={{ fontSize: 13 }}>🤲</Text>
              </View>
              <Text style={[styles.networkCounterVal, { color: colors.text }]}>
                {networkStats ? networkStats.jazakAllahSent.toLocaleString() : '480+'}
              </Text>
              <Text style={[styles.networkCounterLabel, { color: colors.textMuted }]}>
                JazakAllah Sent
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderSubtle }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accentGold, marginRight: 4 }}>View Full Network Directory & Stats</Text>
            <Feather name="chevron-right" size={14} color={colors.accentGold} />
          </View>
        </TouchableOpacity>

        {/* ─── SECTION 1: SPIRITUAL & COMMUNITY HUB (3x3 GRID) ─── */}
        <View style={styles.sectionHeaderRow}>
          <Feather name="compass" size={15} color={colors.accentGold} style={{ marginRight: 6 }} />
          <Text style={[styles.sectionTitle, { color: colors.accentSoft }]}>{t('more.hubTools', 'Deen Hub Tools')}</Text>
        </View>

        <View style={styles.hubGrid}>
          {/* Row 1 */}
          <View style={styles.hubRow}>
            {/* Col 1: Find Qibla */}
            <TouchableOpacity
              style={[styles.hubCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setQiblaModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.hubIconCircle, { backgroundColor: 'rgba(226, 162, 59, 0.15)', borderColor: 'rgba(226, 162, 59, 0.3)' }]}>
                <Feather name="navigation" size={17} color={colors.accentGold} />
              </View>
              <Text numberOfLines={1} style={[styles.hubCardTitle, { color: colors.text }]}>{t('more.qibla', 'Find Qibla')}</Text>
              <Text numberOfLines={1} style={[styles.hubCardDesc, { color: colors.textMuted }]}>{t('more.qiblaSub', 'Compass')}</Text>
            </TouchableOpacity>

            {/* Col 2: Azkar & Duas */}
            <TouchableOpacity
              style={[styles.hubCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/hub/azkar')}
              activeOpacity={0.8}
            >
              <View style={[styles.hubIconCircle, { backgroundColor: 'rgba(226, 162, 59, 0.15)', borderColor: 'rgba(226, 162, 59, 0.3)' }]}>
                <Feather name="book-open" size={17} color={colors.accentGold} />
              </View>
              <Text numberOfLines={1} style={[styles.hubCardTitle, { color: colors.text }]}>{t('more.azkar', 'Daily Azkar')}</Text>
              <Text numberOfLines={1} style={[styles.hubCardDesc, { color: colors.textMuted }]}>{t('more.azkarSub', 'Hisnul Muslim')}</Text>
            </TouchableOpacity>

            {/* Col 3: 99 Names of Allah */}
            <TouchableOpacity
              style={[styles.hubCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/hub/asma-ul-husna')}
              activeOpacity={0.8}
            >
              <View style={[styles.hubIconCircle, { backgroundColor: 'rgba(226, 162, 59, 0.15)', borderColor: 'rgba(226, 162, 59, 0.3)' }]}>
                <Feather name="award" size={17} color={colors.accentGold} />
              </View>
              <Text numberOfLines={1} style={[styles.hubCardTitle, { color: colors.text }]}>{t('more.names99', '99 Names')}</Text>
              <Text numberOfLines={1} style={[styles.hubCardDesc, { color: colors.textMuted }]}>{t('more.names99Sub', 'Attributes')}</Text>
            </TouchableOpacity>
          </View>

          {/* Row 2 */}
          <View style={styles.hubRow}>
            {/* Col 1: Quran & Hadith */}
            <TouchableOpacity
              style={[styles.hubCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/hub/quran-hadith-search')}
              activeOpacity={0.8}
            >
              <View style={[styles.hubIconCircle, { backgroundColor: 'rgba(226, 162, 59, 0.15)', borderColor: 'rgba(226, 162, 59, 0.3)' }]}>
                <Feather name="book" size={17} color={colors.accentGold} />
              </View>
              <Text numberOfLines={1} style={[styles.hubCardTitle, { color: colors.text }]}>{t('more.quranHadith', 'Holy Quran')}</Text>
              <Text numberOfLines={1} style={[styles.hubCardDesc, { color: colors.textMuted }]}>{t('more.quranHadithSub', '114 Surahs')}</Text>
            </TouchableOpacity>

            {/* Col 2: Friday Topics */}
            <TouchableOpacity
              style={[styles.hubCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(tabs)/friday-topics')}
              activeOpacity={0.8}
            >
              <View style={[styles.hubIconCircle, { backgroundColor: 'rgba(226, 162, 59, 0.15)', borderColor: 'rgba(226, 162, 59, 0.3)' }]}>
                <Feather name="mic" size={17} color={colors.accentGold} />
              </View>
              <Text numberOfLines={1} style={[styles.hubCardTitle, { color: colors.text }]}>{t('more.fridayTopics', 'Friday Topics')}</Text>
              <Text numberOfLines={1} style={[styles.hubCardDesc, { color: colors.textMuted }]}>{t('more.fridayTopicsSub', 'Khutbah Roster')}</Text>
            </TouchableOpacity>

            {/* Col 3: Ramadhan */}
            <TouchableOpacity
              style={[styles.hubCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/hub/ramadhan')}
              activeOpacity={0.8}
            >
              <View style={[styles.hubIconCircle, { backgroundColor: 'rgba(226, 162, 59, 0.15)', borderColor: 'rgba(226, 162, 59, 0.3)' }]}>
                <Feather name="moon" size={17} color={colors.accentGold} />
              </View>
              <Text numberOfLines={1} style={[styles.hubCardTitle, { color: colors.text }]}>{t('more.ramadhan', 'Ramadhan')}</Text>
              <Text numberOfLines={1} style={[styles.hubCardDesc, { color: colors.textMuted }]}>{t('more.ramadhanSub', 'Sahar & Iftar')}</Text>
            </TouchableOpacity>
          </View>

          {/* Row 3 */}
          <View style={styles.hubRow}>
            {/* Col 1: Prayer Times (API) */}
            <TouchableOpacity
              style={[styles.hubCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/hub/prayer')}
              activeOpacity={0.8}
            >
              <View style={[styles.hubIconCircle, { backgroundColor: 'rgba(226, 162, 59, 0.15)', borderColor: 'rgba(226, 162, 59, 0.3)' }]}>
                <Feather name="clock" size={17} color={colors.accentGold} />
              </View>
              <Text numberOfLines={1} style={[styles.hubCardTitle, { color: colors.text }]}>Prayer Times (API)</Text>
              <Text numberOfLines={1} style={[styles.hubCardDesc, { color: colors.textMuted }]}>Solar & Global Methods</Text>
            </TouchableOpacity>

            {/* Col 2: Days Clean & Stats */}
            <TouchableOpacity
              style={[styles.hubCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/hub/clean-stats' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.hubIconCircle, { backgroundColor: 'rgba(0, 255, 102, 0.12)', borderColor: 'rgba(0, 255, 102, 0.25)' }]}>
                <Feather name="shield" size={17} color={colors.accentGreen} />
              </View>
              <Text numberOfLines={1} style={[styles.hubCardTitle, { color: colors.text }]}>Days Clean</Text>
              <Text numberOfLines={1} style={[styles.hubCardDesc, { color: colors.textMuted }]}>Streak & Stats</Text>
            </TouchableOpacity>

            {/* Col 3: Community & Feedback */}
            <TouchableOpacity
              style={[styles.hubCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/hub/community-feedback')}
              activeOpacity={0.8}
            >
              <View style={[styles.hubIconCircle, { backgroundColor: 'rgba(226, 162, 59, 0.15)', borderColor: 'rgba(226, 162, 59, 0.3)' }]}>
                <Feather name="message-square" size={17} color={colors.accentGold} />
              </View>
              <Text numberOfLines={1} style={[styles.hubCardTitle, { color: colors.text }]}>{t('more.community', 'Community')}</Text>
              <Text numberOfLines={1} style={[styles.hubCardDesc, { color: colors.textMuted }]}>{t('more.communitySub', 'Feedback')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Admin Dashboard Banner (Role-based, full width below 3x3 grid) */}
        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_USER2') ? (
          <TouchableOpacity
            style={[styles.adminBannerCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/hub/admin-dashboard')}
            activeOpacity={0.8}
          >
            <View style={[styles.adminBannerIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Feather name="shield" size={16} color="#ef4444" />
            </View>
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Text style={[styles.adminBannerTitle, { color: colors.text }]}>Admin Console</Text>
              <Text style={[styles.adminBannerDesc, { color: colors.textMuted }]}>Muazzin & Imam role verification portal</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}

        {/* ─── SECTION 2: LOCALIZED APP SETTINGS ─── */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Feather name="settings" size={15} color={colors.accentGold} style={{ marginRight: 6 }} />
          <Text style={[styles.sectionTitle, { color: colors.accentSoft }]}>{t('more.preferencesTitle', 'App Preferences & Settings')}</Text>
        </View>

        <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Appearance Toggle */}
          <View style={styles.settingItemRow}>
            <View style={styles.settingLabelCol}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('more.appearance', 'Appearance')}</Text>
              <Text style={[styles.settingSubtext, { color: colors.textMuted }]}>{t('more.appearanceSub', 'Dark Emerald, Light Sand, or System Default')}</Text>
            </View>
            <View style={styles.themeSelectorGroup}>
              {(['dark', 'light', 'system'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.themeTogglePill,
                    { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                    themeMode === mode && { backgroundColor: colors.accentGoldBg, borderColor: colors.accentGold },
                  ]}
                  onPress={() => setThemeMode(mode)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.themeTogglePillText,
                      { color: colors.textMuted },
                      themeMode === mode && { color: '#0f1718', fontWeight: '700' },
                    ]}
                  >
                    {mode === 'dark' ? t('more.dark', 'Dark') : mode === 'light' ? t('more.light', 'Light') : t('more.auto', 'Auto')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.settingsDivider, { backgroundColor: colors.borderSubtle }]} />

          {/* App Language Section */}
          <View style={styles.settingColumnBlock}>
            <Text style={[styles.settingLabel, { color: colors.text, marginBottom: 10 }]}>
              {t('more.appLanguage', 'App Language')}
            </Text>
            <View style={styles.langSelectorRowFull}>
              <TouchableOpacity
                style={[
                  styles.langPillFull,
                  { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                  language === 'en' && { backgroundColor: colors.accentGoldBg, borderColor: colors.accentGold },
                ]}
                onPress={() => handleToggleLanguage('en')}
                activeOpacity={0.8}
              >
                <Text style={[styles.langPillText, { color: colors.textMuted }, language === 'en' && { color: '#0f1718', fontWeight: '700' }]}>
                  English
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.langPillFull,
                  { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                  language === 'ur' && { backgroundColor: colors.accentGoldBg, borderColor: colors.accentGold },
                ]}
                onPress={() => handleToggleLanguage('ur')}
                activeOpacity={0.8}
              >
                <Text style={[styles.langPillText, { color: colors.textMuted }, language === 'ur' && { color: '#0f1718', fontWeight: '700' }]}>
                  اردو
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.langPillFull,
                  { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                  language === 'ar' && { backgroundColor: colors.accentGoldBg, borderColor: colors.accentGold },
                ]}
                onPress={() => handleToggleLanguage('ar')}
                activeOpacity={0.8}
              >
                <Text style={[styles.langPillText, { color: colors.textMuted }, language === 'ar' && { color: '#0f1718', fontWeight: '700' }]}>
                  العربية
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.langPillFull,
                  { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                  language === 'te' && { backgroundColor: colors.accentGoldBg, borderColor: colors.accentGold },
                ]}
                onPress={() => handleToggleLanguage('te')}
                activeOpacity={0.8}
              >
                <Text style={[styles.langPillText, { color: colors.textMuted }, language === 'te' && { color: '#0f1718', fontWeight: '700' }]}>
                  తెలుగు
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.settingsDivider, { backgroundColor: colors.borderSubtle }]} />

          {/* Prayer Notifications */}
          <View style={styles.settingItemRow}>
            <View style={styles.settingLabelCol}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('more.salahNotifications', 'Salah Notifications')}</Text>
              <Text style={[styles.settingSubtext, { color: colors.textMuted }]}>{t('more.salahNotificationsSub', 'Reminders for Athan and Iqamah times')}</Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: colors.accentGold }}
              thumbColor={settings.notificationsEnabled ? '#0f1718' : '#cbd5e1'}
            />
          </View>

          <View style={[styles.settingsDivider, { backgroundColor: colors.borderSubtle }]} />

          {/* Calculation Method Selection */}
          <View style={styles.settingColumnBlock}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>{t('more.calcMethod', 'Solar Calculation Method')}</Text>
            <Text style={[styles.settingSubtext, { color: colors.textMuted, marginBottom: 8 }]}>{t('more.calcMethodSub', 'Used when a masjid is falling back to astronomical calculations')}</Text>
            <View style={styles.calcMethodsRow}>
              {[
                { id: 'KARACHI', name: 'Karachi', val: 1 },
                { id: 'MAKKAH', name: 'Umm al-Qura', val: 4 },
                { id: 'ISNA', name: 'ISNA', val: 2 },
                { id: 'MWL', name: 'MWL', val: 3 },
              ].map((m) => {
                const isSelected = settings.calculationMethod === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.calcMethodChip,
                      { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                      isSelected && { backgroundColor: 'rgba(226, 162, 59, 0.18)', borderColor: colors.accentGold },
                    ]}
                    onPress={() => handleSelectCalcMethod(m.id, m.val)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.calcMethodChipText,
                        { color: colors.textMuted },
                        isSelected && { color: colors.accentGold, fontWeight: '700' },
                      ]}
                    >
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.settingsDivider, { backgroundColor: colors.borderSubtle }]} />

          {/* Private DNS & Content Shield */}
          <View style={styles.settingColumnBlock}>
            <View style={styles.dnsHeaderRow}>
              <View style={styles.settingLabelCol}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>{t('more.privateDns', 'Private DNS Shield')}</Text>
                <Text style={[styles.settingSubtext, { color: colors.textMuted }]}>{t('more.privateDnsSub', 'Blocks 500,000+ NSFW domains device-wide')}</Text>
              </View>
              <TouchableOpacity
                style={[styles.dnsSettingsLaunchBtn, { backgroundColor: colors.pill, borderColor: colors.borderSubtle }]}
                onPress={openDNSSettings}
                activeOpacity={0.8}
              >
                <Feather name="external-link" size={13} color={colors.accentGold} style={{ marginRight: 4 }} />
                <Text style={[styles.dnsSettingsLaunchBtnText, { color: colors.accentGold }]}>{t('more.settingsBtn', 'Settings')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.dnsCopyBox, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
              onPress={handleCopyDns}
              activeOpacity={0.7}
            >
              <Text style={[styles.dnsAddressText, { color: colors.accentGold }]}>dns.adguard-family.com</Text>
              <View style={[styles.dnsCopyBadge, { backgroundColor: copiedDns ? 'rgba(16, 185, 129, 0.2)' : colors.pill }]}>
                <Feather name={copiedDns ? "check" : "copy"} size={11} color={copiedDns ? "#10b981" : colors.textMuted} />
                <Text style={[styles.dnsCopyBadgeText, { color: copiedDns ? "#10b981" : colors.textMuted }]}>
                  {copiedDns ? t('more.copied', 'Copied') : t('more.copy', 'Copy')}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.fullSettingsLinkBtn, { borderColor: colors.borderSubtle }]}
              onPress={() => router.push('/hub/settings')}
              activeOpacity={0.8}
            >
              <Text style={[styles.fullSettingsLinkBtnText, { color: colors.accentGold }]}>
                {t('more.openAdvancedSettings', 'Open Advanced App & Location Settings →')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Qibla Modal */}
      <QiblaCompassModal
        visible={qiblaModalVisible}
        onClose={() => setQiblaModalVisible(false)}
      />

      {/* Walkthrough Guide Modal */}
      <FirstTimeWalkthroughModal
        visible={walkthroughVisible}
        onClose={() => setWalkthroughVisible(false)}
        mode={walkthroughMode}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerSettingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  networkCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  networkHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  networkCardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  networkLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  networkLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 5,
  },
  networkLiveText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  networkCountersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  networkCounterItem: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  networkCounterIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  networkCounterVal: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  networkCounterLabel: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },

  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  accountBannerCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  accountTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountAvatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  accountAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTextWrapper: {
    flex: 1,
  },
  accountNameRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  roleBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  accountEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  accountActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  accountProfileBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  accountProfileBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  guideBtn: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  guideBtnText: {
    color: '#0f1718',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  hubGrid: {
    gap: 8,
    marginBottom: 10,
  },
  hubRow: {
    flexDirection: 'row',
    gap: 8,
  },
  hubCard: {
    flex: 1,
    height: 96,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
  },
  hubCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
    includeFontPadding: false,
  },
  hubCardDesc: {
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 12,
    includeFontPadding: false,
  },
  langSelectorRowFull: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  langPillFull: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  adminBannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  adminBannerDesc: {
    fontSize: 10,
    marginTop: 1,
  },
  settingsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  settingItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  settingColumnBlock: {
    paddingVertical: 4,
  },
  settingLabelCol: {
    flex: 1,
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  settingSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  settingsDivider: {
    height: 1,
    marginVertical: 12,
  },
  themeSelectorGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  themeTogglePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  themeTogglePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  langSelectorGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  langPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  calcMethodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  calcMethodChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  calcMethodChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dnsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dnsSettingsLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  dnsSettingsLaunchBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dnsCopyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  dnsAddressText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  dnsCopyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  dnsCopyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  fullSettingsLinkBtn: {
    marginTop: 10,
    paddingVertical: 4,
    alignItems: 'center',
  },
  fullSettingsLinkBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
