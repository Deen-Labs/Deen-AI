import Constants, { ExecutionEnvironment } from 'expo-constants';
import { PrayerTimings } from './prayerTimes';

// Expo Go on Android removed native push notifications in SDK 53+.
// Standalone development builds (expo run:android / EAS Build) support it fully.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: typeof import('expo-notifications') | null = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (error) {
    console.warn('[SalahNotifications] expo-notifications not available:', error);
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (isExpoGo || !Notifications) {
    return false;
  }
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

export async function cancelAllSalahNotifications(): Promise<void> {
  if (isExpoGo || !Notifications) {
    return;
  }
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling notifications:', error);
  }
}

export async function scheduleSalahNotifications(timings: PrayerTimings): Promise<void> {
  if (isExpoGo || !Notifications) {
    return;
  }
  try {
    await cancelAllSalahNotifications();

    const prayers = [
      { name: 'Fajr', time: timings.Fajr },
      { name: 'Dhuhr', time: timings.Dhuhr },
      { name: 'Asr', time: timings.Asr },
      { name: 'Maghrib', time: timings.Maghrib },
      { name: 'Isha', time: timings.Isha },
    ];

    const now = new Date();

    for (const prayer of prayers) {
      if (!prayer.time) continue;

      const [hours, minutes] = prayer.time.split(':').map(Number);
      
      const prayerDate = new Date(now);
      prayerDate.setHours(hours, minutes, 0, 0);

      // Skip if the prayer time has already passed today
      if (prayerDate <= now) {
        continue;
      }

      // Schedule exact time notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🕌 Time for ${prayer.name}`,
          body: `It's time for ${prayer.name} prayer. May Allah accept your salah.`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: prayerDate,
        },
      });

      // Schedule 15 minutes before notification
      const prePrayerDate = new Date(prayerDate.getTime() - 15 * 60000);
      
      if (prePrayerDate > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `⏰ ${prayer.name} in 15 minutes`,
            body: `${prayer.name} prayer is approaching. Prepare for salah.`,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: prePrayerDate,
          },
        });
      }
    }
  } catch (error) {
    console.error('Error scheduling salah notifications:', error);
  }
}
