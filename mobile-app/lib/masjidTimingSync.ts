function sha256Hex(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  for (let i = 0; i < ascii.length; i++) {
    words[i >> 2] |= (ascii.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  words[ascii.length >> 2] |= 0x80 << (24 - (ascii.length % 4) * 8);
  words[(((ascii.length + 8) >> 6) << 4) + 15] = asciiBitLength;

  for (let i = 0; i < words.length; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice(0);
    for (let j = 0; j < 64; j++) {
      if (j >= 16) {
        const gamma0 = rightRotate(w[j - 15] || 0, 7) ^ rightRotate(w[j - 15] || 0, 18) ^ ((w[j - 15] || 0) >>> 3);
        const gamma1 = rightRotate(w[j - 2] || 0, 17) ^ rightRotate(w[j - 2] || 0, 19) ^ ((w[j - 2] || 0) >>> 10);
        w[j] = ((w[j - 16] || 0) + gamma0 + (w[j - 7] || 0) + gamma1) | 0;
      }
      const s1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + s1 + ch + k[j] + (w[j] | 0)) | 0;
      const s0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0 + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }
    for (let j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  let result = '';
  for (let j = 0; j < 8; j++) {
    for (let i = 3; i >= 0; i--) {
      const b = (hash[j] >> (i * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}



import { invalidateMasjidMemoryCache } from './salahTimeBackend';
import { cancelUpdaterReminders } from './muazzinNotifications';
import {
  hasTimingDiff,
  awardTimingUpdatePoints,
  awardNewMasjidPoints,
  TimingPointsResult,
} from './community';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from './auth';
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
  announcements?: string;
  updatedBy?: string;
  updatedByUid?: string;
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
 * Clear all custom user-added masjids completely.
 */
export async function clearAllCustomAddedMasjids(): Promise<void> {
  memoryCustomMasjids = [];
  try {
    await AsyncStorage.removeItem(CUSTOM_MASJIDS_KEY);
  } catch (err) {
    console.warn('[MasjidTimingSync] Error clearing custom masjids:', err);
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
  const currentUser = await getCurrentUser().catch(() => null);
  const now = Date.now();
  overrides[override.masjidId] = {
    ...override,
    updatedBy: override.updatedBy || currentUser?.name || 'Masjid Committee',
    updatedByUid: override.updatedByUid || currentUser?.uid || '',
    announcements: override.announcements || override.notes || '',
    notes: override.notes || override.announcements || '',
    updatedAt: override.updatedAt || now,
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
      notes: override.notes || masjid.notes,
      announcements: override.announcements || override.notes || masjid.announcements || masjid.notes,
      updatedBy: override.updatedBy || masjid.updatedBy,
      updatedByName: override.updatedBy || masjid.updatedByName || masjid.updatedBy,
      updatedByUid: override.updatedByUid || masjid.updatedByUid,
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

// --- Default Masjid & Imam Auth Additions ---
import {
  DEFAULT_MASJID_KEY,
  PINNED_MASJID_KEY,
  getDefaultMasjidId,
  setDefaultMasjidId,
  getPinnedMasjidId,
  setPinnedMasjidId,
} from './defaultMasjid';

export {
  DEFAULT_MASJID_KEY,
  PINNED_MASJID_KEY,
  getDefaultMasjidId,
  setDefaultMasjidId,
  getPinnedMasjidId,
  setPinnedMasjidId,
};
export const IMAM_SESSION_KEY = '@deen_ai_imam_session_v1';

export type { UserRole, UserProfile } from './auth';
export {
  normalizeUserRole,
  isAuthorizedRole,
  hasRole,
  getCurrentUser,
  logoutUser,
  signUpUser,
  loginUser,
  updateUserProfile,
} from './auth';

export interface ImamSession {
  imamName: string;
  email?: string;
  uid?: string;
  masjidId?: string;
  role?: string;
  token?: string;
  loggedInAt: number;
}

export async function resolveActiveMasjid(
  userCoords: { latitude: number; longitude: number } | null,
  masjids: Masjid[]
): Promise<Masjid | null> {
  if (!masjids || masjids.length === 0) return null;
  const defId = await getDefaultMasjidId();
  if (defId) {
    const found = masjids.find((m) => m.id === defId);
    if (found) return found;
  }
  if (userCoords) {
    const sorted = [...masjids].sort((a, b) => {
      const distA = calculateDistance(userCoords.latitude, userCoords.longitude, a.latitude, a.longitude);
      const distB = calculateDistance(userCoords.latitude, userCoords.longitude, b.latitude, b.longitude);
      return distA - distB;
    });
    return sorted[0] || null;
  }
  return masjids[0] || null;
}

export async function getImamSession(): Promise<ImamSession | null> {
  try {
    const raw = await AsyncStorage.getItem(IMAM_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function logoutImam(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([IMAM_SESSION_KEY, '@deen_ai_user_session_v1', '@deen_auth_user_session_v1']);
  } catch (err) {
    console.warn('[MasjidTimingSync] Error logging out imam:', err);
  }
}

export async function verifyAndLoginImam(
  emailOrId: string,
  password: string,
  masjidId?: string
): Promise<{ success: boolean; session?: ImamSession; error?: string }> {
  try {
    const { loginUser } = require('./auth');
    const res = await loginUser(emailOrId, password);
    if (!res.success || !res.user) {
      return { success: false, error: res.error || 'Authentication failed.' };
    }
    const session = await getImamSession();
    if (!session) {
      return {
        success: false,
        error: 'Account verified, but your account does not have Muazzin, Imam, or Committee edit privileges.',
      };
    }
    return { success: true, session };
  } catch (err: any) {
    console.error('[MasjidTimingSync] verifyAndLoginImam error:', err);
    return { success: false, error: err?.message || 'Authentication failed.' };
  }
}

export async function pushMasjidTimingToFirestore(
  masjid: Masjid,
  formData: any,
  session: ImamSession,
  editScope: 'all' | 'details' | 'timings' = 'all'
): Promise<{ success: boolean; error?: string; pointsResult?: TimingPointsResult }> {
  let pointsResult: TimingPointsResult | undefined;
  try {
    const currentUser = await getCurrentUser().catch(() => null);
    const updaterName = session.imamName || currentUser?.name || 'Masjid Committee';
    const updaterUid = session.uid || currentUser?.uid || '';
    const nowIso = new Date().toISOString();
    const announcements = formData.notes || formData.announcements || '';

    await saveLocalTimingOverride({
      masjidId: masjid.id,
      name: masjid.name,
      address: masjid.address,
      athanTimes: formData.athanTimes,
      iqamahTimes: formData.iqamahTimes,
      jummah: formData.jummah,
      jummahAthan: formData.jummahAthan,
      sunrise: formData.sunrise,
      sahar: formData.sahar,
      iftar: formData.iftar,
      notes: announcements,
      announcements: announcements,
      updatedBy: updaterName,
      updatedByUid: updaterUid,
      muazzinPasscode: formData.muazzinPasscode,
      isMuazzinVerified: true,
      updatedAt: Date.now(),
      syncStatus: 'synced',
    });

    const rawMasjidId = masjid.id.replace(/^salahtime-/, '');
    const isCustom = Boolean(masjid.isCustomAdded);

    // 1. Calculate timing diff and enforce duplicate check for non-details updates
    const hasDiff = hasTimingDiff(masjid, formData);
    if (editScope !== 'details' && !isCustom) {
      if (!hasDiff) {
        return {
          success: false,
          error: 'Timings are identical to current values. No changes to save.'
        };
      }
      try {
        const checkRes = await fetch(
          `https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents/salah_time/${rawMasjidId}`
        );
        if (checkRes.ok) {
          const sDoc = await checkRes.json();
          const sf = sDoc?.fields || {};
          const norm = (v?: any) => (v?.stringValue || '').trim().toLowerCase();
          const sF = norm(sf.fajr);
          const sZ = norm(sf.zohar);
          const sA = norm(sf.asr);
          const sM = norm(sf.magrib);
          const sE = norm(sf.esha);
          const sJ = norm(sf.juma);

          const formNorm = (val?: string) => (val || '').trim().toLowerCase();
          const fF = formNorm(formData.iqamahTimes?.Fajr);
          const fZ = formNorm(formData.iqamahTimes?.Dhuhr);
          const fA = formNorm(formData.iqamahTimes?.Asr);
          const fM = formNorm(formData.iqamahTimes?.Maghrib);
          const fE = formNorm(formData.iqamahTimes?.Isha);
          const fJ = formNorm(formData.jummah);

          if (sF && sF === fF && sZ === fZ && sA === fA && sM === fM && sE === fE && sJ === fJ) {
            return {
              success: false,
              error: 'Server already has these exact timings. Duplicate updates are not permitted.'
            };
          }
        }
      } catch (errCheck) {
        console.warn('[MasjidTimingSync] Pre-flight server check warning:', errCheck);
      }
    }

    if (session.uid) {
      if (isCustom) {
        const res = await awardNewMasjidPoints(session.uid, masjid.id).catch(() => null);
        if (res) {
          pointsResult = {
            awarded: res.awarded,
            pointsAdded: res.pointsAdded,
            newTotalPoints: res.newTotalPoints,
            reason: `Earned +${res.pointsAdded} Sadaqah points for registering a new masjid!`,
          };
        }
      } else {
        pointsResult = await awardTimingUpdatePoints(session.uid, masjid.id, hasDiff).catch(() => undefined);
      }
    }

    // 2. Kill-switch / Silencing: Cancel daily Zohar & Maghrib updater notifications immediately
    await cancelUpdaterReminders(masjid.id).catch(() => {});

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session.token && !session.token.startsWith('admin_token_')) {
      headers['Authorization'] = `Bearer ${session.token}`;
    }

    const fields: Record<string, any> = {
      masjidId: { stringValue: rawMasjidId },
      masjidName: { stringValue: masjid.name },
      fajr: { stringValue: formData.iqamahTimes?.Fajr || '' },
      fajrAzaan: { stringValue: formData.athanTimes?.Fajr || '' },
      zohar: { stringValue: formData.iqamahTimes?.Dhuhr || '' },
      zoharAzaan: { stringValue: formData.athanTimes?.Dhuhr || '' },
      asr: { stringValue: formData.iqamahTimes?.Asr || '' },
      asrAzaan: { stringValue: formData.athanTimes?.Asr || '' },
      magrib: { stringValue: formData.iqamahTimes?.Maghrib || '' },
      magribAzaan: { stringValue: formData.athanTimes?.Maghrib || '' },
      esha: { stringValue: formData.iqamahTimes?.Isha || '' },
      eshaAzaan: { stringValue: formData.athanTimes?.Isha || '' },
      juma: { stringValue: formData.jummah || '' },
      jumaAzaan: { stringValue: formData.jummahAthan || '' },
      taravihTime: { stringValue: formData.taravihTime || '' },
      qariName: { stringValue: formData.qariName || '' },
      sahar: { stringValue: formData.sahar || '' },
      iftar: { stringValue: formData.iftar || '' },
      sunrise: { stringValue: formData.sunrise || '' },
      notes: { stringValue: announcements },
      announcements: { stringValue: announcements },
      updatedByName: { stringValue: updaterName },
      updatedBy: { stringValue: updaterName },
      updatedByUid: { stringValue: updaterUid },
      updatedAt: { timestampValue: nowIso },
      updatedOn: { timestampValue: nowIso },
    };

    const method = isCustom ? 'POST' : 'PATCH';
    let firestoreUrl = isCustom
      ? 'https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents/salah_time'
      : `https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents/salah_time/${encodeURIComponent(rawMasjidId)}`;

    if (method === 'PATCH') {
      const updateMaskParams = Object.keys(fields)
        .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
        .join('&');
      firestoreUrl += `?${updateMaskParams}`;
    }

    await fetch(firestoreUrl, {
      method,
      headers,
      body: JSON.stringify({ fields }),
    });

    // If this is a newly added custom masjid, also sync its metadata to /masjids
    if (isCustom) {
      try {
        const masjidsDocUrl = 'https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents/masjids';
        await fetch(masjidsDocUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            fields: {
              name: { stringValue: masjid.name },
              address: { stringValue: masjid.address || '' },
              famousArea: { stringValue: masjid.famousArea || '' },
              latitude: { doubleValue: Number(masjid.latitude || 17.385044) },
              longitude: { doubleValue: Number(masjid.longitude || 78.486671) },
              school: { stringValue: masjid.school || 'Ahle Sunnah (Hanafi)' },
              status: { stringValue: session.role === 'ADMIN' ? 'approved' : 'pending' },
              createdOn: { timestampValue: new Date().toISOString() },
              createdBy: { stringValue: session.imamName },
            },
          }),
        });
      } catch (metaErr) {
        console.warn('[MasjidTimingSync] Custom masjid metadata sync offline:', metaErr);
      }
    }

    // If editing existing masjid and metadata is provided, PATCH /masjids
    if (!isCustom) {
      try {
        const metaFields: Record<string, any> = {};
        const metaFieldPaths: string[] = [];
        if (formData.name) {
          metaFields.name = { stringValue: formData.name };
          metaFieldPaths.push('name');
        }
        if (formData.address) {
          metaFields.address = { stringValue: formData.address };
          metaFieldPaths.push('address');
        }
        if (formData.famousArea) {
          metaFields.famousArea = { stringValue: formData.famousArea };
          metaFieldPaths.push('famousArea');
        }
        if (formData.presidentName) {
          metaFields.presidentName = { stringValue: formData.presidentName };
          metaFieldPaths.push('presidentName');
        }
        if (formData.school) {
          metaFields.school = { stringValue: formData.school };
          metaFieldPaths.push('school');
        }
        if (formData.ladiesSection !== undefined) {
          metaFields.ladiesSection = { booleanValue: Boolean(formData.ladiesSection) };
          metaFieldPaths.push('ladiesSection');
        }
        if (formData.qariName) {
          metaFields.qariName = { stringValue: formData.qariName };
          metaFieldPaths.push('qariName');
        }
        if (formData.taravihTime) {
          metaFields.taravihTime = { stringValue: formData.taravihTime };
          metaFieldPaths.push('taravihTime');
        }

        // Always update updater audit fields and announcements on /masjids document
        metaFields.updatedBy = { stringValue: updaterName };
        metaFieldPaths.push('updatedBy');
        metaFields.updatedByUid = { stringValue: updaterUid };
        metaFieldPaths.push('updatedByUid');
        metaFields.updatedAt = { timestampValue: nowIso };
        metaFieldPaths.push('updatedAt');
        metaFields.updatedOn = { timestampValue: nowIso };
        metaFieldPaths.push('updatedOn');
        if (announcements) {
          metaFields.announcements = { stringValue: announcements };
          metaFieldPaths.push('announcements');
          metaFields.notes = { stringValue: announcements };
          metaFieldPaths.push('notes');
        }

        if (metaFieldPaths.length > 0) {
          const queryParams = metaFieldPaths.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
          const masjidPatchUrl = `https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents/masjids/${encodeURIComponent(rawMasjidId)}?${queryParams}`;
          await fetch(masjidPatchUrl, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ fields: metaFields }),
          });
        }
      } catch (metaErr) {
        console.warn('[MasjidTimingSync] Masjid metadata patch offline:', metaErr);
      }
    }

    // Invalidate in-memory cache so subsequent fetches instantly reflect updated timings
    invalidateMasjidMemoryCache();
    return { success: true, pointsResult };
  } catch (err) {
    console.warn('[MasjidTimingSync] Firestore timing push failed, cached locally:', err);
    return { success: true, pointsResult };
  }
}
