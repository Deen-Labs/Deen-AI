import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppLanguage = 'en' | 'ur' | 'ar' | 'te';

export const APP_LANGUAGE_KEY = '@deen_app_language_v1';
export const WALKTHROUGH_COMPLETED_KEY = '@deen_onboarding_completed_v1';

export interface LanguageOption {
  code: AppLanguage;
  name: string;
  nativeName: string;
  sublabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    sublabel: 'Default international language for translations and navigation',
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    sublabel: 'حیدرآباد اور برصغیر کے مسلمانوں کے لیے ترجمہ، اذکار اور فضائل',
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    sublabel: 'اللغة العربية الأصلية للأذكار والقرآن الكريم والأدعية',
  },
  {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    sublabel: 'తెలుగులో నమాజ్ సమయాలు, దువాలు మరియు సమాచారం',
  },
];

/**
 * Detect on-device system locale with safe try/catch fallback to English.
 */
export function detectDeviceLanguage(): AppLanguage {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    if (locale.startsWith('ar')) return 'ar';
    if (locale.startsWith('ur')) return 'ur';
    if (locale.startsWith('te')) return 'te';
  } catch (e) {
    // fallback
  }
  return 'en';
}

/**
 * Retrieve user's selected language, falling back to on-device detected language.
 */
export async function getAppLanguage(): Promise<AppLanguage> {
  try {
    const val = await AsyncStorage.getItem(APP_LANGUAGE_KEY);
    if (val === 'ur' || val === 'ar' || val === 'en' || val === 'te') {
      return val;
    }
  } catch (err) {
    console.warn('[Onboarding] Error reading language:', err);
  }
  return detectDeviceLanguage();
}

type LanguageListener = (lang: AppLanguage) => void;
const languageListeners: Set<LanguageListener> = new Set();

export function subscribeToLanguageChanges(listener: LanguageListener): () => void {
  languageListeners.add(listener);
  return () => {
    languageListeners.delete(listener);
  };
}

/**
 * Persist user's selected language.
 */
export async function setAppLanguage(lang: AppLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(APP_LANGUAGE_KEY, lang);
    languageListeners.forEach((fn) => {
      try {
        fn(lang);
      } catch (e) {
        console.warn('[Onboarding] Error in language listener:', e);
      }
    });
  } catch (err) {
    console.warn('[Onboarding] Error setting language:', err);
  }
}

/**
 * Check if the first-time walkthrough has been completed.
 */
export async function isWalkthroughCompleted(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(WALKTHROUGH_COMPLETED_KEY);
    return val === 'true';
  } catch (err) {
    console.warn('[Onboarding] Error checking walkthrough status:', err);
    return false;
  }
}

/**
 * Mark the first-time walkthrough as completed (or reset it for re-play).
 */
export async function setWalkthroughCompleted(completed: boolean = true): Promise<void> {
  try {
    await AsyncStorage.setItem(WALKTHROUGH_COMPLETED_KEY, completed ? 'true' : 'false');
  } catch (err) {
    console.warn('[Onboarding] Error setting walkthrough status:', err);
  }
}
