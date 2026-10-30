import { fetchSalahTimeMasjids } from './salahTimeBackend';
import { Coordinates, getCurrentLocation, calculateDistance } from './location';
export { calculateDistance };
import { getLocalPrayerTimes } from './prayerTimes';

const HYDERABAD_NEIGHBORHOODS: Record<string, Coordinates> = {
  "banjara hills": { latitude: 17.4156, longitude: 78.4347 },
  "jubilee hills": { latitude: 17.4325, longitude: 78.4071 },
  "mehdipatnam": { latitude: 17.3916, longitude: 78.4439 },
  "mallepally": { latitude: 17.3871, longitude: 78.4556 },
  "tolichowki": { latitude: 17.3996, longitude: 78.4155 },
  "toli chowki": { latitude: 17.3996, longitude: 78.4155 },
  "charminar": { latitude: 17.3616, longitude: 78.4747 },
  "gachibowli": { latitude: 17.4401, longitude: 78.3489 },
  "secunderabad": { latitude: 17.4399, longitude: 78.4983 },
  "nampally": { latitude: 17.3925, longitude: 78.4682 },
  "amberpet": { latitude: 17.3862, longitude: 78.5204 },
  "himayatnagar": { latitude: 17.4042, longitude: 78.4867 },
  "begumpet": { latitude: 17.4447, longitude: 78.4664 },
  "kukatpally": { latitude: 17.4841, longitude: 78.4012 },
  "malakpet": { latitude: 17.3732, longitude: 78.5024 },
  "hitech city": { latitude: 17.4483, longitude: 78.3741 },
  "madhapur": { latitude: 17.4485, longitude: 78.3908 },
  "old city": { latitude: 17.3616, longitude: 78.4747 },
  "khairatabad": { latitude: 17.4126, longitude: 78.4583 },
  "somajiguda": { latitude: 17.4262, longitude: 78.4588 },
  "ameerpet": { latitude: 17.4374, longitude: 78.4482 },
  "yousufguda": { latitude: 17.4287, longitude: 78.4379 },
  "tarnaka": { latitude: 17.4299, longitude: 78.5375 },
  "bandlaguda": { latitude: 17.3096, longitude: 78.4124 },
  "malkajgiri": { latitude: 17.4563, longitude: 78.5284 },
  "chandanagar": { latitude: 17.4912, longitude: 78.3304 },
  "uppal": { latitude: 17.4022, longitude: 78.5594 },
  "dilsukhnagar": { latitude: 17.3688, longitude: 78.5247 },
  "falaknuma": { latitude: 17.3304, longitude: 78.4684 },
  "attapur": { latitude: 17.3694, longitude: 78.4312 },
  "masab tank": { latitude: 17.4026, longitude: 78.4526 },
  "sr nagar": { latitude: 17.4437, longitude: 78.4419 },
};

export interface Masjid {
  id: string;
  name: string;
  address: string;
  distance: number; // in meters
  latitude: number;
  longitude: number;
  vicinity?: string;
  isOpen?: boolean;
  school?: 'Ahle Sunnah (Hanafi)' | 'Ahle Hadees';
  athanTimes?: {
    Fajr: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
  };
  iqamahTimes?: {
    Fajr: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
  };
  sunrise?: string;
  jummah?: string;
  jummahAthan?: string;
  suhoor?: string;
  iftar?: string;
  isLocalUpdate?: boolean;
  isCustomAdded?: boolean;
  isMuazzinVerified?: boolean;
  lastUpdated?: number;
  presidentName?: string;
  famousArea?: string;
  ladiesSection?: boolean;
  taravihTime?: string;
  qariName?: string;
  updatedByName?: string;
  updatedAt?: string | number;
  updatedBy?: string;
  updatedByUid?: string;
  jazakallahCount?: number;
  announcements?: string;
  about?: string;
  notes?: string;
  lastSyncedAt?: string;
  status?: string;
  isApproved?: boolean;
  approved?: boolean;
}

function getDeterministicHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function generateMasjidIqamahTimes(
  id: string,
  name: string,
  lat: number,
  lon: number
): { 
  school: 'Ahle Sunnah (Hanafi)' | 'Ahle Hadees';
  athanTimes: { Fajr: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string };
  iqamahTimes: { Fajr: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string };
  sunrise: string;
  jummah: string;
  suhoor: string;
  iftar: string;
} {
  const hash = getDeterministicHash(id + name);
  
  // Classify based on masjid name keywords
  const cleanName = name.toLowerCase();
  const isAhleHadees = 
    cleanName.includes('hadith') || 
    cleanName.includes('hadees') || 
    cleanName.includes('salafi') || 
    cleanName.includes('tawheed') ||
    cleanName.includes('ahl-e-hadith') ||
    cleanName.includes('ahle-hadith') ||
    (hash % 6 === 0);

  const school = isAhleHadees ? 'Ahle Hadees' : 'Ahle Sunnah (Hanafi)';
  const asrMethod = isAhleHadees ? 'standard' : 'hanafi';
  const baseAthan = getLocalPrayerTimes(lat, lon, new Date(), asrMethod);

  const toMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const to12hStr = (minutes: number): string => {
    const h24 = Math.floor(minutes / 60) % 24;
    const m = Math.round(minutes % 60);
    return `${h24 % 12 || 12}:${m.toString().padStart(2, '0')}`;
  };

  const roundToNearest15 = (minutes: number): number => {
    return Math.round(minutes / 15) * 15;
  };

  // Convert Base Athans to 12h format (without AM/PM suffix, matching LED digital watch display)
  const athanFajr = to12hStr(toMinutes(baseAthan.Fajr));
  const athanDhuhr = to12hStr(toMinutes(baseAthan.Dhuhr));
  const athanAsr = to12hStr(toMinutes(baseAthan.Asr));
  const athanMaghrib = to12hStr(toMinutes(baseAthan.Maghrib));
  const athanIsha = to12hStr(toMinutes(baseAthan.Isha));
  
  const athanTimes = {
    Fajr: athanFajr,
    Dhuhr: athanDhuhr,
    Asr: athanAsr,
    Maghrib: athanMaghrib,
    Isha: athanIsha
  };

  // Fajr Iqamah:
  // - Ahle Hadees pray early: Athan + 20/25/30 mins
  // - Ahle Sunnah pray late (Isfar): Athan + 45/50/55 mins
  const fajrAthanMins = toMinutes(baseAthan.Fajr);
  const fajrOffsets = isAhleHadees ? [20, 25, 30] : [45, 50, 55];
  const fajrIqamahMins = roundToNearest15(fajrAthanMins + fajrOffsets[hash % 3]);
  const Fajr = to12hStr(fajrIqamahMins);

  // Dhuhr Iqamah: Hyderabad standard 1:30 or 1:40
  const Dhuhr = (hash % 2 === 0) ? '1:30' : '1:40';

  // Asr Iqamah: Athan + 15/20 mins
  const asrAthanMins = toMinutes(baseAthan.Asr);
  const asrOffsets = [15, 20];
  const asrIqamahMins = roundToNearest15(asrAthanMins + asrOffsets[hash % 2]);
  const Asr = to12hStr(asrIqamahMins);

  // Maghrib Iqamah: Maghrib Athan + 5 mins
  const maghribAthanMins = toMinutes(baseAthan.Maghrib);
  const Maghrib = to12hStr(maghribAthanMins + 5);

  // Isha Iqamah:
  // - Ahle Hadees pray earlier: 8:15 or 8:30
  // - Ahle Sunnah pray at comfort slots: 8:30, 8:45, or 9:00
  let Isha = '8:30';
  if (isAhleHadees) {
    Isha = (hash % 2 === 0) ? '8:15' : '8:30';
  } else {
    const ishaTimes = ['8:30', '8:45', '9:00'];
    Isha = ishaTimes[hash % 3];
  }

  const iqamahTimes = { Fajr, Dhuhr, Asr, Maghrib, Isha };

  const sunrise = to12hStr(toMinutes(baseAthan.Sunrise));
  const jummah = (hash % 2 === 0) ? '1:30' : '1:45';
  const suhoor = to12hStr(toMinutes(baseAthan.Fajr) - 10);
  const iftar = athanMaghrib;

  return {
    school,
    athanTimes,
    iqamahTimes,
    sunrise,
    jummah,
    suhoor,
    iftar
  };
}



/**
 * Format distance for display with accurate meter rounding
 */
export function formatDistance(meters?: number): string {
  if (meters === undefined || meters === null || isNaN(meters) || meters <= 0) {
    return '';
  }
  if (meters < 1000) {
    const rounded = Math.max(10, Math.round(meters / 10) * 10);
    return `${rounded} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

// In-memory cache to avoid repeated API calls
let masjidCache: { coords: Coordinates; radius: number; result: Masjid[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes fresh cache

/**
 * Synchronous cache lookup for instantaneous screen renders (0ms latency).
 */
export function getCachedMasjidsSync(currentCoords?: Coordinates): Masjid[] | null {
  if (masjidCache && Date.now() - masjidCache.timestamp < CACHE_TTL_MS) {
    if (currentCoords) {
      return masjidCache.result.map(m => ({
        ...m,
        distance: calculateDistance(currentCoords.latitude, currentCoords.longitude, m.latitude, m.longitude),
      })).sort((a, b) => a.distance - b.distance);
    }
    return masjidCache.result;
  }
  return null;
}

/**
 * Generate a comprehensive local list of at least 14 masajid dynamically relative to user coordinates.
 * Ensures the screen ALWAYS shows at least 10 masajid even in low-density or offline environments.
 */
export function generateFallbackMasjids(latitude: number, longitude: number): Masjid[] {
  const localMasjids = [
    { name: "Masjid Al-Noor", latOffset: 0.0018, lonOffset: 0.0015, address: "Bazar Ghat Main Road" },
    { name: "Jamia Masjid Bilal", latOffset: -0.0025, lonOffset: 0.0030, address: "Station Road, Sector 3" },
    { name: "Masjid Al-Taqwa", latOffset: 0.0035, lonOffset: -0.0022, address: "West Gate Plaza Lane" },
    { name: "Masjid e Quba", latOffset: -0.0042, lonOffset: -0.0038, address: "Madina Colony, Main St" },
    { name: "Al-Rahman Mosque & Islamic Center", latOffset: 0.0051, lonOffset: 0.0045, address: "Ring Road Cross" },
    { name: "Masjid Aisha", latOffset: -0.0060, lonOffset: 0.0055, address: "Green Avenue, 2nd Cross" },
    { name: "Jamia Masjid Farooq-e-Azam", latOffset: 0.0072, lonOffset: -0.0065, address: "Market Lane, Ward 5" },
    { name: "Masjid Al-Falah", latOffset: -0.0080, lonOffset: -0.0072, address: "Old City Road" },
    { name: "Masjid e Khadija", latOffset: 0.0090, lonOffset: 0.0085, address: "Near Government High School" },
    { name: "Masjid Baitul Mukarram", latOffset: -0.0102, lonOffset: 0.0095, address: "Bismillah Complex Road" },
    { name: "Masjid Usman-e-Ghani", latOffset: 0.0115, lonOffset: -0.0105, address: "Gulshan Nagar Colony" },
    { name: "Jamia Masjid Madina", latOffset: -0.0125, lonOffset: -0.0115, address: "Al-Huda Extension" },
    { name: "Masjid e Ali Murtaza", latOffset: 0.0135, lonOffset: 0.0125, address: "Noor Nagar, Block B" },
    { name: "Masjid Ahle Hadees Salafia", latOffset: -0.0145, lonOffset: 0.0135, address: "Tawheed St, Main Chowk" },
  ];

  return localMasjids.map((item, idx) => {
    const lat = latitude + item.latOffset;
    const lon = longitude + item.lonOffset;
    const id = `fallback-${idx}`;
    const { school, athanTimes, iqamahTimes, sunrise, jummah, suhoor, iftar } = generateMasjidIqamahTimes(id, item.name, lat, lon);
    return {
      id,
      name: item.name,
      address: item.address,
      distance: calculateDistance(latitude, longitude, lat, lon),
      latitude: lat,
      longitude: lon,
      vicinity: "Local Community District",
      isOpen: true,
      school,
      athanTimes,
      iqamahTimes,
      sunrise,
      jummah,
      suhoor,
      iftar
    };
  }).sort((a, b) => a.distance - b.distance);
}

/**
 * Sanitize input for Overpass QL regex filter (VULN-06).
 * Strips syntax delimiters and quotes, and escapes regex metacharacters.
 */
function sanitizeOverpassRegex(input: string): string {
  return input.replace(/[^a-zA-Z0-9\s-]/g, '').trim().slice(0, 64);
}

export async function getNearbyMasjids(
  coordinates: Coordinates,
  radiusMeters: number = 3500,
  nameQuery?: string,
  searchCenter?: Coordinates
): Promise<Masjid[]> {
  const { latitude, longitude } = coordinates;
  const centerLat = searchCenter ? searchCenter.latitude : latitude;
  const centerLon = searchCenter ? searchCenter.longitude : longitude;

  // Fast-path: return cached result if fresh and same location
  if (!nameQuery && !searchCenter && masjidCache && Date.now() - masjidCache.timestamp < CACHE_TTL_MS) {
    const dist = Math.abs(masjidCache.coords.latitude - latitude) + Math.abs(masjidCache.coords.longitude - longitude);
    if (dist < 0.05 && masjidCache.result.length > 0) {
      return masjidCache.result.map(m => ({
        ...m,
        distance: calculateDistance(latitude, longitude, m.latitude, m.longitude),
      })).sort((a, b) => a.distance - b.distance);
    }
  }

  // Pure Database Masajid: Fetch from verified Salah Time database + persistent storage
  let masjids: Masjid[] = [];
  try {
    const raw = await fetchSalahTimeMasjids();
    if (raw && raw.length > 0) {
      // Strictly use ONLY verified SalahTime masjids when database is reachable. Do NOT merge OSM or fallbacks.
      masjids = raw.map((m) => ({
        ...m,
        distance: calculateDistance(centerLat, centerLon, m.latitude, m.longitude),
      }));
    }
  } catch (err) {
    console.warn('[getNearbyMasjids] Error reading database masajid:', err);
    masjids = [];
  }

  // Filter by name query if active
  if (nameQuery && nameQuery.trim().length > 0) {
    const q = nameQuery.trim().toLowerCase();
    masjids = masjids.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      m.address.toLowerCase().includes(q) ||
      (m.famousArea && m.famousArea.toLowerCase().includes(q))
    );
  }

  // Proximity Sorting: Closest to furthest
  masjids.sort((a, b) => a.distance - b.distance);

  if (!nameQuery) {
    masjidCache = {
      coords: coordinates,
      radius: radiusMeters,
      result: masjids,
      timestamp: Date.now(),
    };
  }

  return masjids;
}

export function resolveSearchCenterAndQuery(
  rawQuery: string,
  userLocation: Coordinates
): { searchCenter: Coordinates; cleanedQuery: string } {
  const clean = rawQuery.trim().toLowerCase();
  const neighborhoods: Record<string, Coordinates> = {
    'charminar': { latitude: 17.3616, longitude: 78.4747 },
    'tolichowki': { latitude: 17.4018, longitude: 78.4116 },
    'mehdipatnam': { latitude: 17.3916, longitude: 78.4400 },
    'mallepally': { latitude: 17.3850, longitude: 78.4550 },
    'banjara hills': { latitude: 17.4156, longitude: 78.4350 },
    'jubilee hills': { latitude: 17.4319, longitude: 78.4073 },
    'gachibowli': { latitude: 17.4401, longitude: 78.3489 },
    'secunderabad': { latitude: 17.4399, longitude: 78.4983 },
    'nampally': { latitude: 17.3920, longitude: 78.4680 },
    'chandrayangutta': { latitude: 17.3200, longitude: 78.4800 },
    'bandlaguda': { latitude: 17.3150, longitude: 78.4700 },
  };

  for (const [name, coords] of Object.entries(neighborhoods)) {
    if (clean.includes(name)) {
      const remainingQuery = clean.replace(name, '').replace(/\b(in|near|at|around)\b/g, '').trim();
      return { searchCenter: coords, cleanedQuery: remainingQuery };
    }
  }

  return { searchCenter: userLocation, cleanedQuery: rawQuery.trim() };
}

export async function findMasjidsByName(
  nameQuery: string,
  userCoords?: Coordinates
): Promise<Masjid[]> {
  const clean = nameQuery.trim();
  if (!clean) return [];

  const coords: Coordinates = userCoords || (await getCurrentLocation()) || { latitude: 17.385044, longitude: 78.486671 };

  const { searchCenter, cleanedQuery } = await resolveSearchCenterAndQuery(clean, coords);
  const effectiveQuery = cleanedQuery || clean;

  const masjids = await getNearbyMasjids(coords, 15000, effectiveQuery, searchCenter);
  return masjids.slice(0, 5);
}
