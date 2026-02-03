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
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch prayer times: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Get prayer times - checks for masjid override first, falls back to API
 */
export async function getPrayerTimes(
  latitude: number,
  longitude: number,
  followedMasjidId?: string
): Promise<{ timings: PrayerTimings; source: PrayerSource }> {
  // TODO: Check for masjid override when backend is ready
  // if (followedMasjidId) {
  //   const masjidTimes = await fetchMasjidTimes(followedMasjidId);
  //   if (masjidTimes) {
  //     return {
  //       timings: masjidTimes.timings,
  //       source: {
  //         type: 'masjid',
  //         masjidName: masjidTimes.name,
  //         lastUpdated: masjidTimes.updatedAt
  //       }
  //     };
  //   }
  // }
  
  // Fallback to API
  const data = await fetchPrayerTimes(latitude, longitude);
  return {
    timings: data.timings,
    source: {
      type: 'api',
    }
  };
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
