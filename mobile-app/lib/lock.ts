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
const PIN_SALT_KEY = '@deen_ai_pin_salt';
const FAILED_ATTEMPTS_KEY = '@deen_ai_pin_failed_attempts';
const LOCKOUT_UNTIL_KEY = '@deen_ai_pin_lockout_until';

// Standard 64 SHA-256 round constants
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

/**
 * Pure JavaScript SHA-256 implementation.
 * Self-contained with no external dependencies; works seamlessly across Hermes, V8, iOS, Android, and Web.
 */
function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  const hash = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ]);

  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words.length] = (asciiBitLength / 0x100000000) | 0;
  words[words.length] = asciiBitLength | 0;

  const w = new Uint32Array(64);
  for (let j = 0; j < words.length; j += 16) {
    for (let i = 0; i < 16; i++) w[i] = words[j + i] | 0;

    for (let i = 16; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let a = hash[0], b = hash[1], c = hash[2], d = hash[3],
        e = hash[4], f = hash[5], g = hash[6], h = hash[7];

    for (let i = 0; i < 64; i++) {
      const ch = (e & f) ^ (~e & g);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const t1 = (h + s1 + ch + SHA256_K[i] + w[i]) | 0;
      const t2 = (s0 + maj) | 0;

      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const byte = (hash[i] >>> (j * 8)) & 0xff;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

/**
 * Generate a random 16-byte hex salt for this device.
 */
function generateRandomSalt(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  let salt = '';
  for (let i = 0; i < 32; i++) {
    salt += Math.floor(Math.random() * 16).toString(16);
  }
  return salt;
}

/**
 * Retrieve or generate the per-device random salt.
 */
async function getOrCreateSalt(): Promise<string> {
  let salt = await AsyncStorage.getItem(PIN_SALT_KEY);
  if (!salt) {
    salt = generateRandomSalt();
    await AsyncStorage.setItem(PIN_SALT_KEY, salt);
  }
  return salt;
}

/**
 * Multi-round SHA-256 iterative hash (10,000 rounds).
 */
function hashPINWithSalt(pin: string, salt: string): string {
  let current = pin;
  for (let i = 0; i < 10000; i++) {
    current = sha256(current + salt);
  }
  return 'v2_' + current;
}

/**
 * Legacy weak hash function for backward compatibility and migration.
 */
function legacyHashPIN(pin: string): string {
  let hash = 0;
  const salt = 'DeenAI_Protection_2024';
  const salted = salt + pin + salt;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  const baseHash = Math.abs(hash).toString(36);
  let secondHash = 0;
  for (let i = 0; i < salted.length; i++) {
    secondHash = ((secondHash << 7) ^ salted.charCodeAt(i) ^ (secondHash >> 3)) | 0;
  }
  return baseHash + '_' + Math.abs(secondHash).toString(36);
}

/**
 * Get remaining lockout cooldown in seconds if the user is currently rate-limited.
 */
export async function getLockoutRemainingSeconds(): Promise<number> {
  try {
    const lockoutUntilStr = await AsyncStorage.getItem(LOCKOUT_UNTIL_KEY);
    if (!lockoutUntilStr) return 0;
    const lockoutUntil = parseInt(lockoutUntilStr, 10);
    const now = Date.now();
    if (isNaN(lockoutUntil) || now >= lockoutUntil) {
      return 0;
    }
    return Math.ceil((lockoutUntil - now) / 1000);
  } catch {
    return 0;
  }
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

    const salt = await getOrCreateSalt();
    const hashed = hashPINWithSalt(pin, salt);
    await AsyncStorage.setItem(LOCK_PIN_KEY, hashed);
    await AsyncStorage.setItem(LOCK_ENABLED_KEY, 'true');
    await AsyncStorage.setItem(LOCK_SET_DATE_KEY, new Date().toISOString());
    await AsyncStorage.setItem(FAILED_ATTEMPTS_KEY, '0');
    await AsyncStorage.removeItem(LOCKOUT_UNTIL_KEY);
    
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
 * Verify a PIN attempt against the stored PIN with brute-force rate-limiting.
 */
export async function verifyPIN(attempt: string): Promise<boolean> {
  const remainingLockout = await getLockoutRemainingSeconds();
  if (remainingLockout > 0) {
    return false;
  }

  try {
    const storedHash = await AsyncStorage.getItem(LOCK_PIN_KEY);
    if (!storedHash) {
      return false;
    }

    const salt = await getOrCreateSalt();
    let isValid = false;

    if (storedHash.startsWith('v2_')) {
      const attemptHash = hashPINWithSalt(attempt, salt);
      isValid = (storedHash === attemptHash);
    } else {
      // Legacy hash verification and transparent migration to v2
      const legacyHash = legacyHashPIN(attempt);
      if (storedHash === legacyHash) {
        isValid = true;
        const newHash = hashPINWithSalt(attempt, salt);
        await AsyncStorage.setItem(LOCK_PIN_KEY, newHash);
        console.log('✅ Successfully migrated legacy PIN hash to v2 SHA-256');
      }
    }

    if (isValid) {
      // Reset failed attempts on success
      await AsyncStorage.setItem(FAILED_ATTEMPTS_KEY, '0');
      await AsyncStorage.removeItem(LOCKOUT_UNTIL_KEY);
      return true;
    } else {
      // Track failed attempt
      const failedStr = await AsyncStorage.getItem(FAILED_ATTEMPTS_KEY);
      const currentFailed = (parseInt(failedStr || '0', 10) || 0) + 1;
      await AsyncStorage.setItem(FAILED_ATTEMPTS_KEY, currentFailed.toString());

      // Lockout thresholds: every 5th attempt (5 -> 60s, 10 -> 120s, 15+ -> 300s)
      if (currentFailed >= 5 && currentFailed % 5 === 0) {
        const tier = Math.floor(currentFailed / 5);
        let cooldownSeconds = 60;
        if (tier === 2) cooldownSeconds = 120;
        else if (tier >= 3) cooldownSeconds = 300;

        const lockoutUntil = Date.now() + (cooldownSeconds * 1000);
        await AsyncStorage.setItem(LOCKOUT_UNTIL_KEY, lockoutUntil.toString());
      }
      return false;
    }
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
    await AsyncStorage.setItem(FAILED_ATTEMPTS_KEY, '0');
    await AsyncStorage.removeItem(LOCKOUT_UNTIL_KEY);
    
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

    const salt = await getOrCreateSalt();
    const hashed = hashPINWithSalt(newPin, salt);
    await AsyncStorage.setItem(LOCK_PIN_KEY, hashed);
    await AsyncStorage.setItem(FAILED_ATTEMPTS_KEY, '0');
    await AsyncStorage.removeItem(LOCKOUT_UNTIL_KEY);
    
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
