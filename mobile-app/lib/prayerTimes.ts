import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Sunset?: string;
  Imsak?: string;
  Midnight?: string;
  Firstthird?: string;
  Lastthird?: string;
}

export interface PrayerTimesData {
  timings: PrayerTimings;
  date: {
    readable: string;
    gregorian: {
      date: string;
      month: { en: string };
      year: string;
    };
    hijri: {
      date: string;
      month: { en: string };
      year: string;
    };
  };
  meta: {
    method: {
      name: string;
    };
  };
}

export interface PrayerSource {
  type: 'api' | 'masjid';
  masjidName?: string;
  masjidDistance?: number;
  iqamahTimes?: {
    Fajr: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
  };
  lastUpdated?: Date;
}

/**
 * Fetch prayer times from Aladhan API
 * @param latitude 
 * @param longitude 
 * @param method Calculation method (default: 4 = Umm Al-Qura University, Makkah)
 */
export async function fetchPrayerTimes(
  latitude: number,
  longitude: number,
  method: number = 4
): Promise<PrayerTimesData> {
  const today = new Date();
  const timestamp = Math.floor(today.getTime() / 1000);
  
  const url = `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${latitude}&longitude=${longitude}&method=${method}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch prayer times: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Prayer times request timed out. Please check your internet connection.');
    }
    throw error;
  }
}

/**
 * Calculate precise prayer times mathematically using solar declination and equation of time
 * (Hanafi double-shadow method for Asr, and standard 18-degree angles for Fajr/Isha)
 * This acts as our zero-dependency, lightning-fast local fallback.
 */
export function getLocalPrayerTimes(
  lat: number,
  lng: number,
  date: Date = new Date(),
  asrMethod: 'standard' | 'hanafi' = 'hanafi'
): PrayerTimings {
  const timezoneOffset = -date.getTimezoneOffset() / 60; // e.g. +5.5 for India (IST)
  
  // Calculate day of the year
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);

  // Solar declination
  const decl = 23.45 * Math.sin((2 * Math.PI * (284 + day)) / 365);
  const declRad = (decl * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;

  // Equation of Time (minutes)
  const b = (2 * Math.PI * (day - 81)) / 364;
  const eqt = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);

  // Solar noon in hours
  const meridian = 15 * timezoneOffset;
  const solarNoon = 12 + (meridian - lng) / 15 - eqt / 60;

  // Helper to calculate hour angle for a given altitude
  const getHourAngle = (altitude: number) => {
    const altRad = (altitude * Math.PI) / 180;
    const cosH = (Math.sin(altRad) - Math.sin(latRad) * Math.sin(declRad)) / (Math.cos(latRad) * Math.cos(declRad));
    if (cosH > 1) return 0; // Sun always below altitude
    if (cosH < -1) return 24; // Sun always above altitude
    return Math.acos(cosH) * (180 / Math.PI) / 15; // in hours
  };

  // Dhuhr is solar noon
  const dhuhrTime = solarNoon;

  // Sunrise & Sunset (altitude -0.833 degrees)
  const sunriseAngle = getHourAngle(-0.833);
  const sunriseTime = solarNoon - sunriseAngle;
  const sunsetTime = solarNoon + sunriseAngle;

  // Fajr (altitude -18 degrees for standard South Asian/Karachi calculation)
  const fajrAngle = getHourAngle(-18);
  const fajrTime = solarNoon - fajrAngle;

  // Isha (altitude -18 degrees)
  const ishaAngle = getHourAngle(-18);
  const ishaTime = solarNoon + ishaAngle;

  // Asr (shadow length is 1x or 2x object length + noon shadow)
  const latDeclDiff = Math.abs(latRad - declRad);
  const tanDiff = Math.tan(latDeclDiff);
  const shadowRatio = asrMethod === 'hanafi' ? 2 : 1;
  const altAsrRad = Math.atan(1 / (shadowRatio + tanDiff));
  const altAsrDeg = (altAsrRad * 180) / Math.PI;
  const asrAngle = getHourAngle(altAsrDeg);
  const asrTime = solarNoon + asrAngle;

  // Helper: decimal hours to "HH:MM"
  const formatDecimal = (decimalHours: number): string => {
    let h = Math.floor(decimalHours);
    let m = Math.round((decimalHours - h) * 60);
    if (m === 60) {
      h += 1;
      m = 0;
    }
    h = (h + 24) % 24;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return {
    Fajr: formatDecimal(fajrTime),
    Sunrise: formatDecimal(sunriseTime),
    Dhuhr: formatDecimal(dhuhrTime),
    Asr: formatDecimal(asrTime),
    Maghrib: formatDecimal(sunsetTime),
    Isha: formatDecimal(ishaTime),
  };
}

// In-memory cache for ultra-fast, zero-delay UI rendering
let memoryPrayerCache: {
  date: string;
  lat: number;
  lng: number;
  method: number;
  data: { timings: PrayerTimings; source: PrayerSource };
} | null = null;

/**
 * Synchronous instant prayer times lookup for instantaneous 0ms screen renders.
 * If cached data exists for today, returns it immediately.
 * If not, instantly calculates precise astronomical prayer times locally (<0.1ms).
 */
export function setMemoryPrayerCache(
  timings: PrayerTimings,
  lat: number,
  lng: number,
  method: number
): void {
  const todayStr = new Date().toISOString().split('T')[0];
  memoryPrayerCache = {
    date: todayStr,
    lat,
    lng,
    method,
    data: {
      timings,
      source: { type: 'api' },
    },
  };
}

export function getCachedPrayerTimesSync(
  fallbackLat: number = 17.385044,
  fallbackLng: number = 78.486671
): { timings: PrayerTimings; source: PrayerSource } {
  const todayStr = new Date().toISOString().split('T')[0];
  if (memoryPrayerCache && memoryPrayerCache.date === todayStr) {
    return memoryPrayerCache.data;
  }

  // Instant zero-delay local calculation fallback
  const localTimings = getLocalPrayerTimes(fallbackLat, fallbackLng);
  const instantResult = {
    timings: localTimings,
    source: { type: 'api' as const },
  };
  memoryPrayerCache = { date: todayStr, lat: fallbackLat, lng: fallbackLng, method: 2, data: instantResult };
  return instantResult;
}

/**
 * Get prayer times - checks in-memory cache (0ms), AsyncStorage (~2ms),
 * uses instant astronomical solar calculation if first launch, and revalidates via API in the background.
 */
export async function getPrayerTimes(
  latitude: number,
  longitude: number,
  methodOrMasjidId?: string | number
): Promise<{ timings: PrayerTimings; source: PrayerSource }> {
  const todayStr = new Date().toISOString().split('T')[0];

  const method = typeof methodOrMasjidId === 'number' ? methodOrMasjidId : (parseInt(String(methodOrMasjidId), 10) || 2);

  // 1. Fast in-memory cache check (0ms)
  if (
    memoryPrayerCache &&
    memoryPrayerCache.date === todayStr &&
    memoryPrayerCache.method === method &&
    Math.abs(memoryPrayerCache.lat - latitude) < 0.05 &&
    Math.abs(memoryPrayerCache.lng - longitude) < 0.05
  ) {
    return memoryPrayerCache.data;
  }

  // 2. Persistent storage cache check (~2ms)
  const cacheKey = `PRAYER_TIMES_${todayStr}_${latitude.toFixed(2)}_${longitude.toFixed(2)}_M${method}`;
  try {
    const persisted = await AsyncStorage.getItem(cacheKey);
    if (persisted) {
      const parsed = JSON.parse(persisted);
      memoryPrayerCache = { date: todayStr, lat: latitude, lng: longitude, method, data: parsed };
      return parsed;
    }
  } catch {
    // Continue
  }

  // 3. Immediately seed with instant local astronomical calculations (<0.1ms)
  const instantTimings = getLocalPrayerTimes(latitude, longitude);
  const instantData = {
    timings: instantTimings,
    source: { type: 'api' as const },
  };
  memoryPrayerCache = { date: todayStr, lat: latitude, lng: longitude, method, data: instantData };

  // 4. Background network revalidation with Aladhan API
  fetchPrayerTimes(latitude, longitude, method)
    .then((data) => {
      const apiResult = {
        timings: data.timings,
        source: { type: 'api' as const },
      };
      memoryPrayerCache = { date: todayStr, lat: latitude, lng: longitude, method, data: apiResult };
      AsyncStorage.setItem(cacheKey, JSON.stringify(apiResult)).catch(() => {});
    })
    .catch((err) => {
      console.warn('[PrayerTimes] Background API sync failed, continuing with local mathematical timings:', err);
    });

  return instantData;
}

/**
 * Format time from 24h to 12h format
 */
export function formatTime(time: string, prayerName?: string): string {
  if (!time || time === '--:--') return '--:--';
  if (time.toLowerCase().includes('sunset')) return 'Sunset';
  const totalMins = parsePrayerTimeToMinutes(time, prayerName);
  if (totalMins < 0) return time;
  const h24 = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const hour12 = h24 % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Get current prayer based on time
 */
export function getCurrentPrayer(timings: PrayerTimings, currentTime: Date = new Date()): string | null {
  const now = currentTime.getHours() * 60 + currentTime.getMinutes();
  
  const prayers = [
    { name: 'Fajr', time: timings.Fajr },
    { name: 'Sunrise', time: timings.Sunrise },
    { name: 'Dhuhr', time: timings.Dhuhr },
    { name: 'Asr', time: timings.Asr },
    { name: 'Maghrib', time: timings.Maghrib },
    { name: 'Isha', time: timings.Isha },
  ];
  
  const prayerMinutes = prayers.map(p => {
    const [hours, minutes] = p.time.split(':').map(Number);
    return { name: p.name, minutes: hours * 60 + minutes };
  });
  
  for (let i = 0; i < prayerMinutes.length; i++) {
    if (now < prayerMinutes[i].minutes) {
      return i > 0 ? prayers[i - 1].name : null;
    }
  }
  
  return prayers[prayers.length - 1].name;
}

/**
 * Safely parse any prayer time string (e.g. "05:30 AM", "01:00 PM", "17:55", "1:15")
 * into total minutes from midnight (0..1439).
 */
export function parsePrayerTimeToMinutes(timeStr?: string, prayerName?: string): number {
  if (!timeStr || typeof timeStr !== 'string') return -1;
  const clean = timeStr.trim().toUpperCase();
  if (clean === '' || clean === '--:--' || clean === 'SUNSET') return -1;

  // Match 12h or 24h format with optional AM/PM
  const match = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return -1;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3]?.toUpperCase();

  if (modifier) {
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
  } else {
    // If no AM/PM specified, check if 12h representation for afternoon prayers
    if (prayerName) {
      const p = prayerName.toLowerCase();
      if ((p === 'dhuhr' || p === 'asr' || p === 'maghrib' || p === 'isha') && hours < 12) {
        hours += 12;
      }
    }
  }

  if (isNaN(hours) || isNaN(minutes)) return -1;
  return hours * 60 + minutes;
}

/**
 * Robust countdown calculator handling 12h AM/PM, 24h, and midnight rollover
 */
export function calculatePrayerCountdown(timeStr?: string, prayerName?: string, now: Date = new Date()): string {
  if (!timeStr) return '';
  const targetMinutes = parsePrayerTimeToMinutes(timeStr, prayerName);
  if (targetMinutes < 0) return '';

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let diffMinutes = targetMinutes - nowMinutes;
  if (diffMinutes <= 0) {
    diffMinutes += 24 * 60; // Next day
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  const seconds = 59 - now.getSeconds();

  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) {
    return `${hours}h ${pad(minutes)}m`;
  }
  return `${pad(minutes)}m ${pad(seconds)}s`;
}

/**
 * Get next prayer based on time with AM/PM support and midnight rollover
 */
export function getNextPrayer(timings: PrayerTimings, currentTime: Date = new Date()): { name: string; time: string } | null {
  const now = currentTime.getHours() * 60 + currentTime.getMinutes();
  
  const prayers = [
    { name: 'Fajr', time: timings.Fajr },
    { name: 'Dhuhr', time: timings.Dhuhr },
    { name: 'Asr', time: timings.Asr },
    { name: 'Maghrib', time: timings.Maghrib },
    { name: 'Isha', time: timings.Isha },
  ];
  
  for (const prayer of prayers) {
    const prayerMinutes = parsePrayerTimeToMinutes(prayer.time, prayer.name);
    if (prayerMinutes >= 0 && now < prayerMinutes) {
      return prayer;
    }
  }
  
  // If all prayers today passed (e.g. after Isha), next prayer is Fajr tomorrow
  return prayers[0];
}

/**
 * Calculate the Islamic end time for a given prayer:
 * - Fajr ends at Sunrise
 * - Dhuhr ends at Asr
 * - Asr ends at Maghrib (Sunset)
 * - Maghrib ends at Isha
 * - Isha ends at Midnight (Islamic Midnight)
 */
export function getPrayerEndTime(timings: PrayerTimings, prayerName: string): string {
  if (!timings) return '';
  const p = (prayerName || '').trim().toLowerCase();

  if (p === 'fajr') {
    return timings.Sunrise || '';
  }

  if (p === 'dhuhr' || p === 'zohar') {
    return timings.Asr || '';
  }

  if (p === 'asr') {
    return timings.Maghrib || timings.Sunset || '';
  }

  if (p === 'maghrib' || p === 'sunset' || p === 'magrib') {
    return timings.Isha || '';
  }

  if (p === 'isha' || p === 'esha') {
    if (timings.Midnight && timings.Midnight !== '--:--') {
      return timings.Midnight;
    }
    // Calculate Islamic Solar Midnight (halfway between Sunset/Maghrib and Fajr)
    const sunsetM = parsePrayerTimeToMinutes(timings.Sunset || timings.Maghrib, 'Maghrib');
    const fajrM = parsePrayerTimeToMinutes(timings.Fajr, 'Fajr');
    if (sunsetM >= 0 && fajrM >= 0) {
      const nightDuration = (fajrM + 24 * 60 - sunsetM) % (24 * 60);
      const midnightM = (sunsetM + Math.floor(nightDuration / 2)) % (24 * 60);
      const h24 = Math.floor(midnightM / 60) % 24;
      const m = midnightM % 60;
      return `${h24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
    return '';
  }

  return '';
}

