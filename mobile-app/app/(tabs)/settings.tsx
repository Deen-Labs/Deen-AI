import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Clipboard, Platform, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { loadSettings, saveSettings, CALCULATION_METHODS, AppSettings } from "../../lib/settings";

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>({
    notificationsEnabled: true,
    autoLocation: true,
    calculationMethod: "ISNA",
    calculationMethodValue: 2,
  });

  const [copiedDns1, setCopiedDns1] = useState(false);
  const [copiedDns2, setCopiedDns2] = useState(false);

  const handleCopy = (text: string, setCopied: (val: boolean) => void) => {
    Clipboard.setString(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openDNSSettings = async () => {
    if (Platform.OS === 'android') {
      // List of settings intents to try, starting from the absolute most specific Private DNS intent
      const intentsToTry = [
        'android.settings.PRIVATE_DNS_SETTINGS',      // Direct Private DNS setting overlay!
        'android.settings.WIRELESS_SETTINGS',         // Connections/Wireless setting dashboard
        'android.settings.SETTINGS'                  // Global system settings
      ];

      for (const intent of intentsToTry) {
        try {
          console.log(`DeenAI: Attempting to launch settings intent: ${intent}`);
          await Linking.sendIntent(intent);
          return; // Success, exit early!
        } catch (err) {
          console.warn(`DeenAI: Setting intent ${intent} not supported on this OEM build:`, err);
        }
      }

      Alert.alert(
        "Open Settings Manually",
        "Your device prevented automatic settings navigation. Please go to Phone Settings ➔ Connections ➔ More Connection Settings ➔ Private DNS.",
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
  }, []);

  const loadSettingsFromStorage = async () => {
    const loadedSettings = await loadSettings();
    setSettings(loadedSettings);
  };

  const updateSetting = async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>
            Customize your Deen AI experience
          </Text>
        </View>

        {/* Prayer Times Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prayer Times</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Notifications</Text>
                <Text style={styles.settingDescription}>
                  Get alerts before prayer times
                </Text>
              </View>
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={(value) => updateSetting('notificationsEnabled', value)}
                trackColor={{ false: "#2a3c3e", true: "#e2a23b" }}
                thumbColor={settings.notificationsEnabled ? "#ffdda8" : "#94a4a2"}
              />
            </View>
          </View>

        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Auto-detect Location</Text>
                <Text style={styles.settingDescription}>
                  Automatically use your current location
                </Text>
              </View>
              <Switch
                value={settings.autoLocation}
                onValueChange={(value) => updateSetting('autoLocation', value)}
                trackColor={{ false: "#2a3c3e", true: "#e2a23b" }}
                thumbColor={settings.autoLocation ? "#ffdda8" : "#94a4a2"}
              />
            </View>
          </View>

          {!settings.autoLocation && (
            <TouchableOpacity style={styles.settingCard}>
              <Text style={styles.settingLabel}>Set Location Manually</Text>
              <Text style={styles.settingDescription}>
                Tap to choose your city
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* System-Wide & Secure Folder Protection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛡️ System & Secure Folder Shield</Text>
          
          <View style={styles.settingCard}>
            <Text style={styles.dnsSectionHeader}>Absolute Device Protection</Text>
            <Text style={styles.settingDescription}>
              Samsung Secure Folder and secondary profiles run inside completely isolated sandboxes. Android security prevents our standard App accessibility filters from reading or blocking activities inside these private spaces.
            </Text>
            
            <View style={styles.dnsAlertBox}>
              <Text style={styles.dnsAlertTitle}>💡 The Solution:</Text>
              <Text style={styles.dnsAlertBody}>
                Configure a Secure Private DNS. Because DNS filters operate at your device's core network level, they block adult sites <Text style={{fontWeight: 'bold', color: '#ffdda8'}}>everywhere on your device</Text>—including all browsers (Chrome, Samsung Internet), Incognito tabs, and your Secure Folder!
              </Text>
            </View>

            <Text style={styles.dnsLabel}>Step 1: Copy a Trusted Filter Hostname</Text>
            
            {/* DNS Hostname 1 */}
            <View style={styles.dnsInputContainer}>
              <View style={styles.dnsTextWrapper}>
                <Text style={styles.dnsInputTitle}>AdGuard Family Shield (Highly Recommended)</Text>
                <Text style={styles.dnsInputValue}>dns.adguard-family.com</Text>
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
            <View style={styles.dnsInputContainer}>
              <View style={styles.dnsTextWrapper}>
                <Text style={styles.dnsInputTitle}>CleanBrowsing Family (Strict Filter)</Text>
                <Text style={styles.dnsInputValue}>family-filter-dns.cleanbrowsing.org</Text>
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

            <Text style={styles.dnsLabel}>Step 2: Configure in Settings</Text>
            <Text style={styles.dnsStepDescription}>
              Tap the button below, go to <Text style={{fontWeight: '600', color: '#d6e2e0'}}>Connections ➔ More Connection Settings ➔ Private DNS</Text>, select "Private DNS provider hostname", paste the copied text, and tap Save!
            </Text>

            <TouchableOpacity
              style={styles.dnsShortcutButton}
              onPress={openDNSSettings}
              activeOpacity={0.8}
            >
              <Text style={styles.dnsShortcutButtonText}>⚡ Open Phone DNS Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>Version</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>

          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>Deen AI</Text>
            <Text style={styles.settingDescription}>
              Your AI-powered Islamic companion for prayer times, masjid network, and mindful living.
            </Text>
          </View>
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
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
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
});
