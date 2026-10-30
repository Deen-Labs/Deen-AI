import AsyncStorage from '@react-native-async-storage/async-storage';
import { getImamSession } from './masjidTimingSync';
import { syncMuazzinKhutbahReminders, checkAndScheduleUpdaterReminders } from './muazzinNotifications';
import { getCurrentUser } from './auth';
import { getQuickLocation, getCurrentLocation } from './location';
import { getPrayerTimes, fetchPrayerTimes, setMemoryPrayerCache } from './prayerTimes';
import { getNearbyMasjids } from './masjid';
import { loadSettings } from './settings';
let isWarmupRunning = false;
let isWarmedUp = false;

type WarmupListener = () => void;
const listeners = new Set<WarmupListener>();

export function subscribeToWarmup(listener: WarmupListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.warn('[BackgroundWarmup] Listener notification error:', e);
    }
  });
}

/**
 * Background warm-up service:
 * Runs immediately upon app launch to pre-fetch and warm prayer times
 * and nearby masajid in memory so tab navigation is instantaneous (0ms).
 */
export async function warmUpAppData(): Promise<void> {
  if (isWarmupRunning) {
    return;
  }
  isWarmupRunning = true;

  try {
    console.log('[BackgroundWarmup] Initializing background pre-fetch for Salah and Masajid...');

    // 1. Get user coordinates with instant local lookup first
    const quickLocation = await getQuickLocation();
    const settings = await loadSettings();

    const lat = quickLocation?.latitude ?? 17.385044;
    const lng = quickLocation?.longitude ?? 78.486671;

    // 2. Concurrently fetch and warm both Al-Adhaan API and Nearby Masajid (3500m radius)
    const methodVal = settings.calculationMethodValue || 1;
    const prayerPromise = fetchPrayerTimes(lat, lng, methodVal)
      .then((data) => {
        if (data && data.timings) {
          setMemoryPrayerCache(data.timings, lat, lng, methodVal);
          AsyncStorage.setItem('@deen_warm_aladhan_cache', JSON.stringify({
            timings: data.timings,
            date: data.date,
            lat,
            lng,
            method: methodVal,
            timestamp: Date.now(),
          })).catch(() => {});
        }
        return data;
      })
      .catch(() => getPrayerTimes(lat, lng, String(methodVal)));
    const masjidPromise = getNearbyMasjids({ latitude: lat, longitude: lng }, 3500);

    const results = await Promise.allSettled([prayerPromise, masjidPromise]);
    isWarmedUp = true;

    const prayerSuccess = results[0].status === 'fulfilled';
    const masjidSuccess = results[1].status === 'fulfilled';

    console.log(
      `[BackgroundWarmup] Background warm-up completed. (Prayer: ${prayerSuccess ? 'OK' : 'ERR'}, Masjid: ${masjidSuccess ? 'OK' : 'ERR'})`
    );

    // Check and sync Muazzin Jumu'ah and Daily Zohar & Maghrib reminders
    getImamSession().then(async (session) => {
      syncMuazzinKhutbahReminders(session).catch(() => {});
      const user = await getCurrentUser().catch(() => null);
      checkAndScheduleUpdaterReminders(user, session).catch(() => {});
    }).catch(() => {});

    // Notify any active screens that warm data is ready
    notifyListeners();

    // 3. In the background, refresh with high-accuracy GPS if available
    getCurrentLocation().then(async (freshLoc) => {
      if (freshLoc && (Math.abs(freshLoc.latitude - lat) > 0.05 || Math.abs(freshLoc.longitude - lng) > 0.05)) {
        await Promise.allSettled([
          getPrayerTimes(freshLoc.latitude, freshLoc.longitude, String(settings.calculationMethodValue)),
          getNearbyMasjids(freshLoc, 3500),
        ]);
        notifyListeners();
      }
    }).catch(() => {});
  } catch (error) {
    console.warn('[BackgroundWarmup] Warm-up encountered an issue:', error);
  } finally {
    isWarmupRunning = false;
  }
}
