import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const STORAGE_KEY_LAST_COORDS = '@deen_last_known_coords';
let inMemoryCoords: Coordinates | null = null;

export type LocationListener = (coords: Coordinates) => void;
const locationListeners = new Set<LocationListener>();

/**
 * Subscribe to real-time location updates. Fires immediately if cached coords exist.
 */
export function subscribeToLocationUpdates(listener: LocationListener): () => void {
  locationListeners.add(listener);
  if (inMemoryCoords) {
    try {
      listener(inMemoryCoords);
    } catch (e) {
      console.warn('[Location] Listener error:', e);
    }
  }
  return () => {
    locationListeners.delete(listener);
  };
}

export function notifyLocationUpdate(coords: Coordinates) {
  inMemoryCoords = coords;
  locationListeners.forEach((listener) => {
    try {
      listener(coords);
    } catch (e) {
      console.warn('[Location] Listener dispatch error:', e);
    }
  });
}

/**
 * Calculate great-circle distance between two GPS coordinates in meters (Haversine formula).
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Get synchronously cached in-memory coordinates for zero-latency execution.
 */
export function getCachedCoordinatesSync(): Coordinates | null {
  return inMemoryCoords;
}

/**
 * Fast location retrieval (0ms - 5ms).
 * Reads in-memory cache, then OS last-known position, then persistent storage.
 */
export async function getQuickLocation(): Promise<Coordinates | null> {
  if (inMemoryCoords) {
    return inMemoryCoords;
  }

  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 3600000, // 1 hour fresh
      });
      if (lastKnown?.coords) {
        const coords = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
        inMemoryCoords = coords;
        AsyncStorage.setItem(STORAGE_KEY_LAST_COORDS, JSON.stringify(coords)).catch(() => {});
        return coords;
      }
    }

    const stored = await AsyncStorage.getItem(STORAGE_KEY_LAST_COORDS);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.latitude && parsed?.longitude) {
        inMemoryCoords = parsed;
        return parsed;
      }
    }
  } catch {
    // Continue
  }

  return null;
}

/**
 * Request location permission and get current high-accuracy coordinates.
 * Falls back rapidly to quick location if satellite lock takes longer than 3 seconds.
 */
export async function getCurrentLocation(): Promise<Coordinates | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[Location] Foreground permission not granted');
      return await getQuickLocation();
    }

    // Try instantaneous last-known position first
    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 600000 });
    if (lastKnown?.coords) {
      const coords = {
        latitude: lastKnown.coords.latitude,
        longitude: lastKnown.coords.longitude,
      };
      notifyLocationUpdate(coords);
    }

    // Request fresh high-accuracy position with 4.5s timeout promise race
    const freshPositionPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 4500)
    );

    const freshLocation = await Promise.race([freshPositionPromise, timeoutPromise]);

    if (freshLocation?.coords) {
      const coords = {
        latitude: freshLocation.coords.latitude,
        longitude: freshLocation.coords.longitude,
      };
      AsyncStorage.setItem(STORAGE_KEY_LAST_COORDS, JSON.stringify(coords)).catch(() => {});
      notifyLocationUpdate(coords);
      return coords;
    }

    // If fresh GPS acquisition timed out, return last known or cached
    if (inMemoryCoords) {
      return inMemoryCoords;
    }

    return await getQuickLocation();
  } catch (error) {
    console.error('[Location] Error getting current location:', error);
    return await getQuickLocation();
  }
}

/**
 * Force refresh location actively requesting GPS hardware lock.
 */
export async function forceRefreshLocation(): Promise<Coordinates | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return await getQuickLocation();
    const freshLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });
    if (freshLocation?.coords) {
      const coords = {
        latitude: freshLocation.coords.latitude,
        longitude: freshLocation.coords.longitude,
      };
      AsyncStorage.setItem(STORAGE_KEY_LAST_COORDS, JSON.stringify(coords)).catch(() => {});
      notifyLocationUpdate(coords);
      return coords;
    }
  } catch (e) {
    console.warn('[Location] Force refresh error:', e);
  }
  return await getCurrentLocation();
}

/**
 * Get city name from coordinates (reverse geocoding)
 */
export async function getCityFromCoordinates(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });
    
    if (results.length > 0) {
      const { city, region } = results[0];
      return city || region || null;
    }
    
    return null;
  } catch (error) {
    console.error('[Location] Error reverse geocoding:', error);
    return null;
  }
}
