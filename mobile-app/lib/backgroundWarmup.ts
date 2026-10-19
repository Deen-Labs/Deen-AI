import { getCurrentLocation } from './location';
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
    console.log('[BackgroundWarmup] 🚀 Initializing background pre-fetch for Salah & Masajid...');

    // 1. Get user GPS coordinates (with timeout fallback)
    const location = await getCurrentLocation();
    const settings = await loadSettings();

    const lat = location?.latitude ?? 40.7128;
    const lng = location?.longitude ?? -74.006;

    // 2. Concurrently fetch and warm both Prayer Times & Nearby Masajid
    const prayerPromise = getPrayerTimes(lat, lng, String(settings.calculationMethodValue));
    const masjidPromise = location
      ? getNearbyMasjids(location, 5000)
      : getNearbyMasjids({ latitude: lat, longitude: lng }, 5000);

    const results = await Promise.allSettled([prayerPromise, masjidPromise]);
    isWarmedUp = true;

    const prayerSuccess = results[0].status === 'fulfilled';
    const masjidSuccess = results[1].status === 'fulfilled';

    console.log(
      `[BackgroundWarmup] ✅ Background warm-up completed! (Prayer: ${prayerSuccess ? 'OK' : 'ERR'}, Masjid: ${masjidSuccess ? 'OK' : 'ERR'})`
    );

    // Notify any active screens that warm data is ready
    notifyListeners();
  } catch (error) {
    console.warn('[BackgroundWarmup] Warm-up encountered an issue:', error);
  } finally {
    isWarmupRunning = false;
  }
}
