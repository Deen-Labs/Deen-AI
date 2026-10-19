import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const STORAGE_KEY_LAST_COORDS = '@deen_last_known_coords';
let inMemoryCoords: Coordinates | null = null;

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
      inMemoryCoords = {
        latitude: lastKnown.coords.latitude,
        longitude: lastKnown.coords.longitude,
      };
    }

    // Request fresh high-accuracy position with 3.5s timeout promise race
    const freshPositionPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 3500)
    );

    const freshLocation = await Promise.race([freshPositionPromise, timeoutPromise]);

    if (freshLocation?.coords) {
      const coords = {
        latitude: freshLocation.coords.latitude,
        longitude: freshLocation.coords.longitude,
      };
      inMemoryCoords = coords;
      AsyncStorage.setItem(STORAGE_KEY_LAST_COORDS, JSON.stringify(coords)).catch(() => {});
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
