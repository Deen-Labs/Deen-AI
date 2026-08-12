import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_COUNT_KEY = '@deen_ai_streak_count';
const STREAK_START_DATE_KEY = '@deen_ai_streak_start_date';
const LAST_RESET_REASON_KEY = '@deen_ai_last_reset_reason';
const LAST_CHECK_DATE_KEY = '@deen_ai_last_check_date';
const STREAK_HISTORY_KEY = '@deen_ai_streak_history';

type StreakHistoryEntry = {
  date: string;
  streak: number;
  resetReason: string;
};

export async function getStreak(): Promise<{ currentStreak: number; startDate: string | null; lastResetReason: string | null }> {
  try {
    const [streakCount, startDate, lastResetReason] = await Promise.all([
      AsyncStorage.getItem(STREAK_COUNT_KEY),
      AsyncStorage.getItem(STREAK_START_DATE_KEY),
      AsyncStorage.getItem(LAST_RESET_REASON_KEY)
    ]);
    
    return {
      currentStreak: streakCount ? parseInt(streakCount, 10) : 0,
      startDate,
      lastResetReason
    };
  } catch (error) {
    console.error('Error getting streak:', error);
    return { currentStreak: 0, startDate: null, lastResetReason: null };
  }
}

export async function resetStreak(reason: 'vpn_disabled' | 'content_blocked'): Promise<void> {
  try {
    const { currentStreak, startDate } = await getStreak();
    const today = new Date().toISOString();
    
    // Save to history before resetting
    if (currentStreak > 0 || startDate) {
      const historyStr = await AsyncStorage.getItem(STREAK_HISTORY_KEY);
      const history: StreakHistoryEntry[] = historyStr ? JSON.parse(historyStr) : [];
      
      history.push({
        date: today,
        streak: currentStreak,
        resetReason: reason
      });
      
      await AsyncStorage.setItem(STREAK_HISTORY_KEY, JSON.stringify(history));
    }
    
    await Promise.all([
      AsyncStorage.setItem(STREAK_COUNT_KEY, '0'),
      AsyncStorage.setItem(STREAK_START_DATE_KEY, today),
      AsyncStorage.setItem(LAST_RESET_REASON_KEY, reason),
      AsyncStorage.setItem(LAST_CHECK_DATE_KEY, today.split('T')[0])
    ]);
  } catch (error) {
    console.error('Error resetting streak:', error);
  }
}

export async function checkAndUpdateStreak(): Promise<number> {
  try {
    const { currentStreak, startDate } = await getStreak();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const lastCheckDate = await AsyncStorage.getItem(LAST_CHECK_DATE_KEY);

    if (!startDate) {
      await Promise.all([
        AsyncStorage.setItem(STREAK_COUNT_KEY, '0'),
        AsyncStorage.setItem(STREAK_START_DATE_KEY, today.toISOString()),
        AsyncStorage.setItem(LAST_CHECK_DATE_KEY, todayStr)
      ]);
      return 0;
    }

    if (lastCheckDate === todayStr) {
      return currentStreak;
    }
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > currentStreak) {
      await AsyncStorage.setItem(STREAK_COUNT_KEY, diffDays.toString());
      await AsyncStorage.setItem(LAST_CHECK_DATE_KEY, todayStr);
      return diffDays;
    }
    
    return currentStreak;
  } catch (error) {
    console.error('Error checking streak:', error);
    return 0;
  }
}

export async function recordBlockEvent(): Promise<void> {
  await resetStreak('content_blocked');
}

export async function recordVPNDisabled(): Promise<void> {
  await resetStreak('vpn_disabled');
}

export async function getStreakHistory(): Promise<Array<{ date: string; streak: number; resetReason?: string }>> {
  try {
    const historyStr = await AsyncStorage.getItem(STREAK_HISTORY_KEY);
    return historyStr ? JSON.parse(historyStr) : [];
  } catch (error) {
    console.error('Error getting streak history:', error);
    return [];
  }
}
