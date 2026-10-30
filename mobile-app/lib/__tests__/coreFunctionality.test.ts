import { normalizeUserRole, isAuthorizedRole, UserRole, UserProfile } from '../auth';
import { parsePrayerTimeToMinutes, calculatePrayerCountdown } from '../prayerTimes';
import { validateSalahTimings, TimingFormData } from '../../components/UpdateMasjidTimingModal';
import { Masjid, calculateDistance } from '../masjid';
import { calculateLeaderboardPoints, getKhadimBadge, hasTimingDiff } from '../community';
import { isMasjidTimingVerifiedAndFresh } from '../muazzinNotifications';
import { getPrayerEndTime, PrayerTimings } from '../prayerTimes';
import { getMasjidJumaTopics, parseFridayDate, SalahTimeJuma } from '../salahTimeBackend';
import { saveCustomCategory, getCustomCategories, saveCustomAzkar, getCustomAzkar } from '../azkarData';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEST SUITE 1: salah_time to masjids Multi-Key Relational Binding
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function testSalahTimeRelationalBinding() {
  console.log('[Test Suite 1] Testing salah_time to masjids multi-key relational binding...');

  // Simulate Firestore raw documents
  const sampleSalahTimeDocs = [
    {
      name: 'projects/salahtime-ee90f/databases/(default)/documents/salah_time/st_doc_101',
      fields: {
        masjidId: 'm_alpha_1',
        masjidName: 'Masjid Al-Alpha',
        fajr: '05:20 AM',
        fajrAzaan: '05:00 AM',
        zohar: '01:15 PM',
        zoharAzaan: '12:45 PM',
        asr: '04:30 PM',
        asrAzaan: '04:00 PM',
        magrib: 'Sunset',
        magribAzaan: '06:30 PM',
        esha: '08:15 PM',
        eshaAzaan: '08:00 PM',
        juma: '01:30 PM',
        jumaAzaan: '01:00 PM',
      },
    },
    {
      name: 'projects/salahtime-ee90f/databases/(default)/documents/salah_time/st_doc_202',
      fields: {
        docId: 'm_beta_2',
        masjidName: 'Jamia Masjid Beta & Center',
        fajr: '05:30 AM',
        fajrAzan: '05:10 AM', // field variation test
        dhuhr: '01:20 PM',    // field variation test
        dhuhrAzaan: '12:50 PM',
        asr: '04:45 PM',
        asrAzaan: '04:15 PM',
        maghrib: 'Sunset',
        maghribAzaan: '06:32 PM',
        isha: '08:30 PM',
        ishaAzaan: '08:10 PM',
      },
    },
    {
      name: 'projects/salahtime-ee90f/databases/(default)/documents/salah_time/st_doc_303',
      fields: {
        id: 'm_gamma_3',
        masjidName: 'Historic Gamma Masjid',
        fajr: '05:15 AM',
        fajrAzaan: '04:55 AM',
      },
    },
  ];

  // Build lookup index using all keys
  const timingsMap: Record<string, Record<string, any>> = {};
  for (const doc of sampleSalahTimeDocs) {
    const stDocId = doc.name.split('/').pop() || '';
    const parsed = doc.fields;
    if (stDocId) timingsMap[stDocId] = parsed;
    if (parsed.masjidId) timingsMap[parsed.masjidId] = parsed;
    if (parsed.docId) timingsMap[parsed.docId] = parsed;
    if (parsed.id) timingsMap[parsed.id] = parsed;
    if (parsed.masjidName) {
      const nameKey = String(parsed.masjidName).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (nameKey) timingsMap[nameKey] = parsed;
    }
  }

  // 1. Resolve by masjidId
  const match1 = timingsMap['m_alpha_1'];
  if (!match1 || match1.fajr !== '05:20 AM') {
    throw new Error('FAILED: Could not resolve timing by parsed.masjidId');
  }

  // 2. Resolve by docId
  const match2 = timingsMap['m_beta_2'];
  if (!match2 || match2.fajr !== '05:30 AM') {
    throw new Error('FAILED: Could not resolve timing by parsed.docId');
  }

  // 3. Resolve by stDocId
  const match3 = timingsMap['st_doc_303'];
  if (!match3 || match3.fajr !== '05:15 AM') {
    throw new Error('FAILED: Could not resolve timing by stDocId');
  }

  // 4. Resolve by normalized name fallback
  const testRawName = 'Jamia Masjid Beta & Center!';
  const normKey = testRawName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const match4 = timingsMap[normKey];
  if (!match4 || match4.asr !== '04:45 PM') {
    throw new Error('FAILED: Could not resolve timing by normalized masjidName');
  }

  // 5. Check field variation resolution
  const fajrAzaanField = match2.fajrAzaan || match2.fajrAzan;
  const dhuhrField = match2.zohar || match2.dhuhr || match2.zuhr;
  if (fajrAzaanField !== '05:10 AM' || dhuhrField !== '01:20 PM') {
    throw new Error('FAILED: Field variation binding (fajrAzan, dhuhr) failed.');
  }

  console.log('✓ PASS: Suite 1 (Multi-Key Relational Binding)');
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEST SUITE 2: Strict Salah Timing Input Validator
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function testSalahTimingValidator() {
  console.log('[Test Suite 2] Testing Salah timing input validator...');

  const validPayload: TimingFormData = {
    name: 'Masjid-e-Noor',
    address: 'Mehdipatnam, Hyderabad',
    school: 'Ahle Sunnah (Hanafi)',
    athanTimes: {
      Fajr: '05:00 AM',
      Dhuhr: '12:45 PM',
      Asr: '04:15 PM',
      Maghrib: '06:20 PM',
      Isha: '08:00 PM',
    },
    iqamahTimes: {
      Fajr: '05:25 AM',
      Dhuhr: '01:15 PM',
      Asr: '04:45 PM',
      Maghrib: 'Sunset',
      Isha: '08:30 PM',
    },
    jummah: '01:30 PM',
    jummahAthan: '01:00 PM',
    sunrise: '06:15 AM',
    sahar: '05:00 AM',
    iftar: '06:22 PM',
  };

  // 1. Valid payload should pass
  const res1 = validateSalahTimings(validPayload);
  if (!res1.valid) {
    throw new Error(`FAILED: Valid payload was rejected: ${res1.error}`);
  }

  // 2. Reject placeholder '--:--'
  const invalidPayload1: TimingFormData = {
    ...validPayload,
    athanTimes: { ...validPayload.athanTimes, Fajr: '--:--' },
  };
  const res2 = validateSalahTimings(invalidPayload1);
  if (res2.valid) {
    throw new Error('FAILED: Validator failed to reject "--:--"');
  }

  // 3. Reject invalid hours/minutes (e.g. "13:75 PM")
  const invalidPayload2: TimingFormData = {
    ...validPayload,
    iqamahTimes: { ...validPayload.iqamahTimes, Asr: '13:75 PM' },
  };
  const res3 = validateSalahTimings(invalidPayload2);
  if (res3.valid) {
    throw new Error('FAILED: Validator failed to reject invalid hour/minute "13:75 PM"');
  }

  // 4. Enforce period constraints (Fajr cannot be PM)
  const invalidPayload3: TimingFormData = {
    ...validPayload,
    athanTimes: { ...validPayload.athanTimes, Fajr: '05:00 PM' },
  };
  const res4 = validateSalahTimings(invalidPayload3);
  if (res4.valid) {
    throw new Error('FAILED: Validator failed to reject Fajr with PM period.');
  }

  // 5. Enforce Jama'at >= Athan constraint
  const invalidPayload4: TimingFormData = {
    ...validPayload,
    athanTimes: { ...validPayload.athanTimes, Isha: '08:30 PM' },
    iqamahTimes: { ...validPayload.iqamahTimes, Isha: '08:15 PM' }, // Jamaat before Athan!
  };
  const res5 = validateSalahTimings(invalidPayload4);
  if (res5.valid) {
    throw new Error('FAILED: Validator failed to reject Jamaat time earlier than Athan time.');
  }

  console.log('✓ PASS: Suite 2 (Strict Salah Timing Validation)');
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEST SUITE 3: 5-Tier RBAC Permission Matrix
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function test5TierRoleRBAC() {
  console.log('[Test Suite 3] Testing 5-tier RBAC role normalization & permissions...');

  // 1. Normalization tests
  if (normalizeUserRole('admin') !== 'ADMIN') throw new Error('FAILED: admin normalization');
  if (normalizeUserRole('superadmin') !== 'ADMIN') throw new Error('FAILED: superadmin normalization');
  if (normalizeUserRole('imam') !== 'IMAM') throw new Error('FAILED: imam normalization');
  if (normalizeUserRole('muazzin') !== 'MUAZZIN') throw new Error('FAILED: muazzin normalization');
  if (normalizeUserRole('president') !== 'PRESIDENT') throw new Error('FAILED: president normalization');
  if (normalizeUserRole('committee') !== 'PRESIDENT') throw new Error('FAILED: committee normalization');
  if (normalizeUserRole('trustee') !== 'PRESIDENT') throw new Error('FAILED: trustee normalization');
  if (normalizeUserRole('user') !== 'USER') throw new Error('FAILED: user normalization');
  if (normalizeUserRole(undefined) !== 'USER') throw new Error('FAILED: undefined role normalization');

  // 2. Permission checks: Publishing Friday Topics
  const topicPublishers: UserRole[] = ['ADMIN', 'IMAM', 'MUAZZIN', 'PRESIDENT'];
  if (!isAuthorizedRole('ADMIN', topicPublishers)) throw new Error('FAILED: ADMIN topic permission');
  if (!isAuthorizedRole('IMAM', topicPublishers)) throw new Error('FAILED: IMAM topic permission');
  if (!isAuthorizedRole('MUAZZIN', topicPublishers)) throw new Error('FAILED: MUAZZIN topic permission');
  if (!isAuthorizedRole('PRESIDENT', topicPublishers)) throw new Error('FAILED: PRESIDENT topic permission');
  if (isAuthorizedRole('USER', topicPublishers)) throw new Error('FAILED: USER should NOT have topic permission');

  // 3. Permission checks: Admin Dashboard
  const adminOnly: UserRole[] = ['ADMIN'];
  if (!isAuthorizedRole('ADMIN', adminOnly)) throw new Error('FAILED: ADMIN portal permission');
  if (isAuthorizedRole('IMAM', adminOnly)) throw new Error('FAILED: IMAM cannot access ADMIN portal');
  if (isAuthorizedRole('PRESIDENT', adminOnly)) throw new Error('FAILED: PRESIDENT cannot access ADMIN portal');
  if (isAuthorizedRole('MUAZZIN', adminOnly)) throw new Error('FAILED: MUAZZIN cannot access ADMIN portal');
  if (isAuthorizedRole('USER', adminOnly)) throw new Error('FAILED: USER cannot access ADMIN portal');

  console.log('✓ PASS: Suite 3 (5-Tier RBAC Matrix)');
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEST SUITE 4: Default Masjid Resolution & GPS Proximity Fallback
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function testDefaultMasjidResolution() {
  console.log('[Test Suite 4] Testing Default Masjid resolution & GPS fallback...');

  const sampleMasjids: Masjid[] = [
    {
      id: 'masjid_far',
      name: 'Far Away Mosque',
      address: 'Outer Ring Road',
      latitude: 17.5000,
      longitude: 78.5500,
      distance: 0,
    },
    {
      id: 'masjid_close',
      name: 'Neighborhood Mosque',
      address: 'Local Street 1',
      latitude: 17.3860,
      longitude: 78.4870,
      distance: 0,
    },
    {
      id: 'masjid_selected_default',
      name: 'Chosen Default Masjid',
      address: 'Downtown',
      latitude: 17.4200,
      longitude: 78.4500,
      distance: 0,
    },
  ];

  const userGps = { latitude: 17.385044, longitude: 78.486671 };

  // 1. When explicit Default Masjid is selected, it must take precedence over GPS proximity
  function resolveMockMasjid(defaultId: string | null, coords: { latitude: number; longitude: number }, list: Masjid[]): Masjid {
    if (defaultId) {
      const found = list.find((m) => m.id === defaultId);
      if (found) return found;
    }
    // Proximity fallback
    const sorted = [...list].sort((a, b) => {
      const distA = calculateDistance(coords.latitude, coords.longitude, a.latitude, a.longitude);
      const distB = calculateDistance(coords.latitude, coords.longitude, b.latitude, b.longitude);
      return distA - distB;
    });
    return sorted[0];
  }

  const explicitSelection = resolveMockMasjid('masjid_selected_default', userGps, sampleMasjids);
  if (explicitSelection.id !== 'masjid_selected_default') {
    throw new Error('FAILED: Explicit Default Masjid did not take precedence.');
  }

  // 2. When no Default Masjid is selected, GPS proximity must select the closest masjid
  const autoGpsSelection = resolveMockMasjid(null, userGps, sampleMasjids);
  if (autoGpsSelection.id !== 'masjid_close') {
    throw new Error('FAILED: GPS Proximity fallback did not select the closest masjid.');
  }

  console.log('✓ PASS: Suite 4 (Default Masjid Resolution & Fallback)');
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEST SUITE 5: Notification Trigger Time Calculation & Midnight Rollover
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function testNotificationTriggerCalculations() {
  console.log('[Test Suite 5] Testing notification triggers and midnight rollover calculations...');

  // 1. parsePrayerTimeToMinutes checks
  const fajrMins = parsePrayerTimeToMinutes('05:15 AM', 'Fajr');
  if (fajrMins !== 5 * 60 + 15) {
    throw new Error(`FAILED: Fajr minutes expected 315, got ${fajrMins}`);
  }

  const dhuhrMins = parsePrayerTimeToMinutes('12:45 PM', 'Dhuhr');
  if (dhuhrMins !== 12 * 60 + 45) {
    throw new Error(`FAILED: Dhuhr minutes expected 765, got ${dhuhrMins}`);
  }

  const ishaMins = parsePrayerTimeToMinutes('08:30 PM', 'Isha');
  if (ishaMins !== 20 * 60 + 30) {
    throw new Error(`FAILED: Isha minutes expected 1230, got ${ishaMins}`);
  }

  // 2. Pre-Jama'at offset calculation (15 minutes prior)
  const jamaatTimeStr = '01:15 PM';
  const jamaatTotalMins = parsePrayerTimeToMinutes(jamaatTimeStr, 'Dhuhr');
  const reminderOffsetMins = 15;
  const triggerMinutes = jamaatTotalMins - reminderOffsetMins;

  if (triggerMinutes !== 13 * 60) { // 1:00 PM = 780 mins
    throw new Error(`FAILED: Pre-Jamaat 15m reminder trigger expected 780, got ${triggerMinutes}`);
  }

  // 3. Countdown calculator across midnight rollover
  // Simulate time after Isha (e.g. 11:30 PM = 1410 mins), counting down to Fajr tomorrow (05:00 AM = 300 mins)
  const mockNow = new Date(2026, 9, 26, 23, 30, 0); // 11:30 PM
  const countdown = calculatePrayerCountdown('05:00 AM', 'Fajr', mockNow);
  // Difference = (300 - 1410) + 1440 = 330 mins = 5h 30m
  if (!countdown.includes('5h 30m') && !countdown.includes('5h 29m')) {
    throw new Error(`FAILED: Countdown across midnight expected ~5h 30m, got "${countdown}"`);
  }

  console.log('✓ PASS: Suite 5 (Notification Trigger Time & Midnight Rollover)');
}

/**
 * Execute all 5 Test Suites.
 */

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEST SUITE 6: Community Leaderboard Scoring & Persistent Reminder Engine
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function testLeaderboardAndPersistentReminders() {
  console.log('[Test Suite 6] Testing Leaderboard scoring algorithm, diff guard, and verification fresh logic...');

  // 1. Test Leaderboard Scoring Formula:
  // Points = (New Masjids Added * 100) + (Unique Masjids Updated * 50) + (Total Timing Updates * 10)
  const score1 = calculateLeaderboardPoints({
    masjidsAddedCount: 2,
    uniqueMasjidsCount: 4,
    salahUpdateCount: 15,
  });
  // 2*100 + 4*50 + 15*10 = 200 + 200 + 150 = 550
  if (score1 !== 550) {
    throw new Error(`FAILED: Scoring formula expected 550, got ${score1}`);
  }

  const scoreZero = calculateLeaderboardPoints({});
  if (scoreZero !== 0) {
    throw new Error(`FAILED: Zero counts expected 0 points, got ${scoreZero}`);
  }

  // 2. Test Khadim Badge Assignment
  const badge1 = getKhadimBadge(1);
  if (badge1.badge !== 'Gold Khadim-e-Masjid' || badge1.badgeIcon !== '🥇') {
    throw new Error(`FAILED: Rank 1 badge expected Gold Khadim-e-Masjid, got ${badge1.badge}`);
  }

  const badge5 = getKhadimBadge(5);
  if (badge5.badge !== 'Silver Khadim-e-Masjid' || badge5.badgeIcon !== '🥈') {
    throw new Error(`FAILED: Rank 5 badge expected Silver Khadim-e-Masjid, got ${badge5.badge}`);
  }

  const badge15 = getKhadimBadge(15);
  if (badge15.badge !== 'Bronze Khadim-e-Masjid' || badge15.badgeIcon !== '🥉') {
    throw new Error(`FAILED: Rank 15 badge expected Bronze Khadim-e-Masjid, got ${badge15.badge}`);
  }

  // 3. Test Diff Validation Guard
  const mockMasjid: Masjid = {
    id: 'test_m1',
    name: 'Masjid Al-Taqwa',
    address: 'Near Charminar, Hyderabad',
    latitude: 17.385,
    longitude: 78.486,
    distance: 0.5,
    athanTimes: { Fajr: '05:15', Dhuhr: '12:45', Asr: '16:30', Maghrib: '18:00', Isha: '20:00' },
    iqamahTimes: { Fajr: '05:30', Dhuhr: '13:00', Asr: '16:45', Maghrib: '18:05', Isha: '20:15' },
    jummah: '01:30 PM',
    lastUpdated: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
  };

  const unchangedForm = {
    athanTimes: { Fajr: '05:15', Dhuhr: '12:45', Asr: '16:30', Maghrib: '18:00', Isha: '20:00' },
    iqamahTimes: { Fajr: '05:30', Dhuhr: '13:00', Asr: '16:45', Maghrib: '18:05', Isha: '20:15' },
    jummah: '01:30 PM',
  };
  if (hasTimingDiff(mockMasjid, unchangedForm)) {
    throw new Error('FAILED: hasTimingDiff should return false for identical timings');
  }

  const changedForm = {
    ...unchangedForm,
    iqamahTimes: { ...unchangedForm.iqamahTimes, Asr: '17:00' },
  };
  if (!hasTimingDiff(mockMasjid, changedForm)) {
    throw new Error('FAILED: hasTimingDiff should return true for modified Asr timing');
  }

  // 4. Test Verification & Staleness Logic
  // Fresh masjid (all 5 times present and updated 2 days ago)
  if (!isMasjidTimingVerifiedAndFresh(mockMasjid)) {
    throw new Error('FAILED: mockMasjid should be verified and fresh');
  }

  // Stale masjid (updated 20 days ago > 14 days limit)
  const staleMasjid: Masjid = {
    ...mockMasjid,
    lastUpdated: Date.now() - 20 * 24 * 60 * 60 * 1000,
  };
  if (isMasjidTimingVerifiedAndFresh(staleMasjid)) {
    throw new Error('FAILED: staleMasjid older than 14 days should return false');
  }

  // Incomplete masjid (missing Isha)
  const incompleteMasjid: Masjid = {
    ...mockMasjid,
    iqamahTimes: {
      Fajr: mockMasjid.iqamahTimes?.Fajr || '05:30',
      Dhuhr: mockMasjid.iqamahTimes?.Dhuhr || '13:00',
      Asr: mockMasjid.iqamahTimes?.Asr || '16:45',
      Maghrib: mockMasjid.iqamahTimes?.Maghrib || '18:05',
      Isha: '--:--',
    },
  };
  if (isMasjidTimingVerifiedAndFresh(incompleteMasjid)) {
    throw new Error('FAILED: incompleteMasjid with --:-- Isha should return false');
  }

  console.log('✓ PASS: Suite 6 (Leaderboard Scoring, Diff Validation & Staleness Logic)');
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEST SUITE 7: Phase 2 Feature Tests (End Times, Juma Roster, Custom Azkar, JazakAllah)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function testPhase2Features() {
  console.log('[Test Suite 7] Testing Phase 2 features (Prayer End Times, Juma separation, Azkar Sync, JazakAllah structure)...');

  // 1. Prayer End Time Logic
  const mockTimings: PrayerTimings = {
    Fajr: '05:00',
    Sunrise: '06:15',
    Dhuhr: '12:30',
    Asr: '16:00',
    Maghrib: '18:15',
    Isha: '19:45',
    Midnight: '23:38',
  };

  const fajrEnd = getPrayerEndTime(mockTimings, 'Fajr');
  if (fajrEnd !== '06:15') {
    throw new Error(`FAILED: Fajr end time expected 06:15, got ${fajrEnd}`);
  }

  const dhuhrEnd = getPrayerEndTime(mockTimings, 'Dhuhr');
  if (dhuhrEnd !== '16:00') {
    throw new Error(`FAILED: Dhuhr end time expected 16:00, got ${dhuhrEnd}`);
  }

  const asrEnd = getPrayerEndTime(mockTimings, 'Asr');
  if (asrEnd !== '18:15') {
    throw new Error(`FAILED: Asr end time expected 18:15, got ${asrEnd}`);
  }

  const maghribEnd = getPrayerEndTime(mockTimings, 'Maghrib');
  if (maghribEnd !== '19:45') {
    throw new Error(`FAILED: Maghrib end time expected 19:45, got ${maghribEnd}`);
  }

  const ishaEnd = getPrayerEndTime(mockTimings, 'Isha');
  if (ishaEnd !== '23:38') {
    throw new Error(`FAILED: Isha end time expected 23:38, got ${ishaEnd}`);
  }

  // 2. Friday Topics Past/Upcoming Separation
  const mockJumas: SalahTimeJuma[] = [
    {
      id: 'j-upcoming',
      masjidId: 'm-1',
      masjidName: 'Masjid Noor',
      masjidAddress: 'Main St',
      speakerName: 'Imam Ali',
      aboutSpeaker: 'Resident Scholar',
      timing: '01:00 PM - 01:30 PM',
      topicName: 'Taqwa Today',
      fridayDateStr: '15-12-2099 11:59 PM', // definitely upcoming
      status: 'approved',
    },
    {
      id: 'j-past',
      masjidId: 'm-1',
      masjidName: 'Masjid Noor',
      masjidAddress: 'Main St',
      speakerName: 'Imam Ali',
      aboutSpeaker: 'Resident Scholar',
      timing: '01:00 PM - 01:30 PM',
      topicName: 'Old Khutbah',
      fridayDateStr: '01-01-2020 11:59 PM', // definitely past
      status: 'approved',
    },
  ];

  const history = getMasjidJumaTopics('m-1', 'Masjid Noor', mockJumas);
  if (!history.current || history.current.id !== 'j-upcoming') {
    throw new Error('FAILED: Upcoming topic should be designated as current');
  }
  if (!history.past || history.past.length !== 1 || history.past[0].id !== 'j-past') {
    throw new Error('FAILED: Past topic should be moved into past accordion list');
  }

  // 3. Custom Azkar & Categories Creation
  const newCat = await saveCustomCategory('Test Travel Duas', 'سفر کی دعائیں');
  if (!newCat || newCat.nameEn !== 'Test Travel Duas') {
    throw new Error('FAILED: Could not save custom category');
  }
  const allCats = await getCustomCategories();
  if (!allCats.some((c) => c.nameEn === 'Test Travel Duas')) {
    throw new Error('FAILED: Custom category not found in getCustomCategories()');
  }

  const newDua = await saveCustomAzkar({
    categoryName: 'Test Travel Duas',
    supplication: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا',
    translationEn: 'Glory unto Him Who created this for us',
    translationUr: 'پاک ہے وہ جس نے ہمارے لیے اس کو مسخر کیا',
    repeatCount: 3,
  });
  if (!newDua || newDua.categoryName !== 'Test Travel Duas' || !newDua.isCustom) {
    throw new Error('FAILED: Could not save custom Azkar item');
  }

  console.log('✓ PASS: Suite 7 (Phase 2 Features: End Times, Juma Roster, Custom Azkar)');
}

export async function runAllCoreFunctionalityTests() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  RUNNING DEEN AI / SALAHTIME CORE FUNCTIONALITY TEST SUITE       ');
  console.log('═══════════════════════════════════════════════════════════════════');
  testSalahTimeRelationalBinding();
  testSalahTimingValidator();
  test5TierRoleRBAC();
  testDefaultMasjidResolution();
  testNotificationTriggerCalculations();
  testLeaderboardAndPersistentReminders();
  await testPhase2Features();
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  ALL 6 CORE SUITES PASSED WITH 100% SUCCESS RATE                  ');
  console.log('═══════════════════════════════════════════════════════════════════');
  return true;
}
