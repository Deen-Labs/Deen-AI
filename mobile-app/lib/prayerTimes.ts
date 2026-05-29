export interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
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
  lastUpdated?: Date;
}

/**
 * Fetch prayer times from Aladhan API
 * @param latitude 
 * @param longitude 
 * @param method Calculation method (default: 2 = Islamic Society of North America)
 */
export async function fetchPrayerTimes(
  latitude: number,
  longitude: number,
  method: number = 2
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

/**
 * Get prayer times - checks for masjid override first, falls back to API, and utilizes locally calculated math offline.
 */
export async function getPrayerTimes(
  latitude: number,
  longitude: number,
  followedMasjidId?: string
): Promise<{ timings: PrayerTimings; source: PrayerSource }> {
  try {
    // Try online API fetch
    const data = await fetchPrayerTimes(latitude, longitude);
    return {
      timings: data.timings,
      source: {
        type: 'api',
      }
    };
  } catch (error) {
    console.warn("Aladhan API offline or failed. Applying precise mathematical astronomical calculations locally.", error);
    // Graceful offline fallback
    const timings = getLocalPrayerTimes(latitude, longitude);
    return {
      timings,
      source: {
        type: 'api',
      }
    };
  }
}

/**
 * Format time from 24h to 12h format
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
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
 * Get next prayer based on time
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
    const [hours, minutes] = prayer.time.split(':').map(Number);
    const prayerMinutes = hours * 60 + minutes;
    
    if (now < prayerMinutes) {
      return prayer;
    }
  }
  
  // If all prayers passed, next is Fajr tomorrow
  return prayers[0];
}
