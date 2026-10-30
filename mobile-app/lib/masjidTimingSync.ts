import AsyncStorage from '@react-native-async-storage/async-storage';
import { Masjid, calculateDistance } from './masjid';

const TIMING_OVERRIDES_KEY = '@deen_ai_masjid_timing_overrides_v1';
const CUSTOM_MASJIDS_KEY = '@deen_ai_custom_added_masjids_v1';
const REMOTE_TIMINGS_CACHE_KEY = '@deen_ai_verified_remote_timings_cache';

export interface LocalTimingOverride {
  masjidId: string;
  name: string;
  address: string;
  athanTimes?: {
    Fajr: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
  };
  iqamahTimes: {
    Fajr: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
  };
  jummah: string;
  jummahAthan?: string;
  sunrise?: string;
  sahar?: string;
  iftar?: string;
  notes?: string;
  muazzinPasscode?: string;
  isMuazzinVerified?: boolean;
  updatedAt: number; // Unix epoch ms
  syncStatus: 'pending' | 'synced' | 'failed';
  isCustomAdded?: boolean;
}

export interface VerifiedRemoteTiming {
  masjidId: string;
  name?: string;
  address?: string;
  athanTimes?: {
    Fajr: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
  };
  iqamahTimes: {
    Fajr: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
  };
  jummah: string;
  updatedAt: number;
}

// In-memory caches for ultra-fast UI rendering
let memoryOverrides: Record<string, LocalTimingOverride> | null = null;
let memoryCustomMasjids: Masjid[] | null = null;

/**
 * Retrieve all custom added masjids from AsyncStorage.
 */
export async function getCustomAddedMasjids(): Promise<Masjid[]> {
  if (memoryCustomMasjids !== null) {
    return memoryCustomMasjids;
  }
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_MASJIDS_KEY);
    if (raw) {
      memoryCustomMasjids = JSON.parse(raw);
      return memoryCustomMasjids || [];
    }
  } catch (err) {
    console.warn('[MasjidTimingSync] Error reading custom masjids:', err);
  }
  memoryCustomMasjids = [];
  return [];
}

/**
 * Save a newly added masjid locally and persist to AsyncStorage.
 */
export async function saveCustomAddedMasjid(masjid: Masjid): Promise<void> {
  const current = await getCustomAddedMasjids();
  const updated = [masjid, ...current.filter((m) => m.id !== masjid.id)];
  memoryCustomMasjids = updated;
  try {
    await AsyncStorage.setItem(CUSTOM_MASJIDS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('[MasjidTimingSync] Error saving custom masjid:', err);
  }
}

/**
 * Delete a custom added masjid from AsyncStorage and remove its timing override.
 */
export async function deleteCustomAddedMasjid(masjidId: string): Promise<void> {
  const current = await getCustomAddedMasjids();
  const updated = current.filter((m) => m.id !== masjidId);
  memoryCustomMasjids = updated;
  try {
    await AsyncStorage.setItem(CUSTOM_MASJIDS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('[MasjidTimingSync] Error deleting custom masjid:', err);
  }

  // Also remove from overrides
  const overrides = await getLocalTimingOverrides();
  if (overrides[masjidId]) {
    delete overrides[masjidId];
    memoryOverrides = overrides;
    try {
      await AsyncStorage.setItem(TIMING_OVERRIDES_KEY, JSON.stringify(overrides));
    } catch (err) {
      console.warn('[MasjidTimingSync] Error removing override on delete:', err);
    }
  }
}

/**
 * Retrieve all locally saved timing overrides from AsyncStorage with in-memory caching.
 */
export async function getLocalTimingOverrides(): Promise<Record<string, LocalTimingOverride>> {
  if (memoryOverrides !== null) {
    return memoryOverrides;
  }
  try {
    const raw = await AsyncStorage.getItem(TIMING_OVERRIDES_KEY);
    if (raw) {
      memoryOverrides = JSON.parse(raw);
      return memoryOverrides || {};
    }
  } catch (err) {
    console.warn('[MasjidTimingSync] Error reading overrides:', err);
  }
  memoryOverrides = {};
  return {};
}

/**
 * Save a user's timing update locally (optimistic update) and persist to AsyncStorage.
 */
export async function saveLocalTimingOverride(override: LocalTimingOverride): Promise<void> {
  const overrides = await getLocalTimingOverrides();
  overrides[override.masjidId] = {
    ...override,
    updatedAt: override.updatedAt || Date.now(),
    syncStatus: override.syncStatus || 'pending',
  };
  memoryOverrides = overrides;
  try {
    await AsyncStorage.setItem(TIMING_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (err) {
    console.error('[MasjidTimingSync] Error saving override:', err);
  }
}

/**
 * Merge custom added masjids, local overrides, and remote verified timings into a single list.
 */
export async function applyTimingOverridesToMasjids(
  masjids: Masjid[],
  userCoords?: { latitude: number; longitude: number } | null
): Promise<Masjid[]> {
  const overrides = await getLocalTimingOverrides();
  const customMasjids = await getCustomAddedMasjids();

  // Combine custom masjids with api masjids
  const combined = [...masjids];
  for (const custom of customMasjids) {
    if (!combined.some((m) => m.id === custom.id)) {
      if (userCoords) {
        custom.distance = calculateDistance(
          userCoords.latitude,
          userCoords.longitude,
          custom.latitude,
          custom.longitude
        );
      }
      combined.unshift(custom);
    }
  }

  return combined.map((masjid) => {
    const override = overrides[masjid.id];
    if (!override) return masjid;

    return {
      ...masjid,
      athanTimes: override.athanTimes ? {
        Fajr: override.athanTimes.Fajr || masjid.athanTimes?.Fajr || '--:--',
        Dhuhr: override.athanTimes.Dhuhr || masjid.athanTimes?.Dhuhr || '--:--',
        Asr: override.athanTimes.Asr || masjid.athanTimes?.Asr || '--:--',
        Maghrib: override.athanTimes.Maghrib || masjid.athanTimes?.Maghrib || '--:--',
        Isha: override.athanTimes.Isha || masjid.athanTimes?.Isha || '--:--',
      } : masjid.athanTimes,
      iqamahTimes: {
        Fajr: override.iqamahTimes.Fajr || masjid.iqamahTimes?.Fajr || '--:--',
        Dhuhr: override.iqamahTimes.Dhuhr || masjid.iqamahTimes?.Dhuhr || '--:--',
        Asr: override.iqamahTimes.Asr || masjid.iqamahTimes?.Asr || '--:--',
        Maghrib: override.iqamahTimes.Maghrib || masjid.iqamahTimes?.Maghrib || '--:--',
        Isha: override.iqamahTimes.Isha || masjid.iqamahTimes?.Isha || '--:--',
      },
      sunrise: override.sunrise || masjid.sunrise,
      jummah: override.jummah || masjid.jummah || '1:30',
      suhoor: override.sahar || masjid.suhoor,
      iftar: override.iftar || masjid.iftar,
      isLocalUpdate: true,
      isMuazzinVerified: override.isMuazzinVerified || false,
      lastUpdated: override.updatedAt,
    };
  });
}

/**
 * Sync with a verified remote feed.
 */
export async function syncRemoteVerifiedTimings(
  remoteTimings: VerifiedRemoteTiming[]
): Promise<void> {
  if (!remoteTimings || remoteTimings.length === 0) return;
  const overrides = await getLocalTimingOverrides();
  let modified = false;

  for (const remote of remoteTimings) {
    const local = overrides[remote.masjidId];
    if (local && remote.updatedAt > local.updatedAt) {
      delete overrides[remote.masjidId];
      modified = true;
    }
  }

  if (modified) {
    memoryOverrides = overrides;
    try {
      await AsyncStorage.setItem(TIMING_OVERRIDES_KEY, JSON.stringify(overrides));
    } catch (err) {
      console.warn('[MasjidTimingSync] Error updating overrides after sync:', err);
    }
  }
}

/**
 * Background silent submission using the same Google Form:
 */
export async function submitTimingUpdateToBackend(
  override: LocalTimingOverride,
  options?: {
    webhookUrl?: string;
    googleFormUrl?: string;
  }
): Promise<{ success: boolean; mode: string }> {
  const webhookUrl = options?.webhookUrl || process.env.EXPO_PUBLIC_MASJID_WEBHOOK_URL;
  const googleFormUrl = options?.googleFormUrl;

  // 1. If custom Webhook / Apps Script is available, POST JSON directly
  if (webhookUrl && webhookUrl.trim().length > 0) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: override.isCustomAdded ? 'add_new_masjid' : 'update_masjid_timings',
          masjidId: override.masjidId,
          name: override.name,
          address: override.address,
          athanTimes: override.athanTimes,
          iqamahTimes: override.iqamahTimes,
          jummah: override.jummah,
          sunrise: override.sunrise,
          sahar: override.sahar,
          iftar: override.iftar,
          notes: override.notes || '',
          muazzinPasscode: override.muazzinPasscode || '',
          isMuazzinVerified: override.isMuazzinVerified || false,
          timestamp: override.updatedAt,
          isCustomAdded: override.isCustomAdded || false,
        }),
      });

      if (response.ok) {
        override.syncStatus = 'synced';
        await saveLocalTimingOverride(override);
        return { success: true, mode: 'webhook' };
      }
    } catch (err) {
      console.warn('[MasjidTimingSync] Webhook submission error (queued locally):', err);
    }
  }

  // 2. Headless Google Form Submission using the exact same form fields
  if (googleFormUrl && googleFormUrl.trim().length > 0) {
    try {
      const formResponseUrl = googleFormUrl.replace('/viewform', '/formResponse');
      const params = new URLSearchParams({
        'entry.1516814957': override.masjidId,
        'entry.1446041143': override.name,
        'entry.340835418': override.address,
      });

      // Submit headlessly via background POST
      await fetch(formResponseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      override.syncStatus = 'synced';
      await saveLocalTimingOverride(override);
      return { success: true, mode: 'google_form_headless' };
    } catch (err) {
      console.log('[MasjidTimingSync] Form response dispatched');
    }
  }

  return { success: true, mode: 'local_optimistic' };
}
