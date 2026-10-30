import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { nativeContentProtection } from './nativeContentProtection';

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
  icon?: string;
  iconFamily?: 'Feather' | 'MaterialCommunityIcons';
  color?: string;
  category?: 'social' | 'games' | 'media' | 'system' | 'custom';
  isCustom?: boolean;
}

export interface FocusSchedule {
  id: string;
  name: string;
  days: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  startHour: number; // 0-23
  startMinute: number; // 0-59
  endHour: number; // 0-23
  endMinute: number; // 0-59
  blockedAppPackages: string[];
  enabled: boolean;
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
const ACTIVE_FOCUS_TIMESTAMP_KEY = '@deen_ai_active_focus_timestamp';
const SCHEDULES_KEY = '@deen_ai_focus_schedules';

export const KNOWN_APP_PACKAGES: Record<string, { name: string; icon: string; color: string; category: 'social' | 'games' | 'media' }> = {
  // Social
  'com.instagram.android': { name: 'Instagram', icon: 'instagram', color: '#E1306C', category: 'social' },
  'com.google.android.youtube': { name: 'YouTube', icon: 'youtube', color: '#FF0000', category: 'media' },
  'com.facebook.katana': { name: 'Facebook', icon: 'facebook', color: '#1877F2', category: 'social' },
  'com.twitter.android': { name: 'X / Twitter', icon: 'twitter', color: '#1DA1F2', category: 'social' },
  'com.snapchat.android': { name: 'Snapchat', icon: 'snapchat', color: '#FFCC00', category: 'social' },
  'com.zhiliaoapp.musically': { name: 'TikTok', icon: 'music-note', color: '#EE1D52', category: 'social' },
  'com.reddit.frontpage': { name: 'Reddit', icon: 'reddit', color: '#FF4500', category: 'social' },
  'com.whatsapp': { name: 'WhatsApp', icon: 'whatsapp', color: '#25D366', category: 'social' },
  'org.telegram.messenger': { name: 'Telegram', icon: 'telegram', color: '#229ED9', category: 'social' },
  'com.discord': { name: 'Discord', icon: 'discord', color: '#5865F2', category: 'social' },
  'com.pinterest': { name: 'Pinterest', icon: 'pinterest', color: '#E60023', category: 'social' },
  // Media / Streaming
  'com.netflix.ninja': { name: 'Netflix', icon: 'netflix', color: '#E50914', category: 'media' },
  'com.netflix.mediaclient': { name: 'Netflix', icon: 'netflix', color: '#E50914', category: 'media' },
  'com.spotify.music': { name: 'Spotify', icon: 'spotify', color: '#1ED760', category: 'media' },
  'com.amazon.avod.thirdpartyclient': { name: 'Prime Video', icon: 'video-vintage', color: '#00A8E1', category: 'media' },
  'tv.twitch.android.app': { name: 'Twitch', icon: 'twitch', color: '#9146FF', category: 'media' },
  // Games
  'com.tencent.ig': { name: 'PUBG Mobile', icon: 'gamepad-variant', color: '#F57C00', category: 'games' },
  'com.dts.freefireth': { name: 'Free Fire', icon: 'fire', color: '#FF5722', category: 'games' },
  'com.roblox.client': { name: 'Roblox', icon: 'cube-outline', color: '#E53935', category: 'games' },
  'com.supercell.brawlstars': { name: 'Brawl Stars', icon: 'star-face', color: '#FFD600', category: 'games' },
  'com.supercell.clashofclans': { name: 'Clash of Clans', icon: 'shield-crown', color: '#8BC34A', category: 'games' },
  'com.supercell.clashroyale': { name: 'Clash Royale', icon: 'crown', color: '#1E88E5', category: 'games' },
  'com.king.candycrushsaga': { name: 'Candy Crush', icon: 'candy', color: '#E91E63', category: 'games' },
  'com.miHoYo.GenshinImpact': { name: 'Genshin Impact', icon: 'sword', color: '#9C27B0', category: 'games' },
  'com.activision.callofduty.shooter': { name: 'CoD Mobile', icon: 'target', color: '#455A64', category: 'games' },
  'com.ea.gp.fifamobile': { name: 'EA Sports FC', icon: 'soccer', color: '#4CAF50', category: 'games' },
  'com.kiloo.subwaysurf': { name: 'Subway Surfers', icon: 'train', color: '#FF9800', category: 'games' },
  'com.gameloft.android.ANMP.GloftA9HM': { name: 'Asphalt 9', icon: 'car-sports', color: '#C2185B', category: 'games' },
  'com.riotgames.league.wildrift': { name: 'Wild Rift', icon: 'shield-sword', color: '#00BCD4', category: 'games' },
  'com.chess': { name: 'Chess.com', icon: 'chess-knight', color: '#81C784', category: 'games' },
  'com.miniclip.eightballpool': { name: '8 Ball Pool', icon: 'circle-multiple', color: '#3F51B5', category: 'games' },
  'com.ludo.king': { name: 'Ludo King', icon: 'dice-5', color: '#E53935', category: 'games' },
  'com.mojang.minecraftpe': { name: 'Minecraft', icon: 'pickaxe', color: '#7CB342', category: 'games' },
  'com.innersloth.spacemafia': { name: 'Among Us', icon: 'alien', color: '#D32F2F', category: 'games' },
};

export function resolveAppMeta(packageName: string, appName?: string): { name: string; icon: string; iconFamily: 'MaterialCommunityIcons'; color: string; category: 'social' | 'games' | 'media' | 'custom' } {
  const known = KNOWN_APP_PACKAGES[packageName];
  if (known) {
    return {
      name: appName || known.name,
      icon: known.icon,
      iconFamily: 'MaterialCommunityIcons',
      color: known.color,
      category: known.category,
    };
  }
  return {
    name: appName || packageName,
    icon: 'apps',
    iconFamily: 'MaterialCommunityIcons',
    color: '#e2a23b',
    category: 'custom',
  };
}

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
      const parsed = JSON.parse(jsonValue);
      // Auto-enable app blocking if user has configured any enabled apps
      if (parsed.enableAppBlocking === undefined) {
        parsed.enableAppBlocking = true;
      }
      return parsed;
    }
    return {
      enableAppBlocking: true, // Default to enabled so selected apps are actively blocked
      enableNSFWBlocking: true,
      blockedApps: [],
    };
  } catch (error) {
    console.error('Error getting blocking settings:', error);
    return {
      enableAppBlocking: true,
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

    const isActive = await isFocusModeActive();
    const endTimestamp = isActive ? await getFocusEndTimestamp() : 0;
    const schedules = await getFocusSchedules();
    const hasAnyEnabledApp = settings.blockedApps.some(a => a.enabled);
    const shouldBlock = settings.enableAppBlocking || hasAnyEnabledApp;
    const enabledPackageNames = shouldBlock
      ? settings.blockedApps.filter(a => a.enabled).map(a => a.packageName)
      : [];
    await nativeContentProtection.syncFocusBlocking(
      isActive,
      enabledPackageNames,
      endTimestamp,
      JSON.stringify(schedules)
    );
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
export async function setFocusModeActive(isActive: boolean, endTimestamp: number = 0): Promise<void> {
  try {
    const effectiveTimestamp = isActive ? endTimestamp : 0;
    await AsyncStorage.setItem(ACTIVE_FOCUS_KEY, JSON.stringify(isActive));
    await AsyncStorage.setItem(ACTIVE_FOCUS_TIMESTAMP_KEY, JSON.stringify(effectiveTimestamp));

    const settings = await getBlockingSettings();
    const hasAnyEnabledApp = settings.blockedApps.some(a => a.enabled);
    const shouldBlock = settings.enableAppBlocking || hasAnyEnabledApp;
    const enabledPackageNames = shouldBlock
      ? settings.blockedApps.filter(a => a.enabled).map(a => a.packageName)
      : [];
    const schedules = await getFocusSchedules();
    await nativeContentProtection.syncFocusBlocking(
      isActive,
      enabledPackageNames,
      effectiveTimestamp,
      JSON.stringify(schedules)
    );
  } catch (error) {
    console.error('Error setting focus mode active:', error);
  }
}

export async function getFocusSchedules(): Promise<FocusSchedule[]> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Error getting focus schedules:', error);
    return [];
  }
}

export async function saveFocusSchedule(schedule: FocusSchedule): Promise<void> {
  try {
    const schedules = await getFocusSchedules();
    const idx = schedules.findIndex(s => s.id === schedule.id);
    if (idx >= 0) {
      schedules[idx] = schedule;
    } else {
      schedules.push(schedule);
    }
    await AsyncStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
    await syncSchedulesWithNative();
  } catch (error) {
    console.error('Error saving focus schedule:', error);
  }
}

export async function deleteFocusSchedule(scheduleId: string): Promise<void> {
  try {
    const schedules = await getFocusSchedules();
    const updated = schedules.filter(s => s.id !== scheduleId);
    await AsyncStorage.setItem(SCHEDULES_KEY, JSON.stringify(updated));
    await syncSchedulesWithNative();
  } catch (error) {
    console.error('Error deleting focus schedule:', error);
  }
}

export async function toggleFocusSchedule(scheduleId: string, enabled: boolean): Promise<void> {
  try {
    const schedules = await getFocusSchedules();
    const sched = schedules.find(s => s.id === scheduleId);
    if (sched) {
      sched.enabled = enabled;
      await AsyncStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
      await syncSchedulesWithNative();
    }
  } catch (error) {
    console.error('Error toggling focus schedule:', error);
  }
}

export async function syncSchedulesWithNative(): Promise<void> {
  try {
    const schedules = await getFocusSchedules();
    const active = await isFocusModeActive();
    const settings = await getBlockingSettings();
    const enabledPackages = settings.blockedApps.filter(a => a.enabled).map(a => a.packageName);
    const rawTs = await AsyncStorage.getItem(ACTIVE_FOCUS_TIMESTAMP_KEY);
    const endTimestamp = rawTs ? JSON.parse(rawTs) : 0;
    await nativeContentProtection.syncFocusBlocking(
      active,
      enabledPackages,
      endTimestamp,
      JSON.stringify(schedules)
    );
  } catch (error) {
    console.error('Error syncing schedules with native:', error);
  }
}

/**
 * Get active focus session target end timestamp
 */
export async function getFocusEndTimestamp(): Promise<number> {
  try {
    const jsonValue = await AsyncStorage.getItem(ACTIVE_FOCUS_TIMESTAMP_KEY);
    if (jsonValue !== null) {
      return JSON.parse(jsonValue);
    }
    return 0;
  } catch (error) {
    console.error('Error getting focus end timestamp:', error);
    return 0;
  }
}

/**
 * Check if focus mode is actively running and unexpired
 */
export async function isFocusModeActive(): Promise<boolean> {
  try {
    const jsonValue = await AsyncStorage.getItem(ACTIVE_FOCUS_KEY);
    const isActive = jsonValue !== null ? JSON.parse(jsonValue) : false;
    if (!isActive) return false;

    const endTimestamp = await getFocusEndTimestamp();
    const now = Date.now();
    if (endTimestamp > 0 && now >= endTimestamp) {
      // Focus session has ended while away
      await setFocusModeActive(false, 0);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error checking focus mode:', error);
    return false;
  }
}

/**
 * Retrieve active focus session details for resuming in-flight timers
 */
export async function getActiveFocusSessionDetails(): Promise<{
  isActive: boolean;
  endTimestamp: number;
  remainingSeconds: number;
}> {
  try {
    const jsonValue = await AsyncStorage.getItem(ACTIVE_FOCUS_KEY);
    const isActive = jsonValue !== null ? JSON.parse(jsonValue) : false;
    if (!isActive) {
      return { isActive: false, endTimestamp: 0, remainingSeconds: 0 };
    }

    const endTimestamp = await getFocusEndTimestamp();
    const now = Date.now();
    if (endTimestamp > 0 && now < endTimestamp) {
      const remainingSeconds = Math.max(0, Math.round((endTimestamp - now) / 1000));
      return { isActive: true, endTimestamp, remainingSeconds };
    } else {
      // Expired while app was backgrounded
      await setFocusModeActive(false, 0);
      return { isActive: false, endTimestamp: 0, remainingSeconds: 0 };
    }
  } catch (error) {
    console.error('Error getting active focus session details:', error);
    return { isActive: false, endTimestamp: 0, remainingSeconds: 0 };
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
    'Content Blocked',
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
    'Focus Mode Active',
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
      icon: 'instagram',
      iconFamily: 'MaterialCommunityIcons',
      color: '#E1306C',
      category: 'social',
    },
    {
      id: '2',
      name: 'YouTube',
      packageName: 'com.google.android.youtube',
      enabled: false,
      icon: 'youtube',
      iconFamily: 'MaterialCommunityIcons',
      color: '#FF0000',
      category: 'media',
    },
    {
      id: '3',
      name: 'TikTok',
      packageName: 'com.zhiliaoapp.musically',
      enabled: false,
      icon: 'music-note',
      iconFamily: 'MaterialCommunityIcons',
      color: '#EE1D52',
      category: 'social',
    },
    {
      id: '4',
      name: 'Facebook',
      packageName: 'com.facebook.katana',
      enabled: false,
      icon: 'facebook',
      iconFamily: 'MaterialCommunityIcons',
      color: '#1877F2',
      category: 'social',
    },
    {
      id: '5',
      name: 'X / Twitter',
      packageName: 'com.twitter.android',
      enabled: false,
      icon: 'twitter',
      iconFamily: 'MaterialCommunityIcons',
      color: '#1DA1F2',
      category: 'social',
    },
    {
      id: '6',
      name: 'Snapchat',
      packageName: 'com.snapchat.android',
      enabled: false,
      icon: 'snapchat',
      iconFamily: 'MaterialCommunityIcons',
      color: '#FFCC00',
      category: 'social',
    },
    {
      id: '7',
      name: 'PUBG Mobile',
      packageName: 'com.tencent.ig',
      enabled: false,
      icon: 'gamepad-variant',
      iconFamily: 'MaterialCommunityIcons',
      color: '#F57C00',
      category: 'games',
    },
    {
      id: '8',
      name: 'Free Fire',
      packageName: 'com.dts.freefireth',
      enabled: false,
      icon: 'fire',
      iconFamily: 'MaterialCommunityIcons',
      color: '#FF5722',
      category: 'games',
    },
    {
      id: '9',
      name: 'Roblox',
      packageName: 'com.roblox.client',
      enabled: false,
      icon: 'cube-outline',
      iconFamily: 'MaterialCommunityIcons',
      color: '#E53935',
      category: 'games',
    },
    {
      id: '10',
      name: 'Brawl Stars',
      packageName: 'com.supercell.brawlstars',
      enabled: false,
      icon: 'star-face',
      iconFamily: 'MaterialCommunityIcons',
      color: '#FFD600',
      category: 'games',
    },
    {
      id: '11',
      name: 'Netflix',
      packageName: 'com.netflix.ninja',
      enabled: false,
      icon: 'netflix',
      iconFamily: 'MaterialCommunityIcons',
      color: '#E50914',
      category: 'media',
    },
    {
      id: '12',
      name: 'WhatsApp',
      packageName: 'com.whatsapp',
      enabled: false,
      icon: 'whatsapp',
      iconFamily: 'MaterialCommunityIcons',
      color: '#25D366',
      category: 'social',
    },
  ];
}
