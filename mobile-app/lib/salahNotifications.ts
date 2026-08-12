import * as Notifications from 'expo-notifications';
import { PrayerTimings } from './prayerTimes';

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

export async function cancelAllSalahNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling notifications:', error);
  }
}

export async function scheduleSalahNotifications(timings: PrayerTimings): Promise<void> {
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
            date: prePrayerDate,
          },
        });
      }
    }
  } catch (error) {
    console.error('Error scheduling salah notifications:', error);
  }
}
