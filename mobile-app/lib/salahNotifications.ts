import Constants, { ExecutionEnvironment } from 'expo-constants';
import { PrayerTimings, parsePrayerTimeToMinutes } from './prayerTimes';
import { loadSettings, AppSettings } from './settings';
import { getDefaultMasjidId } from './masjidTimingSync';
import { fetchSalahTimeMasjids } from './salahTimeBackend';
import { Masjid } from './masjid';

const isExpoGo = (Constants as any).appOwnership === 'expo' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: typeof import('expo-notifications') | null = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (error) {
    console.log('[SalahNotifications] expo-notifications not available:', error instanceof Error ? error.message : error);
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

export interface PrayerNotificationScheduleItem {
  name: 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha' | 'Jummah';
  athanTime?: string;
  jamaatTime?: string;
}

/**
 * Schedule local notifications matching legacy SalahTime behavior.
 * Resolves Default Masjid timings, checks granular user preferences,
 * and schedules alerts for exact Athan time and pre-Jama'at reminders.
 */
export async function scheduleSalahNotifications(
  fallbackTimings?: PrayerTimings,
  overrideMasjid?: Masjid,
  customSettings?: AppSettings
): Promise<void> {
  if (isExpoGo || !Notifications) {
    return;
  }

  try {
    const settings = customSettings || (await loadSettings());
    await cancelAllSalahNotifications();

    if (!settings.notificationsEnabled) {
      return;
    }

    // Resolve Default Masjid
    let masjid: Masjid | null = overrideMasjid || null;
    if (!masjid) {
      try {
        const defId = await getDefaultMasjidId();
        if (defId) {
          const list = await fetchSalahTimeMasjids();
          const found = list.find(
            (m) =>
              m.id === defId ||
              m.id.replace(/^salahtime-/, '') === defId.replace(/^salahtime-/, '')
          );
          if (found) masjid = found;
        }
      } catch (err) {
        console.warn('[SalahNotifications] Error resolving default masjid:', err);
      }
    }

    const isFriday = new Date().getDay() === 5;
    const now = new Date();
    const masjidName = masjid ? masjid.name : 'Your Local Masjid';

    const prayersToSchedule: PrayerNotificationScheduleItem[] = [];

    // Fajr
    prayersToSchedule.push({
      name: 'Fajr',
      athanTime: masjid?.athanTimes?.Fajr || fallbackTimings?.Fajr,
      jamaatTime: masjid?.iqamahTimes?.Fajr || fallbackTimings?.Fajr,
    });

    // Dhuhr / Jummah on Friday
    if (isFriday) {
      prayersToSchedule.push({
        name: 'Jummah',
        athanTime: masjid?.jummahAthan || masjid?.athanTimes?.Dhuhr || fallbackTimings?.Dhuhr || '01:00 PM',
        jamaatTime: masjid?.jummah || '01:30 PM',
      });
    } else {
      prayersToSchedule.push({
        name: 'Dhuhr',
        athanTime: masjid?.athanTimes?.Dhuhr || fallbackTimings?.Dhuhr,
        jamaatTime: masjid?.iqamahTimes?.Dhuhr || fallbackTimings?.Dhuhr,
      });
    }

    // Asr
    prayersToSchedule.push({
      name: 'Asr',
      athanTime: masjid?.athanTimes?.Asr || fallbackTimings?.Asr,
      jamaatTime: masjid?.iqamahTimes?.Asr || fallbackTimings?.Asr,
    });

    // Maghrib
    prayersToSchedule.push({
      name: 'Maghrib',
      athanTime: masjid?.athanTimes?.Maghrib || fallbackTimings?.Maghrib,
      jamaatTime: masjid?.iqamahTimes?.Maghrib || fallbackTimings?.Maghrib,
    });

    // Isha
    prayersToSchedule.push({
      name: 'Isha',
      athanTime: masjid?.athanTimes?.Isha || fallbackTimings?.Isha,
      jamaatTime: masjid?.iqamahTimes?.Isha || fallbackTimings?.Isha,
    });

    for (const prayer of prayersToSchedule) {
      // Check if this prayer is enabled in granular settings
      const isEnabled = settings.perPrayerEnabled[prayer.name];
      if (!isEnabled) continue;

      // 1. Exact Athan Notification
      if (settings.notifyAtAthan && prayer.athanTime) {
        const athanMins = parsePrayerTimeToMinutes(prayer.athanTime, prayer.name);
        if (athanMins >= 0) {
          const athanHours = Math.floor(athanMins / 60);
          const athanMinutes = athanMins % 60;

          const athanDate = new Date(now);
          athanDate.setHours(athanHours, athanMinutes, 0, 0);

          if (athanDate > now) {
            try {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: `Time for ${prayer.name} Athan`,
                  body: `Athan is being called at ${masjidName}. Prepare for prayer.`,
                  sound: true,
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.DATE,
                  date: athanDate,
                },
              });
            } catch (err) {
              console.warn(`[SalahNotifications] Failed to schedule Athan for ${prayer.name}:`, err);
            }
          }
        }
      }

      // 2. Pre-Jama'at Reminder (15 mins before congregation)
      if (settings.notifyBeforeJamaat && prayer.jamaatTime) {
        const jamaatMins = parsePrayerTimeToMinutes(prayer.jamaatTime, prayer.name);
        if (jamaatMins >= 0) {
          const jHours = Math.floor(jamaatMins / 60);
          const jMinutes = jamaatMins % 60;

          const jamaatDate = new Date(now);
          jamaatDate.setHours(jHours, jMinutes, 0, 0);

          const offsetMins = settings.beforeJamaatMinutes || 15;
          const preReminderDate = new Date(jamaatDate.getTime() - offsetMins * 60000);

          if (preReminderDate > now) {
            try {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: `${prayer.name} Jama'at in ${offsetMins} minutes`,
                  body: `${prayer.name} congregation begins in ${offsetMins} mins at ${masjidName}. Proceed with wudhu.`,
                  sound: true,
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.DATE,
                  date: preReminderDate,
                },
              });
            } catch (err) {
              console.warn(`[SalahNotifications] Failed to schedule pre-Jama'at for ${prayer.name}:`, err);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[SalahNotifications] scheduleSalahNotifications error:', error);
  }
}
