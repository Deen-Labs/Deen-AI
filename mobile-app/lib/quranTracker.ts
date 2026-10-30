import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = (Constants as any).appOwnership === 'expo' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: typeof import('expo-notifications') | null = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (error) {
    console.log('[QuranTracker] expo-notifications not available:', error instanceof Error ? error.message : error);
  }
}

const QURAN_REMINDER_NOTIFICATION_ID = 'deen_quran_daily_3h_reminder';

export async function scheduleQuranReminder(state: QuranTrackerState): Promise<void> {
  if (isExpoGo || !Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(QURAN_REMINDER_NOTIFICATION_ID).catch(() => {});
    if (!state.reminderEnabled) return;

    await Notifications.scheduleNotificationAsync({
      identifier: QURAN_REMINDER_NOTIFICATION_ID,
      content: {
        title: '📖 Daily Quran Tracker',
        body: `Take 1 minute to read Verse #${state.currentAyatNumber} today. Total read: ${state.totalReadAyats} Ayats.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3 * 3600,
        repeats: true,
      },
    });
  } catch (err) {
    console.warn('[QuranTracker] Could not schedule 3h notification:', err);
  }
}

export async function cancelQuranReminder(): Promise<void> {
  if (isExpoGo || !Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(QURAN_REMINDER_NOTIFICATION_ID).catch(() => {});
  } catch {}
}


const TRACKER_STORAGE_KEY = '@deen_quran_tracker_state_v1';
const LAST_READ_AYAH_KEY = '@deen_last_read_ayah_v1';

export interface QuranTrackerState {
  currentAyatNumber: number;
  totalReadAyats: number;
  readToday: boolean;
  lastReadDate: string;
  reminderEnabled: boolean;
}

export interface AyatData {
  number: number;
  surahNumber: number;
  numberInSurah: number;
  surahNameEnglish: string;
  surahNameArabic: string;
  arabicText: string;
  englishTranslation: string;
  urduTranslation?: string;
}

const DEFAULT_STATE: QuranTrackerState = {
  currentAyatNumber: 1,
  totalReadAyats: 0,
  readToday: false,
  lastReadDate: '',
  reminderEnabled: true,
};

// Fallback Ayat data for offline/instant warmup
const FALLBACK_AYAT: AyatData = {
  number: 1,
  surahNumber: 1,
  numberInSurah: 1,
  surahNameEnglish: 'Al-Faatiha',
  surahNameArabic: 'الفاتحة',
  arabicText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  englishTranslation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
  urduTranslation: 'شروع اللہ کے نام سے جو بڑا مہربان نہایت رحم والا ہے',
};

export async function getQuranTrackerState(): Promise<QuranTrackerState> {
  try {
    const raw = await AsyncStorage.getItem(TRACKER_STORAGE_KEY);
    if (raw) {
      const state: QuranTrackerState = JSON.parse(raw);
      const todayStr = new Date().toISOString().split('T')[0];
      if (state.lastReadDate !== todayStr) {
        state.readToday = false;
      }
      return state;
    }
  } catch (err) {
    console.warn('[QuranTracker] Error loading state:', err);
  }
  return DEFAULT_STATE;
}

export async function saveQuranTrackerState(state: QuranTrackerState): Promise<void> {
  try {
    await AsyncStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('[QuranTracker] Error saving state:', err);
  }
}

export async function markAyatReadToday(): Promise<QuranTrackerState> {
  const current = await getQuranTrackerState();
  const todayStr = new Date().toISOString().split('T')[0];

  const updated: QuranTrackerState = {
    ...current,
    currentAyatNumber: current.currentAyatNumber + 1,
    totalReadAyats: current.totalReadAyats + 1,
    readToday: false, // Reset to 0 (ready for next verse)
    lastReadDate: todayStr,
  };

  await saveQuranTrackerState(updated);
  await AsyncStorage.setItem(LAST_READ_AYAH_KEY, JSON.stringify({
    ayahNumber: updated.currentAyatNumber,
    updatedAt: new Date().toISOString(),
  }));
  await scheduleQuranReminder(updated);
  return updated;
}

export async function toggleQuranReminder(enabled: boolean): Promise<QuranTrackerState> {
  const current = await getQuranTrackerState();
  const updated: QuranTrackerState = {
    ...current,
    reminderEnabled: enabled,
  };
  await saveQuranTrackerState(updated);
  if (enabled) {
    await scheduleQuranReminder(updated);
  } else {
    await cancelQuranReminder();
  }
  return updated;
}

export async function fetchAyat(ayatNumber: number = 1): Promise<AyatData> {
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/ayah/${ayatNumber}/editions/quran-uthmani,en.sahih,ur.jalandhry`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data) && json.data.length >= 2) {
        const arabic = json.data[0];
        const english = json.data[1];
        const urdu = json.data[2];
        return {
          number: arabic.number,
          surahNumber: arabic.surah.number,
          numberInSurah: arabic.numberInSurah,
          surahNameEnglish: arabic.surah.englishName,
          surahNameArabic: arabic.surah.name,
          arabicText: arabic.text,
          englishTranslation: english.text,
          urduTranslation: urdu ? urdu.text : undefined,
        };
      }
    }
  } catch (err) {
    console.warn('[QuranTracker] Network fetch error, using fallback:', err);
  }
  return FALLBACK_AYAT;
}
