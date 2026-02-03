import AsyncStorage from '@react-native-async-storage/async-storage';

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

const SESSIONS_KEY = '@deen_ai_focus_sessions';
const STATS_KEY = '@deen_ai_focus_stats';

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
