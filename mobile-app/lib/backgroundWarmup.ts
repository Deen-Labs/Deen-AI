import { getQuickLocation, getCurrentLocation } from './location';
import { getPrayerTimes } from './prayerTimes';
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

    // 2. Concurrently fetch and warm both Prayer Times and Nearby Masajid (3500m radius)
    const prayerPromise = getPrayerTimes(lat, lng, String(settings.calculationMethodValue));
    const masjidPromise = getNearbyMasjids({ latitude: lat, longitude: lng }, 3500);

    const results = await Promise.allSettled([prayerPromise, masjidPromise]);
    isWarmedUp = true;

    const prayerSuccess = results[0].status === 'fulfilled';
    const masjidSuccess = results[1].status === 'fulfilled';

    console.log(
      `[BackgroundWarmup] Background warm-up completed. (Prayer: ${prayerSuccess ? 'OK' : 'ERR'}, Masjid: ${masjidSuccess ? 'OK' : 'ERR'})`
    );

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
