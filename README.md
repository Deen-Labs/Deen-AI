# Deen AI

Deen AI is an Islamic-focused AI assistant and digital wellness companion by **Deen Labs**. It combines proactive prayer reminders, daily dhikr & Quran/Hadith inspiration, halal content protection, and authentic Islamic Q&A powered by Retrieval-Augmented Generation (RAG).

---

## 🚀 Latest Release (v1.5.1 / v1.5.1i) - Performance, UI & Warm-Up Update

### ⚡ Background Warm-Up & Zero-Latency Screen Transitions
- **Concurrent Startup Pre-Fetch**: Background engine (`lib/backgroundWarmup.ts`) executes immediately upon app launch, querying prayer times and nearby masjids concurrently.
- **Instantaneous Tab Renders**: Pre-warmed in-memory singletons and persistent `AsyncStorage` caches allow navigation to the Prayer and Masjid tabs to render with zero loading spinners or network stalls (0ms transition).
- **Graceful Offline Fallbacks**: If location or network services are unavailable, cached coordinates and scheduled prayer timings ensure complete offline functionality.

### 📱 Streamlined 5-Tab Navigation
- **Optimized Tab Bar**: Simplified from 6 cramped tabs to 5 primary tabs (`Home`, `Prayer`, `Focus`, `Imam AI`, `Masjid`) utilizing crisp Feather vector icons.
- **Relocated Settings**: Moved the Settings screen out of the bottom bar into a dedicated, clean top-right icon on the dashboard header.

### 🕋 Real-Time Dashboard & Inspiration
- **Live Next Azan Ticker**: Dynamic countdown timer updating live every second to the next Salah.
- **Daily Ayah & Hadith Card**: Features Arabic calligraphy typography, English translation, source attribution, and a quick one-tap copy-to-clipboard action.
- **Protection Status Pill**: Visual status pill (`PROTECTED` / `OFFLINE`) with an emerald glow indicator when the native VPN/content protection shield is active.
- **Layout Polish**: Cleaned up overlapping floating action buttons and standardized card margins across device resolutions.

### 🗓️ Dual Gregorian & Hijri Prayer Experience
- **Bilingual Calendar Display**: Displays simultaneous Gregorian and Hijri dates (English `8 Jumada I, 1448 AH` + Arabic `٨ جمادى الأولى ١٤٤٨ هـ`).
- **Salah Countdown Hero**: Prominent hero card tracking exact hours, minutes, and seconds until the upcoming prayer.
- **Visual Daily Schedule**: Full timetable with bilingual labels, prayer status indicators, and contextual icons.

### 🤖 Imam AI & Focus Mode Enhancements
- **Quick Suggestion Chips**: Branded header and quick-tap prompt chips for instant answers to frequently asked Islamic questions.
- **Natural Language Focus Mode**: Voice or text commands to Imam AI (e.g. *"start focus mode for 15 minutes"*) parse custom durations and automatically route to an active Focus session.

### 🛡️ Native Security & Stability Fixes
- **Expo Go Android SDK Crash Guard**: Safeguarded `expo-notifications` against runtime null listener exceptions on Android devices running Expo Go.
- **Aggressive Content Filtering**: AccessibilityService and VPNService intercept prohibited search queries and app launches.
- **Uninstall PIN Lock**: Device settings interception prompts a strictly enforced 4-digit PIN screen, granting a 2-minute safety window for legitimate uninstalls.
- **Hidden Developer Menu**: Rapidly tap the Streak circle 7 times in the dashboard to access developer debugging tools (streak overrides) without requiring a separate dev build.
- **Standalone Android Packaging**: Fully configured native Gradle 8.13, Kotlin 2.0, and NDK 27.1 build pipeline for standalone release APKs.

---

## 📂 Monorepo Layout

- `mobile-app/` — React Native & Expo mobile application for Android & iOS.
- `frontend-web/` — Web landing page and interactive showcase (`deenlabs.tech`).
- `ai-engine/` — RAG pipeline, embeddings, and LLM connectors.
- `backend-data/` — Database schemas, ETL pipelines for Quran, Hadith, and Tafsir data.

---

## 🛠️ Tech Stack

- **Mobile Framework**: React Native (0.86.2), Expo (SDK 57), Expo Router (v57)
- **Styling**: NativeWind (Tailwind CSS v4)
- **Vector Icons**: Expo Vector Icons (Feather)
- **AI Core**: Google Gemini API & Local LLMs
- **Native Android Security**: Custom `AccessibilityService` and `VpnService`
- **Build Tools**: Gradle 8.13, Android SDK 36, NDK 27.1.12297006, Java 21 LTS

---

## 💻 Local Setup & Development

### Mobile App (`mobile-app/`)
1. Ensure **Node.js ≥ 20** and **Java 21 LTS** are installed.
2. Navigate to the mobile app directory:
   ```bash
   cd mobile-app
   npm install
   ```
3. Start the Expo development server:
   ```bash
   npx expo start
   ```
4. Build the standalone Android APK:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
   The generated release APK is located at:
   `android/app/build/outputs/apk/release/app-release.apk`

---

## 🌿 Git Workflow

- **`main`**: Production-ready branch. Protected.
- **`progress`**: Active feature integration and testing branch.
- Submit Pull Requests with at least 1 review prior to merging into `main`.
