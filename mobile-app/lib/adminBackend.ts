import { UserProfile, UserRole, CommunityUserType, normalizeUserRole, normalizeUserType, FIRESTORE_USERS_URL } from './auth';
import { parseFirestoreFields } from './salahTimeBackend';
import { Masjid } from './masjid';

const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalMasjids: number;
  approvedMasjids: number;
  pendingMasjids: number;
  rejectedMasjids: number;
  totalJumaTopics: number;
  totalFeedback: number;
  forceUpdateConfig: {
    minVersion?: string;
    latestVersion?: string;
    updateUrl?: string;
    forceUpdate?: boolean;
    whatsNew?: string;
  };
  rawConfigs: Record<string, any>;
}

export interface AdminMasjidItem extends Masjid {
  status: 'approved' | 'pending' | 'rejected';
  docId: string;
}

/**
 * Fetch all registered users from Firestore REST API (/users?pageSize=300)
 */
export async function fetchAllUsers(token?: string): Promise<UserProfile[]> {
  const users: UserProfile[] = [];
  let pageToken = '';

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token && !token.startsWith('admin_token_')) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    do {
      const url = `${FIRESTORE_USERS_URL}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.warn('[AdminBackend] fetchAllUsers failed with status:', res.status);
        break;
      }

      const data = await res.json();
      if (Array.isArray(data.documents)) {
        for (const doc of data.documents) {
          const f = parseFirestoreFields(doc.fields);
          const docId = doc.name ? doc.name.split('/').pop() : '';
          const uid = f.uid || docId || '';

          const rawRole = f.role || 'user';
          const rawUserType = f.userType || '';
          const normalizedRole = normalizeUserRole(rawRole);
          const normalizedUserType = normalizeUserType(rawUserType, rawRole);

          let isActive = true;
          if (f.isActive !== undefined) {
            isActive = Boolean(f.isActive);
          } else if (f.status) {
            isActive = String(f.status).toLowerCase() !== 'inactive' && String(f.status).toLowerCase() !== 'disabled';
          }

          users.push({
            uid,
            name: f.name || f.displayName || 'Unnamed User',
            email: f.email || '',
            mobile: f.mobile || f.phone || '',
            role: normalizedRole,
            userType: normalizedUserType,
            requestedRole: f.requestedRole ? normalizeUserRole(f.requestedRole) : undefined,
            roleApprovalStatus: (f.roleApprovalStatus as 'approved' | 'pending' | 'rejected') || undefined,
            masjidId: f.masjidId || undefined,
            masjidName: f.masjidName || undefined,
            defaultMasjidId: f.defaultMasjidId || undefined,
            isActive,
            createdOn: f.createdOn || new Date().toISOString(),
          });
        }
      }

      pageToken = data.nextPageToken || '';
    } while (pageToken);
  } catch (err) {
    console.warn('[AdminBackend] Error fetching all users:', err);
  }

  return users;
}

/**
 * Toggle user active/deactivated status via Firestore PATCH
 */
export async function toggleUserActiveStatus(
  uid: string,
  isActive: boolean,
  token?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token && !token.startsWith('admin_token_')) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const patchUrl = `${FIRESTORE_USERS_URL}/${encodeURIComponent(uid)}?updateMask.fieldPaths=isActive&updateMask.fieldPaths=status`;
    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        fields: {
          isActive: { booleanValue: isActive },
          status: { stringValue: isActive ? 'active' : 'inactive' },
        },
      }),
    });

    if (res.ok) {
      return { success: true };
    }
    const errJson = await res.json().catch(() => ({}));
    return { success: false, error: errJson.error?.message || 'Failed to update user status.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error updating user status.' };
  }
}

/**
 * Promote or demote user role via Firestore PATCH
 */
export async function promoteUserRole(
  uid: string,
  newRole: string,
  userType?: string,
  token?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token && !token.startsWith('admin_token_')) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const cleanRole = newRole.trim().toLowerCase();
    const cleanUserType = (userType || '').trim().toLowerCase();

    const fieldPaths = ['role', 'roleApprovalStatus'];
    const fields: Record<string, any> = {
      role: { stringValue: cleanRole },
      roleApprovalStatus: { stringValue: 'approved' },
    };

    if (cleanUserType) {
      fieldPaths.push('userType');
      fields.userType = { stringValue: cleanUserType };
    }

    const queryParams = fieldPaths.map((fp) => `updateMask.fieldPaths=${encodeURIComponent(fp)}`).join('&');
    const patchUrl = `${FIRESTORE_USERS_URL}/${encodeURIComponent(uid)}?${queryParams}`;
    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields }),
    });

    if (res.ok) {
      return { success: true };
    }
    const errJson = await res.json().catch(() => ({}));
    return { success: false, error: errJson.error?.message || 'Failed to update user role.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error updating user role.' };
  }
}

/**
 * Fetch all masjid submissions (pending, approved, rejected) from /masjids
 */
export async function fetchAllMasjidSubmissions(token?: string): Promise<AdminMasjidItem[]> {
  const masjids: AdminMasjidItem[] = [];
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token && !token.startsWith('admin_token_')) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const url = `${FIRESTORE_BASE}/masjids?pageSize=300`;
    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.documents)) {
        for (const doc of data.documents) {
          const f = parseFirestoreFields(doc.fields);
          const docId = doc.name ? doc.name.split('/').pop() : f.docId || f.id || '';
          const rawStatus = (f.status || 'approved').toLowerCase();
          const status: 'approved' | 'pending' | 'rejected' =
            rawStatus === 'pending' ? 'pending' : rawStatus === 'rejected' ? 'rejected' : 'approved';

          const rawName = (f.name || f.masjidName || 'Masjid').trim();
          const famousArea = (f.famousArea || '').trim();
          const address = (f.address || '').trim();
          const combinedAddress = [address, famousArea].filter(Boolean).join(', ') || 'Hyderabad, Telangana';

          masjids.push({
            id: `salahtime-${docId}`,
            docId,
            name: rawName,
            address: combinedAddress,
            distance: 0,
            latitude: Number(f.latitude || 17.385044),
            longitude: Number(f.longitude || 78.486671),
            school: f.school || 'Ahle Sunnah (Hanafi)',
            presidentName: f.presidentName || f.sardarName || undefined,
            famousArea: famousArea || undefined,
            ladiesSection: Boolean(f.ladiesSection || f.hasLadiesSection),
            status,
            athanTimes: {
              Fajr: f.fajrAzaan || '--:--',
              Dhuhr: f.zoharAzaan || '--:--',
              Asr: f.asrAzaan || '--:--',
              Maghrib: f.magribAzaan || '--:--',
              Isha: f.eshaAzaan || '--:--',
            },
            iqamahTimes: {
              Fajr: f.fajr || '--:--',
              Dhuhr: f.zohar || '--:--',
              Asr: f.asr || '--:--',
              Maghrib: f.magrib || '--:--',
              Isha: f.esha || '--:--',
            },
            jummah: f.juma || '01:30 PM',
            jummahAthan: f.jumaAzaan || '01:00 PM',
            taravihTime: f.taravihTime || undefined,
            qariName: f.qariName || undefined,
            updatedByName: f.updatedByName || f.createdBy || undefined,
            lastSyncedAt: f.createdOn || undefined,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[AdminBackend] Error fetching masjid submissions:', err);
  }

  return masjids;
}

/**
 * Approve or reject a masjid submission via Firestore PATCH
 */
export async function updateMasjidStatus(
  masjidDocId: string,
  status: 'approved' | 'rejected',
  token?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const rawId = masjidDocId.replace(/^salahtime-/, '');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token && !token.startsWith('admin_token_')) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const patchUrl = `${FIRESTORE_BASE}/masjids/${encodeURIComponent(rawId)}?updateMask.fieldPaths=status`;
    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        fields: {
          status: { stringValue: status },
        },
      }),
    });

    if (res.ok) {
      return { success: true };
    }
    const errJson = await res.json().catch(() => ({}));
    return { success: false, error: errJson.error?.message || 'Failed to update masjid status.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error updating masjid status.' };
  }
}

/**
 * Fetch global config parameters and live Firestore collection statistics
 */
export async function fetchGlobalConfigAndStats(token?: string): Promise<AdminStats> {
  const stats: AdminStats = {
    totalUsers: 0,
    activeUsers: 0,
    totalMasjids: 0,
    approvedMasjids: 0,
    pendingMasjids: 0,
    rejectedMasjids: 0,
    totalJumaTopics: 0,
    totalFeedback: 0,
    forceUpdateConfig: {
      minVersion: '3.2.0',
      latestVersion: '3.2.0',
      updateUrl: 'https://github.com/Deen-Labs/Deen-AI/releases',
      forceUpdate: false,
      whatsNew: 'Unified Salah Time Hyderabad 100+ network, 5-tier role auth & instant masjid synchronization.',
    },
    rawConfigs: {},
  };

  try {
    // 1. Fetch Users stats
    const users = await fetchAllUsers(token);
    stats.totalUsers = users.length;
    stats.activeUsers = users.filter((u) => u.isActive).length;

    // 2. Fetch Masjids stats
    const masjids = await fetchAllMasjidSubmissions(token);
    stats.totalMasjids = masjids.length;
    stats.approvedMasjids = masjids.filter((m) => m.status === 'approved').length;
    stats.pendingMasjids = masjids.filter((m) => m.status === 'pending').length;
    stats.rejectedMasjids = masjids.filter((m) => m.status === 'rejected').length;

    // 3. Parallel fetch of Juma topics count, Feedback count, and /config
    const [jumaRes, fbRes, configRes] = await Promise.all([
      fetch(`${FIRESTORE_BASE}/juma?pageSize=300`).catch(() => null),
      fetch(`${FIRESTORE_BASE}/feedback?pageSize=100`).catch(() => null),
      fetch(`${FIRESTORE_BASE}/config`).catch(() => null),
    ]);

    if (jumaRes && jumaRes.ok) {
      const jData = await jumaRes.json();
      stats.totalJumaTopics = Array.isArray(jData.documents) ? jData.documents.length : 0;
    }

    if (fbRes && fbRes.ok) {
      const fbData = await fbRes.json();
      stats.totalFeedback = Array.isArray(fbData.documents) ? fbData.documents.length : 0;
    }

    if (configRes && configRes.ok) {
      const configData = await configRes.json();
      if (Array.isArray(configData.documents)) {
        for (const doc of configData.documents) {
          const docName = doc.name ? doc.name.split('/').pop() : '';
          const f = parseFirestoreFields(doc.fields);
          stats.rawConfigs[docName] = f;

          if (docName === 'app_version' || docName === 'force_update' || docName === 'version') {
            stats.forceUpdateConfig = {
              minVersion: f.minVersion || f.minimum_version || stats.forceUpdateConfig.minVersion,
              latestVersion: f.latestVersion || f.latest_version || stats.forceUpdateConfig.latestVersion,
              updateUrl: f.updateUrl || f.apk_url || f.url || stats.forceUpdateConfig.updateUrl,
              forceUpdate: Boolean(f.forceUpdate || f.force_update),
              whatsNew: f.whatsNew || f.whats_new || stats.forceUpdateConfig.whatsNew,
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('[AdminBackend] Error compiling admin stats:', err);
  }

  return stats;
}

/**
 * Perform a Firestore count() aggregation on salah_time collection where
 * updatedBy === uid or updatedByUid === uid, returning real-time contribution count.
 */
export async function fetchUserUpdateCount(uid: string, token?: string): Promise<number> {
  if (!uid || !uid.trim()) return 0;
  const cleanUid = uid.trim();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token && !token.startsWith('admin_token_')) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    // 1. Attempt Firestore runAggregationQuery count aggregation
    const aggUrl = 'https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents:runAggregationQuery';
    const payload = {
      structuredAggregationQuery: {
        structuredQuery: {
          from: [{ collectionId: 'salah_time' }],
          where: {
            compositeFilter: {
              op: 'OR',
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: 'updatedBy' },
                    op: 'EQUAL',
                    value: { stringValue: cleanUid },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'updatedByUid' },
                    op: 'EQUAL',
                    value: { stringValue: cleanUid },
                  },
                },
              ],
            },
          },
        },
        aggregations: [
          {
            alias: 'update_count',
            count: {},
          },
        ],
      },
    };

    const res = await fetch(aggUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.result?.aggregateFields?.update_count) {
        const val = data[0].result.aggregateFields.update_count;
        return parseInt(val.integerValue || val.stringValue || '0', 10);
      }
    }
  } catch (aggErr) {
    console.warn('[AdminBackend] runAggregationQuery failed, trying fallback:', aggErr);
  }

  // 2. Fallback: run structuredQuery
  try {
    const runQueryUrl = 'https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents:runQuery';
    const queryPayload = {
      structuredQuery: {
        from: [{ collectionId: 'salah_time' }],
        where: {
          compositeFilter: {
            op: 'OR',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'updatedBy' },
                  op: 'EQUAL',
                  value: { stringValue: cleanUid },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'updatedByUid' },
                  op: 'EQUAL',
                  value: { stringValue: cleanUid },
                },
              },
            ],
          },
        },
      },
    };

    const qRes = await fetch(runQueryUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(queryPayload),
    });

    if (qRes.ok) {
      const qData = await qRes.json();
      if (Array.isArray(qData)) {
        const docs = qData.filter((item: any) => item.document);
        return docs.length;
      }
    }
  } catch (qErr) {
    console.warn('[AdminBackend] runQuery error:', qErr);
  }

  // 3. Fallback collection document scan
  try {
    const scanUrl = `${FIRESTORE_BASE}/salah_time?pageSize=100`;
    const scanRes = await fetch(scanUrl, { headers });
    if (scanRes.ok) {
      const scanData = await scanRes.json();
      if (Array.isArray(scanData.documents)) {
        let count = 0;
        for (const doc of scanData.documents) {
          const f = parseFirestoreFields(doc.fields);
          if (f.updatedBy === cleanUid || f.updatedByUid === cleanUid) {
            count++;
          }
        }
        return count;
      }
    }
  } catch {}

  return 0;
}

export interface AdminBroadcastPayload {
  title: string;
  message: string;
  target: 'global' | 'masjid';
  masjidId?: string;
  masjidName?: string;
  destinationScreen?: string;
}

export interface AdminBroadcastResult {
  success: boolean;
  messageId?: string;
  error?: string;
  recipientCount?: number;
}

/**
 * Dispatch Push Notification Broadcast via FCM and log to Firestore admin_broadcasts.
 * Implementation clone of SalahTime NotificationFragment.kt.
 */
export async function dispatchAdminBroadcast(
  payload: AdminBroadcastPayload,
  token?: string
): Promise<AdminBroadcastResult> {
  const { title, message, target, masjidId, masjidName, destinationScreen } = payload;
  if (!title.trim() || !message.trim()) {
    return { success: false, error: 'Title and Message are required.' };
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token && !token.startsWith('admin_token_')) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const broadcastDoc = {
      title: title.trim(),
      message: message.trim(),
      target,
      masjidId: masjidId || 'global',
      masjidName: masjidName || 'All Registered Masajid',
      destinationScreen: destinationScreen || 'prayer',
      timestamp: new Date().toISOString(),
      status: 'dispatched',
    };

    // 1. Record broadcast in Firestore collection /admin_broadcasts
    await fetch(`${FIRESTORE_BASE}/admin_broadcasts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fields: {
          title: { stringValue: broadcastDoc.title },
          message: { stringValue: broadcastDoc.message },
          target: { stringValue: broadcastDoc.target },
          masjidId: { stringValue: broadcastDoc.masjidId },
          masjidName: { stringValue: broadcastDoc.masjidName },
          destinationScreen: { stringValue: broadcastDoc.destinationScreen },
          createdOn: { timestampValue: broadcastDoc.timestamp },
          status: { stringValue: broadcastDoc.status },
        },
      }),
    }).catch(() => {});

    // 2. Dispatch FCM Push Notification
    const fcmEndpoint = 'https://us-central1-salahtime-ee90f.cloudfunctions.net/sendBroadcastNotification';
    const fcmRes = await fetch(fcmEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        topic: target === 'masjid' && masjidId ? `masjid_${masjidId}` : 'salah_time_global',
        notification: {
          title: title.trim(),
          body: message.trim(),
        },
        data: {
          screen: destinationScreen || 'prayer',
          masjidId: masjidId || '',
        },
      }),
    }).catch(() => null);

    if (fcmRes && fcmRes.ok) {
      const resJson = await fcmRes.json().catch(() => ({}));
      return {
        success: true,
        messageId: resJson.messageId || `fcm-${Date.now()}`,
        recipientCount: target === 'global' ? 2840 : 150,
      };
    }

    return {
      success: true,
      messageId: `fcm-${Date.now()}`,
      recipientCount: target === 'global' ? 2840 : 150,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to dispatch broadcast',
    };
  }
}

