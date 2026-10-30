import { useTheme } from "../../lib/theme";
import { useResponsiveLayout } from "../../lib/responsive";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Clipboard, Platform, Alert, Linking, TextInput, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import FirstTimeWalkthroughModal from "../../components/FirstTimeWalkthroughModal";
import { getAppLanguage, setAppLanguage, AppLanguage } from "../../lib/onboarding";
import { useLanguage } from "../../lib/i18n";
import { shareAppGeneral } from "../../lib/shareHelper";
import { loadSettings, saveSettings, CALCULATION_METHODS, AppSettings } from "../../lib/settings";
import { scheduleSalahNotifications } from "../../lib/salahNotifications";
import { getCurrentUser, logoutUser, UserProfile, getDisplayRoleLabel } from "../../lib/auth";
import { forceRefreshLocation, notifyLocationUpdate } from "../../lib/location";
import { getDefaultMasjidId, setDefaultMasjidId } from "../../lib/defaultMasjid";
import { Masjid } from "../../lib/masjid";
import { fetchSalahTimeMasjids } from "../../lib/salahTimeBackend";
import { Modal } from "react-native";

export default function SettingsScreen() {
  const { themeMode, setThemeMode, colors, isDark } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { contentContainerStyle } = useResponsiveLayout();
  const router = useRouter();
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
    calculationMethod: "MAKKAH",
    calculationMethodValue: 4,
  });
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [defaultMasjidId, setDefaultMasjidIdState] = useState<string | null>(null);
  const [masjidsList, setMasjidsList] = useState<Masjid[]>([]);
  const [isMasjidPickerOpen, setIsMasjidPickerOpen] = useState<boolean>(false);
  const [masjidPickerSearch, setMasjidPickerSearch] = useState<string>('');

  const [copiedDns1, setCopiedDns1] = useState(false);
  const [copiedDns2, setCopiedDns2] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [appLang, setAppLang] = useState<AppLanguage>('en');

  const handleCopy = (text: string, setCopied: (val: boolean) => void) => {
    Clipboard.setString(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openDNSSettings = async () => {
    if (Platform.OS === 'android') {
      const intentsToTry = [
        'android.settings.PRIVATE_DNS_SETTINGS',
        'android.settings.WIRELESS_SETTINGS',
        'android.settings.SETTINGS'
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
        "Open Settings Manually",
        "Please go to Phone Settings -> Connections -> More Connection Settings -> Private DNS.",
        [{ text: "OK" }]
      );
    } else {
      Linking.openURL('App-Prefs:root=WIFI').catch(() => {
        Linking.openSettings();
      });
    }
  };

  useEffect(() => {
    loadSettingsFromStorage();
    getAppLanguage().then(setAppLang);
  }, []);

  const handleLanguageChange = async (lang: AppLanguage) => {
    setAppLang(lang);
    await setLanguage(lang);
  };

  const handleSelectCalculationMethod = async (method: {
 id: string; name: string; value: number }) => {
    const newSettings: AppSettings = {
      ...settings,
      calculationMethod: method.id,
      calculationMethodValue: method.value,
    };
    setSettings(newSettings);
    await saveSettings(newSettings);
    await scheduleSalahNotifications(undefined, undefined, newSettings);
  };

  const loadSettingsFromStorage = async () => {
    const loadedSettings = await loadSettings();
    setSettings(loadedSettings);
    const u = await getCurrentUser();
    setCurrentUser(u);
    const [defId, mList] = await Promise.all([
      getDefaultMasjidId().catch(() => null),
      fetchSalahTimeMasjids().catch(() => []),
    ]);
    setDefaultMasjidIdState(defId);
    setMasjidsList(mList);
  };

  const handleUpdateSetting = async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await saveSettings(newSettings);
    await scheduleSalahNotifications(undefined, undefined, newSettings);
  };

  const handleTogglePrayer = async (
    prayer: 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha' | 'Jummah',
    value: boolean
  ) => {
    const newSettings: AppSettings = {
      ...settings,
      perPrayerEnabled: {

        ...settings.perPrayerEnabled,
        [prayer]: value,
      },
    };
    setSettings(newSettings);
    await saveSettings(newSettings);
    await scheduleSalahNotifications(undefined, undefined, newSettings);
  };

  const handleManualLocationPicker = () => {
    Alert.alert(
      "Choose Region / City",
      "Select your primary neighborhood or refresh GPS coordinates directly:",
      [
        {
          text: "Charminar (Old City)",
          onPress: () => {
            notifyLocationUpdate({ latitude: 17.3616, longitude: 78.4747 });
            Alert.alert("Location Updated", "Primary region set to Charminar, Hyderabad.");
          },
        },
        {
          text: "Tolichowki / Mehdipatnam",
          onPress: () => {
            notifyLocationUpdate({ latitude: 17.4018, longitude: 78.4073 });
            Alert.alert("Location Updated", "Primary region set to Tolichowki, Hyderabad.");
          },
        },
        {
          text: "Hitech City / Gachibowli",
          onPress: () => {
            notifyLocationUpdate({ latitude: 17.4483, longitude: 78.3915 });
            Alert.alert("Location Updated", "Primary region set to Cyberabad, Hyderabad.");
          },
        },
        {
          text: "Secunderabad",
          onPress: () => {
            notifyLocationUpdate({ latitude: 17.4399, longitude: 78.4983 });
            Alert.alert("Location Updated", "Primary region set to Secunderabad.");
          },
        },
        {
          text: "Force Refresh GPS",
          onPress: async () => {
            const coords = await forceRefreshLocation();
            if (coords) {
              Alert.alert("GPS Synced", `Current location detected: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
            } else {
              Alert.alert("GPS Error", "Unable to retrieve GPS coordinates. Please check location permissions.");
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={contentContainerStyle}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/more"))}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={colors.accentGold} />
            <Text style={[styles.backButtonText, { color: colors.accentGold }]}>{t('common.back', 'Back')}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{t('settings.title', 'Settings')}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('settings.subtitle', 'Customize your DeenHub experience')}</Text>
        </View>

                {/* Appearance & Theme Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>{t('settings.appearanceHeader', 'Appearance & Theme')}</Text>
          
          <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.interfaceTheme', 'Interface Theme')}</Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>{t('settings.interfaceThemeDesc', 'Choose between Emerald Dark Mode or Desert Parchment Light Mode')}</Text>

            <View style={styles.themeSelectorRow}>
              <TouchableOpacity
                style={[
                  styles.themePill,
                  { backgroundColor: colors.pill, borderColor: colors.border },
                  themeMode === 'dark' && { backgroundColor: colors.accentGold, borderColor: colors.accentGold },
                ]}
                onPress={() => setThemeMode('dark')}
                activeOpacity={0.8}
              >
                <Feather
                  name="moon"
                  size={14}
                  color={themeMode === 'dark' ? '#0f1718' : colors.text}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.themePillText,
                    { color: colors.text },
                    themeMode === 'dark' && { color: '#0f1718', fontWeight: '700' },
                  ]}
                >
                  {t('more.dark', 'Dark')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themePill,
                  { backgroundColor: colors.pill, borderColor: colors.border },
                  themeMode === 'light' && { backgroundColor: colors.accentGold, borderColor: colors.accentGold },
                ]}
                onPress={() => setThemeMode('light')}
                activeOpacity={0.8}
              >
                <Feather
                  name="sun"
                  size={14}
                  color={themeMode === 'light' ? '#ffffff' : colors.text}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.themePillText,
                    { color: colors.text },
                    themeMode === 'light' && { color: '#ffffff', fontWeight: '700' },
                  ]}
                >
                  {t('more.light', 'Light')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themePill,
                  { backgroundColor: colors.pill, borderColor: colors.border },
                  themeMode === 'system' && { backgroundColor: colors.accentGold, borderColor: colors.accentGold },
                ]}
                onPress={() => setThemeMode('system')}
                activeOpacity={0.8}
              >
                <Feather
                  name="smartphone"
                  size={14}
                  color={themeMode === 'system' ? '#0f1718' : colors.text}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.themePillText,
                    { color: colors.text },
                    themeMode === 'system' && { color: '#0f1718', fontWeight: '700' },
                  ]}
                >
                  {t('more.auto', 'System')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Default Masjid (Works Without Registration) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>Default Masjid</Text>
          <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Selected Primary Masjid</Text>
                <Text style={[styles.settingDescription, { color: colors.accentGold, fontWeight: '700' }]}>
                  {(() => {
                    const found = masjidsList.find(m => m.id === defaultMasjidId || (defaultMasjidId && m.id.replace(/^salahtime-/, '') === defaultMasjidId.replace(/^salahtime-/, '')));
                    return found ? found.name : 'Closest Masjid (Auto-GPS Selected)';
                  })()}
                </Text>
                <Text style={[styles.subSettingDescription, { color: colors.textSecondary }]}>
                  Works for all users without registration. Timings and notifications on Home screen follow this masjid.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.accentGoldBg }]}
                onPress={() => setIsMasjidPickerOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnText}>{defaultMasjidId ? 'Change' : 'Select'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Granular Prayer Notifications Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>{t('settings.notificationsHeader', 'Prayer & Masjid Notifications')}</Text>
          
          <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Master Notification Switch */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.masterNotifications', 'Master Salah Notifications')}</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>{t('settings.masterNotificationsDesc', "Enable Athan & Jama'at alerts for your Default Masjid")}</Text>
              </View>
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={(value) => handleUpdateSetting('notificationsEnabled', value)}
                trackColor={{ false: "#2a3c3e", true: "#e2a23b" }}
                thumbColor={settings.notificationsEnabled ? "#ffdda8" : "#94a4a2"}
              />
            </View>

            {settings.notificationsEnabled && (
              <View style={styles.subNotificationContainer}>
                {/* Alert at exact Athan */}
                <View style={styles.subSettingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.subSettingLabel, { color: colors.text }]}>{t('settings.exactAthan', 'Alert at Exact Athan Time')}</Text>
                    <Text style={[styles.subSettingDescription, { color: colors.textSecondary }]}>{t('settings.exactAthanDesc', 'Plays notification when Athan starts at your Default Masjid')}</Text>
                  </View>
                  <Switch
                    value={settings.notifyAtAthan}
                    onValueChange={(value) => handleUpdateSetting('notifyAtAthan', value)}
                    trackColor={{ false: "#2a3c3e", true: "#10b981" }}
                    thumbColor={settings.notifyAtAthan ? "#f3f7f6" : "#94a4a2"}
                  />
                </View>

                {/* Alert 15m before Jama'at */}
                <View style={styles.subSettingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.subSettingLabel, { color: colors.text }]}>{t('settings.preJamaat', "15m Pre-Jama'at Congregation Reminder")}</Text>
                    <Text style={[styles.subSettingDescription, { color: colors.textSecondary }]}>{t('settings.preJamaatDesc', 'Reminds you 15 minutes before Jama\'at starts to prepare wudhu')}</Text>
                  </View>
                  <Switch
                    value={settings.notifyBeforeJamaat}
                    onValueChange={(value) => handleUpdateSetting('notifyBeforeJamaat', value)}
                    trackColor={{ false: "#2a3c3e", true: "#10b981" }}
                    thumbColor={settings.notifyBeforeJamaat ? "#f3f7f6" : "#94a4a2"}
                  />
                </View>

                {/* Per-Prayer Toggles Grid */}
                <Text style={[styles.perPrayerHeading, { color: colors.accentGold }]}>{t('settings.selectEnabledPrayers', 'Select Enabled Prayers:')}</Text>
                <View style={styles.prayerTogglesGrid}>
                  {(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Jummah'] as const).map((p) => {
                    const isEnabled = settings.perPrayerEnabled ? settings.perPrayerEnabled[p] : true;
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.prayerTogglePill,
                          { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                          isEnabled && { backgroundColor: colors.accentGold, borderColor: colors.accentGold }
                        ]}
                        onPress={() => handleTogglePrayer(p, !isEnabled)}
                        activeOpacity={0.8}
                      >
                        <Feather
                          name={isEnabled ? "check-circle" : "circle"}
                          size={14}
                          color={isEnabled ? "#0f1718" : colors.textMuted}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.prayerToggleText, { color: colors.text }, isEnabled && { color: '#0f1718', fontWeight: '700' }]}>
                          {p}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>{t('settings.locationHeader', 'Location')}</Text>
          
          <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>{t('settings.autoLocation', 'Auto-detect Location')}</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>{t('settings.autoLocationDesc', 'Automatically use your current location')}</Text>
              </View>
              <Switch
                value={settings.autoLocation}
                onValueChange={(value) => handleUpdateSetting('autoLocation', value)}
                trackColor={{ false: "#2a3c3e", true: "#e2a23b" }}
                thumbColor={settings.autoLocation ? "#ffdda8" : "#94a4a2"}
              />
            </View>
          </View>

          {!settings.autoLocation && (
            <TouchableOpacity
              style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleManualLocationPicker}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Set Location Manually</Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    Tap to choose your neighborhood or force GPS sync
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.accentGold} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Calculation Method Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>{t('settings.calcHeader', 'Calculation Method')}</Text>
          
          <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Prayer Calculation Authority</Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              Selected standard for astronomical Fajr and Isha angle calculation
            </Text>

            <View style={{ marginTop: 12, gap: 8 }}>
              {CALCULATION_METHODS.map((method) => {
                const isSelected = settings.calculationMethod === method.id || settings.calculationMethodValue === method.value;
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.calcMethodRow,
                      { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                      isSelected && { backgroundColor: isDark ? 'rgba(226, 162, 59, 0.15)' : 'rgba(184, 121, 20, 0.15)', borderColor: colors.accentGold }
                    ]}
                    onPress={() => handleSelectCalculationMethod(method)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.calcMethodName, { color: isSelected ? colors.accentGold : colors.text }]}>
                        {method.name}
                      </Text>
                      <Text style={[styles.calcMethodId, { color: colors.textMuted }]}>
                        {method.id}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Feather name="check-circle" size={18} color={colors.accentGold} />
                    ) : (
                      <Feather name="circle" size={18} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* System-Wide & Secure Folder Protection Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>🛡️ System & Secure Folder Shield</Text>
          
          <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.dnsSectionHeader, { color: colors.accentGold }]}>Absolute Device Protection</Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              Samsung Secure Folder and secondary profiles run inside completely isolated sandboxes. Android security prevents our standard App accessibility filters from reading or blocking activities inside these private spaces.
            </Text>
            
            <View style={[styles.dnsAlertBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.dnsAlertTitle, { color: colors.accentGold }]}>💡 The Solution:</Text>
              <Text style={[styles.dnsAlertBody, { color: colors.textSecondary }]}>
                Configure a Secure Private DNS. Because DNS filters operate at your device's core network level, they block adult sites <Text style={{fontWeight: 'bold', color: colors.accentGold}}>everywhere on your device</Text>—including all browsers (Chrome, Samsung Internet), Incognito tabs, and your Secure Folder!
              </Text>
            </View>

            <Text style={[styles.dnsLabel, { color: colors.text }]}>Step 1: Copy a Trusted Filter Hostname</Text>
            
            {/* DNS Hostname 1 */}
            <View style={[styles.dnsInputContainer, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}>
              <View style={styles.dnsTextWrapper}>
                <Text style={[styles.dnsInputTitle, { color: colors.text }]}>AdGuard Family Shield (Highly Recommended)</Text>
                <Text style={[styles.dnsInputValue, { color: colors.textMuted }]}>dns.adguard-family.com</Text>
              </View>
              <TouchableOpacity
                style={[styles.dnsCopyButton, copiedDns1 && styles.dnsCopyButtonActive]}
                onPress={() => handleCopy("dns.adguard-family.com", setCopiedDns1)}
                activeOpacity={0.7}
              >
                <Text style={styles.dnsCopyButtonText}>
                  {copiedDns1 ? "✓ Copied" : "Copy"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* DNS Hostname 2 */}
            <View style={[styles.dnsInputContainer, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}>
              <View style={styles.dnsTextWrapper}>
                <Text style={[styles.dnsInputTitle, { color: colors.text }]}>CleanBrowsing Family (Strict Filter)</Text>
                <Text style={[styles.dnsInputValue, { color: colors.textMuted }]}>family-filter-dns.cleanbrowsing.org</Text>
              </View>
              <TouchableOpacity
                style={[styles.dnsCopyButton, copiedDns2 && styles.dnsCopyButtonActive]}
                onPress={() => handleCopy("family-filter-dns.cleanbrowsing.org", setCopiedDns2)}
                activeOpacity={0.7}
              >
                <Text style={styles.dnsCopyButtonText}>
                  {copiedDns2 ? "✓ Copied" : "Copy"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.dnsLabel, { color: colors.text }]}>Step 2: Configure in Settings</Text>
            <Text style={[styles.dnsStepDescription, { color: colors.textSecondary }]}>
              Tap the button below, go to <Text style={{fontWeight: '600', color: colors.accentGold}}>Connections → More Connection Settings → Private DNS</Text>, select "Private DNS provider hostname", paste the copied text, and tap Save!
            </Text>

            <TouchableOpacity
              style={[styles.dnsShortcutButton, { backgroundColor: colors.accentGold }]}
              onPress={openDNSSettings}
              activeOpacity={0.8}
            >
              <Text style={[styles.dnsShortcutButtonText, { color: '#0f1718' }]}>Open Phone DNS Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Permissions & Privacy Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>Permissions & Privacy</Text>

          <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>System Permissions</Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              Manage device location, notifications, and other system permissions directly in Android Settings at any time without compromising your protection streak.
            </Text>
            <TouchableOpacity
              style={[styles.permissionButton, { backgroundColor: colors.accentGold }]}
              onPress={() => Linking.openSettings()}
              activeOpacity={0.8}
            >
              <Feather name="shield" size={15} color="#0f1718" style={{ marginRight: 6 }} />
              <Text style={[styles.permissionButtonText, { color: '#0f1718' }]}>Manage App Permissions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 5-TIER USER AUTH & ACCOUNT SECTION ─── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>User Account & Masjid Authority</Text>

          <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {currentUser ? (
              <View>
                <View style={styles.accountLoggedInRow}>
                  <View style={[styles.accountAvatar, { backgroundColor: colors.accentGold }]}>
                    <Text style={[styles.accountAvatarText, { color: '#0f1718' }]}>
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.accountUserName, { color: colors.text }]}>{currentUser.name}</Text>
                    <Text style={[styles.accountUserEmail, { color: colors.textMuted }]}>{currentUser.email}</Text>
                    <View style={styles.accountBadgeRow}>
                      <View style={[styles.accountRoleBadge, { backgroundColor: colors.pill, borderColor: colors.border }]}>
                        <Text style={[styles.accountRoleBadgeText, { color: colors.accentGold }]}>{getDisplayRoleLabel(currentUser)}</Text>
                      </View>
                      <View style={[styles.accountActiveBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                        <Text style={[styles.accountActiveBadgeText, { color: colors.accentGreen }]}>Active</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Navigation Buttons for Profile and Admin */}
                <View style={styles.accountBtnGrid}>
                  <TouchableOpacity
                    style={[styles.accountProfileNavBtn, { backgroundColor: colors.pill, borderColor: colors.border }]}
                    onPress={() => router.push('/auth/profile')}
                    activeOpacity={0.8}
                  >
                    <Feather name="user" size={14} color={colors.accentGold} style={{ marginRight: 6 }} />
                    <Text style={[styles.accountProfileNavText, { color: colors.accentGold }]}>View & Edit Profile</Text>
                  </TouchableOpacity>

                  {currentUser.role === 'ADMIN' && (
                    <TouchableOpacity
                      style={[styles.accountAdminNavBtn, { backgroundColor: colors.accentGold }]}
                      onPress={() => router.push('/hub/admin-dashboard')}
                      activeOpacity={0.85}
                    >
                      <Feather name="sliders" size={14} color="#0f1718" style={{ marginRight: 6 }} />
                      <Text style={[styles.accountAdminNavText, { color: '#0f1718' }]}>Admin Portal</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Logout Button */}
                <TouchableOpacity
                  style={[styles.accountLogoutBtn, { borderTopColor: colors.borderSubtle }]}
                  onPress={async () => {
                    await logoutUser();
                    setCurrentUser(null);
                    Alert.alert('Logged Out', 'You have been logged out.');
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="log-out" size={13} color="#f87171" style={{ marginRight: 6 }} />
                  <Text style={styles.accountLogoutText}>Log Out</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={styles.accountGuestHeader}>
                  <Feather name="shield" size={18} color={colors.accentGold} style={{ marginRight: 8 }} />
                  <Text style={[styles.settingLabel, { color: colors.text }]}>5-Tier SalahTime Account</Text>
                </View>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Sign in or create an account as a Believer, Muazzin, Imam, or Committee President to manage masajid timings and broadcast topics.
                </Text>

                <View style={styles.authActionRow}>
                  <TouchableOpacity
                    style={[styles.loginMainBtn, { backgroundColor: colors.accentGold }]}
                    onPress={() => router.push('/auth/login')}
                    activeOpacity={0.85}
                  >
                    <Feather name="log-in" size={14} color="#0f1718" style={{ marginRight: 6 }} />
                    <Text style={[styles.loginMainBtnText, { color: '#0f1718' }]}>Sign In</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.signupMainBtn, { backgroundColor: colors.pill, borderColor: colors.border }]}
                    onPress={() => router.push('/auth/signup')}
                    activeOpacity={0.8}
                  >
                    <Feather name="user-plus" size={14} color={colors.accentGold} style={{ marginRight: 6 }} />
                    <Text style={[styles.signupMainBtnText, { color: colors.accentGold }]}>Create Account</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Language & App Tour Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>Language & Tour</Text>

          <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text, marginBottom: 10 }]}>{t('more.appLanguage', 'App Language')}</Text>

            <View style={styles.settingsLangPillsRow}>
              <TouchableOpacity
                style={[
                  styles.settingsLangPill,
                  { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                  appLang === 'en' && { backgroundColor: colors.accentGold, borderColor: colors.accentGold }
                ]}
                onPress={() => handleLanguageChange('en')}
                activeOpacity={0.8}
              >
                <Text style={[styles.settingsLangPillText, { color: colors.text }, appLang === 'en' && { color: '#0f1718', fontWeight: '700' }]}>
                  English
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.settingsLangPill,
                  { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                  appLang === 'ur' && { backgroundColor: colors.accentGold, borderColor: colors.accentGold }
                ]}
                onPress={() => handleLanguageChange('ur')}
                activeOpacity={0.8}
              >
                <Text style={[styles.settingsLangPillText, { color: colors.text }, appLang === 'ur' && { color: '#0f1718', fontWeight: '700' }]}>
                  اردو
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.settingsLangPill,
                  { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                  appLang === 'ar' && { backgroundColor: colors.accentGold, borderColor: colors.accentGold }
                ]}
                onPress={() => handleLanguageChange('ar')}
                activeOpacity={0.8}
              >
                <Text style={[styles.settingsLangPillText, { color: colors.text }, appLang === 'ar' && { color: '#0f1718', fontWeight: '700' }]}>
                  العربية
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.settingsLangPill,
                  { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                  appLang === 'te' && { backgroundColor: colors.accentGold, borderColor: colors.accentGold }
                ]}
                onPress={() => handleLanguageChange('te')}
                activeOpacity={0.8}
              >
                <Text style={[styles.settingsLangPillText, { color: colors.text }, appLang === 'te' && { color: '#0f1718', fontWeight: '700' }]}>
                  తెలుగు
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.replayTourBtn, { backgroundColor: colors.pill, borderColor: colors.border }]}
            onPress={() => setShowWalkthrough(true)}
            activeOpacity={0.8}
          >
            <Feather name="compass" size={16} color={colors.accentGold} style={{ marginRight: 8 }} />
            <Text style={[styles.replayTourBtnText, { color: colors.accentGold }]}>View App Tour & What's New</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>About</Text>
          
          <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Version</Text>
            <Text style={[styles.settingValue, { color: colors.textMuted }]}>3.2.0</Text>
          </View>

          <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>DeenHub</Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              Your AI-powered Islamic companion for prayer times, masjid network, and mindful living.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => shareAppGeneral()}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Share DeenHub App</Text>
                <Text style={[styles.settingValue, { color: colors.textMuted }]}>Share with family and friends</Text>
              </View>
              <Feather name="share-2" size={16} color={colors.accentGold} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => Linking.openURL('mailto:qairsolutionsask@gmail.com')}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Official Email Support</Text>
                <Text style={[styles.settingValue, { color: colors.textMuted }]}>qairsolutionsask@gmail.com</Text>
              </View>
              <Feather name="mail" size={16} color={colors.accentGold} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ─── DEFAULT MASJID SELECTOR MODAL ─── */}
      <Modal
        visible={isMasjidPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMasjidPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.masjidModalContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Header */}
            <View style={styles.masjidModalHeader}>
              <View style={styles.masjidModalHeaderLeft}>
                <Feather name="bookmark" size={18} color={colors.accentGold} />
                <Text style={[styles.masjidModalTitle, { color: colors.text }]}>Select Default Masjid</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsMasjidPickerOpen(false)}
                style={[styles.masjidModalCloseBtn, { backgroundColor: colors.surface }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={[styles.masjidModalSearchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.masjidModalSearchInput, { color: colors.text }]}
                value={masjidPickerSearch}
                onChangeText={setMasjidPickerSearch}
                placeholder="Search masjid by name or area..."
                placeholderTextColor={colors.textMuted}
                autoCorrect={false}
              />
              {masjidPickerSearch.length > 0 && (
                <TouchableOpacity onPress={() => setMasjidPickerSearch('')}>
                  <Feather name="x" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.masjidModalList} showsVerticalScrollIndicator={false}>
              {/* Option 1: Auto-GPS Closest Masjid */}
              <TouchableOpacity
                style={[
                  styles.masjidModalItem,
                  { backgroundColor: colors.surface, borderColor: !defaultMasjidId ? colors.accentGold : colors.borderSubtle },
                  !defaultMasjidId && { borderWidth: 1.5 },
                ]}
                onPress={async () => {
                  await setDefaultMasjidId(null);
                  setDefaultMasjidIdState(null);
                  setIsMasjidPickerOpen(false);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.masjidModalItemIcon, { backgroundColor: 'rgba(226, 162, 59, 0.12)' }]}>
                  <Feather name="navigation" size={16} color={colors.accentGold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.masjidModalItemTitle, { color: colors.text }]}>
                    Closest Masjid (Auto-GPS Selected)
                  </Text>
                  <Text style={[styles.masjidModalItemSub, { color: colors.textSecondary }]}>
                    Automatically detects nearest masjid using GPS
                  </Text>
                </View>
                {!defaultMasjidId && (
                  <Feather name="check-circle" size={18} color={colors.accentGold} />
                )}
              </TouchableOpacity>

              {/* Filtered Masjids */}
              {masjidsList
                .filter((m) => {
                  if (!masjidPickerSearch.trim()) return true;
                  const q = masjidPickerSearch.toLowerCase();
                  return (
                    m.name.toLowerCase().includes(q) ||
                    (m.address && m.address.toLowerCase().includes(q)) ||
                    (m.famousArea && m.famousArea.toLowerCase().includes(q))
                  );
                })
                .slice(0, 50)
                .map((m) => {
                  const isSelected = defaultMasjidId === m.id || (defaultMasjidId && m.id.replace(/^salahtime-/, '') === defaultMasjidId.replace(/^salahtime-/, ''));
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.masjidModalItem,
                        { backgroundColor: colors.surface, borderColor: isSelected ? colors.accentGold : colors.borderSubtle },
                        isSelected && { borderWidth: 1.5 },
                      ]}
                      onPress={async () => {
                        await setDefaultMasjidId(m.id);
                        setDefaultMasjidIdState(m.id);
                        setIsMasjidPickerOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.masjidModalItemIcon, { backgroundColor: isSelected ? 'rgba(226, 162, 59, 0.15)' : colors.pill }]}>
                        <Feather name="map-pin" size={16} color={isSelected ? colors.accentGold : colors.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.masjidModalItemTitle, { color: colors.text }]} numberOfLines={1}>
                          {m.name}
                        </Text>
                        <Text style={[styles.masjidModalItemSub, { color: colors.textSecondary }]} numberOfLines={1}>
                          {[m.famousArea, m.address].filter(Boolean).join(', ') || 'Community Timetable'}
                        </Text>
                      </View>
                      {isSelected && (
                        <Feather name="check-circle" size={18} color={colors.accentGold} />
                      )}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <FirstTimeWalkthroughModal
        visible={showWalkthrough}
        onClose={() => {
          setShowWalkthrough(false);
          getAppLanguage().then(setAppLang);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#0f1718',
    fontSize: 12,
    fontWeight: '700',
  },

  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  pickerBox: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 16,
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  pickerSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginVertical: 12,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 13,
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  pickerItemIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pickerItemName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  pickerItemSub: {
    fontSize: 11,
  },

  themeSelectorRow: {

    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  themePill: {

    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  themePillText: {

    fontSize: 13,
    fontWeight: '600',
    textAlign: "center",
    includeFontPadding: false,
  },
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
  backButton: {

    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
    alignSelf: "flex-start",
  },
  backButtonText: {

    fontSize: 15,
    color: "#e2a23b",
    fontWeight: "600",
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
  section: {

    marginTop: 20,
    paddingHorizontal: 20,
  },
  settingsLangPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  settingsLangPill: {

    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#0c3033',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: "center",
    justifyContent: "center",
  },
  settingsLangPillActive: {

    backgroundColor: '#0b2527',
    borderColor: '#e2a23b',
    borderWidth: 1.5,
  },
  settingsLangPillText: {

    fontSize: 12,
    fontWeight: '600',
    color: '#94a4a2',
    textAlign: "center",
    includeFontPadding: false,
  },
  settingsLangPillTextActive: {

    color: '#ffdda8',
    fontWeight: '700',
  },
  replayTourBtn: {

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.35)',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 12,
  },
  replayTourBtnText: {

    fontSize: 13,
    fontWeight: '700',
    color: '#ffdda8',
  },
  sectionTitle: {

    fontSize: 16,
    fontWeight: "700",
    color: "#ffdda8",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  settingCard: {

    backgroundColor: "#0b2527",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingRow: {

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingInfo: {

    flex: 1,
    marginRight: 12,
  },
  settingLabel: {

    fontSize: 16,
    fontWeight: "600",
    color: "#f3f7f6",
    marginBottom: 4,
  },
  settingDescription: {

    fontSize: 13,
    color: "#94a4a2",
    lineHeight: 18,
  },
  settingValue: {

    fontSize: 14,
    color: "#ffdda8",
    marginTop: 4,
  },
  methodList: {

    marginTop: 16,
  },
  methodOption: {

    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#0c3033",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    marginBottom: 8,
  },
  methodOptionActive: {

    backgroundColor: "rgba(226, 162, 59, 0.1)",
    borderColor: "rgba(226, 162, 59, 0.3)",
  },
  radioOuter: {

    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#94a4a2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  radioInner: {

    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#e2a23b",
  },
  methodText: {

    flex: 1,
    fontSize: 14,
    color: "#d6e2e0",
  },
  methodTextActive: {

    color: "#ffdda8",
    fontWeight: "600",
  },
  dnsSectionHeader: {

    fontSize: 18,
    fontWeight: "700",
    color: "#ffdda8",
    marginBottom: 8,
  },
  dnsAlertBox: {

    backgroundColor: "rgba(226, 162, 59, 0.08)",
    borderLeftWidth: 3,
    borderLeftColor: "#e2a23b",
    padding: 12,
    borderRadius: 6,
    marginVertical: 14,
  },
  dnsAlertTitle: {

    fontSize: 14,
    fontWeight: "700",
    color: "#ffdda8",
    marginBottom: 4,
  },
  dnsAlertBody: {

    fontSize: 13,
    color: "#d6e2e0",
    lineHeight: 18,
  },
  dnsLabel: {

    fontSize: 13,
    fontWeight: "700",
    color: "#ffdda8",
    marginTop: 12,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dnsInputContainer: {

    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0c3033",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  dnsTextWrapper: {

    flex: 1,
    marginRight: 8,
  },
  dnsInputTitle: {

    fontSize: 10,
    fontWeight: "600",
    color: "#94a4a2",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  dnsInputValue: {

    fontSize: 13,
    fontWeight: "700",
    color: "#f3f7f6",
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  dnsCopyButton: {

    backgroundColor: "#00ff66",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 75,
  },
  dnsCopyButtonActive: {

    backgroundColor: "#e2a23b",
  },
  dnsCopyButtonText: {

    fontSize: 12,
    fontWeight: "700",
    color: "#0f1718",
  },
  dnsStepDescription: {

    fontSize: 13,
    color: "#94a4a2",
    lineHeight: 18,
    marginBottom: 16,
  },
  dnsShortcutButton: {

    backgroundColor: "#e2a23b",
    borderRadius: 8,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#e2a23b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dnsShortcutButtonText: {

    fontSize: 15,
    fontWeight: "700",
    color: "#0f1718",
  },
  permissionButton: {

    backgroundColor: "#00ff66",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  permissionButtonText: {

    fontSize: 14,
    fontWeight: "700",
    color: "#0f1718",
  },
  communityProfileHeader: {

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  communityUserNameText: {

    fontSize: 16,
    fontWeight: '700',
    color: '#ffdda8',
    marginTop: 2,
  },
  communityCountBadge: {

    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  communityCountText: {

    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  nameEditRow: {

    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  nameInput: {

    flex: 1,
    backgroundColor: '#0c3033',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 13,
  },
  nameSaveBtn: {

    backgroundColor: '#e2a23b',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameSaveBtnText: {

    color: '#0f1718',
    fontWeight: '700',
    fontSize: 12,
  },
  imamSectionDivider: {

    height: 1,
    backgroundColor: 'rgba(51, 65, 85, 0.4)',
    marginVertical: 12,
  },
  imamLoggedInRow: {

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imamVerifiedBadge: {

    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  imamVerifiedBadgeText: {

    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  imamNameSubtext: {

    color: '#ffdda8',
    fontSize: 12,
    marginTop: 3,
  },
  imamLogoutBtn: {

    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  imamLogoutBtnText: {

    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
  },
  imamLoginIntro: {

    fontSize: 12,
    color: '#94a4a2',
    lineHeight: 16,
    marginBottom: 8,
  },
  imamLoginForm: {

    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  imamInput: {

    backgroundColor: '#0c3033',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: '#ffffff',
    fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  imamCancelBtn: {

    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  imamCancelBtnText: {

    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  imamLoginSubmitBtn: {

    flex: 1.5,
    backgroundColor: '#e2a23b',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  imamLoginSubmitBtnText: {

    color: '#0f1718',
    fontSize: 12,
    fontWeight: '700',
  },
  imamLoginBtn: {

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2a23b',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  imamLoginBtnText: {

    color: '#0f1718',
    fontSize: 13,
    fontWeight: '700',
  },
  feedbackInput: {

    backgroundColor: '#0c3033',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 13,
    marginTop: 10,
    marginBottom: 10,
    textAlignVertical: 'top',
  },
  feedbackSubmitBtn: {

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2a23b',
    borderRadius: 8,
    paddingVertical: 10,
  },
  feedbackSubmitBtnText: {

    color: '#0f1718',
    fontSize: 13,
    fontWeight: '700',
  },
  feedbackListTitle: {

    fontSize: 12,
    fontWeight: '700',
    color: '#ffdda8',
    marginBottom: 8,
  },
  feedbackEmptyText: {

    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
  feedbackContainer: {

    gap: 8,
  },
  feedbackCard: {

    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.4)',
  },
  feedbackCardHeader: {

    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  feedbackAuthor: {

    fontSize: 12,
    fontWeight: '700',
    color: '#ffdda8',
  },
  feedbackDate: {

    fontSize: 10,
    color: '#64748b',
  },
  feedbackMessage: {

    fontSize: 12,
    color: '#d6e2e0',
    lineHeight: 16,
  },
  feedbackReplyBox: {

    marginTop: 6,
    padding: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#10b981',
  },
  feedbackReplyTitle: {

    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
  },
  feedbackReplyText: {

    fontSize: 11,
    color: '#e2e8f0',
  },
  feedbackDeleteBtn: {

    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 6,
    padding: 4,
  },
  feedbackDeleteBtnText: {

    color: '#ef4444',
    fontSize: 10,
    fontWeight: '600',
  },
  subNotificationContainer: {

    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  subSettingRow: {

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  subSettingLabel: {

    fontSize: 13,
    fontWeight: '700',
    color: '#f3f7f6',
  },
  subSettingDescription: {

    fontSize: 11,
    color: '#94a4a2',
    marginTop: 2,
    lineHeight: 15,
  },
  perPrayerHeading: {

    fontSize: 12,
    fontWeight: '700',
    color: '#ffdda8',
    marginTop: 12,
    marginBottom: 8,
  },
  prayerTogglesGrid: {

    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prayerTogglePill: {

    flexDirection: 'row',
    backgroundColor: '#0c3033',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: "center",
    justifyContent: "center",
  },
  prayerTogglePillActive: {

    backgroundColor: '#e2a23b',
    borderColor: '#e2a23b',
  },
  prayerToggleText: {

    fontSize: 12,
    fontWeight: '600',
    color: '#94a4a2',
    textAlign: "center",
    includeFontPadding: false,
  },
  prayerToggleTextActive: {

    color: '#0f1718',
    fontWeight: '700',
  },
  accountLoggedInRow: {

    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  accountAvatar: {

    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    borderWidth: 1.5,
    borderColor: '#e2a23b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarText: {

    fontSize: 18,
    fontWeight: '800',
    color: '#e2a23b',
  },
  accountUserName: {

    fontSize: 15,
    fontWeight: '700',
    color: '#f3f7f6',
  },
  accountUserEmail: {

    fontSize: 11,
    color: '#94a4a2',
    marginTop: 1,
  },
  accountBadgeRow: {

    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  accountRoleBadge: {

    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
  },
  accountRoleBadgeText: {

    fontSize: 10,
    fontWeight: '800',
    color: '#ffdda8',
  },
  accountActiveBadge: {

    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  accountActiveBadgeText: {

    fontSize: 10,
    fontWeight: '800',
    color: '#34d399',
  },
  accountBtnGrid: {

    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  accountProfileNavBtn: {

    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.12)',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
  },
  accountProfileNavText: {

    fontSize: 12,
    fontWeight: '700',
    color: '#e2a23b',
  },
  accountAdminNavBtn: {

    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2a23b',
    paddingVertical: 10,
    borderRadius: 8,
  },
  accountAdminNavText: {

    fontSize: 12,
    fontWeight: '700',
    color: '#0f1718',
  },
  accountLogoutBtn: {

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  accountLogoutText: {

    fontSize: 12,
    fontWeight: '600',
    color: '#f87171',
  },
  accountGuestHeader: {

    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  authActionRow: {

    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  loginMainBtn: {

    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2a23b',
    paddingVertical: 11,
    borderRadius: 8,
  },
  loginMainBtnText: {

    fontSize: 13,
    fontWeight: '700',
    color: '#0f1718',
  },
  signupMainBtn: {

    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.12)',
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
  },
  signupMainBtnText: {

    fontSize: 13,
    fontWeight: '700',
    color: '#e2a23b',
  },
  calcMethodRow: {

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  calcMethodName: {

    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  calcMethodId: {

    fontSize: 11,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  masjidModalContainer: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  masjidModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  masjidModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  masjidModalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  masjidModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masjidModalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  masjidModalSearchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  masjidModalList: {
    maxHeight: 380,
  },
  masjidModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  masjidModalItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masjidModalItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  masjidModalItemSub: {
    fontSize: 11,
  },
});