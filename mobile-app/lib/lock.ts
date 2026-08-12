/**
 * PIN Lock Module for Deen AI
 * 
 * Manages the security PIN that locks sensitive settings like:
 * - Disabling System-Wide Protection (VPN)
 * - Uninstalling the app
 * - Clearing app data
 * 
 * The PIN is intended to be set by a friend/relative so the user
 * cannot bypass protections on their own.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { nativeContentProtection } from './nativeContentProtection';

const LOCK_PIN_KEY = '@deen_ai_lock_pin';
const LOCK_ENABLED_KEY = '@deen_ai_lock_enabled';
const LOCK_SET_DATE_KEY = '@deen_ai_lock_set_date';

/**
 * Simple hash function for PIN storage.
 * We don't store the raw PIN — we store a hash so even if AsyncStorage
 * is inspected, the PIN isn't in plain text.
 */
function hashPIN(pin: string): string {
  let hash = 0;
  const salt = 'DeenAI_Protection_2024';
  const salted = salt + pin + salt;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  // Convert to a hex-like string and add length-based entropy
  const baseHash = Math.abs(hash).toString(36);
  let secondHash = 0;
  for (let i = 0; i < salted.length; i++) {
    secondHash = ((secondHash << 7) ^ salted.charCodeAt(i) ^ (secondHash >> 3)) | 0;
  }
  return baseHash + '_' + Math.abs(secondHash).toString(36);
}

/**
 * Set a new PIN lock.
 * This should be called when a friend/relative sets the PIN for the user.
 */
export async function setPIN(pin: string): Promise<boolean> {
  try {
    if (pin.length < 4 || pin.length > 8) {
      console.warn('PIN must be 4-8 digits');
      return false;
    }

    // Validate PIN is numeric only
    if (!/^\d+$/.test(pin)) {
      console.warn('PIN must contain only digits');
      return false;
    }

    const hashed = hashPIN(pin);
    await AsyncStorage.setItem(LOCK_PIN_KEY, hashed);
    await AsyncStorage.setItem(LOCK_ENABLED_KEY, 'true');
    await AsyncStorage.setItem(LOCK_SET_DATE_KEY, new Date().toISOString());
    
    // Sync to native side for Accessibility Service
    await nativeContentProtection.syncLockState(true);
    
    console.log('✅ PIN lock has been set');
    return true;
  } catch (error) {
    console.error('Error setting PIN:', error);
    return false;
  }
}

/**
 * Verify a PIN attempt against the stored PIN.
 */
export async function verifyPIN(attempt: string): Promise<boolean> {
  try {
    const storedHash = await AsyncStorage.getItem(LOCK_PIN_KEY);
    if (!storedHash) {
      return false;
    }

    const attemptHash = hashPIN(attempt);
    return storedHash === attemptHash;
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return false;
  }
}

/**
 * Check if the app is currently PIN-locked.
 * When locked, the user cannot:
 * - Disable System-Wide Protection
 * - Uninstall the app
 * - Clear app data
 */
export async function isLocked(): Promise<boolean> {
  try {
    const lockEnabled = await AsyncStorage.getItem(LOCK_ENABLED_KEY);
    const pinExists = await AsyncStorage.getItem(LOCK_PIN_KEY);
    return lockEnabled === 'true' && pinExists !== null;
  } catch (error) {
    console.error('Error checking lock state:', error);
    // Default to locked for safety if we can't determine state
    return true;
  }
}

/**
 * Check if a PIN has been set at all (even if lock is disabled).
 */
export async function hasPIN(): Promise<boolean> {
  try {
    const pinExists = await AsyncStorage.getItem(LOCK_PIN_KEY);
    return pinExists !== null;
  } catch (error) {
    console.error('Error checking PIN existence:', error);
    return false;
  }
}

/**
 * Remove the PIN and disable the lock.
 * Requires PIN verification first — caller must verify before calling this.
 */
export async function removePIN(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(LOCK_PIN_KEY);
    await AsyncStorage.setItem(LOCK_ENABLED_KEY, 'false');
    await AsyncStorage.removeItem(LOCK_SET_DATE_KEY);
    
    // Sync to native side
    await nativeContentProtection.syncLockState(false);
    
    console.log('PIN lock has been removed');
    return true;
  } catch (error) {
    console.error('Error removing PIN:', error);
    return false;
  }
}

/**
 * Change the PIN. Requires verification of old PIN first.
 * Caller must verify old PIN before calling this.
 */
export async function changePIN(newPin: string): Promise<boolean> {
  try {
    if (newPin.length < 4 || newPin.length > 8) {
      console.warn('PIN must be 4-8 digits');
      return false;
    }

    if (!/^\d+$/.test(newPin)) {
      console.warn('PIN must contain only digits');
      return false;
    }

    const hashed = hashPIN(newPin);
    await AsyncStorage.setItem(LOCK_PIN_KEY, hashed);
    
    console.log('PIN has been changed');
    return true;
  } catch (error) {
    console.error('Error changing PIN:', error);
    return false;
  }
}

/**
 * Get the date when the PIN was originally set.
 */
export async function getLockSetDate(): Promise<Date | null> {
  try {
    const dateStr = await AsyncStorage.getItem(LOCK_SET_DATE_KEY);
    return dateStr ? new Date(dateStr) : null;
  } catch (error) {
    console.error('Error getting lock set date:', error);
    return null;
  }
}

/**
 * Toggle the lock state on/off (without removing the PIN).
 * This allows temporarily disabling the lock with the PIN,
 * then re-enabling it without re-entering a new PIN.
 */
export async function setLockEnabled(enabled: boolean): Promise<boolean> {
  try {
    const pinExists = await AsyncStorage.getItem(LOCK_PIN_KEY);
    if (!pinExists && enabled) {
      console.warn('Cannot enable lock without a PIN set');
      return false;
    }

    await AsyncStorage.setItem(LOCK_ENABLED_KEY, enabled ? 'true' : 'false');
    
    // Sync to native side
    await nativeContentProtection.syncLockState(enabled);
    
    return true;
  } catch (error) {
    console.error('Error toggling lock state:', error);
    return false;
  }
}
