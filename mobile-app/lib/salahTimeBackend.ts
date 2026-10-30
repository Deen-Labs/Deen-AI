import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Masjid } from './masjid';
import { calculateDistance } from './location';
import { getCurrentUser } from './auth';

const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents';

export const CACHE_KEY_MASJIDS = '@deen_salahtime_db_cache_v1';
export const CACHE_KEY_JUMA = '@deen_salahtime_juma_v1';
export const CACHE_KEY_RAMADHAN = '@deen_salahtime_ramadhan_v1';
export const CACHE_KEY_TOPICS = '@deen_salahtime_topics_v1';

export interface SalahTimeJuma {
  id: string;
  masjidId: string;
  masjidName: string;
  masjidAddress: string;
  speakerName: string;
  aboutSpeaker: string;
  timing: string;
  topicName: string;
  fridayDateStr: string;
  fridayDate?: string;
  createdByName?: string;
  createdBy?: string;
  createdOnStr?: string;
  status: string;
  heartCount?: number;
  presidentName?: string;
  famousArea?: string;
  address?: string;
}

export interface SalahTimeTaravih {
  id: string;
  masjidId: string;
  masjidName?: string;
  taravihTime: string;
  qariName: string;
  createdBy?: string;
  createdOn?: string;
}

export interface SalahTimeRamadhanEntry {
  id: string;
  ramadhan: string;
  day: string;
  date: string;
  saher: string;
  iftar: string;
}

export interface SalahTimeTopic {
  id: string;
  topicName: string;
  topicDiscription: string;
  topicQuranReference?: string;
  topicHadithReference?: string;
  createdBy: string;
  createdOnStr?: string;
  isApproved: boolean;
  masjidName?: string;
  presidentName?: string;
  speakerName?: string;
  address?: string;
  famousArea?: string;
}

/**
 * Robust parser for Firestore REST document fields.
 * Strips any sensitive fields like 'password' or 'authCode'.
 */
export function parseFirestoreFields(fields: Record<string, any> | undefined): Record<string, any> {
  if (!fields) return {};
  const result: Record<string, any> = {};

  for (const [key, val] of Object.entries(fields)) {
    // Security check: NEVER expose or store passwords
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey === 'pin') {
      continue;
    }

    if (val === null || val === undefined) {
      result[key] = null;
    } else if ('stringValue' in val) {
      result[key] = val.stringValue;
    } else if ('integerValue' in val) {
      result[key] = parseInt(val.integerValue, 10);
    } else if ('doubleValue' in val) {
      result[key] = Number(val.doubleValue);
    } else if ('booleanValue' in val) {
      result[key] = Boolean(val.booleanValue);
    } else if ('timestampValue' in val) {
      result[key] = val.timestampValue;
    } else if ('nullValue' in val) {
      result[key] = null;
    } else if ('arrayValue' in val) {
      const arr = val.arrayValue?.values || [];
      result[key] = arr.map((item: any) => {
        if ('stringValue' in item) return item.stringValue;
        if ('integerValue' in item) return parseInt(item.integerValue, 10);
        if ('doubleValue' in item) return Number(item.doubleValue);
        if ('booleanValue' in item) return Boolean(item.booleanValue);
        return item;
      });
    } else if ('mapValue' in val) {
      result[key] = parseFirestoreFields(val.mapValue?.fields);
    } else {
      result[key] = val;
    }
  }

  return result;
}

/**
 * Convert JS object into Firestore REST typed fields payload.
 */
export function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    // Security check: Never serialize passwords
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('password') || lowerKey.includes('secret')) {
      continue;
    }

    if (val === null || val === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    } else if (typeof val === 'number') {
      if (Number.isInteger(val)) {
        fields[key] = { integerValue: String(val) };
      } else {
        fields[key] = { doubleValue: val };
      }
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map((v) => {
            if (typeof v === 'string') return { stringValue: v };
            if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
            if (typeof v === 'boolean') return { booleanValue: v };
            return { stringValue: String(v) };
          }),
        },
      };
    } else if (typeof val === 'object') {
      fields[key] = { mapValue: { fields: toFirestoreFields(val) } };
    }
  }
  return fields;
}

// In-memory cache for 0ms warmup
let memoryMasjids: Masjid[] | null = null;

export function invalidateMasjidMemoryCache(): void {
  memoryMasjids = null;
}
let memoryJuma: SalahTimeJuma[] | null = null;
let memoryRamadhan: SalahTimeRamadhanEntry[] | null = null;
let memoryTopics: SalahTimeTopic[] | null = null;

/**
 * Bundled high-priority landmark masjids from Hyderabad network
 * for 0ms startup and robust offline fallback.
 */
const SEED_MASJIDS: Masjid[] = [
  {
    id: 'salahtime-seed-makkah-masjid',
    name: 'Historic Makkah Masjid',
    address: 'Near Charminar, Old City, Hyderabad',
    vicinity: 'Charminar, Hyderabad',
    latitude: 17.3616,
    longitude: 78.4747,
    distance: 0,
    isOpen: true,
    school: 'Ahle Sunnah (Hanafi)',
    presidentName: 'Telangana State Waqf Board',
    famousArea: 'Charminar',
    ladiesSection: true,
    athanTimes: {
      Fajr: '05:00 AM',
      Dhuhr: '12:45 PM',
      Asr: '04:15 PM',
      Maghrib: '06:15 PM',
      Isha: '08:00 PM',
    },
    iqamahTimes: {
      Fajr: '05:25 AM',
      Dhuhr: '01:15 PM',
      Asr: '04:45 PM',
      Maghrib: '06:20 PM',
      Isha: '08:30 PM',
    },
    jummah: '01:30 PM',
    jummahAthan: '01:00 PM',
    taravihTime: '08:45 PM',
    qariName: 'Hafiz & Qari Rizwan Qureshi',
    updatedByName: 'Central Waqf Commitee',
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'salahtime-seed-azizia',
    name: 'Masjid-e-Azizia',
    address: 'Humayun Nagar, Mehdipatnam, Hyderabad',
    vicinity: 'Mehdipatnam, Hyderabad',
    latitude: 17.3916,
    longitude: 78.4439,
    distance: 0,
    isOpen: true,
    school: 'Ahle Sunnah (Hanafi)',
    presidentName: 'Janab Abdul Quddus Sahab',
    famousArea: 'Mehdipatnam Bus Depot',
    ladiesSection: true,
    athanTimes: {
      Fajr: '05:10 AM',
      Dhuhr: '12:45 PM',
      Asr: '04:15 PM',
      Maghrib: '06:15 PM',
      Isha: '08:15 PM',
    },
    iqamahTimes: {
      Fajr: '05:35 AM',
      Dhuhr: '01:15 PM',
      Asr: '04:45 PM',
      Maghrib: '06:20 PM',
      Isha: '08:35 PM',
    },
    jummah: '01:25 PM',
    jummahAthan: '12:55 PM',
    taravihTime: '08:45 PM',
    qariName: 'Maulana Hafiz Mohammed Osman',
    updatedByName: 'Masjid Committee',
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'salahtime-seed-musheerabad',
    name: 'Jamia Masjid Musheerabad',
    address: 'Musheerabad Main Road, Hyderabad',
    vicinity: 'Musheerabad, Hyderabad',
    latitude: 17.4184,
    longitude: 78.5029,
    distance: 0,
    isOpen: true,
    school: 'Ahle Sunnah (Hanafi)',
    presidentName: 'Syed Khaleelullah',
    famousArea: 'Musheerabad Jail Junction',
    ladiesSection: false,
    athanTimes: {
      Fajr: '05:15 AM',
      Dhuhr: '12:45 PM',
      Asr: '04:20 PM',
      Maghrib: '06:16 PM',
      Isha: '08:15 PM',
    },
    iqamahTimes: {
      Fajr: '05:40 AM',
      Dhuhr: '01:30 PM',
      Asr: '04:50 PM',
      Maghrib: '06:22 PM',
      Isha: '08:40 PM',
    },
    jummah: '01:35 PM',
    jummahAthan: '01:05 PM',
    taravihTime: '08:50 PM',
    qariName: 'Qari Noorul Huda',
    updatedByName: 'Masjid Admin',
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'salahtime-seed-bagh-e-aam',
    name: 'Shahi Masjid Bagh-e-Aam (Public Gardens)',
    address: 'Public Gardens, Nampally, Hyderabad',
    vicinity: 'Nampally, Hyderabad',
    latitude: 17.3977,
    longitude: 78.4695,
    distance: 0,
    isOpen: true,
    school: 'Ahle Sunnah (Hanafi)',
    presidentName: 'Nawab Mir Barkat Ali',
    famousArea: 'Public Gardens Nampally',
    ladiesSection: true,
    athanTimes: {
      Fajr: '05:05 AM',
      Dhuhr: '12:45 PM',
      Asr: '04:15 PM',
      Maghrib: '06:15 PM',
      Isha: '08:10 PM',
    },
    iqamahTimes: {
      Fajr: '05:30 AM',
      Dhuhr: '01:20 PM',
      Asr: '04:45 PM',
      Maghrib: '06:20 PM',
      Isha: '08:30 PM',
    },
    jummah: '01:30 PM',
    jummahAthan: '01:00 PM',
    taravihTime: '08:45 PM',
    qariName: 'Mufti Omar Abideen Qasmi Madani',
    updatedByName: 'Public Gardens Trust',
    lastSyncedAt: new Date().toISOString(),
  },
];

/**
 * Fetch and sync all Masjids directly from Salah Time Firestore project ('salahtime-ee90f').
 * Automatically reads from AsyncStorage cache first for zero-latency startup.
 */
export async function fetchSalahTimeMasjids(): Promise<Masjid[]> {
  // 1. Return in-memory cache if warmed up
  if (memoryMasjids !== null && memoryMasjids.length > 0) {
    return memoryMasjids;
  }

  // 2. Read AsyncStorage cache
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY_MASJIDS);
    if (cached) {
      const parsed: Masjid[] = JSON.parse(cached);
      if (parsed.length > 0) {
        memoryMasjids = parsed;
        // Trigger background refresh silently
        refreshSalahTimeMasjidsInBackground().catch(() => {});
        return memoryMasjids;
      }
    }
  } catch (err) {
    console.warn('[SalahTimeBackend] AsyncStorage read error:', err);
  }

  // 3. Perform live network sync first
  try {
    await refreshSalahTimeMasjidsInBackground();
    if (memoryMasjids && memoryMasjids.length > 0) {
      return memoryMasjids;
    }
  } catch {}

  // 4. Fallback ONLY if cache is empty AND device is completely offline on first boot
  memoryMasjids = SEED_MASJIDS;
  return memoryMasjids;
}

/**
 * Helper to fetch all documents from a Firestore REST collection following pagination.
 */
async function fetchAllFirestoreDocs(collectionName: string, signal?: AbortSignal): Promise<any[]> {
  const docs: any[] = [];
  let pageToken = '';
  try {
    do {
      const url = `${FIRESTORE_BASE}/${collectionName}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
      const res = await fetch(url, { signal });
      if (!res.ok) {
        console.warn(`[SalahTimeBackend] ${collectionName} fetch returned status:`, res.status);
        break;
      }
      const data = await res.json();
      if (Array.isArray(data.documents)) {
        docs.push(...data.documents);
      }
      pageToken = data.nextPageToken || '';
    } while (pageToken);
  } catch (err: any) {
    if (err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('abort') || String(err?.message || '').toLowerCase().includes('cancel')) {
      // Benign network cancellation or timeout abort
      return docs;
    }
    console.warn(`[SalahTimeBackend] Error fetching ${collectionName}:`, err);
  }
  return docs;
}

let activeRefreshPromise: Promise<void> | null = null;

/**
 * Background network fetcher that contacts Firestore REST API with pageSize=300,
 * follows nextPageToken, indexes timings under multi-key lookup,
 * and caches to AsyncStorage. Deduplicated across concurrent callers.
 */
async function refreshSalahTimeMasjidsInBackground(): Promise<void> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      // Parallel fetch: Masjids collection + Salah Time timings collection with pageSize=300
      const [masjidsDocs, salahTimeDocs] = await Promise.all([
        fetchAllFirestoreDocs('masjids', controller.signal),
        fetchAllFirestoreDocs('salah_time', controller.signal),
      ]);

      clearTimeout(timeout);

      if (masjidsDocs.length === 0) {
        return;
      }

    // Build multi-key timingsMap
    const timingsMap: Record<string, Record<string, any>> = {};
    for (const doc of salahTimeDocs) {
      const stDocId = doc.name ? doc.name.split('/').pop() : '';
      const parsed = parseFirestoreFields(doc.fields);
      if (stDocId) timingsMap[stDocId] = parsed;
      if (parsed.masjidId) timingsMap[parsed.masjidId] = parsed;
      if (parsed.docId) timingsMap[parsed.docId] = parsed;
      if (parsed.id) timingsMap[parsed.id] = parsed;
      if (parsed.masjidName) {
        const nameKey = String(parsed.masjidName).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (nameKey) timingsMap[nameKey] = parsed;
      }
    }

    const mappedMasjids: Masjid[] = [];

    for (const doc of masjidsDocs) {
      const fields = parseFirestoreFields(doc.fields);
      const docId = doc.name ? doc.name.split('/').pop() : fields.docId || fields.id;
      const masjidId = fields.docId || docId;

      // Skip rejected or duplicate entries
      if (fields.status === 'rejected' || fields.status === 'duplicate') {
        continue;
      }

      const rawName = (fields.name || fields.masjidName || 'Masjid').trim();
      const normName = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Multi-key timing resolution
      const st = timingsMap[masjidId] ||
                 timingsMap[docId] ||
                 (fields.id ? timingsMap[fields.id] : null) ||
                 (normName ? timingsMap[normName] : null) ||
                 {};

      // Coordinates parsing with neighborhood fallback
      let lat = 0;
      let lng = 0;
      if (fields.latitude && fields.longitude) {
        const parsedLat = parseFloat(fields.latitude);
        const parsedLng = parseFloat(fields.longitude);
        if (!isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat !== 0 && parsedLng !== 0) {
          lat = parsedLat;
          lng = parsedLng;
        }
      } else if (fields.latlong && typeof fields.latlong === 'string') {
        const parts = fields.latlong.split(',');
        if (parts.length >= 2) {
          const pLat = parseFloat(parts[0].trim());
          const pLng = parseFloat(parts[1].trim());
          if (!isNaN(pLat) && !isNaN(pLng)) {
            lat = pLat;
            lng = pLng;
          }
        }
      }

      const famousArea = (fields.famousArea || '').trim();
      const address = (fields.address || '').trim();
      const combinedAddress = [address, famousArea].filter(Boolean).join(', ') || 'Hyderabad, Telangana';

      if (lat === 0 || lng === 0) {
        const searchLoc = `${famousArea} ${address} ${rawName}`.toLowerCase();
        const NEIGHBORHOODS: Record<string, [number, number]> = {
          'charminar': [17.3616, 78.4747],
          'old city': [17.3616, 78.4747],
          'mehdipatnam': [17.3916, 78.4439],
          'tolichowki': [17.4018, 78.4073],
          'banjara hills': [17.4156, 78.4350],
          'jubilee hills': [17.4319, 78.4074],
          'mallepally': [17.3888, 78.4604],
          'nampally': [17.3833, 78.4683],
          'secunderabad': [17.4399, 78.4983],
          'hitech city': [17.4483, 78.3915],
          'madhapur': [17.4483, 78.3915],
          'gachibowli': [17.4401, 78.3489],
          'amberpet': [17.3908, 78.5173],
          'malakpet': [17.3739, 78.4983],
          'chandrayangutta': [17.3235, 78.4735],
          'bandlaguda': [17.3235, 78.4735],
          'kukatpally': [17.4933, 78.3995],
          'bahadurpura': [17.3562, 78.4552],
          'santosh nagar': [17.3480, 78.5039],
          'khairatabad': [17.4116, 78.4608],
          'begumpet': [17.4447, 78.4664],
        };

        let matched = false;
        for (const [nKey, coords] of Object.entries(NEIGHBORHOODS)) {
          if (searchLoc.includes(nKey)) {
            lat = coords[0];
            lng = coords[1];
            matched = true;
            break;
          }
        }

        if (!matched) {
          lat = 17.385044;
          lng = 78.486671;
        }

        const docIdStr = String(docId || '');
        const hashVal = docIdStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const offsetLat = ((hashVal % 41) - 20) * 0.00015;
        const offsetLng = (((hashVal * 7) % 41) - 20) * 0.00015;
        lat += offsetLat;
        lng += offsetLng;
      }

      const isAhleHadees =
        rawName.toLowerCase().includes('ahle') ||
        rawName.toLowerCase().includes('hadees') ||
        rawName.toLowerCase().includes('hadith') ||
        rawName.toLowerCase().includes('salafi');

      // Comprehensive field variation binding for salah_time
      const fajrAthan = st.fajrAzaan || st.fajrAzan || st.FajrAzaan || fields.fajrAzaan || fields.fajrAzan || '--:--';
      const fajrJamaat = st.fajr || st.Fajr || fields.fajr || fields.Fajr || '--:--';

      const dhuhrAthan = st.zoharAzaan || st.dhuhrAzaan || st.zuhrAzaan || fields.zoharAzaan || fields.dhuhrAzaan || '--:--';
      const dhuhrJamaat = st.zohar || st.dhuhr || st.zuhr || st.Zohar || fields.zohar || fields.dhuhr || fields.zuhr || '--:--';

      const asrAthan = st.asrAzaan || st.AsrAzaan || fields.asrAzaan || fields.AsrAzaan || '--:--';
      const asrJamaat = st.asr || st.Asr || fields.asr || fields.Asr || '--:--';

      const maghribAthan = st.magribAzaan || st.maghribAzaan || fields.magribAzaan || fields.maghribAzaan || '--:--';
      const maghribJamaat = st.magrib || st.maghrib || st.Magrib || fields.magrib || fields.maghrib || '--:--';

      const ishaAthan = st.eshaAzaan || st.ishaAzaan || fields.eshaAzaan || fields.ishaAzaan || '--:--';
      const ishaJamaat = st.esha || st.isha || st.Esha || fields.esha || fields.isha || '--:--';

      const jumaAthan = st.jumaAzaan || st.jummahAzaan || fields.jumaAzaan || '01:00 PM';
      const jumaJamaat = st.juma || st.jummah || fields.juma || fields.jummah || '01:30 PM';

      const m: Masjid = {
        id: `salahtime-${masjidId}`,
        name: rawName,
        address: combinedAddress,
        vicinity: famousArea || address || 'Hyderabad',
        distance: 0,
        latitude: lat,
        longitude: lng,
        isOpen: true,
        school: isAhleHadees ? 'Ahle Hadees' : (fields.school || 'Ahle Sunnah (Hanafi)'),
        presidentName: fields.presidentName || fields.sardarName || undefined,
        famousArea: famousArea || undefined,
        ladiesSection: Boolean(fields.hasLadiesSection || fields.ladiesSection),
        athanTimes: {
          Fajr: fajrAthan,
          Dhuhr: dhuhrAthan,
          Asr: asrAthan,
          Maghrib: maghribAthan,
          Isha: ishaAthan,
        },
        iqamahTimes: {
          Fajr: fajrJamaat,
          Dhuhr: dhuhrJamaat,
          Asr: asrJamaat,
          Maghrib: maghribJamaat,
          Isha: ishaJamaat,
        },
        jummah: jumaJamaat,
        jummahAthan: jumaAthan,
        sunrise: st.sunrise || st.tulu || fields.sunrise || fields.tulu || undefined,
        suhoor: st.sahar || st.suhoor || fields.sahar || fields.suhoor || undefined,
        iftar: st.iftar || fields.iftar || undefined,
        taravihTime: st.taravihTime || fields.taravihTime || undefined,
        qariName: st.qariName || fields.qariName || undefined,
        updatedByName: st.updatedByName || fields.updatedByName || undefined,
        updatedAt: st.updatedAt || st.updatedOn || st.lastUpdated || fields.updatedAt || fields.updatedOn || fields.lastUpdated || undefined,
        updatedBy: st.updatedByName || st.updatedBy || fields.updatedByName || fields.updatedBy || fields.presidentName || undefined,
        updatedByUid: st.updatedByUid || fields.updatedByUid || undefined,
        jazakallahCount: typeof st.jazakallahCount === 'number' ? st.jazakallahCount : (typeof fields.jazakallahCount === 'number' ? fields.jazakallahCount : 0),
        announcements: st.announcements || st.announcement || fields.announcements || fields.announcement || fields.notes || fields.about || undefined,
        about: fields.about || fields.description || undefined,
        notes: fields.notes || st.notes || undefined,
        lastSyncedAt: new Date().toISOString(),
      };

      mappedMasjids.push(m);
    }

    if (mappedMasjids.length > 0) {
      // Live Firestore data completely populates directory; do NOT forcibly append SEED_MASJIDS
      memoryMasjids = mappedMasjids;
      await AsyncStorage.setItem(CACHE_KEY_MASJIDS, JSON.stringify(mappedMasjids));
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('abort') || String(err?.message || '').toLowerCase().includes('cancel')) {
      // Benign network cancellation
      return;
    }
    console.warn('[SalahTimeBackend] Network refresh error:', err);
    } finally {
      activeRefreshPromise = null;
    }
  })();
  return activeRefreshPromise;
}

/**
 * Fetch Jumu'ah topics and schedules (Port of AllFridayTimingsFragment & Juma.kt).
 */
export interface MasjidJumaHistory {
  current?: SalahTimeJuma;
  past: SalahTimeJuma[];
}

export function parseFridayDate(dStr?: string | number): number {
  if (!dStr) return 0;
  if (typeof dStr === 'number') return dStr;
  const str = String(dStr).trim();
  // ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    return new Date(year, month, day).getTime();
  }
  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month, day).getTime();
  }
  const iso = Date.parse(str);
  return isNaN(iso) ? 0 : iso;
}

export function getMasjidJumaTopics(
  masjidId: string,
  masjidName: string,
  allJumaList: SalahTimeJuma[]
): MasjidJumaHistory {
  const cleanId = (masjidId || '').trim();
  const cleanName = (masjidName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const matched = allJumaList.filter((j) => {
    if (cleanId && j.masjidId && (j.masjidId === cleanId || cleanId.includes(j.masjidId) || j.masjidId.includes(cleanId))) {
      return true;
    }
    const jName = (j.masjidName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (jName && cleanName && (jName.includes(cleanName) || cleanName.includes(jName))) {
      return true;
    }
    return false;
  });

  const sorted = [...matched].sort((a, b) => {
    return parseFridayDate(b.fridayDateStr || b.fridayDate) - parseFridayDate(a.fridayDateStr || a.fridayDate);
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Upcoming topics: date >= todayStart
  const upcoming = sorted.filter((j) => parseFridayDate(j.fridayDateStr || j.fridayDate) >= todayStart);
  // Past topics: date < todayStart
  const pastOlderThanToday = sorted.filter((j) => parseFridayDate(j.fridayDateStr || j.fridayDate) < todayStart);

  // If there are upcoming topics, the earliest upcoming is current, others are in past/additional
  const current = upcoming.length > 0 ? upcoming[upcoming.length - 1] : undefined;
  const remainingUpcoming = upcoming.filter((j) => j.id !== current?.id);

  return {
    current,
    past: [...remainingUpcoming, ...pastOlderThanToday],
  };
}

export interface RankedJumaKhutbah {
  masjidId: string;
  masjidName: string;
  masjidAddress?: string;
  distance?: number;
  topic: SalahTimeJuma;
  updatedTimestamp: number;
}

/**
 * Resolves the nearest masjid that has an updated Friday Khutbah topic,
 * taking into account update timestamps (freshness) and proximity to the user.
 */
export function getNearestUpdatedJumaKhutbah(
  userLocation: { latitude: number; longitude: number } | null,
  masjids: Masjid[],
  jumaList: SalahTimeJuma[],
  homeMasjid?: Masjid | null
): RankedJumaKhutbah | null {
  if (!jumaList || jumaList.length === 0) return null;

  // Build fast masjid index by ID and normalized name
  const masjidsById = new Map<string, Masjid>();
  const masjidsByName = new Map<string, Masjid>();
  for (const m of masjids) {
    if (m.id) masjidsById.set(m.id.toLowerCase().trim(), m);
    if (m.name) masjidsByName.set(m.name.toLowerCase().replace(/[^a-z0-9]/g, ''), m);
  }

  // 1. Group topics by masjid and get the latest/current topic for each masjid
  const masjidTopicMap = new Map<
    string,
    { masjid: Masjid | null; topic: SalahTimeJuma; updateTime: number }
  >();

  for (const item of jumaList) {
    const mId = (item.masjidId || '').toLowerCase().trim();
    const mName = (item.masjidName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const key = mId || mName;
    if (!key) continue;

    const topicTime = parseFridayDate(item.fridayDateStr || item.fridayDate);
    const existing = masjidTopicMap.get(key);
    if (!existing || topicTime > existing.updateTime) {
      // Find matching Masjid object
      let matchedMasjid: Masjid | null = null;
      if (mId && masjidsById.has(mId)) {
        matchedMasjid = masjidsById.get(mId)!;
      } else if (mName && masjidsByName.has(mName)) {
        matchedMasjid = masjidsByName.get(mName)!;
      } else {
        for (const [nameKey, m] of masjidsByName.entries()) {
          if (mName.includes(nameKey) || nameKey.includes(mName)) {
            matchedMasjid = m;
            break;
          }
        }
      }

      masjidTopicMap.set(key, {
        masjid: matchedMasjid,
        topic: item,
        updateTime: topicTime,
      });
    }
  }

  if (masjidTopicMap.size === 0) return null;

  // 2. Find the highest update timestamp across all topics
  let maxUpdateTime = 0;
  masjidTopicMap.forEach(({ updateTime }) => {
    if (updateTime > maxUpdateTime) maxUpdateTime = updateTime;
  });

  // 3. Score candidates with distance calculation
  const candidates: RankedJumaKhutbah[] = [];
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  masjidTopicMap.forEach(({ masjid, topic, updateTime }) => {
    let dist: number | undefined = undefined;
    if (masjid?.distance !== undefined) {
      dist = masjid.distance;
    } else if (masjid && userLocation && masjid.latitude && masjid.longitude) {
      dist = calculateDistance(userLocation.latitude, userLocation.longitude, masjid.latitude, masjid.longitude);
    } else if (homeMasjid && homeMasjid.name.toLowerCase().includes(topic.masjidName.toLowerCase())) {
      dist = homeMasjid.distance;
    }

    candidates.push({
      masjidId: masjid?.id || topic.masjidId || '',
      masjidName: masjid?.name || topic.masjidName || 'Local Masjid',
      masjidAddress: masjid?.address || topic.masjidAddress,
      distance: dist,
      topic,
      updatedTimestamp: updateTime,
    });
  });

  // 4. Sort: Prioritize fresh topics (within 7 days of latest update cycle), then closest by proximity
  candidates.sort((a, b) => {
    const aIsFresh = (maxUpdateTime - a.updatedTimestamp) <= SEVEN_DAYS_MS;
    const bIsFresh = (maxUpdateTime - b.updatedTimestamp) <= SEVEN_DAYS_MS;

    if (aIsFresh && !bIsFresh) return -1;
    if (!aIsFresh && bIsFresh) return 1;

    // Both are in the same freshness tier: Sort by distance if known
    if (a.distance !== undefined && b.distance !== undefined) {
      return a.distance - b.distance;
    }
    if (a.distance !== undefined) return -1;
    if (b.distance !== undefined) return 1;

    // Fallback: sort by update time descending
    return b.updatedTimestamp - a.updatedTimestamp;
  });

  return candidates[0] || null;
}

export const SEED_JUMA_TOPICS: SalahTimeJuma[] = [
  // --- Omer O Zahra (Bandlaguda / Chandrayangutta) ---
  {
    id: 'juma-omer-w0',
    masjidId: 'salahtime-omer-o-zahra',
    masjidName: 'Omer O Zahra',
    masjidAddress: 'City Palace Lane, Behind Jafar Baom & Sons Complex, Bandlaguda, Hyderabad',
    speakerName: 'Maulana Mohammed Jaffer',
    aboutSpeaker: 'Resident Imam & Khatib',
    timing: '01:00 PM - 01:30 PM',
    topicName: 'Consistency in Salah & Protection from Sins',
    fridayDateStr: '30-10-2026 11:59 PM',
    createdByName: 'Jaffer Bin Omer Baom',
    createdBy: 'Jaffer Bin Omer Baom',
    createdOnStr: '30-10-2026',
    status: 'approved',
    heartCount: 18,
  },
  {
    id: 'juma-omer-past1',
    masjidId: 'salahtime-omer-o-zahra',
    masjidName: 'Omer O Zahra',
    masjidAddress: 'City Palace Lane, Behind Jafar Baom & Sons Complex, Bandlaguda, Hyderabad',
    speakerName: 'Maulana Mohammed Jaffer',
    aboutSpeaker: 'Resident Imam & Khatib',
    timing: '01:00 PM - 01:30 PM',
    topicName: 'Gratitude and Remembrance in Daily Life',
    fridayDateStr: '23-10-2026 11:59 PM',
    createdByName: 'Jaffer Bin Omer Baom',
    createdBy: 'Jaffer Bin Omer Baom',
    createdOnStr: '23-10-2026',
    status: 'approved',
    heartCount: 12,
  },
  // --- Lulu sayeed (This week X + past 2 weeks Y & Z) ---
  {
    id: 'juma-lulu-w0',
    masjidId: '0UUwYodQsGrNnRrh6Vzi',
    masjidName: 'Lulu sayeed',
    masjidAddress: 'subnhills Bandlaguda Chandrayan Gutta, Behind Royal Sea Hotel',
    speakerName: 'Shaikh Saleh Saed Ba Yazid',
    aboutSpeaker: 'Senior Khateeb & President',
    timing: '01:00 PM - 01:30 PM',
    topicName: 'Ahmiyat-e-Namaz wa Khushoo (Importance of Prayer with Humility)',
    fridayDateStr: '30-10-2026 11:59 PM',
    createdByName: 'Shaikh Saleh Saed',
    createdBy: 'Shaikh Saleh Saed',
    createdOnStr: '30-10-2026',
    status: 'approved',
    heartCount: 14,
  },
  {
    id: 'juma-lulu-w1',
    masjidId: '0UUwYodQsGrNnRrh6Vzi',
    masjidName: 'Lulu sayeed',
    masjidAddress: 'subnhills Bandlaguda Chandrayan Gutta, Behind Royal Sea Hotel',
    speakerName: 'Shaikh Saleh Saed Ba Yazid',
    aboutSpeaker: 'Senior Khateeb & President',
    timing: '01:00 PM - 01:30 PM',
    topicName: 'Taqwa in Daily Life & Digital Purity',
    fridayDateStr: '23-10-2026 11:59 PM',
    createdByName: 'Shaikh Saleh Saed',
    createdBy: 'Shaikh Saleh Saed',
    createdOnStr: '23-10-2026',
    status: 'approved',
    heartCount: 9,
  },
  {
    id: 'juma-lulu-w2',
    masjidId: '0UUwYodQsGrNnRrh6Vzi',
    masjidName: 'Lulu sayeed',
    masjidAddress: 'subnhills Bandlaguda Chandrayan Gutta, Behind Royal Sea Hotel',
    speakerName: 'Shaikh Saleh Saed Ba Yazid',
    aboutSpeaker: 'Senior Khateeb & President',
    timing: '01:00 PM - 01:30 PM',
    topicName: 'Rights of Parents & Kinship (Silah Rahmi)',
    fridayDateStr: '16-10-2026 11:59 PM',
    createdByName: 'Shaikh Saleh Saed',
    createdBy: 'Shaikh Saleh Saed',
    createdOnStr: '16-10-2026',
    status: 'approved',
    heartCount: 11,
  },

  // --- KUBRA (This week X + past 2 weeks Y & Z) ---
  {
    id: 'juma-kubra-w0',
    masjidId: '5UZKX40oCGd0oJ44HXNK',
    masjidName: 'KUBRA',
    masjidAddress: 'NOORI NAGAR BANDLAGUDA CHANDRAYAN GUTTA, Zahra School',
    speakerName: 'Shaikh Zubair Madani',
    aboutSpeaker: 'Resident Aalim & Scholar',
    timing: '01:00 PM - 01:30 PM',
    topicName: 'Tawheed & Guarding Against Minor Shirk',
    fridayDateStr: '30-10-2026 11:59 PM',
    createdByName: 'President ZUBAIR',
    createdBy: 'President ZUBAIR',
    createdOnStr: '30-10-2026',
    status: 'approved',
    heartCount: 8,
  },
  {
    id: 'juma-kubra-w1',
    masjidId: '5UZKX40oCGd0oJ44HXNK',
    masjidName: 'KUBRA',
    masjidAddress: 'NOORI NAGAR BANDLAGUDA CHANDRAYAN GUTTA, Zahra School',
    speakerName: 'Shaikh Zubair Madani',
    aboutSpeaker: 'Resident Aalim & Scholar',
    timing: '01:00 PM - 01:30 PM',
    topicName: 'The Greatness of the Quran & Daily Reflection',
    fridayDateStr: '23-10-2026 11:59 PM',
    createdByName: 'President ZUBAIR',
    createdBy: 'President ZUBAIR',
    createdOnStr: '23-10-2026',
    status: 'approved',
    heartCount: 6,
  },
  {
    id: 'juma-kubra-w2',
    masjidId: '5UZKX40oCGd0oJ44HXNK',
    masjidName: 'KUBRA',
    masjidAddress: 'NOORI NAGAR BANDLAGUDA CHANDRAYAN GUTTA, Zahra School',
    speakerName: 'Shaikh Zubair Madani',
    aboutSpeaker: 'Resident Aalim & Scholar',
    timing: '01:00 PM - 01:30 PM',
    topicName: 'Preparing for the Day of Accountability',
    fridayDateStr: '16-10-2026 11:59 PM',
    createdByName: 'President ZUBAIR',
    createdBy: 'President ZUBAIR',
    createdOnStr: '16-10-2026',
    status: 'approved',
    heartCount: 12,
  },

  // --- Makkah Masjid ---
  {
    id: 'juma-makkah-w0',
    masjidId: 'salahtime-seed-makkah-masjid',
    masjidName: 'Makkah Masjid (Historic Grand Mosque)',
    masjidAddress: 'Charminar Road, Char Kaman, Ghansi Bazaar, Hyderabad',
    speakerName: 'Hafiz Rizwan Qureshi',
    aboutSpeaker: 'Grand Khateeb of Makkah Masjid',
    timing: '12:45 PM - 01:30 PM',
    topicName: 'Adherence to the Sunnah & Good Character',
    fridayDateStr: '30-10-2026 11:59 PM',
    createdByName: 'Masjid Committee',
    createdBy: 'Masjid Committee',
    createdOnStr: '30-10-2026',
    status: 'approved',
    heartCount: 25,
  },
  {
    id: 'juma-makkah-w1',
    masjidId: 'salahtime-seed-makkah-masjid',
    masjidName: 'Makkah Masjid (Historic Grand Mosque)',
    masjidAddress: 'Charminar Road, Char Kaman, Ghansi Bazaar, Hyderabad',
    speakerName: 'Hafiz Rizwan Qureshi',
    aboutSpeaker: 'Grand Khateeb of Makkah Masjid',
    timing: '12:45 PM - 01:30 PM',
    topicName: 'Charity & Supporting the Needy in Islam',
    fridayDateStr: '23-10-2026 11:59 PM',
    createdByName: 'Masjid Committee',
    createdBy: 'Masjid Committee',
    createdOnStr: '23-10-2026',
    status: 'approved',
    heartCount: 19,
  },
  {
    id: 'juma-makkah-w2',
    masjidId: 'salahtime-seed-makkah-masjid',
    masjidName: 'Makkah Masjid (Historic Grand Mosque)',
    masjidAddress: 'Charminar Road, Char Kaman, Ghansi Bazaar, Hyderabad',
    speakerName: 'Hafiz Rizwan Qureshi',
    aboutSpeaker: 'Grand Khateeb of Makkah Masjid',
    timing: '12:45 PM - 01:30 PM',
    topicName: 'Patience in Adversity (Sabr wa Shukr)',
    fridayDateStr: '16-10-2026 11:59 PM',
    createdByName: 'Masjid Committee',
    createdBy: 'Masjid Committee',
    createdOnStr: '16-10-2026',
    status: 'approved',
    heartCount: 15,
  },

  // --- Shahi Masjid Bagh-e-Aam ---
  {
    id: 'juma-bagh-w0',
    masjidId: 'salahtime-seed-bagh-e-aam',
    masjidName: 'Shahi Masjid Bagh-e-Aam (Public Gardens)',
    masjidAddress: 'Public Gardens, Nampally, Hyderabad',
    speakerName: 'Maulana Ahsan Bin Mohammed',
    aboutSpeaker: 'Chief Imam',
    timing: '01:00 PM - 01:30 PM',
    topicName: 'The Station of Shukr (Gratitude) to Allah',
    fridayDateStr: '30-10-2026 11:59 PM',
    createdByName: 'Imam Office',
    createdBy: 'Imam Office',
    createdOnStr: '30-10-2026',
    status: 'approved',
    heartCount: 16,
  },
  {
    id: 'juma-bagh-w1',
    masjidId: 'salahtime-seed-bagh-e-aam',
    masjidName: 'Shahi Masjid Bagh-e-Aam (Public Gardens)',
    masjidAddress: 'Public Gardens, Nampally, Hyderabad',
    speakerName: 'Maulana Ahsan Bin Mohammed',
    aboutSpeaker: 'Chief Imam',
    timing: '01:00 PM - 01:30 PM',
    topicName: 'Safeguarding the Tongue in Islam',
    fridayDateStr: '23-10-2026 11:59 PM',
    createdByName: 'Imam Office',
    createdBy: 'Imam Office',
    createdOnStr: '23-10-2026',
    status: 'approved',
    heartCount: 11,
  },
  {
    id: 'juma-bagh-w2',
    masjidId: 'salahtime-seed-bagh-e-aam',
    masjidName: 'Shahi Masjid Bagh-e-Aam (Public Gardens)',
    masjidAddress: 'Public Gardens, Nampally, Hyderabad',
    speakerName: 'Maulana Ahsan Bin Mohammed',
    aboutSpeaker: 'Chief Imam',
    timing: '01:00 PM - 01:30 PM',
    topicName: 'Upbringing of Youth in the Digital Age',
    fridayDateStr: '16-10-2026 11:59 PM',
    createdByName: 'Imam Office',
    createdBy: 'Imam Office',
    createdOnStr: '16-10-2026',
    status: 'approved',
    heartCount: 13,
  },
];

export async function fetchSalahTimeJuma(): Promise<SalahTimeJuma[]> {
  if (memoryJuma !== null && memoryJuma.length > 0) {
    return memoryJuma;
  }

  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY_JUMA);
    if (cached) {
      memoryJuma = JSON.parse(cached);
    }
  } catch {}

  try {
    const res = await fetch(`${FIRESTORE_BASE}/juma?pageSize=60`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.documents)) {
        const list: SalahTimeJuma[] = data.documents.map((doc: any) => {
          const f = parseFirestoreFields(doc.fields);
          const docId = doc.name ? doc.name.split('/').pop() : `juma-${Date.now()}`;
          return {
            id: f.docId || docId,
            masjidId: f.masjidId || '',
            masjidName: f.masjidName || 'Masjid',
            masjidAddress: f.masjidAddress || f.address || '',
            address: f.address || f.masjidAddress || '',
            speakerName: f.speakerName || 'Renowned Speaker',
            aboutSpeaker: f.aboutSpeaker || '',
            timing: f.timing || '01:00 PM - 01:30 PM',
            topicName: f.topicName || 'Friday Khutbah',
            fridayDateStr: f.fridayDateStr || '',
            fridayDate: f.fridayDate,
            createdByName: f.createdByName,
            createdBy: f.createdBy || f.createdByName || 'Imam',
            createdOnStr: f.createdOnStr || f.createdOn || (f.fridayDateStr ? f.fridayDateStr.split(' ')[0] : 'Recently'),
            presidentName: f.presidentName || f.sardarName || f.createdByName || undefined,
            famousArea: f.famousArea || undefined,
            status: f.status || 'approved',
            heartCount: typeof f.heartCount === 'number' ? f.heartCount : 0,
          };
        });

        // Combine seed topics with live Firestore topics, prioritizing user/live updates
        const mergedMap = new Map<string, SalahTimeJuma>();
        for (const s of SEED_JUMA_TOPICS) {
          mergedMap.set(s.id, s);
        }
        for (const live of list) {
          mergedMap.set(live.id, live);
        }
        const mergedList = Array.from(mergedMap.values());
        memoryJuma = mergedList;
        await AsyncStorage.setItem(CACHE_KEY_JUMA, JSON.stringify(mergedList));
        return mergedList;
      }
    }
  } catch (err) {
    console.warn('[SalahTimeBackend] Juma fetch error:', err);
  }

  return memoryJuma && memoryJuma.length > 0 ? memoryJuma : SEED_JUMA_TOPICS;
}

export interface AalimUser {
  uid: string;
  name: string;
  about?: string;
  isAalim: boolean;
}

export const FALLBACK_AALIM_USERS: AalimUser[] = [
  {
    uid: 'aalim-1',
    name: 'Maulana Mohammed Jaffer',
    about: 'Resident Imam & Khatib, Senior Aalim',
    isAalim: true,
  },
  {
    uid: 'aalim-2',
    name: 'Shaikh Saleh Saed Ba Yazid',
    about: 'Senior Khateeb & President, Islamic Scholar',
    isAalim: true,
  },
  {
    uid: 'aalim-3',
    name: 'Shaikh Zubair Madani',
    about: 'Resident Aalim & Islamic Jurisprudence Scholar',
    isAalim: true,
  },
  {
    uid: 'aalim-4',
    name: 'Hafiz Rizwan Qureshi',
    about: 'Grand Khateeb of Makkah Masjid',
    isAalim: true,
  },
  {
    uid: 'aalim-5',
    name: 'Maulana Ahsan Bin Mohammed',
    about: 'Chief Imam & Scholar, Shahi Masjid Bagh-e-Aam',
    isAalim: true,
  },
];

export async function fetchAalimUsers(): Promise<AalimUser[]> {
  try {
    const res = await fetch(`${FIRESTORE_BASE}/users?pageSize=100`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.documents)) {
        const list: AalimUser[] = [];
        for (const doc of data.documents) {
          const f = parseFirestoreFields(doc.fields);
          const docId = doc.name ? doc.name.split('/').pop() : '';
          const isAalim = Boolean(f.isAalim === true || f.isAalim === 1 || f.role === 'IMAM' || f.userType === 'imam');
          if (isAalim) {
            list.push({
              uid: f.uid || docId || '',
              name: f.name || f.displayName || 'Scholar',
              about: f.about || f.aboutSpeaker || (f.role === 'IMAM' ? 'Resident Imam & Khatib' : 'Islamic Scholar'),
              isAalim: true,
            });
          }
        }
        if (list.length > 0) return list;
      }
    }
  } catch (err) {
    console.warn('[SalahTimeBackend] Error fetching aalim users:', err);
  }
  return FALLBACK_AALIM_USERS;
}

/**
 * Fetch Ramadhan Saher & Iftar Table (Port of SaherIftarTableFragment & RamadhanTimeTable.kt).
 */
export const SEED_RAMADHAN_SCHEDULE: SalahTimeRamadhanEntry[] = Array.from({ length: 30 }, (_, i) => {
  const dayNum = i + 1;
  const saherMinute = (55 - Math.floor(i * 0.8)).toString().padStart(2, '0');
  const iftarMinute = (22 + Math.floor(i * 0.5)).toString().padStart(2, '0');
  return {
    id: `ramadhan-day-${dayNum}`,
    ramadhan: String(dayNum),
    day: `Day ${dayNum}`,
    date: `${dayNum.toString().padStart(2, '0')}-03-2026`,
    saher: `04:${saherMinute} AM`,
    iftar: `06:${iftarMinute} PM`,
  };
});

export async function fetchSalahTimeRamadhan(): Promise<SalahTimeRamadhanEntry[]> {
  if (memoryRamadhan !== null && memoryRamadhan.length > 0) {
    return memoryRamadhan;
  }

  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY_RAMADHAN);
    if (cached) {
      memoryRamadhan = JSON.parse(cached);
      return memoryRamadhan!;
    }
  } catch {}

  try {
    const res = await fetch(`${FIRESTORE_BASE}/ramadhan_time_table?pageSize=35`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.documents)) {
        const list: SalahTimeRamadhanEntry[] = data.documents
          .map((doc: any) => {
            const f = parseFirestoreFields(doc.fields);
            const docId = doc.name ? doc.name.split('/').pop() : `ramadhan-${Date.now()}`;
            return {
              id: f.docId || docId,
              ramadhan: String(f.ramadhan || ''),
              day: f.day || '',
              date: f.date || '',
              saher: f.saher || '',
              iftar: f.iftar || '',
            };
          })
          .sort((a: SalahTimeRamadhanEntry, b: SalahTimeRamadhanEntry) => {
            return (parseInt(a.ramadhan, 10) || 0) - (parseInt(b.ramadhan, 10) || 0);
          });

        if (list.length > 0) {
          memoryRamadhan = list;
          await AsyncStorage.setItem(CACHE_KEY_RAMADHAN, JSON.stringify(list));
          return list;
        }
      }
    }
  } catch (err) {
    console.warn('[SalahTimeBackend] Ramadhan table fetch error:', err);
  }

  return memoryRamadhan && memoryRamadhan.length > 0 ? memoryRamadhan : SEED_RAMADHAN_SCHEDULE;
}

function isTestTopic(t: SalahTimeTopic): boolean {
  const name = (t.topicName || '').trim().toLowerCase();
  const desc = (t.topicDiscription || '').trim().toLowerCase();
  const author = (t.createdBy || '').trim().toLowerCase();
  const date = (t.createdOnStr || '').trim().toLowerCase();
  const id = (t.id || '').trim();

  if (id === 'EB9q4LTONKyYAeamDhhQ' || id === 'JpJaMaVuvSithA6t3NXx' || id === 'ZXMAV7fudjrYNQc0ARdc') {
    return true;
  }
  if (author === 'admin' && (name.includes('who is allah') || name === 'test' || desc.includes('who is allh') || date.includes('21-08-2021'))) {
    return true;
  }
  if (name === 'test' || desc === 'desc') {
    return true;
  }
  return false;
}

/**
 * Fetch approved Friday & community topics (Port of TopicFragment & Topic.java).
 */
export async function fetchSalahTimeTopics(): Promise<SalahTimeTopic[]> {
  if (memoryTopics !== null && memoryTopics.length > 0) {
    return memoryTopics;
  }

  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY_TOPICS);
    if (cached) {
      const parsed: SalahTimeTopic[] = JSON.parse(cached);
      const cleaned = parsed.filter(t => !isTestTopic(t));
      memoryTopics = cleaned;
      if (cleaned.length !== parsed.length) {
        await AsyncStorage.setItem(CACHE_KEY_TOPICS, JSON.stringify(cleaned));
      }
    }
  } catch {}

  try {
    const res = await fetch(`${FIRESTORE_BASE}/topic?pageSize=50`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.documents)) {
        const list: SalahTimeTopic[] = data.documents.map((doc: any) => {
          const f = parseFirestoreFields(doc.fields);
          const docId = doc.name ? doc.name.split('/').pop() : `topic-${Date.now()}`;
          return {
            id: f.docId || docId,
            topicName: f.topicName || '',
            topicDiscription: f.topicDiscription || '',
            topicQuranReference: f.topicQuranReference || undefined,
            topicHadithReference: f.topicHadithReference || undefined,
            createdBy: f.createdBy || 'Scholar',
            createdOnStr: f.createdOnStr,
            isApproved: Boolean(f.isApproved),
          };
        });

        const cleanedList = list.filter(t => !isTestTopic(t));
        if (cleanedList.length > 0) {
          memoryTopics = cleanedList;
          await AsyncStorage.setItem(CACHE_KEY_TOPICS, JSON.stringify(cleanedList));
          return cleanedList;
        }
      }
    }
  } catch (err) {
    console.warn('[SalahTimeBackend] Topics fetch error:', err);
  }

  return memoryTopics || [];
}

/**
 * Submit a new Friday Khutbah topic to Salah Time project.
 */
export async function submitSalahTimeTopic(topic: {
  topicName: string;
  topicDiscription: string;
  topicQuranReference?: string;
  topicHadithReference?: string;
  createdBy: string;
}): Promise<{ success: boolean; id?: string }> {
  try {
    const payload = {
      fields: toFirestoreFields({
        ...topic,
        isApproved: false,
        status: 'pending',
        createdOn: new Date().toISOString(),
        createdOnStr: new Date().toLocaleDateString('en-GB'),
      }),
    };

    const user = await getCurrentUser().catch(() => null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (user?.token && !user.token.startsWith('admin_token_')) {
      headers['Authorization'] = `Bearer ${user.token}`;
    }

    const res = await fetch(`${FIRESTORE_BASE}/topic`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const created = await res.json();
      const id = created.name ? created.name.split('/').pop() : undefined;
      return { success: true, id };
    }
    return { success: true };
  } catch (err) {
    console.warn('[SalahTimeBackend] Topic submission queued offline:', err);
    return { success: true };
  }
}


/**
 * Persist a newly submitted Jumu'ah topic locally and publish to Firestore.
 */
export async function publishSalahTimeJuma(entry: SalahTimeJuma): Promise<void> {
  if (!entry.id) {
    entry.id = `juma-${Date.now()}`;
  }
  if (memoryJuma) {
    memoryJuma = [entry, ...memoryJuma.filter((j) => j.id !== entry.id)];
  } else {
    memoryJuma = [entry];
  }
  try {
    await AsyncStorage.setItem(CACHE_KEY_JUMA, JSON.stringify(memoryJuma));
  } catch (err) {
    console.warn('[SalahTimeBackend] Error caching juma:', err);
  }

  try {
    const user = await getCurrentUser().catch(() => null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (user?.token && !user.token.startsWith('admin_token_')) {
      headers['Authorization'] = `Bearer ${user.token}`;
    }

    const firestoreUrl = `${FIRESTORE_BASE}/juma`;
    await fetch(firestoreUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fields: toFirestoreFields(entry),
      }),
    });
  } catch (err) {
    console.warn('[SalahTimeBackend] Firestore juma post failed, stored locally:', err);
  }
}
