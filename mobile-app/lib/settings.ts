import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppSettings {
  notificationsEnabled: boolean;
  notifyAtAthan: boolean;
  notifyBeforeJamaat: boolean;
  beforeJamaatMinutes?: number;
  perPrayerEnabled: {
    Fajr: boolean;
    Dhuhr: boolean;
    Asr: boolean;
    Maghrib: boolean;
    Isha: boolean;
    Jummah: boolean;
  };
  autoLocation: boolean;
  calculationMethod: string;
  calculationMethodValue: number;
}

const SETTINGS_KEY = '@deen_ai_settings';

const DEFAULT_SETTINGS: AppSettings = {
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
  calculationMethod: 'MAKKAH',
  calculationMethodValue: 4,
};

export const CALCULATION_METHODS = [
  { id: 'ISNA', name: 'Islamic Society of North America', value: 2 },
  { id: 'MWL', name: 'Muslim World League', value: 3 },
  { id: 'EGYPT', name: 'Egyptian General Authority', value: 5 },
  { id: 'MAKKAH', name: 'Umm Al-Qura University, Makkah', value: 4 },
  { id: 'KARACHI', name: 'University of Islamic Sciences, Karachi', value: 1 },
];

/**
 * Load settings from storage with legacy fallback support.
 */
export async function loadSettings(): Promise<AppSettings> {
  try {
    const jsonValue = await AsyncStorage.getItem(SETTINGS_KEY);
    if (jsonValue !== null) {
      const parsed = JSON.parse(jsonValue);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        perPrayerEnabled: {
          ...DEFAULT_SETTINGS.perPrayerEnabled,
          ...(parsed.perPrayerEnabled || {}),
        },
      };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to storage
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    const jsonValue = JSON.stringify(settings);
    await AsyncStorage.setItem(SETTINGS_KEY, jsonValue);
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

/**
 * Update a single setting
 */
export async function updateSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<void> {
  try {
    const settings = await loadSettings();
    settings[key] = value;
    await saveSettings(settings);
  } catch (error) {
    console.error('Error updating setting:', error);
  }
}
