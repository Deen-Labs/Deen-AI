import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_MASJID_KEY = '@deen_ai_default_masjid_id_v2';
export const PINNED_MASJID_KEY = '@deen_ai_pinned_masjid_id_v1';

/**
 * Retrieve user's explicitly selected Default Masjid ID.
 * Automatically migrates any legacy pinned masjid ID from v1.
 */
export async function getDefaultMasjidId(): Promise<string | null> {
  try {
    const val = await AsyncStorage.getItem(DEFAULT_MASJID_KEY);
    if (val) return val;
    // Migrate legacy pinned masjid key
    const legacy = await AsyncStorage.getItem(PINNED_MASJID_KEY);
    if (legacy) {
      await AsyncStorage.setItem(DEFAULT_MASJID_KEY, legacy);
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Explicitly save user's Default Masjid selection and sync with profile if logged in.
 * Setting to null resets the app to auto-detect closest GPS masjid.
 */
export async function setDefaultMasjidId(id: string | null): Promise<void> {
  try {
    if (id) {
      await AsyncStorage.setItem(DEFAULT_MASJID_KEY, id);
      await AsyncStorage.setItem(PINNED_MASJID_KEY, id);
    } else {
      await AsyncStorage.removeItem(DEFAULT_MASJID_KEY);
      await AsyncStorage.removeItem(PINNED_MASJID_KEY);
    }

    // Sync with UserProfile in AsyncStorage and Firestore if logged in
    try {
      const rawUser = await AsyncStorage.getItem('@deen_ai_user_session_v1');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (u.uid && u.defaultMasjidId !== id) {
          u.defaultMasjidId = id || '';
          await AsyncStorage.setItem('@deen_ai_user_session_v1', JSON.stringify(u));
          const patchUrl = `https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents/users/${encodeURIComponent(u.uid)}?updateMask.fieldPaths=defaultMasjidId`;
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (u.token && !u.token.startsWith('admin_token_')) {
            headers['Authorization'] = `Bearer ${u.token}`;
          }
          fetch(patchUrl, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ fields: { defaultMasjidId: { stringValue: id || '' } } }),
          }).catch(() => {});
        }
      }
    } catch {}
  } catch (err) {
    console.warn('[DefaultMasjid] Error saving default masjid id:', err);
  }
}

export const getPinnedMasjidId = getDefaultMasjidId;
export const setPinnedMasjidId = setDefaultMasjidId;
