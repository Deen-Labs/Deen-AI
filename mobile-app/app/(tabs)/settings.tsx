import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from "react-native";
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

  const selectCalculationMethod = async (methodId: string) => {
    const method = CALCULATION_METHODS.find(m => m.id === methodId);
    if (method) {
      const newSettings = {
        ...settings,
        calculationMethod: method.id,
        calculationMethodValue: method.value,
      };
      setSettings(newSettings);
      await saveSettings(newSettings);
    }
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

          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>Calculation Method</Text>
            <Text style={styles.settingDescription}>
              Currently using: {CALCULATION_METHODS.find(m => m.id === settings.calculationMethod)?.name}
            </Text>
            <View style={styles.methodList}>
              {CALCULATION_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.methodOption,
                    settings.calculationMethod === method.id && styles.methodOptionActive,
                  ]}
                  onPress={() => selectCalculationMethod(method.id)}>
                  <View style={styles.radioOuter}>
                    {settings.calculationMethod === method.id && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.methodText,
                      settings.calculationMethod === method.id && styles.methodTextActive,
                    ]}>
                    {method.name}
                  </Text>
                </TouchableOpacity>
              ))}
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
});
