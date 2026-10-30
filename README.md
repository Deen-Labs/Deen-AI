# Deen AI & SalahTime (v3.3.0)

<div align="center">
  <h3>Unified Islamic Intelligence, Live Masjid Digital LED Clocks, & Halal Digital Well-Being</h3>
  <p><b>Production Release v3.3.0 • React Native & Expo SDK 58 • Android Old Architecture & New Fabric Compatible</b></p>
</div>

---

## 📖 Executive Summary & Architectural Overview

**Deen AI / SalahTime (v3.3.0)** is an enterprise-grade mobile application combining high-precision prayer calculation engines, community-verified masjid congregation timing boards, authentic multi-language Quranic and Hadith exploration, and device-wide spiritual protection.

Moving from legacy scattered routes into a unified **4-Tab Minimalist Architecture**, Deen AI v3.3.0 delivers sub-millisecond startup times, 100% offline-first resilience with background pre-warming, universal high-contrast Light/Dark theming across 25+ screens and modals, and authenticated 5-tier role-based masjid management.

---

## 🏛️ Monorepo Architecture & 4-Tab Navigation

Deen AI v3.3.0 reorganizes mobile navigation into 4 dedicated, focused root tabs (`mobile-app/app/(tabs)/_layout.tsx`), while deprecating legacy standalone tabs into the centralized **Deen More** hub.

```
mobile-app/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx           # 4 visible tabs: Home, Masjid, Focus, More (prayer/chat/settings hidden)
│   │   ├── index.tsx             # Tab 1: Home Dashboard & Mahmood Watch Co. LED Board
│   │   ├── masjid.tsx            # Tab 2: Nearby Masajid, Verified Muazzin Portal & Add Masjid
│   │   ├── focus.tsx             # Tab 3: Spiritual Focus Timer & App Blocker
│   │   └── more.tsx              # Tab 4: Unified Deen Hub & Localized Settings
│   ├── hub/
│   │   ├── quran-hadith-search.tsx # Deep 114-Surah Browser, Hadith Bank & Internet Archive
│   │   ├── friday-topics.tsx       # Searchable Jumu'ah Topics & Khutbah Roster
│   │   ├── azkar.tsx               # Morning & Evening Hisnul Muslim Dhikr with Tap Counter
│   │   ├── asma-ul-husna.tsx       # 99 Names of Allah with Audio & Meanings
│   │   ├── ramadhan.tsx            # 30-Day Ramadhan Fasting Timetable (Sahar & Iftar)
│   │   ├── tasbih.tsx              # Digital Tasbih with Target Presets & Session History
│   │   ├── madrasa.tsx             # Maktab Student Roster & Attendance Ledger
│   │   ├── community-feedback.tsx  # Community Masjid Reports & Feedback
│   │   └── admin-dashboard.tsx     # 5-Tier RBAC Approval & Management Console
│   └── auth/
│       ├── login.tsx               # Email / Mobile & Password Authentication
│       ├── signup.tsx              # Account Creation with Role Request & Onboarding Route
│       └── profile.tsx             # User Profile, Assigned Masjid & Security Settings
├── components/
│   ├── MasjidLedBoard.tsx          # Mahmood Watch Co. Replica Digital LED Timing Display
│   ├── FirstTimeWalkthroughModal.tsx # Interactive 4-Step Masjid & App Onboarding Guide
│   ├── UpdateMasjidTimingModal.tsx # Digital LED Board Editor with Muazzin Verification
│   ├── MuazzinLoginModal.tsx       # Fast-path Muazzin Passkey Authentication
│   ├── QiblaCompassModal.tsx       # Real-time Sensor Fusion Kaaba Compass
│   ├── PINModal.tsx                # Hardened SHA-256 PIN Shield with Rate Limiting
│   └── HubBottomBar.tsx            # 4-Tab Elevated Navigation Bar (Swipe-Gesture Safe)
└── lib/
    ├── quranData.ts                # 114 Surahs Metadata, Multi-Edition Caching & Hadith Bank
    ├── salahTimeBackend.ts         # Jumu'ah Khutbah History, President & Proximity Sorting
    ├── masjidTimingSync.ts         # Dual Firestore & Google Sheets Push Pipeline
    ├── prayerTimes.ts              # High-Precision Solar Calculation Engine
    ├── theme.tsx                   # High-Contrast Universal Semantic Theme Tokens
    └── auth.ts                     # 5-Tier RBAC Matrix & Token Auto-Refresh Engine
```

---

## 🌟 Major Highlights in v3.3.0

### 1. Reusable Mahmood Watch Co. Digital LED Board (`components/MasjidLedBoard.tsx`)
- **Authentic Physical Clock Replica**: Faithful digital representation of the iconic Mahmood Watch Co. prayer clocks found across Hyderabad, South Asia, and the Gulf.
- **Bi-Color Digit Illumination**: High-contrast glowing green digits (`#00ff66`) for Athan times and glowing red digits (`#ff2a2a`) for Jama'at congregation times.
- **Traditional Calligraphy Header**: Renders the Shahada (`لَا إِلٰهَ إِلَّا ٱللَّٰهُ مُحَمَّدٌ رَسُولُ ٱللَّٰهِ`) above the prayer matrix.
- **Unupdated Masjid Solar Fallback Banner**: When a newly added or unverified masjid lacks published Jama'at times, an amber/gold indicator notifies believers:
  > *Masjid Jama'at times not yet updated • Showing accurate Solar/API timings*
- **Muazzin Verification Badge**: Shows the verified green seal (`Verified by Muazzin 🕌`) once an authorized muazzin submits confirmed timings.
- **Universal Reusability**: Seamlessly embedded in both the **Home Screen** (`app/(tabs)/index.tsx`) and the **Masjid Screen** (`app/(tabs)/masjid.tsx`).

### 2. Deep Quran & Hadith Explorer (`app/hub/quran-hadith-search.tsx` & `lib/quranData.ts`)
- **114-Surah Browser**: Instant browsing of all 114 Surahs with Arabic calligraphy, transliteration, English meanings, verse counts, and Meccan/Medinan tags.
- **Complete Surah Reader with Offline Caching**:
  - Fetches complete Arabic text alongside multi-edition translations (`en.asad`, `ur.jalandhry`, `en.transliteration`) in a single network round-trip.
  - Automatically caches every loaded Surah in `AsyncStorage` under `@deen_surah_cache_v2_{number}` for permanent offline reading.
  - Instant translation toggles between English, Urdu, Transliteration, Hindi, and Telugu.
  - One-tap `"Bookmark Last Read"` verse saving.
- **Authentic 6-Book Hadith Collection Bank**:
  - Curated hadiths across *Sahih al-Bukhari*, *Sahih Muslim*, *Sunan Abu Dawud*, *Jami` at-Tirmidhi*, *Sunan an-Nasa'i*, and *Sunan Ibn Majah*.
  - Full Arabic text, English translation, authentic Urdu translation, narrator chains, chapter metadata, and authenticity pills (`Sahih`, `Hasan`).
  - Collection filter chips for instant segmented browsing.
- **Internet Archive Classical Islamic Library**:
  - Direct real-time search against `archive.org/advancedsearch.php` covering tens of thousands of verified public domain classical Islamic manuscripts, Hadith commentaries, and Tafsir volumes (e.g., *Tafsir Ibn Kathir*, *Fath al-Bari*, *Riyad as-Salihin*).
  - One-tap links opening full PDF and digital texts directly on Internet Archive.
- **114-Surah Audio Streaming**:
  - High-fidelity streaming of all 114 Surahs recited by Qari Mishary Rashid Alafasy via QuranicAudio CDN with secondary CDN failover.

### 3. Multi-Field Jumu'ah Search & Khutbah Roster (`app/hub/friday-topics.tsx`)
- **Multi-Field Live Querying**: Search across topic title, Khateeb name, Masjid name, Committee President, or neighborhood address.
- **Categorical Filter Chips**: Quickly isolate khutbahs `By Khateeb`, `By Masjid`, or `By President`.
- **Proximity & Freshness Ranking**: Masjids with freshly announced topics (within 7 days) and closest GPS proximity float to the top of the congregant's feed.
- **Historical Khutbah Archives**: Expands past topics (Y & Z) alongside current Friday topics (X).

### 4. Interactive Masjid Onboarding Walkthrough & Login Gate (`components/FirstTimeWalkthroughModal.tsx`)
- **4-Step Visual Onboarding Guide**:
  1. *Find or Pin Your Default Masjid*: Explains GPS auto-selection and how to pin a home masjid to the Home screen LED board.
  2. *Adding a Missing Masjid*: Shows how to tap `+ Add Missing Masjid`, auto-tag GPS coordinates, and register committee details.
  3. *Setting the Digital LED Timing Board*: Demonstrates how green Athan and red Jama'at digits function alongside solar fallbacks.
  4. *Muazzin, Imam & Committee Verification*: Details how authorized officials earn the verified seal.
- **Account Registration Onboarding Route**: Automatically invites newly registered users in `app/auth/signup.tsx` to view the walkthrough before navigating to the masjid directory.
- **Masjid Creation Login Gate**: Prompts unauthenticated guests to sign in or create a free account with direct access to view the onboarding walkthrough before submitting new masjids.

### 5. Unified Deen More Tab (`app/(tabs)/more.tsx`)
- **User Account & Role Banner**: Displays active session details, name, and 5-tier role badge (`USER`, `MUAZZIN`, `IMAM`, `PRESIDENT`, `ADMIN`).
- **Guide to Add Masjid Button**: Triggers the interactive masjid onboarding guide on demand.
- **Spiritual & Community Bento Grid**: High-contrast grid directing believers to Qibla Compass, Azkar, 99 Names, Quran & Hadith, Friday Topics, Ramadhan, Tasbih, Maktab, Community Feedback, and Admin Console.
- **Localized Settings Section**:
  - Theme mode selector: **Dark Mode**, **Light Mode**, and **System** (with high-contrast dynamic styling).
  - Language toggle: **English** and **Urdu**.
  - Salah calculation method selector: University of Islamic Sciences (Karachi), Muslim World League, ISNA, Umm al-Qura, Egyptian General Authority.
  - Salah notification alerts toggle.
  - 18+ Private DNS Halal protection guide, copyable hostname, and one-tap launcher for Android Network Settings.

---

## 🔒 Security Architecture & Content Protection

Deen AI incorporates multiple defensive layers protecting user privacy, app integrity, and spiritual digital well-being:

| Component | Defensive Mechanism | Implementation |
| :--- | :--- | :--- |
| **PIN Shield** | 10,000-round SHA-256 with 16-byte cryptographically random per-device salt | `lib/lock.ts` |
| **Brute-Force Guard** | Progressive lockout cooldowns (60s at 5 attempts, 120s at 10, 300s at 15+) | `components/PINModal.tsx` |
| **5-Tier RBAC** | Server-side Firestore claims and normalized client authorization matrix | `lib/auth.ts` |
| **Halal Shield** | System-wide Private DNS filter (`family-filter-dns.cleanbrowsing.org`) | `app/(tabs)/more.tsx` |
| **Native Accessibility** | Android `AccessibilityService` intercepting adult keywords & unauthorized app launches | `android/.../ContentFilterAccessibilityService.java` |
| **Anti-Tamper** | PackageInstaller detection preventing unauthorized uninstallation or service teardown | `lib/nativeContentProtection.ts` |

---

## 🚀 Getting Started & Development

### Prerequisites
- **Node.js**: v18+ (LTS recommended)
- **Package Manager**: npm or yarn
- **Expo CLI**: SDK 58 compatible
- **Android Studio / SDK**: Android SDK 34+ for native builds
- **Python**: 3.10+ (for backend synchronization utilities)

### Installation
```bash
# Clone the repository
git clone https://github.com/syedammar1/deen.git
cd deen/mobile-app

# Install project dependencies
npm install
```

### Running Locally
```bash
# Start the Expo development server with clear cache
npx expo start -c

# Run on connected Android device or emulator
npx expo run:android
```

### Verification & Testing
```bash
# Run TypeScript compilation check (0 errors required)
npx tsc --noEmit

# Run Core Functionality Test Suite (5/5 suites)
node scripts/runTests.js
```

---

## 📱 Tech Stack

- **Framework**: React Native 0.86, Expo SDK 58, Expo Router
- **Language**: TypeScript 5.9 (Strict mode enabled)
- **Styling**: NativeWind & Dynamic Semantic Theme Tokens (`lib/theme.tsx`)
- **Icons**: Expo Vector Icons (Feather)
- **Audio Engine**: `expo-audio` with CDN fallback failover (`lib/audioPlayer.ts`)
- **State & Storage**: React Hooks, `@react-native-async-storage/async-storage`
- **Backend & Cloud**: Google Cloud Firestore & Google Apps Script Webhooks
- **Sensors**: `expo-sensors` (Magnetometer & Accelerometer for Qibla Compass)
- **Testing**: Node.js automated test runner (`scripts/runTests.js`)

---

## 🤝 Community & Support

- **Organization**: Deen Labs
- **Official Website**: [https://deenlabs.tech](https://deenlabs.tech)
- **Feedback & Bug Reports**: Submit via the in-app Community Feedback hub (`/hub/community-feedback`) or open an issue on GitHub.
- **License**: Proprietary / All Rights Reserved © Deen Labs.
