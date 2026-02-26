import { Coordinates } from './location';

export interface Masjid {
  id: string;
  name: string;
  address: string;
  distance: number; // in meters
  latitude: number;
  longitude: number;
  vicinity?: string;
  isOpen?: boolean;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

// In-memory cache to avoid repeated API calls
let masjidCache: { coords: Coordinates; radius: number; result: Masjid[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch nearby masjids using Overpass API (OpenStreetMap)
 * Free and doesn't require an API key
 */
export async function getNearbyMasjids(
  coordinates: Coordinates,
  radiusMeters: number = 5000
): Promise<Masjid[]> {
  const { latitude, longitude } = coordinates;

  // Return cached result if still fresh and close to same location
  if (masjidCache && Date.now() - masjidCache.timestamp < CACHE_TTL_MS) {
    const dist = Math.abs(masjidCache.coords.latitude - latitude) + Math.abs(masjidCache.coords.longitude - longitude);
    if (dist < 0.005 && masjidCache.radius === radiusMeters) {
      console.log('Returning cached masjid results');
      return masjidCache.result;
    }
  }

  const query = `
[out:json][timeout:10];
(
  node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusMeters},${latitude},${longitude});
  way["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusMeters},${latitude},${longitude});
  node["building"="mosque"](around:${radiusMeters},${latitude},${longitude});
  way["building"="mosque"](around:${radiusMeters},${latitude},${longitude});
);
out center;
  `.trim();

  const servers = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ];

  const fetchFromServer = async (server: string): Promise<Masjid[]> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s per server

    try {
      const response = await fetch(server, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: query,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (!data.elements || !Array.isArray(data.elements)) throw new Error('Invalid response');

      const masjids: Masjid[] = data.elements
        .map((element: any) => {
          let lat, lon;
          if (element.lat && element.lon) {
            lat = element.lat;
            lon = element.lon;
          } else if (element.center) {
            lat = element.center.lat;
            lon = element.center.lon;
          } else {
            return null;
          }

          const name = element.tags?.name || element.tags?.['name:en'] || 'Unnamed Masjid';

          if (name.toLowerCase().includes('dargah') || element.tags?.amenity === 'shrine') {
            return null;
          }

          return {
            id: element.id.toString(),
            name,
            address:
              element.tags?.['addr:full'] ||
              [element.tags?.['addr:housenumber'], element.tags?.['addr:street'], element.tags?.['addr:city']]
                .filter(Boolean).join(', ') ||
              'Address not available',
            distance: calculateDistance(latitude, longitude, lat, lon),
            latitude: lat,
            longitude: lon,
            vicinity: element.tags?.['addr:city'] || element.tags?.['addr:suburb'] || element.tags?.['addr:district'],
          };
        })
        .filter((m: Masjid | null): m is Masjid => m !== null)
        .sort((a: Masjid, b: Masjid) => a.distance - b.distance);

      return masjids;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  // Try servers in sequence if Promise.any is not available or fails
  const tryAny = async (): Promise<Masjid[]> => {
    const errors: Error[] = [];
    // Run all in parallel, return first success
    const results = await Promise.allSettled(servers.map(s => fetchFromServer(s)));
    for (const result of results) {
      if (result.status === 'fulfilled') return result.value;
      errors.push(result.reason);
    }
    throw new AggregateError(errors, 'All servers failed');
  };

  try {
    const result = await tryAny();
    masjidCache = { coords: coordinates, radius: radiusMeters, result, timestamp: Date.now() };
    console.log(`Found ${result.length} masjids`);
    return result;
  } catch (error: any) {
    console.error('All Overpass servers failed:', error);
    const isTimeout = error?.errors?.some((e: any) => e?.name === 'AbortError') || error?.name === 'AbortError';
    if (isTimeout) throw new Error('Request timed out. Check your internet connection and try again.');
    if (error.message?.includes('Network request failed')) throw new Error('No internet connection. Please check your network.');
    throw new Error('Unable to load nearby masjids. Pull down to retry.');
  }
}
