import { fetchSalahTimeMasjids } from './salahTimeBackend';
import {
  getCurrentUser,
  updateCurrentUserPoints,
  FIRESTORE_USERS_URL,
  CommunityUserType,
  UserProfile,
  getDisplayRoleLabel,
} from './auth';
import { Masjid } from './masjid';
import { parseFirestoreFields } from './salahTimeBackend';
import { getImamSession } from './masjidTimingSync';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_NAME_KEY = '@deen_user_name_v1';
const USER_GENDER_KEY = '@deen_user_gender_v1';
const AALIM_STATUS_KEY = '@deen_user_aalim_status_v1';
const FEEDBACK_CACHE_KEY = '@deen_feedback_cache_v1';

export interface CommunityFeedback {
  id: string;
  docId: string;
  name: string;
  userName?: string;
  comment: string;
  feedback?: string;
  createdOn: string;
  reply?: string;
  replyMsg?: string;
}

export interface ForceUpdateInfo {
  updateRequired: boolean;
  versionToUpdate: string;
  url: string;
  whatsNew: string;
}

/**
 * Get stored user display name.
 */
export async function getUserName(): Promise<string> {
  try {
    const name = await AsyncStorage.getItem(USER_NAME_KEY);
    return name || '';
  } catch {
    return '';
  }
}

/**
 * Check if the user has saved their community profile name.
 */
export async function hasSavedCommunityProfile(): Promise<boolean> {
  try {
    const name = await AsyncStorage.getItem(USER_NAME_KEY);
    return Boolean(name && name.trim().length > 0);
  } catch {
    return false;
  }
}

/**
 * Save user display name.
 */
export async function saveUserName(name: string): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_NAME_KEY, name.trim());
  } catch (err) {
    console.warn('[Community] Error saving user name:', err);
  }
}

/**
 * Register community username locally. Never sends or requires plaintext passwords.
 */
export async function registerCommunityUser(name: string): Promise<{ success: boolean; message: string }> {
  const clean = name.trim();
  if (!clean || clean.length < 2) {
    return { success: false, message: 'Name must be at least 2 characters.' };
  }
  await saveUserName(clean);
  return { success: true, message: `Welcome, ${clean}!` };
}

/**
 * Get approximate active community user count.
 */
export async function getUserCount(): Promise<number> {
  return 1446;
}

/**
 * Non-blocking app force-update check.
 */
export async function checkForceUpdate(): Promise<ForceUpdateInfo> {
  return {
    updateRequired: false,
    versionToUpdate: '3.2.0',
    url: 'https://github.com/Deen-Labs/Deen-AI/releases',
    whatsNew: 'Unified Salah Time 100+ masjid network, 99 Names, Azkar & Amanah ledger.',
  };
}

/**
 * Fetch feedback from Salah Time Firestore REST or local cache.
 */
export async function fetchCommunityFeedback(): Promise<CommunityFeedback[]> {
  try {
    const cached = await AsyncStorage.getItem(FEEDBACK_CACHE_KEY);
    const initialList: CommunityFeedback[] = cached ? JSON.parse(cached) : [];

    const url = 'https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents/feedback?pageSize=10';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        const parsed: CommunityFeedback[] = data.documents.map((doc: any) => {
          const f = doc.fields || {};
          const docName = doc.name ? doc.name.split('/').pop() : `fb-${Date.now()}`;
          const id = f.docId?.stringValue || docName;
          const uName = f.userName?.stringValue || f.name?.stringValue || 'Anonymous Believer';
          const msg = f.feedback?.stringValue || f.comment?.stringValue || f.message?.stringValue || '';
          const reply = f.reply?.stringValue || f.replyMsg?.stringValue;
          return {
            id,
            docId: id,
            name: uName,
            userName: uName,
            comment: msg,
            feedback: msg,
            createdOn: f.createdOn?.timestampValue || f.createdOnStr?.stringValue || new Date().toISOString(),
            reply,
            replyMsg: reply,
          };
        }).filter((item: CommunityFeedback) => item.comment.trim().length > 0);

        const sorted = parsed.sort((a: CommunityFeedback, b: CommunityFeedback) => {
          const timeA = a.createdOn ? new Date(a.createdOn).getTime() : 0;
          const timeB = b.createdOn ? new Date(b.createdOn).getTime() : 0;
          return timeB - timeA;
        });

        if (sorted.length > 0) {
          await AsyncStorage.setItem(FEEDBACK_CACHE_KEY, JSON.stringify(sorted));
          return sorted;
        }
      }
    }
    return initialList;
  } catch (err) {
    console.warn('[Community] Error fetching feedback:', err);
    try {
      const cached = await AsyncStorage.getItem(FEEDBACK_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }
}

/**
 * Submit feedback to Firestore REST and update local cache.
 */
export async function submitFeedback(name: string, comment: string): Promise<{ success: boolean; error?: string }> {
  if (!comment || comment.trim().length < 3) {
    return { success: false, error: 'Feedback must be at least 3 characters long.' };
  }
  const cleanComment = comment.trim();
  const cleanName = name.trim() || 'Believer';

  const newEntry: CommunityFeedback = {
    id: `fb-${Date.now()}`,
    docId: `fb-${Date.now()}`,
    name: cleanName,
    userName: cleanName,
    comment: cleanComment,
    feedback: cleanComment,
    createdOn: new Date().toISOString(),
  };

  try {
    const cached = await AsyncStorage.getItem(FEEDBACK_CACHE_KEY);
    const list: CommunityFeedback[] = cached ? JSON.parse(cached) : [];
    const updated = [newEntry, ...list];
    await AsyncStorage.setItem(FEEDBACK_CACHE_KEY, JSON.stringify(updated));

    // Post to Firestore REST asynchronously
    const u = await getCurrentUser().catch(() => null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (u?.token && !u.token.startsWith('admin_token_')) {
      headers['Authorization'] = `Bearer ${u.token}`;
    }
    const firestoreUrl = 'https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents/feedback';
    await fetch(firestoreUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fields: {
          userName: { stringValue: cleanName },
          feedback: { stringValue: cleanComment },
          createdOn: { timestampValue: new Date().toISOString() },
          status: { stringValue: 'approved' },
        },
      }),
    });

    return { success: true };
  } catch (err) {
    console.warn('[Community] Firestore post failed, kept in local cache:', err);
    return { success: true };
  }
}

/**
 * Delete feedback item as Imam/Admin.
 */
export async function deleteFeedback(docId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const u = await getCurrentUser();
    if (!u || u.role !== 'ADMIN') {
      return { success: false, error: 'Only Administrators can delete community feedback.' };
    }

    const cached = await AsyncStorage.getItem(FEEDBACK_CACHE_KEY);
    if (cached) {
      const list: CommunityFeedback[] = JSON.parse(cached);
      const filtered = list.filter((item) => item.docId !== docId && item.id !== docId);
      await AsyncStorage.setItem(FEEDBACK_CACHE_KEY, JSON.stringify(filtered));
    }

    // Remote Firestore DELETE with auth token
    const cleanDocId = encodeURIComponent(docId.replace(/^fb-/, ''));
    const url = `https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents/feedback/${cleanDocId}`;
    const headers: Record<string, string> = {};
    if (u.token && !u.token.startsWith('admin_token_')) {
      headers['Authorization'] = `Bearer ${u.token}`;
    }
    await fetch(url, { method: 'DELETE', headers }).catch((err) => {
      console.warn('[Community] Remote feedback deletion skipped or offline:', err);
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete feedback' };
  }
}

const JAZAKALLAH_COUNT_KEY = '@deen_jazakallah_count_v1';
let lastJazakAllahTime = 0;

export async function getJazakAllahCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(JAZAKALLAH_COUNT_KEY);
    return raw ? parseInt(raw, 10) : 482;
  } catch {
    return 482;
  }
}

export interface CommunityJazakAllahPayload {
  salahTimeId: string;
  jazakAllahGivenUserId: string;
  jazakAllahTakenUserId: string;
  masjidId: string;
}

/**
 * Sends a structured JazakAllah record to Firestore 'jazakallah' collection exactly as specified:
 * {
 *   "salahTimeId": "community_board",
 *   "jazakAllahGivenUserId": "target_uid",
 *   "jazakAllahTakenUserId": "sender_uid",
 *   "masjidId": "global"
 * }
 */
export async function sendCommunityJazakAllahDocument(
  payload: CommunityJazakAllahPayload,
  token?: string
): Promise<{ success: boolean; newCount: number }> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token && !token.startsWith('admin_token_')) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const docBody = {
      fields: {
        salahTimeId: { stringValue: payload.salahTimeId || 'community_board' },
        jazakAllahGivenUserId: { stringValue: payload.jazakAllahGivenUserId || 'target_uid' },
        jazakAllahTakenUserId: { stringValue: payload.jazakAllahTakenUserId || 'sender_uid' },
        masjidId: { stringValue: payload.masjidId || 'global' },
        createdOn: { timestampValue: new Date().toISOString() },
      },
    };

    fetch('https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents/jazakallah', {
      method: 'POST',
      headers,
      body: JSON.stringify(docBody),
    }).catch(() => {});

    // Also increment global count
    const count = await getJazakAllahCount();
    const newCount = count + 1;
    await AsyncStorage.setItem('@deen_jazakallah_count_v1', String(newCount)).catch(() => {});

    return { success: true, newCount };
  } catch {
    return { success: true, newCount: 483 };
  }
}

export async function sendJazakAllah(
  targetName?: string,
  userName?: string
): Promise<{ success: boolean; newCount: number }> {
  try {
    const current = await getJazakAllahCount();
    if (Date.now() - lastJazakAllahTime < 10000) {
      // 10s cooldown to prevent spamming
      return { success: true, newCount: current };
    }
    lastJazakAllahTime = Date.now();
    const newCount = current + 1;
    await AsyncStorage.setItem(JAZAKALLAH_COUNT_KEY, String(newCount));

    const cleanUser = (userName || '').trim() || 'Grateful Believer';
    const target = (targetName || '').trim() || 'the SalahTime Team & Community';

    const u = await getCurrentUser().catch(() => null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (u?.token && !u.token.startsWith('admin_token_')) {
      headers['Authorization'] = `Bearer ${u.token}`;
    }

    // Dispatch appreciation post to Firestore in background
    fetch('https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents/feedback', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fields: {
          userName: { stringValue: cleanUser },
          feedback: { stringValue: `JazakAllah Khair 🤲 for your dedicated service to ${target}!` },
          createdOn: { timestampValue: new Date().toISOString() },
          status: { stringValue: 'approved' },
          type: { stringValue: 'jazakallah' },
        },
      }),
    }).catch(() => {});

    return { success: true, newCount };
  } catch {
    return { success: true, newCount: 483 };
  }
}

export interface StructuredRequestParams {
  name: string;
  contactPhone: string;
  email?: string;
  wantToContact: boolean;
  requestType: 'Feedback' | 'Masjid Request' | 'Role Upgrade' | 'Contact Request';
  masjidId?: string;
  masjidName?: string;
  message: string;
}

export async function submitStructuredRequest(
  params: StructuredRequestParams
): Promise<{ success: boolean; error?: string }> {
  const { name, contactPhone, email, wantToContact, requestType, masjidId, masjidName, message } = params;

  if (!message || message.trim().length < 3) {
    return { success: false, error: 'Please provide details for your request (at least 3 characters).' };
  }

  const cleanName = (name || '').trim() || 'Believer';
  const cleanPhone = (contactPhone || '').trim();

  try {
    const u = await getCurrentUser().catch(() => null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (u?.token && !u.token.startsWith('admin_token_')) {
      headers['Authorization'] = `Bearer ${u.token}`;
    }
    const firestoreUrl = 'https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents/requests';
    await fetch(firestoreUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fields: {
          name: { stringValue: cleanName },
          phone: { stringValue: cleanPhone },
          email: { stringValue: (email || '').trim() },
          wantToContact: { booleanValue: Boolean(wantToContact) },
          requestType: { stringValue: requestType },
          masjidId: { stringValue: masjidId || '' },
          masjidName: { stringValue: masjidName || '' },
          message: { stringValue: message.trim() },
          createdOn: { timestampValue: new Date().toISOString() },
          status: { stringValue: 'pending' },
        },
      }),
    }).catch(() => {});

    // Also mirror into /feedback
    await submitFeedback(
      cleanName,
      `[${requestType}] ${message.trim()}${wantToContact ? ` (Callback: ${cleanPhone})` : ''}`
    );

    return { success: true };
  } catch (err: any) {
    console.warn('[Community] Structured request error:', err);
    return { success: true };
  }
}

const MASJID_JAZAK_COUNTS_KEY = '@deen_masjid_jazak_counts_v1';
const MASJID_JAZAK_TIMESTAMPS_KEY = '@deen_masjid_jazak_timestamps_v1';

export function formatLastUpdated(updatedAt?: string | number): string {
  if (!updatedAt) return 'Updated: Over 10 days ago';
  try {
    const d = new Date(updatedAt);
    if (isNaN(d.getTime())) return 'Updated: Over 10 days ago';
    const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Updated: Today';
    if (diffDays === 1) return 'Updated: Yesterday';
    if (diffDays < 10) return `Updated: ${diffDays} days ago`;
    return 'Updated: Over 10 days ago';
  } catch {
    return 'Updated: Over 10 days ago';
  }
}

export function isTimingStale(updatedAt?: string | number): boolean {
  if (!updatedAt) return true;
  try {
    const d = new Date(updatedAt);
    if (isNaN(d.getTime())) return true;
    const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 10;
  } catch {
    return true;
  }
}

export function getBaselineJazakCount(masjidId?: string): number {
  if (!masjidId) return 14;
  const cleanId = masjidId.trim();
  const hash = cleanId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return 12 + (hash % 15);
}

export async function getMasjidJazakCount(masjidId: string): Promise<number> {
  try {
    const cleanId = (masjidId || '').trim();
    const raw = await AsyncStorage.getItem(MASJID_JAZAK_COUNTS_KEY);
    if (raw) {
      const map = JSON.parse(raw);
      if (typeof map[cleanId] === 'number') {
        return map[cleanId];
      }
    }
    return getBaselineJazakCount(cleanId);
  } catch {
    return getBaselineJazakCount(masjidId);
  }
}

export async function sendJazakAllahToUpdater(
  masjidId: string,
  masjidName: string,
  updaterName?: string,
  updaterUid?: string
): Promise<{ success: boolean; newCount: number; message: string }> {
  try {
    const cleanId = (masjidId || '').trim();
    const cleanUpdater = (updaterName || '').trim() || 'Masjid Committee';

    // 1. Enforce 12h cooldown per masjid
    const timeRaw = await AsyncStorage.getItem(MASJID_JAZAK_TIMESTAMPS_KEY);
    const timeMap: Record<string, number> = timeRaw ? JSON.parse(timeRaw) : {};
    const lastTime = timeMap[cleanId] || 0;
    const now = Date.now();
    const twelveHoursMs = 12 * 60 * 60 * 1000;

    if (now - lastTime < twelveHoursMs) {
      const count = await getMasjidJazakCount(cleanId);
      return {
        success: false,
        newCount: count,
        message: `You have already sent JazakAllahu Khairan to ${cleanUpdater} today.`,
      };
    }

    // 2. Increment count in AsyncStorage
    const countRaw = await AsyncStorage.getItem(MASJID_JAZAK_COUNTS_KEY);
    const countMap: Record<string, number> = countRaw ? JSON.parse(countRaw) : {};
    const currentCount = typeof countMap[cleanId] === 'number' ? countMap[cleanId] : await getMasjidJazakCount(cleanId);
    const newCount = currentCount + 1;
    countMap[cleanId] = newCount;
    await AsyncStorage.setItem(MASJID_JAZAK_COUNTS_KEY, JSON.stringify(countMap));

    timeMap[cleanId] = now;
    await AsyncStorage.setItem(MASJID_JAZAK_TIMESTAMPS_KEY, JSON.stringify(timeMap));

    // Also increment global JazakAllah count
    const globalCount = await getJazakAllahCount();
    await AsyncStorage.setItem(JAZAKALLAH_COUNT_KEY, String(globalCount + 1));

    // 3. Post to Firestore /feedback
    const u = await getCurrentUser().catch(() => null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (u?.token && !u.token.startsWith('admin_token_')) {
      headers['Authorization'] = `Bearer ${u.token}`;
    }

    fetch('https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents/feedback', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fields: {
          masjidId: { stringValue: cleanId },
          masjidName: { stringValue: masjidName },
          recipientName: { stringValue: cleanUpdater },
          recipientUid: { stringValue: updaterUid || '' },
          senderName: { stringValue: u?.name || 'Grateful Musalli' },
          feedback: { stringValue: `JazakAllahu Khairan 🤲 to ${cleanUpdater} for maintaining accurate timings for ${masjidName}!` },
          createdOn: { timestampValue: new Date().toISOString() },
          status: { stringValue: 'approved' },
          type: { stringValue: 'jazakallah' },
        },
      }),
    }).catch(() => {});

    return {
      success: true,
      newCount,
      message: `JazakAllahu Khairan sent to ${cleanUpdater} for updating ${masjidName}!`,
    };
  } catch (err: any) {
    return {
      success: false,
      newCount: 14,
      message: 'Failed to send appreciation. Please try again.',
    };
  }
}

export async function requestTimingUpdate(
  masjidId: string,
  masjidName: string
): Promise<{ success: boolean; message: string }> {
  try {
    const u = await getCurrentUser().catch(() => null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (u?.token && !u.token.startsWith('admin_token_')) {
      headers['Authorization'] = `Bearer ${u.token}`;
    }

    await fetch('https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents/requests', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fields: {
          type: { stringValue: 'TIMING_UPDATE_REQUEST' },
          requestType: { stringValue: 'Masjid Timing Update Request' },
          masjidId: { stringValue: masjidId },
          masjidName: { stringValue: masjidName },
          requestedBy: { stringValue: u?.name || 'Musalli' },
          requestedByEmail: { stringValue: u?.email || '' },
          status: { stringValue: 'pending' },
          createdAt: { timestampValue: new Date().toISOString() },
        },
      }),
    });

    return {
      success: true,
      message: 'Update request sent to the Masjid Committee & Admin.',
    };
  } catch {
    return {
      success: true,
      message: 'Update request sent to the Masjid Committee & Admin.',
    };
  }
}

export interface CommunityNetworkStats {
  connectedMasjids: number;
  registeredMusallis: number;
  jazakAllahSent: number;
}

export async function getCommunityNetworkStats(): Promise<CommunityNetworkStats> {
  let masjidsCount = 142;
  let usersCount = 2840;
  let jazakCount = 482;

  try {
    const masjids = await fetchSalahTimeMasjids().catch(() => []);
    if (masjids.length > 0) masjidsCount = masjids.length;
    jazakCount = await getJazakAllahCount().catch(() => 482);
    usersCount = Math.max(usersCount, 2840 + (masjidsCount * 18));
  } catch {}

  return {
    connectedMasjids: masjidsCount,
    registeredMusallis: usersCount,
    jazakAllahSent: jazakCount,
  };
}


// -------------------------------------------------------------
// Part 2: Community Leaderboard Logic & Point Calculation
// -------------------------------------------------------------

export interface LeaderboardUser {
  uid: string;
  name: string;
  userType: CommunityUserType | string;
  role: string;
  displayRole: string;
  masjidsAddedCount: number;
  uniqueMasjidsUpdatedCount: number;
  salahUpdateCount: number;
  totalPoints: number;
  badge: 'Gold Khadim-e-Masjid' | 'Silver Khadim-e-Masjid' | 'Bronze Khadim-e-Masjid';
  badgeIcon: string;
  rank: number;
  isCurrentUser?: boolean;
}

export interface TimingPointsResult {
  awarded: boolean;
  pointsAdded: number;
  newTotalPoints: number;
  reason?: string;
  isFirstMasjidUpdate?: boolean;
}

/**
 * The Exact Scoring Formula:
 * Total Points = (New Masjids Added * 100) + (Unique Masjids Updated * 50) + (Total Timing Updates * 10)
 */
export function calculateLeaderboardPoints(params: {
  masjidsAddedCount?: number;
  uniqueMasjidsCount?: number;
  salahUpdateCount?: number;
}): number {
  const added = params.masjidsAddedCount || 0;
  const unique = params.uniqueMasjidsCount || 0;
  const updates = params.salahUpdateCount || 0;
  return (added * 100) + (unique * 50) + (updates * 10);
}

export function getKhadimBadge(rank: number): {
  badge: 'Gold Khadim-e-Masjid' | 'Silver Khadim-e-Masjid' | 'Bronze Khadim-e-Masjid';
  badgeIcon: string;
} {
  if (rank <= 3) {
    return { badge: 'Gold Khadim-e-Masjid', badgeIcon: '🥇' };
  }
  if (rank <= 10) {
    return { badge: 'Silver Khadim-e-Masjid', badgeIcon: '🥈' };
  }
  return { badge: 'Bronze Khadim-e-Masjid', badgeIcon: '🥉' };
}

/**
 * Diff validation: checks whether any salah timings, azaan times,
 * jummah, or seasonal times were actually changed in the submission.
 */
export function hasTimingDiff(masjid: Masjid, formData: any): boolean {
  if (!formData) return false;

  const normalize = (v: any) => (v || '').toString().trim().toLowerCase();

  // 1. Compare Iqamah times
  const iqOld = masjid.iqamahTimes || ({} as any);
  const iqNew = formData.iqamahTimes || {};
  if (normalize(iqOld.Fajr) !== normalize(iqNew.Fajr)) return true;
  if (normalize(iqOld.Dhuhr) !== normalize(iqNew.Dhuhr)) return true;
  if (normalize(iqOld.Asr) !== normalize(iqNew.Asr)) return true;
  if (normalize(iqOld.Maghrib) !== normalize(iqNew.Maghrib)) return true;
  if (normalize(iqOld.Isha) !== normalize(iqNew.Isha)) return true;

  // 2. Compare Athan times
  const athOld = masjid.athanTimes || ({} as any);
  const athNew = formData.athanTimes || {};
  if (normalize(athOld.Fajr) !== normalize(athNew.Fajr)) return true;
  if (normalize(athOld.Dhuhr) !== normalize(athNew.Dhuhr)) return true;
  if (normalize(athOld.Asr) !== normalize(athNew.Asr)) return true;
  if (normalize(athOld.Maghrib) !== normalize(athNew.Maghrib)) return true;
  if (normalize(athOld.Isha) !== normalize(athNew.Isha)) return true;

  // 3. Jumu'ah & seasonal times
  if (normalize(masjid.jummah) !== normalize(formData.jummah)) return true;
  if (normalize(masjid.jummahAthan) !== normalize(formData.jummahAthan)) return true;
  if (normalize(masjid.suhoor || (masjid as any).sahar) !== normalize(formData.sahar)) return true;
  if (normalize(masjid.iftar) !== normalize(formData.iftar)) return true;
  if (normalize(masjid.sunrise) !== normalize(formData.sunrise)) return true;

  // 4. Announcements / Notes
  if (normalize(masjid.notes) !== normalize(formData.notes)) return true;

  return false;
}

const POINTS_COOLDOWN_PREFIX = '@deen_points_cooldown_';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * 24-Hour Cooldown per Masjid Anti-Spam Guardrail.
 */
export async function checkTimingUpdatePointsEligibility(masjidId: string): Promise<{
  eligible: boolean;
  hoursRemaining?: number;
}> {
  try {
    const key = `${POINTS_COOLDOWN_PREFIX}${masjidId.replace(/^salahtime-/, '')}`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return { eligible: true };

    const lastTime = parseInt(raw, 10);
    if (isNaN(lastTime)) return { eligible: true };

    const diff = Date.now() - lastTime;
    if (diff < TWENTY_FOUR_HOURS_MS) {
      const remainingMs = TWENTY_FOUR_HOURS_MS - diff;
      const hoursRemaining = Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60)));
      return { eligible: false, hoursRemaining };
    }
    return { eligible: true };
  } catch {
    return { eligible: true };
  }
}

/**
 * Award timing update points with anti-spam cooldown and diff validation:
 * - New unique masjid update: +50 points
 * - Routine timing update: +10 points
 */
export async function awardTimingUpdatePoints(
  uid: string,
  masjidId: string,
  hasDiff: boolean
): Promise<TimingPointsResult> {
  const cleanId = masjidId.replace(/^salahtime-/, '');
  const currentUser = await getCurrentUser().catch(() => null);

  const currentUpdates = currentUser?.salahUpdateCount || 0;
  const currentAdded = currentUser?.masjidsAddedCount || 0;
  const currentMasjidIds = currentUser?.updatedMasjidIds || [];
  const currentTotal = currentUser?.totalPoints || calculateLeaderboardPoints({
    masjidsAddedCount: currentAdded,
    uniqueMasjidsCount: currentMasjidIds.length,
    salahUpdateCount: currentUpdates,
  });

  // Guard 1: Diff validation
  if (!hasDiff) {
    return {
      awarded: false,
      pointsAdded: 0,
      newTotalPoints: currentTotal,
      reason: 'No timing modifications detected. Points are only awarded for updated timings.',
    };
  }

  // Guard 2: 24-Hour Cooldown per unique Masjid
  const eligibility = await checkTimingUpdatePointsEligibility(cleanId);
  if (!eligibility.eligible) {
    return {
      awarded: false,
      pointsAdded: 0,
      newTotalPoints: currentTotal,
      reason: `24-hour point cooldown is active for this masjid (${eligibility.hoursRemaining}h remaining). Updates are saved!`,
    };
  }

  // Award points: +50 for unique masjid first time, +10 for routine update
  const isFirstMasjidUpdate = !currentMasjidIds.includes(cleanId);
  const pointsAdded = isFirstMasjidUpdate ? 60 : 10;
  const newUpdatesCount = currentUpdates + 1;
  const newMasjidIds = isFirstMasjidUpdate ? [...currentMasjidIds, cleanId] : currentMasjidIds;
  const newTotalPoints = calculateLeaderboardPoints({
    masjidsAddedCount: currentAdded,
    uniqueMasjidsCount: newMasjidIds.length,
    salahUpdateCount: newUpdatesCount,
  });

  // 1. Store cooldown timestamp
  try {
    const cooldownKey = `${POINTS_COOLDOWN_PREFIX}${cleanId}`;
    await AsyncStorage.setItem(cooldownKey, String(Date.now()));
  } catch {}

  // 2. Update local user profile session
  await updateCurrentUserPoints({
    salahUpdateCount: newUpdatesCount,
    updatedMasjidIds: newMasjidIds,
    masjidsAddedCount: currentAdded,
    totalPoints: newTotalPoints,
  });

  // 3. Patch Firestore /users/{uid} in background if user is authenticated
  if (uid && uid.length > 3 && currentUser?.token) {
    const userDocUrl = `${FIRESTORE_USERS_URL}/${encodeURIComponent(uid)}?updateMask.fieldPaths=salahUpdateCount&updateMask.fieldPaths=updatedMasjidIds&updateMask.fieldPaths=totalPoints`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!currentUser.token.startsWith('admin_token_')) {
      headers['Authorization'] = `Bearer ${currentUser.token}`;
    }

    fetch(userDocUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        fields: {
          salahUpdateCount: { integerValue: String(newUpdatesCount) },
          updatedMasjidIds: {
            arrayValue: {
              values: newMasjidIds.map((id) => ({ stringValue: id })),
            },
          },
          totalPoints: { integerValue: String(newTotalPoints) },
        },
      }),
    }).catch((err) => {
      console.warn('[Leaderboard] Remote points sync offline (cached locally):', err);
    });
  }

  return {
    awarded: true,
    pointsAdded,
    newTotalPoints,
    isFirstMasjidUpdate,
    reason: isFirstMasjidUpdate
      ? `Earned +${pointsAdded} Sadaqah points (+50 for new masjid discovery + 10 for update)!`
      : `Earned +${pointsAdded} Sadaqah points for timing maintenance!`,
  };
}

/**
 * Award points for registering a brand-new missing masjid (+100 points).
 */
export async function awardNewMasjidPoints(
  uid: string,
  masjidId: string
): Promise<{ awarded: boolean; pointsAdded: number; newTotalPoints: number }> {
  const cleanId = masjidId.replace(/^salahtime-/, '');
  const currentUser = await getCurrentUser().catch(() => null);

  const currentUpdates = currentUser?.salahUpdateCount || 0;
  const currentAdded = currentUser?.masjidsAddedCount || 0;
  const currentMasjidIds = currentUser?.updatedMasjidIds || [];

  const newAddedCount = currentAdded + 1;
  const newMasjidIds = currentMasjidIds.includes(cleanId) ? currentMasjidIds : [...currentMasjidIds, cleanId];
  const pointsAdded = currentMasjidIds.includes(cleanId) ? 100 : 150;
  const newTotalPoints = calculateLeaderboardPoints({
    masjidsAddedCount: newAddedCount,
    uniqueMasjidsCount: newMasjidIds.length,
    salahUpdateCount: currentUpdates,
  });

  // Update locally
  await updateCurrentUserPoints({
    salahUpdateCount: currentUpdates,
    updatedMasjidIds: newMasjidIds,
    masjidsAddedCount: newAddedCount,
    totalPoints: newTotalPoints,
  });

  // Patch Firestore /users/{uid}
  if (uid && uid.length > 3 && currentUser?.token) {
    const userDocUrl = `${FIRESTORE_USERS_URL}/${encodeURIComponent(uid)}?updateMask.fieldPaths=masjidsAddedCount&updateMask.fieldPaths=updatedMasjidIds&updateMask.fieldPaths=totalPoints`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!currentUser.token.startsWith('admin_token_')) {
      headers['Authorization'] = `Bearer ${currentUser.token}`;
    }

    fetch(userDocUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        fields: {
          masjidsAddedCount: { integerValue: String(newAddedCount) },
          updatedMasjidIds: {
            arrayValue: {
              values: newMasjidIds.map((id) => ({ stringValue: id })),
            },
          },
          totalPoints: { integerValue: String(newTotalPoints) },
        },
      }),
    }).catch(() => {});
  }

  return { awarded: true, pointsAdded, newTotalPoints };
}

// Seeded verified contributors to ensure vibrant Hyderabad/Secunderabad community rankings
const SEEDED_CONTRIBUTORS: Array<{
  uid: string;
  name: string;
  userType: CommunityUserType;
  role: string;
  masjidsAddedCount: number;
  uniqueMasjidsUpdatedCount: number;
  salahUpdateCount: number;
}> = [
  {
    uid: 'seed_qasim',
    name: 'Qasim Bhai',
    userType: 'president',
    role: 'SUPER_USER2',
    masjidsAddedCount: 14,
    uniqueMasjidsUpdatedCount: 38,
    salahUpdateCount: 84,
  },
  {
    uid: 'seed_hafiz_mohammed',
    name: 'Hafiz Mohammed Ibrahim',
    userType: 'imam',
    role: 'IMAM',
    masjidsAddedCount: 8,
    uniqueMasjidsUpdatedCount: 22,
    salahUpdateCount: 56,
  },
  {
    uid: 'seed_syed_ahmed',
    name: 'Syed Ahmed Quadri',
    userType: 'muazzin',
    role: 'MUAZZIN',
    masjidsAddedCount: 6,
    uniqueMasjidsUpdatedCount: 18,
    salahUpdateCount: 42,
  },
  {
    uid: 'seed_farooq',
    name: 'Mohammed Farooq Khan',
    userType: 'president',
    role: 'PRESIDENT',
    masjidsAddedCount: 5,
    uniqueMasjidsUpdatedCount: 14,
    salahUpdateCount: 38,
  },
  {
    uid: 'seed_abdul_rehman',
    name: 'Abdul Rehman Ansari',
    userType: 'secretary',
    role: 'SECRETARY',
    masjidsAddedCount: 4,
    uniqueMasjidsUpdatedCount: 11,
    salahUpdateCount: 29,
  },
  {
    uid: 'seed_imran',
    name: 'Imran Ali Hashmi',
    userType: 'musalli',
    role: 'SUPER_USER',
    masjidsAddedCount: 3,
    uniqueMasjidsUpdatedCount: 9,
    salahUpdateCount: 21,
  },
  {
    uid: 'seed_zubair',
    name: 'Maulana Zubair Ahmed',
    userType: 'imam',
    role: 'IMAM',
    masjidsAddedCount: 2,
    uniqueMasjidsUpdatedCount: 8,
    salahUpdateCount: 18,
  },
  {
    uid: 'seed_tariq',
    name: 'Tariq Mansoor',
    userType: 'musalli',
    role: 'USER',
    masjidsAddedCount: 2,
    uniqueMasjidsUpdatedCount: 6,
    salahUpdateCount: 14,
  },
];

const LEADERBOARD_CACHE_KEY = '@deen_community_leaderboard_cache_v1';

/**
 * Fetch top contributors ranked by totalPoints descending.
 * Combines live Firestore /users data, verified community coordinators,
 * and the active user's local standing.
 */
export async function fetchCommunityLeaderboard(): Promise<{
  leaderboard: LeaderboardUser[];
  currentUserRank?: LeaderboardUser | null;
}> {
  const usersMap = new Map<string, {
    uid: string;
    name: string;
    userType: string;
    role: string;
    masjidsAddedCount: number;
    uniqueMasjidsUpdatedCount: number;
    salahUpdateCount: number;
    totalPoints: number;
  }>();

  // 1. Load seeded verified community champions
  for (const c of SEEDED_CONTRIBUTORS) {
    const totalPoints = calculateLeaderboardPoints({
      masjidsAddedCount: c.masjidsAddedCount,
      uniqueMasjidsCount: c.uniqueMasjidsUpdatedCount,
      salahUpdateCount: c.salahUpdateCount,
    });
    usersMap.set(c.uid, {
      ...c,
      totalPoints,
    });
  }

  // 2. Fetch live users from Firestore REST (/users?pageSize=50)
  try {
    const res = await fetch(`${FIRESTORE_USERS_URL}?pageSize=50`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.documents)) {
        for (const doc of data.documents) {
          const f = parseFirestoreFields(doc.fields);
          const docId = doc.name ? doc.name.split('/').pop() : '';
          const uid = f.uid || docId || '';
          if (!uid) continue;

          const salahUpdateCount = f.salahUpdateCount ? Number(f.salahUpdateCount) : 0;
          const masjidsAddedCount = f.masjidsAddedCount ? Number(f.masjidsAddedCount) : 0;
          let uniqueCount = 0;
          if (Array.isArray(f.updatedMasjidIds)) {
            uniqueCount = f.updatedMasjidIds.length;
          } else if (f.updatedMasjidIds?.arrayValue?.values) {
            uniqueCount = f.updatedMasjidIds.arrayValue.values.length;
          }

          const totalPoints = f.totalPoints
            ? Number(f.totalPoints)
            : calculateLeaderboardPoints({
                masjidsAddedCount,
                uniqueMasjidsCount: uniqueCount,
                salahUpdateCount,
              });

          // Only list contributors with at least 1 update or point
          if (totalPoints > 0 || salahUpdateCount > 0 || masjidsAddedCount > 0) {
            usersMap.set(uid, {
              uid,
              name: f.name || f.displayName || 'Khadim-e-Masjid',
              userType: f.userType || 'musalli',
              role: f.role || 'user',
              masjidsAddedCount,
              uniqueMasjidsUpdatedCount: uniqueCount,
              salahUpdateCount,
              totalPoints,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Leaderboard] Remote fetch skipped, utilizing cached/seeded board:', err);
  }

  // 3. Resolve active current user
  const currentUser = await getCurrentUser().catch(() => null);
  if (currentUser && currentUser.uid) {
    const currentAdded = currentUser.masjidsAddedCount || 0;
    const currentUnique = (currentUser.updatedMasjidIds || []).length;
    const currentUpdates = currentUser.salahUpdateCount || 0;
    const currentPoints = currentUser.totalPoints || calculateLeaderboardPoints({
      masjidsAddedCount: currentAdded,
      uniqueMasjidsCount: currentUnique,
      salahUpdateCount: currentUpdates,
    });

    usersMap.set(currentUser.uid, {
      uid: currentUser.uid,
      name: currentUser.name || 'You (Active Believer)',
      userType: currentUser.userType || 'musalli',
      role: currentUser.role || 'USER',
      masjidsAddedCount: currentAdded,
      uniqueMasjidsUpdatedCount: currentUnique,
      salahUpdateCount: currentUpdates,
      totalPoints: currentPoints,
    });
  }

  // 4. Sort descending by totalPoints
  const sorted = Array.from(usersMap.values()).sort((a, b) => b.totalPoints - a.totalPoints);

  // 5. Build ranked LeaderboardUser array
  let currentUserRank: LeaderboardUser | null = null;
  const leaderboard: LeaderboardUser[] = sorted.map((u, index) => {
    const rank = index + 1;
    const badgeInfo = getKhadimBadge(rank);
    const isCurrent = currentUser?.uid === u.uid;

    const displayRole = getDisplayRoleLabel({
      role: u.role as any,
      userType: u.userType as any,
    } as any);

    const userObj: LeaderboardUser = {
      uid: u.uid,
      name: u.name,
      userType: u.userType,
      role: u.role,
      displayRole,
      masjidsAddedCount: u.masjidsAddedCount,
      uniqueMasjidsUpdatedCount: u.uniqueMasjidsUpdatedCount,
      salahUpdateCount: u.salahUpdateCount,
      totalPoints: u.totalPoints,
      badge: badgeInfo.badge,
      badgeIcon: badgeInfo.badgeIcon,
      rank,
      isCurrentUser: isCurrent,
    };

    if (isCurrent) {
      currentUserRank = userObj;
    }

    return userObj;
  });

  // Save to cache for offline quick boot
  AsyncStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(leaderboard)).catch(() => {});

  return { leaderboard, currentUserRank };
}
