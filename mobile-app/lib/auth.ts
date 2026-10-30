import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDefaultMasjidId, setDefaultMasjidId } from './defaultMasjid';

export type UserRole =
  | 'USER'
  | 'SUPER_USER'
  | 'SUPER_USER2'
  | 'ADMIN'
  | 'MUAZZIN'
  | 'IMAM'
  | 'PRESIDENT'
  | 'SECRETARY';

export type CommunityUserType = 'musalli' | 'imam' | 'muazzin' | 'president' | 'secretary';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  userType?: CommunityUserType;
  requestedRole?: UserRole;
  roleApprovalStatus?: 'approved' | 'pending' | 'rejected';
  masjidId?: string;
  masjidName?: string;
  defaultMasjidId?: string;
  isActive: boolean;
  createdOn: string;
  token?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  salahUpdateCount?: number;
  masjidsAddedCount?: number;
  updatedMasjidIds?: string[];
  totalPoints?: number;
}

export const USER_SESSION_KEY = '@deen_ai_user_session_v1';
export const IMAM_SESSION_KEY = '@deen_ai_imam_session_v1';

export const FIREBASE_AUTH_API_KEY =
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCcp4oS59N45Oeccmq07fnurLRS2bIuhIQ';
export const FIRESTORE_USERS_URL = 'https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents/users';

/**
 * Normalizes legacy role strings:
 * 'admin' / 'superadmin' -> 'ADMIN'
 * 'imam' -> 'IMAM'
 * 'muazzin' -> 'MUAZZIN'
 * 'president' / 'committee' / 'trustee' -> 'PRESIDENT'
 * default -> 'USER'
 */
export function normalizeUserRole(roleStr?: string | null): UserRole {
  if (!roleStr) return 'USER';
  const r = roleStr.trim().toLowerCase();
  if (r === 'admin' || r === 'superadmin') return 'ADMIN';
  if (r === 'super_user2' || r === 'superuser2') return 'SUPER_USER2';
  if (r === 'super_user' || r === 'superuser') return 'SUPER_USER';
  if (r === 'imam') return 'IMAM';
  if (r === 'muazzin') return 'MUAZZIN';
  if (r === 'president' || r === 'committee' || r === 'trustee') return 'PRESIDENT';
  if (r === 'secretary') return 'SECRETARY';
  return 'USER';
}

export function normalizeUserType(typeStr?: string | null, legacyRoleStr?: string | null): CommunityUserType {
  if (typeStr) {
    const t = typeStr.trim().toLowerCase();
    if (t === 'imam' || t === 'muazzin' || t === 'president' || t === 'secretary') {
      return t as CommunityUserType;
    }
    if (t === 'musalli' || t === 'user') return 'musalli';
  }
  if (legacyRoleStr) {
    const lr = legacyRoleStr.trim().toLowerCase();
    if (lr === 'imam') return 'imam';
    if (lr === 'muazzin') return 'muazzin';
    if (lr === 'president') return 'president';
    if (lr === 'secretary') return 'secretary';
  }
  return 'musalli';
}

export function getDisplayRoleLabel(user?: UserProfile | null): string {
  if (!user) return 'Guest';
  if (user.role === 'ADMIN') return 'Admin';
  const typeMap: Record<CommunityUserType, string> = {
    president: 'President',
    secretary: 'Secretary',
    imam: 'Imam',
    muazzin: 'Muazzin',
    musalli: user.role === 'SUPER_USER2' ? 'Area Coordinator' : user.role === 'SUPER_USER' ? 'Verified Updater' : 'Musalli',
  };
  if (user.userType && typeMap[user.userType]) {
    return typeMap[user.userType];
  }
  if (user.role === 'PRESIDENT') return 'President';
  if (user.role === 'SECRETARY') return 'Secretary';
  if (user.role === 'IMAM') return 'Imam';
  if (user.role === 'MUAZZIN') return 'Muazzin';
  if (user.role === 'SUPER_USER2') return 'Area Coordinator';
  if (user.role === 'SUPER_USER') return 'Verified Updater';
  return 'Musalli';
}

export function canManageMasjid(user?: UserProfile | null, targetMasjidId?: string): boolean {
  if (!user || !user.isActive) return false;
  if (user.role === 'ADMIN' || user.role === 'SUPER_USER2') return true;
  if (!targetMasjidId) return false;
  const clean = (s?: string) => (s || '').replace(/^salahtime-/, '').trim().toLowerCase();
  const cleanTarget = clean(targetMasjidId);
  const isAssigned = clean(user.masjidId) === cleanTarget || clean(user.defaultMasjidId) === cleanTarget;
  if (
    isAssigned &&
    (user.role === 'SUPER_USER' ||
     user.role === 'IMAM' ||
     user.role === 'MUAZZIN' ||
     user.role === 'PRESIDENT' ||
     user.role === 'SECRETARY')
  ) {
    return true;
  }
  return false;
}

/**
 * Check if a role has the required permissions.
 */
export function isAuthorizedRole(
  role?: UserRole | null,
  allowedRoles: UserRole[] = ['ADMIN', 'IMAM', 'MUAZZIN', 'PRESIDENT']
): boolean {
  if (!role) return false;
  return allowedRoles.includes(role);
}

/**
 * Check if the active user profile has authorized permissions.
 */
export function hasRole(user: UserProfile | null, allowedRoles: UserRole[]): boolean {
  if (!user || !user.isActive) return false;
  return allowedRoles.includes(user.role);
}

/**
 * Retrieve the currently logged in UserProfile from AsyncStorage.
 * Auto-refreshes Firebase ID token if expired using the stored refreshToken.
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_SESSION_KEY);
    if (!raw) return null;
    const profile: UserProfile = JSON.parse(raw);

    // Auto-refresh token if expired or about to expire in <= 2 minutes
    if (profile.refreshToken && profile.tokenExpiresAt && Date.now() > profile.tokenExpiresAt) {
      try {
        const refreshUrl = `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_AUTH_API_KEY}`;
        const res = await fetch(refreshUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(profile.refreshToken)}`,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.id_token) {
            profile.token = data.id_token;
            profile.refreshToken = data.refresh_token || profile.refreshToken;
            profile.tokenExpiresAt = Date.now() + (Number(data.expires_in || 3600) - 120) * 1000;
            await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(profile));

            // Sync with IMAM_SESSION_KEY if active
            const rawImam = await AsyncStorage.getItem(IMAM_SESSION_KEY);
            if (rawImam) {
              const imamObj = JSON.parse(rawImam);
              imamObj.token = data.id_token;
              await AsyncStorage.setItem(IMAM_SESSION_KEY, JSON.stringify(imamObj));
            }
          }
        }
      } catch (refreshErr) {
        console.warn('[Auth] Token refresh error:', refreshErr);
      }
    }

    return profile;
  } catch (err) {
    console.warn('[Auth] Error getting current user session:', err);
    return null;
  }
}

/**
 * Clear local user and imam sessions completely on Logout.
 */
export async function logoutUser(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([USER_SESSION_KEY, IMAM_SESSION_KEY]);
  } catch (err) {
    console.warn('[Auth] Error logging out user:', err);
  }
}

export interface SignUpParams {
  name: string;
  email: string;
  mobile: string;
  password: string;
  role?: UserRole;
  masjidId?: string;
  masjidName?: string;
}

/**
 * Register a new user in Firebase Auth & Firestore /users collection.
 * VULN-01 Fix: Regardless of requested role, ALWAYS assign role: 'USER' initially.
 * If privileged role requested, record requestedRole & roleApprovalStatus: 'pending'
 * and submit an approval request for Admins.
 */
export async function signUpUser(
  params: SignUpParams
): Promise<{ success: boolean; uid?: string; error?: string }> {
  const { name, email, mobile, password, role = 'USER', masjidId, masjidName } = params;

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanMobile = mobile.trim();
  const cleanPass = password.trim();

  if (!cleanName || cleanName.length < 2) {
    return { success: false, error: 'Please enter a valid full name (at least 2 characters).' };
  }
  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (!cleanMobile || cleanMobile.length < 10) {
    return { success: false, error: 'Please enter a valid 10-digit mobile number.' };
  }
  if (!cleanPass || cleanPass.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const requestedRole = normalizeUserRole(role);
  const actualRole: UserRole = 'USER'; // VULN-01: Privileged roles require Admin approval
  const isPendingApproval = requestedRole !== 'USER';

  try {
    // 1. Firebase Identity Toolkit accounts:signUp
    const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_AUTH_API_KEY}`;
    const authRes = await fetch(signUpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password: cleanPass,
        returnSecureToken: true,
      }),
    });

    const authData = await authRes.json();
    if (!authRes.ok) {
      const msg = authData.error?.message;
      if (msg === 'EMAIL_EXISTS') {
        return { success: false, error: 'An account with this email already exists. Please log in.' };
      }
      return { success: false, error: msg || 'Registration failed. Please verify your details.' };
    }

    const uid = authData.localId;
    const idToken = authData.idToken;
    const nowIso = new Date().toISOString();

    // 2. Create user document in Firestore: /users?documentId=${uid}
    const createDocUrl = `${FIRESTORE_USERS_URL}?documentId=${encodeURIComponent(uid)}`;
    const fields: Record<string, any> = {
      uid: { stringValue: uid },
      name: { stringValue: cleanName },
      email: { stringValue: cleanEmail },
      mobile: { stringValue: cleanMobile },
      role: { stringValue: 'user' },
      userType: { stringValue: 'musalli' },
      isActive: { booleanValue: true },
      status: { stringValue: 'active' },
      createdOn: { timestampValue: nowIso },
      masjidId: { stringValue: masjidId || '' },
      masjidName: { stringValue: masjidName || '' },
      defaultMasjidId: { stringValue: masjidId || '' },
    };

    if (isPendingApproval) {
      fields.requestedRole = { stringValue: requestedRole };
      fields.roleApprovalStatus = { stringValue: 'pending' };
    }

    await fetch(createDocUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ fields }),
    });

    // 3. Post a role-upgrade request document for Admin Dashboard visibility
    if (isPendingApproval) {
      const requestUrl = `https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents/requests`;
      await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fields: {
            type: { stringValue: 'ROLE_UPGRADE_REQUEST' },
            uid: { stringValue: uid },
            userName: { stringValue: cleanName },
            userEmail: { stringValue: cleanEmail },
            userMobile: { stringValue: cleanMobile },
            requestedRole: { stringValue: requestedRole },
            masjidId: { stringValue: masjidId || '' },
            masjidName: { stringValue: masjidName || '' },
            status: { stringValue: 'pending' },
            createdAt: { timestampValue: nowIso },
          },
        }),
      }).catch(() => {});
    }

    // Do NOT auto-login as active session; return success for redirection to login screen
    return { success: true, uid };
  } catch (err: any) {
    console.error('[Auth] SignUp error:', err);
    return { success: false, error: err?.message || 'Unable to connect to the authentication server.' };
  }
}

/**
 * Sign in user with Email or ID and Password.
 * Blocks deactivated accounts (isActive === false).
 * Normalizes roles and synchronizes USER and IMAM sessions.
 */
export async function loginUser(
  emailOrId: string,
  password: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const cleanInput = emailOrId.trim();
  const cleanPass = password.trim();

  if (!cleanInput || !cleanPass) {
    return { success: false, error: 'Please enter your registered Email / ID and Password.' };
  }

  const effectiveEmail = cleanInput.includes('@')
    ? cleanInput.toLowerCase()
    : `${cleanInput.toLowerCase()}@salahtime.org`;

  try {
    // 1. Authenticate with Firebase Auth
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_AUTH_API_KEY}`;
    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: effectiveEmail,
        password: cleanPass,
        returnSecureToken: true,
      }),
    });

    const authData = await authRes.json();
    if (!authRes.ok) {
      const msg = authData.error?.message;
      if (
        msg === 'INVALID_LOGIN_CREDENTIALS' ||
        msg === 'INVALID_PASSWORD' ||
        msg === 'EMAIL_NOT_FOUND'
      ) {
        return { success: false, error: 'Incorrect Email or Password. Please verify your credentials.' };
      }
      return { success: false, error: msg || 'Authentication failed. Please verify your credentials.' };
    }

    const uid = authData.localId;
    const idToken = authData.idToken;

    // 2. Fetch /users/{uid} from Firestore REST
    const userDocUrl = `${FIRESTORE_USERS_URL}/${encodeURIComponent(uid)}`;
    const userRes = await fetch(userDocUrl, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    let name = authData.displayName || effectiveEmail.split('@')[0];
    let mobile = '';
    let rawRole = 'user';
    let rawUserType = 'musalli';
    let requestedRole: UserRole | undefined;
    let roleApprovalStatus: 'approved' | 'pending' | 'rejected' | undefined;
    let masjidId = '';
    let masjidName = '';
    let defaultMasjidId = '';
    let isActive = true;
    let salahUpdateCount = 0;
    let masjidsAddedCount = 0;
    let updatedMasjidIds: string[] = [];
    let totalPoints = 0;
    let createdOn = new Date().toISOString();

    if (userRes.ok) {
      const userJson = await userRes.json();
      const f = userJson.fields || {};

      if (f.isActive?.booleanValue !== undefined) {
        isActive = f.isActive.booleanValue;
      } else if (f.status?.stringValue) {
        isActive = f.status.stringValue.toLowerCase() !== 'inactive' && f.status.stringValue.toLowerCase() !== 'disabled';
      }

      // Check active status
      if (isActive === false) {
        return {
          success: false,
          error: 'Your account has been deactivated by the administrator.',
        };
      }

      if (f.name?.stringValue) name = f.name.stringValue;
      if (f.mobile?.stringValue) mobile = f.mobile.stringValue;
      if (f.role?.stringValue) rawRole = f.role.stringValue;
      if (f.userType?.stringValue) rawUserType = f.userType.stringValue;
      if (f.requestedRole?.stringValue) requestedRole = normalizeUserRole(f.requestedRole.stringValue);
      if (f.roleApprovalStatus?.stringValue) roleApprovalStatus = f.roleApprovalStatus.stringValue as any;
      if (f.masjidId?.stringValue) masjidId = f.masjidId.stringValue;
      if (f.masjidName?.stringValue) masjidName = f.masjidName.stringValue;
      if (f.defaultMasjidId?.stringValue) defaultMasjidId = f.defaultMasjidId.stringValue;
      if (f.createdOn?.timestampValue) createdOn = f.createdOn.timestampValue;

      if (f.salahUpdateCount?.integerValue) salahUpdateCount = parseInt(f.salahUpdateCount.integerValue, 10);
      else if (typeof f.salahUpdateCount === 'number') salahUpdateCount = f.salahUpdateCount;

      if (f.masjidsAddedCount?.integerValue) masjidsAddedCount = parseInt(f.masjidsAddedCount.integerValue, 10);
      else if (typeof f.masjidsAddedCount === 'number') masjidsAddedCount = f.masjidsAddedCount;

      if (f.updatedMasjidIds?.arrayValue?.values) {
        updatedMasjidIds = f.updatedMasjidIds.arrayValue.values.map((v: any) => v.stringValue).filter(Boolean);
      } else if (Array.isArray(f.updatedMasjidIds)) {
        updatedMasjidIds = f.updatedMasjidIds;
      }

      if (f.totalPoints?.integerValue) {
        totalPoints = parseInt(f.totalPoints.integerValue, 10);
      } else if (typeof f.totalPoints === 'number') {
        totalPoints = f.totalPoints;
      } else {
        totalPoints = (masjidsAddedCount * 100) + (updatedMasjidIds.length * 50) + (salahUpdateCount * 10);
      }
    }

    const normalizedRole = normalizeUserRole(rawRole);
    const normalizedType = normalizeUserType(rawUserType, rawRole);

    const userProfile: UserProfile = {
      uid,
      name,
      email: effectiveEmail,
      mobile,
      role: normalizedRole,
      userType: normalizedType,
      requestedRole,
      roleApprovalStatus,
      masjidId: masjidId || undefined,
      masjidName: masjidName || undefined,
      defaultMasjidId: defaultMasjidId || masjidId || undefined,
      isActive: true,
      createdOn,
      token: idToken,
      refreshToken: authData.refreshToken || undefined,
      tokenExpiresAt: Date.now() + (Number(authData.expiresIn || 3600) - 120) * 1000,
      salahUpdateCount,
      masjidsAddedCount,
      updatedMasjidIds,
      totalPoints,
    };

    // Save to user session cache
    await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(userProfile));

    // VULN-04: Unify sessions: if privileged role, sync IMAM_SESSION_KEY; if USER, clear it
    if (normalizedRole !== 'USER') {
      const imamSession = {
        imamName: name,
        email: effectiveEmail,
        uid,
        masjidId: masjidId || defaultMasjidId || undefined,
        role: normalizedRole,
        token: idToken,
        loggedInAt: Date.now(),
      };
      await AsyncStorage.setItem(IMAM_SESSION_KEY, JSON.stringify(imamSession));
    } else {
      await AsyncStorage.removeItem(IMAM_SESSION_KEY);
    }

    // Sync default masjid if set
    if (userProfile.defaultMasjidId) {
      await setDefaultMasjidId(userProfile.defaultMasjidId);
    }

    return { success: true, user: userProfile };
  } catch (err: any) {
    console.error('[Auth] Login error:', err);
    return { success: false, error: err?.message || 'Unable to connect to authentication server.' };
  }
}

/**
 * Update user profile locally and via Firestore PATCH.
 * VULN-01 Fix: Strictly whitelist editable fields to prevent client-side role or status escalation.
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<UserProfile, 'name' | 'mobile' | 'defaultMasjidId' | 'masjidId' | 'masjidName'>>,
  token?: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  try {
    const current = await getCurrentUser();
    const updatedProfile: UserProfile = {
      uid,
      name: updates.name !== undefined ? updates.name : (current?.name || ''),
      email: current?.email || '',
      mobile: updates.mobile !== undefined ? updates.mobile : (current?.mobile || ''),
      role: current?.role || 'USER', // Role preserved; cannot be self-modified
      requestedRole: current?.requestedRole,
      roleApprovalStatus: current?.roleApprovalStatus,
      masjidId: updates.masjidId !== undefined ? updates.masjidId : current?.masjidId,
      masjidName: updates.masjidName !== undefined ? updates.masjidName : current?.masjidName,
      defaultMasjidId: updates.defaultMasjidId !== undefined ? updates.defaultMasjidId : current?.defaultMasjidId,
      isActive: current?.isActive ?? true,
      createdOn: current?.createdOn || new Date().toISOString(),
      token: token || current?.token,
      refreshToken: current?.refreshToken,
      tokenExpiresAt: current?.tokenExpiresAt,
      salahUpdateCount: current?.salahUpdateCount || 0,
      masjidsAddedCount: current?.masjidsAddedCount || 0,
      updatedMasjidIds: current?.updatedMasjidIds || [],
      totalPoints: current?.totalPoints || 0,
    };

    // Save locally
    await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedProfile));

    // If defaultMasjidId changed, sync it
    if (updates.defaultMasjidId !== undefined) {
      await setDefaultMasjidId(updates.defaultMasjidId);
    }

    // Strictly whitelist allowed Firestore patch fields
    const fields: Record<string, any> = {};
    const fieldPaths: string[] = [];

    if (updates.name !== undefined) {
      fields.name = { stringValue: updates.name };
      fieldPaths.push('name');
    }
    if (updates.mobile !== undefined) {
      fields.mobile = { stringValue: updates.mobile };
      fieldPaths.push('mobile');
    }
    if (updates.defaultMasjidId !== undefined) {
      fields.defaultMasjidId = { stringValue: updates.defaultMasjidId || '' };
      fieldPaths.push('defaultMasjidId');
    }
    if (updates.masjidId !== undefined) {
      fields.masjidId = { stringValue: updates.masjidId || '' };
      fieldPaths.push('masjidId');
    }
    if (updates.masjidName !== undefined) {
      fields.masjidName = { stringValue: updates.masjidName || '' };
      fieldPaths.push('masjidName');
    }

    if (fieldPaths.length > 0) {
      const effectiveToken = token || current?.token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (effectiveToken && !effectiveToken.startsWith('admin_token_')) {
        headers['Authorization'] = `Bearer ${effectiveToken}`;
      }

      const queryParams = fieldPaths.map((fp) => `updateMask.fieldPaths=${encodeURIComponent(fp)}`).join('&');
      const patchUrl = `${FIRESTORE_USERS_URL}/${encodeURIComponent(uid)}?${queryParams}`;

      await fetch(patchUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields }),
      });
    }

    return { success: true, user: updatedProfile };
  } catch (err: any) {
    console.error('[Auth] updateUserProfile error:', err);
    return { success: false, error: err?.message || 'Failed to update user profile.' };
  }
}

export async function updateCurrentUserPoints(pointsData: {
  salahUpdateCount?: number;
  masjidsAddedCount?: number;
  updatedMasjidIds?: string[];
  totalPoints?: number;
}): Promise<UserProfile | null> {
  try {
    const current = await getCurrentUser();
    if (!current) return null;
    const updated: UserProfile = {
      ...current,
      salahUpdateCount: pointsData.salahUpdateCount !== undefined ? pointsData.salahUpdateCount : (current.salahUpdateCount || 0),
      masjidsAddedCount: pointsData.masjidsAddedCount !== undefined ? pointsData.masjidsAddedCount : (current.masjidsAddedCount || 0),
      updatedMasjidIds: pointsData.updatedMasjidIds !== undefined ? pointsData.updatedMasjidIds : (current.updatedMasjidIds || []),
      totalPoints: pointsData.totalPoints !== undefined ? pointsData.totalPoints : (current.totalPoints || 0),
    };
    await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return null;
  }
}

/**
 * Submits a role upgrade request for an existing user (e.g. Musalli -> Imam, Muazzin, President, Secretary).
 * Updates /users/{uid} in Firestore, creates a request record in /requests, and updates local session.
 */
export async function requestRoleUpgrade(
  uid: string,
  requestedUserType: CommunityUserType,
  masjidId: string,
  masjidName: string,
  token?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const current = await getCurrentUser();
    const effectiveToken = token || current?.token;
    const nowIso = new Date().toISOString();

    // 1. Update user document in Firestore (/users/{uid})
    const patchUrl = `${FIRESTORE_USERS_URL}/${encodeURIComponent(uid)}?updateMask.fieldPaths=requestedRole&updateMask.fieldPaths=userType&updateMask.fieldPaths=roleApprovalStatus&updateMask.fieldPaths=masjidId&updateMask.fieldPaths=masjidName`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (effectiveToken && !effectiveToken.startsWith('admin_token_')) {
      headers['Authorization'] = `Bearer ${effectiveToken}`;
    }

    await fetch(patchUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        fields: {
          requestedRole: { stringValue: 'SUPER_USER' },
          userType: { stringValue: requestedUserType },
          roleApprovalStatus: { stringValue: 'pending' },
          masjidId: { stringValue: masjidId || '' },
          masjidName: { stringValue: masjidName || '' },
        },
      }),
    });

    // 2. Post request document to /requests
    const requestUrl = `https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents/requests`;
    await fetch(requestUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fields: {
          type: { stringValue: 'ROLE_UPGRADE_REQUEST' },
          uid: { stringValue: uid },
          userName: { stringValue: current?.name || 'Musalli' },
          userEmail: { stringValue: current?.email || '' },
          userMobile: { stringValue: current?.mobile || '' },
          requestedRole: { stringValue: 'SUPER_USER' },
          requestedUserType: { stringValue: requestedUserType },
          masjidId: { stringValue: masjidId || '' },
          masjidName: { stringValue: masjidName || '' },
          status: { stringValue: 'pending' },
          createdAt: { timestampValue: nowIso },
        },
      }),
    }).catch(() => {});

    // 3. Update local user session in AsyncStorage
    if (current) {
      const updated: UserProfile = {
        ...current,
        requestedRole: 'SUPER_USER',
        userType: requestedUserType,
        roleApprovalStatus: 'pending',
        masjidId: masjidId || current.masjidId,
        masjidName: masjidName || current.masjidName,
      };
      await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(updated));
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Auth] requestRoleUpgrade error:', err);
    return { success: false, error: err?.message || 'Failed to submit role upgrade request.' };
  }
}
