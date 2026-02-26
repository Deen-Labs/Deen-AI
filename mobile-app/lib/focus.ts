import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export interface FocusSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  completed: boolean;
}

export interface FocusStats {
  totalSessions: number;
  totalMinutes: number;
  completedSessions: number;
  currentStreak: number;
}

export interface BlockedApp {
  id: string;
  name: string;
  packageName: string; // Android package name or iOS bundle identifier
  enabled: boolean; // Whether this app should be blocked during focus mode
}

export interface BlockingSettings {
  enableAppBlocking: boolean;
  enableNSFWBlocking: boolean;
  blockedApps: BlockedApp[];
}

const SESSIONS_KEY = '@deen_ai_focus_sessions';
const STATS_KEY = '@deen_ai_focus_stats';
const BLOCKING_SETTINGS_KEY = '@deen_ai_blocking_settings';
const ACTIVE_FOCUS_KEY = '@deen_ai_active_focus';

/**
 * Save a focus session
 */
export async function saveFocusSession(session: FocusSession): Promise<void> {
  try {
    const sessions = await getFocusSessions();
    sessions.unshift(session);
    
    // Keep only last 100 sessions
    const limitedSessions = sessions.slice(0, 100);
    
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(limitedSessions));
    
    // Update stats
    await updateFocusStats(session);
  } catch (error) {
    console.error('Error saving focus session:', error);
  }
}

/**
 * Get all focus sessions
 */
export async function getFocusSessions(): Promise<FocusSession[]> {
  try {
    const jsonValue = await AsyncStorage.getItem(SESSIONS_KEY);
    if (jsonValue !== null) {
      const sessions = JSON.parse(jsonValue);
      // Convert date strings back to Date objects
      return sessions.map((s: any) => ({
        ...s,
        startTime: new Date(s.startTime),
        endTime: s.endTime ? new Date(s.endTime) : undefined,
      }));
    }
    return [];
  } catch (error) {
    console.error('Error getting focus sessions:', error);
    return [];
  }
}

/**
 * Update focus stats
 */
async function updateFocusStats(session: FocusSession): Promise<void> {
  try {
    const stats = await getFocusStats();
    
    stats.totalSessions += 1;
    
    if (session.completed) {
      stats.completedSessions += 1;
      stats.totalMinutes += session.duration;
      stats.currentStreak += 1;
    } else {
      stats.currentStreak = 0;
    }
    
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('Error updating focus stats:', error);
  }
}

/**
 * Get focus stats
 */
export async function getFocusStats(): Promise<FocusStats> {
  try {
    const jsonValue = await AsyncStorage.getItem(STATS_KEY);
    if (jsonValue !== null) {
      return JSON.parse(jsonValue);
    }
    return {
      totalSessions: 0,
      totalMinutes: 0,
      completedSessions: 0,
      currentStreak: 0,
    };
  } catch (error) {
    console.error('Error getting focus stats:', error);
    return {
      totalSessions: 0,
      totalMinutes: 0,
      completedSessions: 0,
      currentStreak: 0,
    };
  }
}

/**
 * Get today's focus time
 */
export async function getTodayFocusTime(): Promise<number> {
  try {
    const sessions = await getFocusSessions();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySessions = sessions.filter(s => {
      const sessionDate = new Date(s.startTime);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime() && s.completed;
    });
    
    return todaySessions.reduce((total, session) => total + session.duration, 0);
  } catch (error) {
    console.error('Error getting today focus time:', error);
    return 0;
  }
}

/**
 * Get blocking settings
 */
export async function getBlockingSettings(): Promise<BlockingSettings> {
  try {
    const jsonValue = await AsyncStorage.getItem(BLOCKING_SETTINGS_KEY);
    if (jsonValue !== null) {
      return JSON.parse(jsonValue);
    }
    return {
      enableAppBlocking: false,
      enableNSFWBlocking: true, // Default to enabled for content protection
      blockedApps: [],
    };
  } catch (error) {
    console.error('Error getting blocking settings:', error);
    return {
      enableAppBlocking: false,
      enableNSFWBlocking: true,
      blockedApps: [],
    };
  }
}

/**
 * Save blocking settings
 */
export async function saveBlockingSettings(settings: BlockingSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(BLOCKING_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving blocking settings:', error);
  }
}

/**
 * Add or update a blocked app
 */
export async function updateBlockedApp(app: BlockedApp): Promise<void> {
  try {
    const settings = await getBlockingSettings();
    const existingIndex = settings.blockedApps.findIndex(a => a.id === app.id);
    
    if (existingIndex >= 0) {
      settings.blockedApps[existingIndex] = app;
    } else {
      settings.blockedApps.push(app);
    }
    
    await saveBlockingSettings(settings);
  } catch (error) {
    console.error('Error updating blocked app:', error);
  }
}

/**
 * Remove a blocked app
 */
export async function removeBlockedApp(appId: string): Promise<void> {
  try {
    const settings = await getBlockingSettings();
    settings.blockedApps = settings.blockedApps.filter(a => a.id !== appId);
    await saveBlockingSettings(settings);
  } catch (error) {
    console.error('Error removing blocked app:', error);
  }
}

/**
 * Set focus mode active status
 */
export async function setFocusModeActive(isActive: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVE_FOCUS_KEY, JSON.stringify(isActive));
  } catch (error) {
    console.error('Error setting focus mode active:', error);
  }
}

/**
 * Check if focus mode is active
 */
export async function isFocusModeActive(): Promise<boolean> {
  try {
    const jsonValue = await AsyncStorage.getItem(ACTIVE_FOCUS_KEY);
    if (jsonValue !== null) {
      return JSON.parse(jsonValue);
    }
    return false;
  } catch (error) {
    console.error('Error checking focus mode:', error);
    return false;
  }
}

/**
 * Check if a URL contains NSFW content
 * Note: This is a basic keyword-based detection. For production use,
 * implement a proper content filtering service or native VPN-based solution.
 */
export function checkNSFWContent(url: string): boolean {
  const nsfwKeywords = [
    'porn', 'xxx', 'adult', 'sex', 'nude', 'nsfw', 'erotic',
    'hentai', 'xvideos', 'pornhub', 'xhamster', 'redtube',
    'youporn', 'tube8', 'spankwire', 'keezmovies', 'extremetube',
  ];
  
  const lowerUrl = url.toLowerCase();
  return nsfwKeywords.some(keyword => lowerUrl.includes(keyword));
}

/**
 * Show NSFW blocked alert
 */
export function showNSFWBlockedAlert(): void {
  Alert.alert(
    '🛡️ Content Blocked',
    'This content has been blocked by DEEN AI for your spiritual well-being and protection.',
    [
      {
        text: 'Understood',
        style: 'default',
      }
    ],
    { cancelable: false }
  );
}

/**
 * Show app blocked alert
 */
export function showAppBlockedAlert(appName: string): void {
  Alert.alert(
    '⏰ Focus Mode Active',
    `${appName} is blocked during Focus Mode. Stay focused on what matters.`,
    [
      {
        text: 'Okay',
        style: 'default',
      }
    ],
    { cancelable: false }
  );
}

/**
 * Check if app should be blocked
 * Note: Actual app blocking requires native implementation
 */
export async function shouldBlockApp(packageName: string): Promise<boolean> {
  try {
    const isActive = await isFocusModeActive();
    if (!isActive) return false;
    
    const settings = await getBlockingSettings();
    if (!settings.enableAppBlocking) return false;
    
    const blockedApp = settings.blockedApps.find(
      a => a.packageName === packageName && a.enabled
    );
    
    return blockedApp !== undefined;
  } catch (error) {
    console.error('Error checking if app should be blocked:', error);
    return false;
  }
}

/**
 * Get sample apps for blocking configuration
 * In a real implementation, this would query installed apps from the device
 */
export function getSampleApps(): BlockedApp[] {
  return [
    {
      id: '1',
      name: 'Instagram',
      packageName: 'com.instagram.android',
      enabled: false,
    },
    {
      id: '2',
      name: 'TikTok',
      packageName: 'com.zhiliaoapp.musically',
      enabled: false,
    },
    {
      id: '3',
      name: 'Facebook',
      packageName: 'com.facebook.katana',
      enabled: false,
    },
    {
      id: '4',
      name: 'Twitter/X',
      packageName: 'com.twitter.android',
      enabled: false,
    },
    {
      id: '5',
      name: 'YouTube',
      packageName: 'com.google.android.youtube',
      enabled: false,
    },
    {
      id: '6',
      name: 'Snapchat',
      packageName: 'com.snapchat.android',
      enabled: false,
    },
    {
      id: '7',
      name: 'Reddit',
      packageName: 'com.reddit.frontpage',
      enabled: false,
    },
    {
      id: '8',
      name: 'WhatsApp',
      packageName: 'com.whatsapp',
      enabled: false,
    },
  ];
}
