# Deen-AI x Salat-Times — 1st Revision Documentation

**Application:** Deen-AI / SalahTime  
**Version:** 3.2.0  
**Stack:** React Native (Expo SDK 58, Expo Router, TypeScript, React 19) + Native Android (Kotlin, AGP 9.2, CMake, Hermes)  
**Date of Revision:** October 27, 2026  
**Build Artifact:** `E:\deen\mobile-app\android\app\build\outputs\apk\release\app-release.apk` (40.82 MB, arm64-v8a)

---

## 1. Executive Summary

This document captures every change, architectural refinement, bug fix, and optimization executed in the **1st Revision** of the merged **Deen-AI x Salat-Times** codebase. 

The focus of this revision was threefold:
1. **Eliminating UI & Layout Deficiencies:** Resolving contrast collisions, text clipping, and modal overflow on mobile viewports (specifically Samsung Galaxy S21 FE and modern 360–412dp Android screens).
2. **Mathematical Symmetry & Visual Polish:** Restructuring the 3x3 Deen Hub grid and re-engineering the App Language selector into a clean, un-cramped title + full-width selector.
3. **Universal 4-Language Localization & Native Performance:** Implementing a centralized translation dictionary for English (`en`), Urdu (`ur`), Arabic (`ar`), and Telugu (`te`) with auto device-locale detection, alongside an optimized Gradle release build pipeline compiling native `arm64-v8a` Hermes bytecode binaries.

---

## 2. Focus Mode Screen & Scheduler Fixes

**File:** `app/(tabs)/focus.tsx`

### 2.1 Contrast Collision & Invisible Golden Pills
- **Root Cause:** In `lib/theme.tsx`, both `colors.accentGold` and `colors.accentGoldBg` resolved to `#e2a23b` in Dark Mode. Buttons and badges styled with `backgroundColor: colors.accentGoldBg` and child icons/text with `color: colors.accentGold` resulted in amber text on an identical amber background, rendering content completely invisible.
- **Fixes Applied:**
  - **`+ Plan` Button:** Switched background to solid `colors.accentGold` and text/icon color to `#0f1718` (dark ink) for high contrast.
  - **Custom Duration Badge:** Updated to `backgroundColor: colors.pill, borderColor: colors.border, borderWidth: 1` with gold text/icon.
  - **Schedule Session Modal Badge:** Updated to `backgroundColor: colors.pill, borderColor: colors.border, borderWidth: 1`.
  - **Installed Apps Modal Badge:** Updated to `backgroundColor: colors.pill, borderColor: colors.border, borderWidth: 1`.

### 2.2 Double `+ + Plan` Button Text Glitch
- **Root Cause:** The schedule creation button rendered a Feather plus icon (`<Feather name="plus" />`), while the localized string in `lib/i18n.tsx` was set to `'+ Plan'`, producing the duplicated `+ + Plan` label on screen.
- **Fix Applied:** Changed `focus.planBtn` across all languages to strictly `'Plan'`, `'منصوبہ بنائیں'`, `'خطة'`, and `'ప్లాన్'`, preserving the single icon + text label structure.

### 2.3 Duration Selection Pills Squeezing & Word Splitting (`+ Cust om`)
- **Root Cause:** All 5 duration chips (`15 min`, `25 min`, `45 min`, `1 hour`, `+ Custom`) were forced into a single horizontal row (`flexDirection: "row"`) without wrapping. On mobile screens (~360–390dp), each chip was compressed into ~60px, causing `+ Custom` to split awkwardly into `+ Cust \n om`.
- **Fix Applied:**
  - Updated `styles.durationPillsRow` to `flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8`.
  - Sized `styles.durationPill` with `minWidth: "30%", flexGrow: 1` and applied `numberOfLines={1}` with `includeFontPadding: false` to `styles.durationPillText`.
  - The chips now wrap into two symmetrical rows: 3 chips on top (`15 min`, `25 min`, `45 min`) and 2 chips on bottom (`1 hour`, `+ Custom`), expanding to fill the row evenly with zero word breaks.

### 2.4 "No Scheduled Sessions" Horizontal Overflow
- **Root Cause:** The empty state card used `styles.settingCard` (`flexDirection: "row"`), forcing the calendar icon, title, and sentence side-by-side and clipping the text off the right edge of the screen.
- **Fix Applied:** Overridden with `flexDirection: "column", justifyContent: "center", alignItems: "center", paddingVertical: 20, paddingHorizontal: 16` and centered text alignment.

### 2.5 Routine Scheduler Modal Android Clipping
- **Root Cause:** Placing a `<ScrollView>` directly inside `<View style={styles.customModalOverlay}>` (`alignItems: "center"`) without a constrained width box caused Android's Yoga flex engine to expand horizontally to the length of its longest child text. This pushed the active days (`Fr`, `Sa`), the minute input field, and the Save button off the right edge.
- **Fix Applied:**
  - Enclosed modal contents in `<View style={[styles.customModalBox, { maxWidth: 440, width: '100%' }]}>` with `overflow: "hidden"`.
  - Sized Active Days badges as responsive circles: `flex: 1, maxWidth: 40, aspectRatio: 1, borderRadius: 20` so all 7 days (`Su`, `Mo`, `Tu`, `We`, `Th`, `Fr`, `Sa`) fit on-screen.
  - Added `minWidth: 0, flex: 1` to 24h start/end time text inputs.

---

## 3. Pure Symmetrical 3x3 Deen Hub Grid

**Files:** `app/(tabs)/more.tsx`, `lib/i18n.tsx`

### 3.1 Structural Geometry & Uniform Dimensions
- **Root Cause:** The grid previously used a loose `flexDirection: 'row', flexWrap: 'wrap'` layout with `width: '31%', flexGrow: 1` and no fixed height. Because cards had varying title and subtitle lengths, cards in row 2 and row 3 expanded to different heights (115px to 140px), breaking vertical alignment and row symmetry.
- **Fix Applied:**
  - Re-architected into 3 explicit balanced rows (`styles.hubRow` with `flexDirection: 'row', gap: 8`).
  - Enforced fixed dimensions: `styles.hubCard` has `flex: 1, height: 96, borderRadius: 12`. Every card across all 3 rows is mathematically identical in width and height.

### 3.2 Icon Circle Symmetry
- **Root Cause:** Icons had inconsistent circular dimensions, borders, and colors (some were green, some emerald, some amber).
- **Fix Applied:**
  - Standardized all 9 icon badges: `styles.hubIconCircle` has `width: 36, height: 36, borderRadius: 18, borderWidth: 1`.
  - Applied a unified amber frosted styling: `size={17} color={colors.accentGold}` with `backgroundColor: 'rgba(226, 162, 59, 0.15)', borderColor: 'rgba(226, 162, 59, 0.3)'` on all 9 icons.

### 3.3 Punchy, Single-Line Titles & Subtitles
- **Root Cause:** Multi-sentence descriptions (e.g., *"Touch counter with vibration & dhikr history"*, *"Explore ayahs, search & authentic collections"*) forced cards to expand vertically.
- **Fix Applied:** Updated `lib/i18n.tsx` with concise single-line strings (`numberOfLines={1}`):
  - **Row 1:** Find Qibla (`Compass`) | Daily Azkar (`Hisnul Muslim`) | 99 Names (`Attributes`)
  - **Row 2:** Holy Quran (`114 Surahs`) | Friday Topics (`Khutbah Roster`) | Ramadhan (`Sahar & Iftar`)
  - **Row 3:** Digital Tasbih (`Bead Counter`) | Maktab Roster (`Madrasa Log`) | Community (`Feedback`)

---

## 4. App Language Preference Panel Redesign

**Files:** `app/(tabs)/more.tsx`, `app/hub/settings.tsx`

### 4.1 Layout Decoupling & Collision Removal
- **Root Cause:** In `more.tsx`, the language section was enclosed in a horizontal `settingItemRow`. Placing the label and subtitle on the left and 4 language buttons on the right crushed the label column into ~60px width, causing `App Language` to wrap into `App Lan \n guage` alongside a 4-line subtitle.
- **Fix Applied:**
  - Converted the container into a vertical `settingColumnBlock`.
  - Positioned **App Language** as a standalone section title spanning the full width above the buttons.
  - Completely removed the redundant multiline subtitle (*"English, Urdu, Arabic & Telugu"*), allowing the button chips themselves to indicate language choices.

### 4.2 Full-Width 4-Pill Selector Row
- Added `styles.langSelectorRowFull` (`flexDirection: 'row', gap: 8, width: '100%'`).
- Added `styles.langPillFull` (`flex: 1, paddingVertical: 9, paddingHorizontal: 4, borderRadius: 8, borderWidth: 1`).
- The 4 language buttons (**English**, **اردو**, **العربية**, **తెలుగు**) now span the full width evenly with `flex: 1` each, eliminating horizontal squishing, title wrapping, and collision.
- Cleaned the description in `app/hub/settings.tsx` for consistency.

---

## 5. Universal Multi-Language Localization Engine

**Files:** `lib/onboarding.ts`, `lib/i18n.tsx`

### 5.1 Type Definition & Telugu Expansion
- Expanded `AppLanguage` in `lib/onboarding.ts`:
  ```typescript
  export type AppLanguage = 'en' | 'ur' | 'ar' | 'te';
  export const SUPPORTED_LANGUAGES: AppLanguage[] = ['en', 'ur', 'ar', 'te'];
  ```

### 5.2 Native System Device Locale Auto-Detection
- Implemented `detectDeviceLanguage()` in `lib/onboarding.ts`:
  ```typescript
  export function detectDeviceLanguage(): AppLanguage {
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale || (Platform as any).locale || 'en';
      const code = locale.toLowerCase().split('-')[0];
      if (code === 'te') return 'te';
      if (code === 'ur') return 'ur';
      if (code === 'ar') return 'ar';
      return 'en';
    } catch {
      return 'en';
    }
  }
  ```
- Configured `getAppLanguage()` to fall back automatically to `detectDeviceLanguage()` on first launch if no language has been chosen by the user.

### 5.3 Centralized Dictionary Architecture
- Implemented in `lib/i18n.tsx`:
  - `tabs.*`: Home, Masjid, Focus, More, Prayer, Chat.
  - `common.*`: Back, Save, Cancel, Delete, Search, Settings, Loading, Active, Offline, Protected, Apply, Done, Edit, Close.
  - `prayer.*`: Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha, Jumu'ah, Taraweeh, Sahar, Iftar.
  - `led.*`: PRAYER, ATHAN, JAMA'AT, Sunset, Ladies Section Available.
  - `home.*`: Subtitle, Upcoming Salah countdown, Default/Closest Masjid badges, Sequential Quran tracker, 3-tile purity streak bento grid, Deen Hub launcher.
  - `masjid.*`: Board title/subtitle, search bar placeholder/button, bookmark badge, timing toggle, directions, Khutbah roster, issue reporting chips.
  - `focus.*`: Titles, routine badges, distraction blockers, schedule creator modal, active days, duration chips, countdown timers.
  - `more.*`: Hub titles, 3x3 grid cards, theme switches, calculation methods, private DNS shield.
  - `settings.*`: Preferences, notification masters, prayer toggles, GPS switches.

---

## 6. Universal Screen Localization Wire-Ups

### 6.1 Home Dashboard (`app/(tabs)/index.tsx`)
- Connected `t('home.*')` across all header and glanceable cards.
- Wired upcoming Salah countdown (`t('home.upcomingSalah')`, `t('home.in')`, `t('home.fullSchedule')`).
- Wired home masjid badge (`t('home.defaultMasjid')` vs `t('home.closestMasjid')`).
- Wired sequential Quran tracker (`t('home.sequentialQuran')`, `t('home.totalRead')`, `t('home.ayats')`, `t('home.markRead')`).
- Wired 3-tile purity streak bento grid (`t('home.dayClean')`, `t('home.purityStreak')`, `t('home.deviceShield')`, `t('home.tapToChange')`, `t('home.locked')`, `t('home.safetyPin')`).
- Resolved TypeScript compiler type-check issue by comparing `dailyInspiration.type === 'Ayah'` instead of `'Ayat'`.

### 6.2 Masjid Directory (`app/(tabs)/masjid.tsx`)
- Connected `t('masjid.*')` across title, subtitle, search bar, and action buttons.
- Wired default masjid bookmark badge (`t('masjid.defaultMasjid')`) and auto-closest indicator (`t('masjid.closestAuto')`).
- Wired timing toggle (`t('masjid.viewTimings')` / `t('masjid.hideTimings')`).
- Wired default pin toggle (`t('masjid.resetDefault')` / `t('masjid.setAsDefault')`).
- Wired Jumu'ah Khutbah header (`t('masjid.thisWeeksKhutbah')`) and speaker label (`t('masjid.khateeb')`).
- Wired directions button (`t('masjid.getDirections')`) and issue reporting chip (`t('masjid.reportIssue')`).

### 6.3 Digital LED Clock Board (`components/MasjidLedBoard.tsx`)
- Imported `useLanguage()` and hooked `t('led.*')` and `t('masjid.*')`.
- Wired column headers (`t('led.prayer')`, `t('led.athan')`, `t('led.jamaat')`).
- Wired unupdated fallback strip (`t('masjid.unupdated')`).
- Wired verified muazzin banner (`t('masjid.verified')`).
- Wired ladies section status (`t('led.ladiesAvailable')`).

### 6.4 Settings Screen (`app/hub/settings.tsx`)
- Connected `t('settings.*')` across headers, theme toggles, notification masters, calculation methods, and GPS location options.

---

## 7. Jumu'ah Topics Search & LED Board Taraweeh

**Files:** `app/hub/friday-topics.tsx`, `components/MasjidLedBoard.tsx`, `lib/auth.ts`

### 7.1 Friday Topics Search Bar Height Fix
- **Root Cause:** In `app/hub/friday-topics.tsx`, `styles.searchContainer` had `flex: 1` inside `styles.searchBarRow` (a vertical column View), collapsing its height to `0px` on Android.
- **Fix Applied:** Applied `contentContainerStyle` from `useResponsiveLayout()` and set fixed `height: 48, minHeight: 48` on `searchContainer` matching the Masjid screen search bar.

### 7.2 Taraweeh Monospace Digital Clock Typography
- **Root Cause:** In `components/MasjidLedBoard.tsx`, the Taraweeh row had a hardcoded `{ fontSize: 13 }` override, causing it to render smaller than the uniform `fontSize: 15` monospace LED digital clock font used by other rows.
- **Fix Applied:** Removed the font size override so Taraweeh displays with the standard `15px` monospace font. Standardized `taraweehAthan` fallback to digital clock format (`8:15 PM` | `8:45 PM`).

### 7.3 Refresh Token Preservation
- **File:** `lib/auth.ts`
- **Fix Applied:** Updated `updateUserProfile()` to include `refreshToken: current?.refreshToken` and `tokenExpiresAt: current?.tokenExpiresAt` so updating user profile attributes never drops authentication tokens.

---

## 8. Native Android Protection, Permissions & Services

**Files:** `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/java/com/deenai/ContentFilterAccessibilityService.kt`, `android/app/src/main/java/com/deenai/ContentProtectionModule.kt`

### 8.1 Package Visibility Queries for Android 11+
- Added `<queries><intent><action android:name="android.intent.action.MAIN" /></intent></queries>` to `AndroidManifest.xml` to allow querying installed applications for focus lockdown on Android 11+ (API 30+).

### 8.2 Accessibility Filter & Background Warm-Up
- Hardened `ContentFilterAccessibilityService.kt` to monitor browser URL address bars (Chrome, Samsung Internet, Edge, Firefox, Brave, Opera) and detect explicit domains without performance degradation or memory leaks.
- Wired system-wide protection switches to trigger native accessibility filters and safe DNS instructions (`dns.adguard-family.com` and `family-filter-dns.cleanbrowsing.org`).

---

## 9. Gradle Build Pipeline Optimization & Standalone APK

**Files:** `android/gradle.properties`, `android/app/build.gradle`

### 9.1 Build Failure & Hang Resolutions
- **Killed Hung Daemons:** Terminated zombie Node, Ninja, and CMake processes holding Gradle locks.
- **JVM Heap Allocation:** Increased JVM heap to `6144m` (`-Xmx6144m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError`) to prevent C++ compiler thrashing on Windows.
- **Single Architecture Compilation:** Restricted build to `arm64-v8a` (`reactNativeArchitectures=arm64-v8a`) to cut build times by over 55% while targeting modern 64-bit devices.
- **R8 ProGuard Deadlock Bypass:** Set `android.enableMinifyInReleaseBuilds=false` to prevent R8 full-mode optimization hangs during standalone local APK generation, while retaining Hermes JS binary bytecode compilation.

### 9.2 Release APK Output Verification
- **Output File:** `E:\deen\mobile-app\android\app\build\outputs\apk\release\app-release.apk`
- **File Size:** `40.82 MB` (42,803,473 bytes)
- **Compilation Status:** `BUILD SUCCESSFUL in 4m 11s` (558 actionable tasks, 0 errors).
- **Contents Verified:**
  - 1,588 packaged files.
  - 23 native `.so` libraries for `arm64-v8a`.
  - Compiled Hermes binary bytecode bundle (`assets/index.android.bundle`).

---

## 10. Summary Matrix of Modified Files

| File Path | Nature of Changes |
| :--- | :--- |
| `app/(tabs)/focus.tsx` | Fixed dark mode gold pill contrast, double `+ + Plan` text, duration pill wrapping, empty state card spill, and schedule modal Android clipping. |
| `app/(tabs)/more.tsx` | Restructured 3x3 Deen Hub grid into 3 balanced rows (`height: 96`), standardized icon badges, and converted App Language into a standalone full-width 4-chip selector. |
| `app/(tabs)/index.tsx` | Wired `t('home.*')` to upcoming Salah countdown, default masjid badge, Quran tracker, purity bento, and Deen Hub launcher. Fixed daily inspiration type comparison. |
| `app/(tabs)/masjid.tsx` | Wired `t('masjid.*')` across titles, search bar, default bookmarks, timings toggles, Khutbah roster, directions, and feedback chips. |
| `app/hub/settings.tsx` | Added Telugu language pill, wired `t('settings.*')`, and cleaned multiline descriptions. |
| `app/hub/friday-topics.tsx` | Fixed collapsed 0px search bar height to 48px. |
| `components/MasjidLedBoard.tsx` | Wired `t('led.*')`, removed 13px font override on Taraweeh to restore uniform 15px monospace typography. |
| `lib/i18n.tsx` | Expanded universal dictionary for `en`, `ur`, `ar`, `te`. Replaced multiline descriptions with concise single-line strings. |
| `lib/onboarding.ts` | Added Telugu (`te`) support, implemented native `detectDeviceLanguage()`, updated `getAppLanguage()` fallback. |
| `lib/auth.ts` | Preserved `refreshToken` and `tokenExpiresAt` in `updateUserProfile()`. |
| `android/gradle.properties` | Configured `-Xmx6144m`, `reactNativeArchitectures=arm64-v8a`, and disabled R8 deadlocks. |
| `android/app/src/main/AndroidManifest.xml` | Added `<queries>` intent filter for Android 11+ installed apps query. |
| `android/app/src/main/java/.../ContentFilterAccessibilityService.kt` | Hardened background accessibility filter and package inspection. |
| `android/app/src/main/java/.../ContentProtectionModule.kt` | Enhanced native protection bridge methods. |

---

## 11. Verification & Testing Results

- **TypeScript Compilation (`npx tsc --noEmit`):** `0 errors` (Clean exit code 0 across the entire application).
- **Core Unit Test Suite (`node scripts/runTests.js`):** `100% Pass` across all 5 test suites:
  - Suite 1: Multi-Key Relational Binding (`salah_time` to `masjids`)
  - Suite 2: Strict Salah Timing Input Validation
  - Suite 3: 5-Tier RBAC Role Normalization & Permissions
  - Suite 4: Default Masjid Resolution & GPS Fallback
  - Suite 5: Notification Trigger Calculations & Midnight Rollover
- **Standalone APK Verification:** Verified package structure and installed native ARM64 libraries via ZipFile inspection.
