import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImamSession } from './masjidTimingSync';
import { fetchSalahTimeJuma, fetchSalahTimeMasjids, getMasjidJumaTopics, parseFridayDate } from './salahTimeBackend';
import { Masjid } from './masjid';
import { parsePrayerTimeToMinutes } from './prayerTimes';
import { UserProfile, canManageMasjid } from './auth';

const isExpoGo = (Constants as any).appOwnership === 'expo' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: typeof import('expo-notifications') | null = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (error) {
    console.log('[MuazzinNotifications] expo-notifications not available:', error instanceof Error ? error.message : error);
  }
}

const STORAGE_KEY_SCHEDULED_IDS = '@deen_muazzin_scheduled_notif_ids_v1';
export const STORAGE_KEY_NOTIFICATION_STATUS = '@deen_muazzin_notif_status_v1';

export interface MuazzinReminderStatus {
  status: 'silenced_already_posted' | 'scheduled' | 'no_session' | 'permissions_denied';
  masjidName?: string;
  nextScheduledTime?: string;
  stage?: 'thursday_isha' | 'friday_fajr' | 'friday_2hr_before' | 'none';
  targetFridayDate?: string;
  lastCheckedAt: string;
}

/**
 * Request notification permissions for Muazzin reminders
 */
export async function requestMuazzinNotificationPermissions(): Promise<boolean> {
  if (isExpoGo || !Notifications) return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('[MuazzinNotifications] Permission request error:', err);
    return false;
  }
}

/**
 * Cancel any existing Muazzin Khutbah reminders
 */
export async function cancelMuazzinKhutbahNotifications(): Promise<void> {
  if (isExpoGo || !Notifications) return;
  try {
    const rawIds = await AsyncStorage.getItem(STORAGE_KEY_SCHEDULED_IDS);
    if (rawIds) {
      const ids: string[] = JSON.parse(rawIds);
      for (const id of ids) {
        try {
          await Notifications.cancelScheduledNotificationAsync(id);
        } catch {}
      }
      await AsyncStorage.removeItem(STORAGE_KEY_SCHEDULED_IDS);
    }
  } catch (err) {
    console.warn('[MuazzinNotifications] Error canceling reminders:', err);
  }
}

/**
 * Calculate the next upcoming Friday date.
 * If today is Friday before 1:30 PM, returns today.
 * If today is Friday after 1:30 PM, returns next Friday (7 days).
 */
export function getUpcomingFriday(now: Date = new Date()): Date {
  const target = new Date(now);
  const day = target.getDay(); // 0 is Sun, 5 is Fri, 6 is Sat

  if (day === 5) {
    // Today is Friday: if past 1:30 PM, target next Friday
    if (target.getHours() >= 13 && target.getMinutes() >= 30) {
      target.setDate(target.getDate() + 7);
    }
  } else {
    // Days until next Friday
    const daysUntilFriday = (5 - day + 7) % 7;
    target.setDate(target.getDate() + daysUntilFriday);
  }

  target.setHours(13, 0, 0, 0); // Jumu'ah target time base
  return target;
}

/**
 * Check if the Muazzin has already posted/updated this week's Jumu'ah topic
 */
export async function hasMuazzinUpdatedThisWeeksTopic(
  masjidId: string,
  masjidName: string,
  targetFriday: Date
): Promise<boolean> {
  try {
    const allJumas = await fetchSalahTimeJuma();
    const history = getMasjidJumaTopics(masjidId, masjidName, allJumas);

    if (!history.current) return false;

    // Check if the current topic timestamp is within 6 days of the target Friday
    const topicTimestamp = parseFridayDate(history.current.fridayDateStr || history.current.fridayDate);
    if (topicTimestamp === 0) return false;

    const diffMs = Math.abs(targetFriday.getTime() - topicTimestamp);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    // If topic was published within 4 days of target Friday, it is considered updated!
    return diffDays <= 4;
  } catch (err) {
    console.warn('[MuazzinNotifications] Error checking topic timeline:', err);
    return false;
  }
}

/**
 * Synchronize Muazzin Khutbah Reminders with 3-Stage Drip and Smart Silence:
 * - Stage 1: Thursday Night at Isha prayer time (night of Friday)
 * - Stage 2: Friday Morning at Fajr prayer time
 * - Stage 3: Friday 2 Hours before Jumu'ah Azaan
 * - Smart Silence: If topic is already updated in database, cancel and suppress reminders!
 */
export async function syncMuazzinKhutbahReminders(
  session: ImamSession | null
): Promise<MuazzinReminderStatus> {
  const now = new Date();

  // 1. If not logged in as Muazzin, cancel reminders
  if (!session || !session.masjidId) {
    await cancelMuazzinKhutbahNotifications();
    const status: MuazzinReminderStatus = {
      status: 'no_session',
      lastCheckedAt: now.toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEY_NOTIFICATION_STATUS, JSON.stringify(status));
    return status;
  }

  // 2. Resolve Muazzin's Masjid details
  const masjids = await fetchSalahTimeMasjids();
  const targetMasjid = masjids.find(m => m.id === session.masjidId || m.name.toLowerCase().includes(session.imamName.toLowerCase())) || {
    id: session.masjidId,
    name: 'Your Masjid',
    athanTimes: { Fajr: '05:15', Dhuhr: '12:45', Asr: '16:30', Maghrib: '17:55', Isha: '20:00' },
    iqamahTimes: { Fajr: '05:30', Dhuhr: '13:00', Asr: '16:45', Maghrib: '18:00', Isha: '20:15' },
    jummahAthan: '12:45 PM',
    jummah: '01:15 PM',
  } as Masjid;

  // 3. Check if already updated in database timeline
  const targetFriday = getUpcomingFriday(now);
  const alreadyUpdated = await hasMuazzinUpdatedThisWeeksTopic(targetMasjid.id, targetMasjid.name, targetFriday);

  if (alreadyUpdated) {
    // Topic is already published! Smart Silence: stop any pending notifications
    await cancelMuazzinKhutbahNotifications();
    const status: MuazzinReminderStatus = {
      status: 'silenced_already_posted',
      masjidName: targetMasjid.name,
      stage: 'none',
      targetFridayDate: targetFriday.toLocaleDateString('en-GB'),
      lastCheckedAt: now.toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEY_NOTIFICATION_STATUS, JSON.stringify(status));
    console.log(`[MuazzinNotifications] Topic already posted for ${targetMasjid.name} (${targetFriday.toLocaleDateString('en-GB')}). Reminders silenced.`);
    return status;
  }

  // 4. Topic NOT yet updated: Calculate 3 reminder stages
  // Stage 1: Thursday Night at Isha (Crash-proof 12h/24h parsing)
  const thursdayNightIsha = new Date(targetFriday);
  thursdayNightIsha.setDate(targetFriday.getDate() - 1); // Thursday
  const ishaTime = targetMasjid.iqamahTimes?.Isha || targetMasjid.athanTimes?.Isha || '20:15';
  const ishaMins = parsePrayerTimeToMinutes(ishaTime, 'Isha');
  const ishaH = ishaMins >= 0 ? Math.floor(ishaMins / 60) : 20;
  const ishaM = ishaMins >= 0 ? ishaMins % 60 : 15;
  thursdayNightIsha.setHours(ishaH, ishaM, 0, 0);

  // Stage 2: Friday Morning at Fajr (Crash-proof 12h/24h parsing)
  const fridayMorningFajr = new Date(targetFriday);
  const fajrTime = targetMasjid.iqamahTimes?.Fajr || targetMasjid.athanTimes?.Fajr || '05:15';
  const fajrMins = parsePrayerTimeToMinutes(fajrTime, 'Fajr');
  const fajrH = fajrMins >= 0 ? Math.floor(fajrMins / 60) : 5;
  const fajrM = fajrMins >= 0 ? fajrMins % 60 : 15;
  fridayMorningFajr.setHours(fajrH, fajrM, 0, 0);

  // Stage 3: Friday 2 Hours Before Jumu'ah Azaan
  const fridayTwoHoursBefore = new Date(targetFriday);
  let jumaAthanH = 12;
  let jumaAthanM = 45;
  if (targetMasjid.jummahAthan) {
    const match = targetMasjid.jummahAthan.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      jumaAthanH = parseInt(match[1], 10);
      if (match[3]?.toUpperCase() === 'PM' && jumaAthanH < 12) jumaAthanH += 12;
      jumaAthanM = parseInt(match[2], 10);
    }
  }
  fridayTwoHoursBefore.setHours(jumaAthanH - 2, jumaAthanM, 0, 0);

  // 5. Schedule future stages using expo-notifications
  await cancelMuazzinKhutbahNotifications();

  const stagesToSchedule: Array<{ date: Date; title: string; body: string; stage: 'thursday_isha' | 'friday_fajr' | 'friday_2hr_before' }> = [
    {
      date: thursdayNightIsha,
      title: 'Upcoming Jumu\'ah Khutbah Reminder',
      body: `Assalamu Alaikum ${session.imamName}, prepare your congregation for tomorrow's Jumu'ah. Please post tomorrow's Khutbah topic and Khateeb for ${targetMasjid.name}.`,
      stage: 'thursday_isha',
    },
    {
      date: fridayMorningFajr,
      title: 'Friday Fajr Reminder: Jumu\'ah Khutbah',
      body: `Jumu'ah Mubarak ${session.imamName}! Congregants are deciding which masjid to attend today. Tap to publish today's Khutbah topic for ${targetMasjid.name}.`,
      stage: 'friday_fajr',
    },
    {
      date: fridayTwoHoursBefore,
      title: 'Final Reminder: 2 Hours Until Jumu\'ah Azaan',
      body: `Khutbah commences in 2 hours at ${targetMasjid.name}. Please confirm today's topic and speaker so it displays on nearby congregants' screens.`,
      stage: 'friday_2hr_before',
    },
  ];

  const scheduledIds: string[] = [];
  let nextStage: 'thursday_isha' | 'friday_fajr' | 'friday_2hr_before' | 'none' = 'none';
  let nextScheduledTime: string | undefined = undefined;

  if (!isExpoGo && Notifications) {
    for (const item of stagesToSchedule) {
      if (item.date > now) {
        try {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: item.title,
              body: item.body,
              data: {
                type: 'muazzin_khutbah_reminder',
                stage: item.stage,
                masjidId: targetMasjid.id,
                masjidName: targetMasjid.name,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: item.date,
            },
          });
          scheduledIds.push(id);
          if (nextStage === 'none') {
            nextStage = item.stage;
            nextScheduledTime = item.date.toLocaleString();
          }
        } catch (err) {
          console.warn(`[MuazzinNotifications] Error scheduling stage ${item.stage}:`, err);
        }
      }
    }

    if (scheduledIds.length > 0) {
      await AsyncStorage.setItem(STORAGE_KEY_SCHEDULED_IDS, JSON.stringify(scheduledIds));
    }
  }

  const resultStatus: MuazzinReminderStatus = {
    status: 'scheduled',
    masjidName: targetMasjid.name,
    nextScheduledTime,
    stage: nextStage,
    targetFridayDate: targetFriday.toLocaleDateString('en-GB'),
    lastCheckedAt: now.toISOString(),
  };

  await AsyncStorage.setItem(STORAGE_KEY_NOTIFICATION_STATUS, JSON.stringify(resultStatus));
  console.log(`[MuazzinNotifications] Scheduled ${scheduledIds.length} reminders for ${targetMasjid.name}. Next: ${nextStage} (${nextScheduledTime || 'none'}).`);
  return resultStatus;
}


// -------------------------------------------------------------
// Part 1: Persistent Dhuhr and Maghrib Notifications Until Verified
// -------------------------------------------------------------

export const STORAGE_KEY_DAILY_REMINDER_IDS = '@deen_updater_daily_reminder_ids_v1';
export const STORAGE_KEY_DAILY_REMINDER_STATUS = '@deen_updater_daily_reminder_status_v1';

export interface UpdaterReminderStatus {
  status: 'verified_fresh' | 'scheduled' | 'not_authorized' | 'no_masjid' | 'cancelled_verified';
  masjidName?: string;
  masjidId?: string;
  dhuhrReminderTime?: string;
  maghribReminderTime?: string;
  lastCheckedAt: string;
}

/**
 * Checks if a masjid has fully populated and fresh timings (<= 14 days old).
 */
export function isMasjidTimingVerifiedAndFresh(masjid?: Masjid | null): boolean {
  if (!masjid) return false;

  // 1. Check all 5 obligatory Jama'at times
  const iqamah = masjid.iqamahTimes;
  if (!iqamah) return false;

  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
  for (const prayer of prayers) {
    const val = (iqamah[prayer] || '').trim();
    if (!val || val === '--:--' || val === '--' || val === '00:00') {
      return false;
    }
  }

  // 2. Check staleness threshold (14 days)
  const lastUpdated = masjid.lastUpdated || (masjid as any).updatedAt || (masjid as any).updatedOn;
  if (!lastUpdated) return false;

  const updateTime = new Date(lastUpdated).getTime();
  if (isNaN(updateTime) || updateTime <= 0) return false;

  const diffMs = Date.now() - updateTime;
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  if (diffMs > fourteenDaysMs) return false;

  // 3. Verification flag check
  if (masjid.isMuazzinVerified === false && (masjid as any).isLocalUpdate !== true) {
    return false;
  }

  return true;
}

/**
 * Cancel daily Zohar and Maghrib notifications for an updater.
 */
export async function cancelUpdaterReminders(masjidId?: string): Promise<void> {
  if (isExpoGo || !Notifications) return;
  try {
    const rawIds = await AsyncStorage.getItem(STORAGE_KEY_DAILY_REMINDER_IDS);
    if (rawIds) {
      const ids: string[] = JSON.parse(rawIds);
      for (const id of ids) {
        try {
          await Notifications.cancelScheduledNotificationAsync(id);
        } catch {}
      }
      await AsyncStorage.removeItem(STORAGE_KEY_DAILY_REMINDER_IDS);
    }
    const status: UpdaterReminderStatus = {
      status: 'cancelled_verified',
      masjidId,
      lastCheckedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEY_DAILY_REMINDER_STATUS, JSON.stringify(status));
    console.log(`[MuazzinNotifications] Cancelled daily updater reminders for ${masjidId || 'all'}.`);
  } catch (err) {
    console.warn('[MuazzinNotifications] Error cancelling updater reminders:', err);
  }
}

/**
 * Check masjid status and schedule daily persistent reminders at Zohar + 15m and Maghrib + 15m
 * until database timings are officially verified/updated.
 */
export async function checkAndScheduleUpdaterReminders(
  userProfile?: UserProfile | null,
  session?: ImamSession | null,
  targetMasjid?: Masjid | null
): Promise<UpdaterReminderStatus> {
  const now = new Date();

  // 1. Check if user is an authorized updater
  const isAuthorized = Boolean(
    (userProfile && canManageMasjid(userProfile, targetMasjid?.id)) ||
    (userProfile && (
      userProfile.role === 'ADMIN' ||
      userProfile.role === 'SUPER_USER2' ||
      userProfile.role === 'SUPER_USER' ||
      userProfile.role === 'IMAM' ||
      userProfile.role === 'MUAZZIN' ||
      userProfile.role === 'PRESIDENT' ||
      userProfile.role === 'SECRETARY'
    )) ||
    (session && (session.role === 'ADMIN' || session.role === 'SUPER_USER' || session.masjidId))
  );

  if (!isAuthorized || (!targetMasjid && !session?.masjidId && !userProfile?.masjidId)) {
    await cancelUpdaterReminders();
    const status: UpdaterReminderStatus = {
      status: 'not_authorized',
      lastCheckedAt: now.toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEY_DAILY_REMINDER_STATUS, JSON.stringify(status));
    return status;
  }

  // 2. Resolve target masjid if not passed
  let resolvedMasjid = targetMasjid;
  if (!resolvedMasjid) {
    const masjidIdToFind = userProfile?.masjidId || session?.masjidId || userProfile?.defaultMasjidId;
    if (masjidIdToFind) {
      try {
        const masjids = await fetchSalahTimeMasjids();
        resolvedMasjid = masjids.find(
          (m) =>
            m.id === masjidIdToFind ||
            m.id.replace(/^salahtime-/, '') === masjidIdToFind.replace(/^salahtime-/, '')
        );
      } catch {}
    }
  }

  if (!resolvedMasjid) {
    const status: UpdaterReminderStatus = {
      status: 'no_masjid',
      lastCheckedAt: now.toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEY_DAILY_REMINDER_STATUS, JSON.stringify(status));
    return status;
  }

  // 3. Database Verification Status Check:
  // Are all 5 obligatory times populated and updated within 14 days?
  const isFresh = isMasjidTimingVerifiedAndFresh(resolvedMasjid);

  if (isFresh) {
    // Kill-switch / silencing: Timings are verified and fresh! Cancel reminders.
    await cancelUpdaterReminders(resolvedMasjid.id);
    const status: UpdaterReminderStatus = {
      status: 'verified_fresh',
      masjidName: resolvedMasjid.name,
      masjidId: resolvedMasjid.id,
      lastCheckedAt: now.toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEY_DAILY_REMINDER_STATUS, JSON.stringify(status));
    console.log(`[MuazzinNotifications] Timings for ${resolvedMasjid.name} are verified & fresh. Daily reminders silenced.`);
    return status;
  }

  // 4. Timings are unverified or stale (>14 days): Schedule daily Zohar & Maghrib reminders!
  await cancelUpdaterReminders(resolvedMasjid.id);

  // Compute Dhuhr and Maghrib Athan + 15 mins
  const dhuhrAthan = resolvedMasjid.athanTimes?.Dhuhr || '12:45';
  const maghribAthan = resolvedMasjid.athanTimes?.Maghrib || '17:55';

  const dhuhrMins = parsePrayerTimeToMinutes(dhuhrAthan, 'Dhuhr');
  const maghribMins = parsePrayerTimeToMinutes(maghribAthan, 'Maghrib');

  const dhuhrTriggerMins = (dhuhrMins >= 0 ? dhuhrMins + 15 : 13 * 60) % (24 * 60);
  const maghribTriggerMins = (maghribMins >= 0 ? maghribMins + 15 : 18 * 60 + 10) % (24 * 60);

  const dhuhrH = Math.floor(dhuhrTriggerMins / 60);
  const dhuhrM = dhuhrTriggerMins % 60;

  const maghribH = Math.floor(maghribTriggerMins / 60);
  const maghribM = maghribTriggerMins % 60;

  const scheduledIds: string[] = [];

  if (!isExpoGo && Notifications) {
    const notificationsToSchedule = [
      {
        type: 'zohar_updater_reminder',
        hour: dhuhrH,
        minute: dhuhrM,
        title: '⚠️ Action Required: Masjid Timings Pending',
        body: `${resolvedMasjid.name} Jama'at timings are unverified. Update the board now to earn Sadaqah points!`,
      },
      {
        type: 'maghrib_updater_reminder',
        hour: maghribH,
        minute: maghribM,
        title: '🌅 Evening Check: Verify Masjid Timings',
        body: `Keep your community updated! Tap to verify or update ${resolvedMasjid.name} prayer times.`,
      },
    ];

    for (const item of notificationsToSchedule) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: item.title,
            body: item.body,
            sound: true,
            data: {
              type: item.type,
              masjidId: resolvedMasjid.id,
              masjidName: resolvedMasjid.name,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: item.hour,
            minute: item.minute,
          },
        });
        scheduledIds.push(id);
      } catch (scheduleErr) {
        // Fallback to DATE trigger for the next upcoming occurrence
        try {
          const nextDate = new Date();
          nextDate.setHours(item.hour, item.minute, 0, 0);
          if (nextDate.getTime() <= Date.now()) {
            nextDate.setDate(nextDate.getDate() + 1);
          }
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: item.title,
              body: item.body,
              sound: true,
              data: {
                type: item.type,
                masjidId: resolvedMasjid.id,
                masjidName: resolvedMasjid.name,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: nextDate,
            },
          });
          scheduledIds.push(id);
        } catch (dateErr) {
          console.warn(`[MuazzinNotifications] Error scheduling ${item.type}:`, dateErr);
        }
      }
    }

    if (scheduledIds.length > 0) {
      await AsyncStorage.setItem(STORAGE_KEY_DAILY_REMINDER_IDS, JSON.stringify(scheduledIds));
    }
  }

  const formatTimeStr = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = m < 10 ? `0${m}` : m;
    return `${displayH}:${displayM} ${period}`;
  };

  const status: UpdaterReminderStatus = {
    status: 'scheduled',
    masjidName: resolvedMasjid.name,
    masjidId: resolvedMasjid.id,
    dhuhrReminderTime: formatTimeStr(dhuhrH, dhuhrM),
    maghribReminderTime: formatTimeStr(maghribH, maghribM),
    lastCheckedAt: now.toISOString(),
  };

  await AsyncStorage.setItem(STORAGE_KEY_DAILY_REMINDER_STATUS, JSON.stringify(status));
  console.log(`[MuazzinNotifications] Scheduled daily reminders for ${resolvedMasjid.name} (Zohar: ${formatTimeStr(dhuhrH, dhuhrM)}, Maghrib: ${formatTimeStr(maghribH, maghribM)}).`);
  return status;
}
