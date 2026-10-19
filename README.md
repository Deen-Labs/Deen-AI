# Deen AI

Deen AI is an Islamic-focused AI assistant and digital wellness companion by **Deen Labs**. It combines proactive prayer reminders, daily dhikr & Quran/Hadith inspiration, halal content protection, and authentic Islamic Q&A powered by Retrieval-Augmented Generation (RAG).

---

## 🚀 Latest Release (v2.1.1) - Standalone Android Production Packaging, Multi-Session Imam AI & Qibla Compass

### 📦 Standalone Release Packaging (v2.1.1)
- **Direct Sideload Production APK (`Deen-AI-v2.1.1.apk`)**: Packaged standalone release APK pre-optimized with R8/Proguard, Hermes JavaScript bytecode compilation, and zero external dependency on Expo Go for immediate physical device installation.
- **Unified Website Distribution**: Integrated directly into the [Deen Labs](https://deenlabs.tech) showcase website with instant 1-click download (`Download App (v2.1.1)`).

### 💬 Multi-Session Client-Side Chat Engine
- **Independent Conversation Sessions**: Imam AI supports full multi-session chats stored securely on-device via `AsyncStorage` (`@deen_imam_chat_sessions_v1`). Users can start new conversations, switch between previous discussions without context overloading, and delete past sessions.
- **Auto-Generated Contextual Titles**: Each session automatically names itself from the user's initial inquiry (e.g. *"Tahajjud timings and rulings"*, *"Masjid Azizia direction"*).
- **Session History Drawer Modal**: Clean dark-emerald modal displays conversation titles, last-active timestamps, query counts, and delete actions.

### ⚡ String-Based Fast-Path Recall ($0 Token Cost & <300ms Latency)
- **Zero-Latency In-App Agent Actions**: Queries like *"start a focus timer for 10 mins"*, *"find Azizia masjid"*, *"what are today's prayer times"*, *"show my streak"*, or *"disable protection"* are intercepted directly via deterministic regex fast-paths and local APIs without invoking remote LLM tokens.
- **Strict Guardrail Direct Refusal**: Secular programming, coding, math, and homework queries are courteously declined instantly via on-device checks, preserving reverence and saving API quota.

### 🌐 High-Quota Cascading Gemini Hierarchy
- **Optimized Model Selection**: Tailored strictly to available Google Cloud API quota tiers:
  - **Primary Default**: `gemini-3.5-flash-lite` (500 Requests/Day, 15 RPM, 250K TPM)
  - **Tier 1 Fallback**: `gemini-3.1-flash-lite` (500 Requests/Day, 15 RPM, 250K TPM)
  - **Tier 2 Fallback**: `gemini-3-flash` (20 Requests/Day, 5 RPM)
  - **Tier 3 Fallback**: `gemini-2.5-flash` (20 Requests/Day, 5 RPM)
- **Automatic HTTP 429 Cascade**: If a model hits a rate or quota limit, requests cascade seamlessly down the hierarchy without error alerts.

### 🧭 Precision Qibla Compass Modal
- **Spherical Great-Circle Azimuth**: Calculates true bearing towards the Kaaba in Makkah (`21.422487° N, 39.826206° E`) from user's live GPS coordinates.
- **Interactive Compass Dial**: Dedicated dark-gold compass modal showing exact bearing (e.g. `292° WNW`), distance in km (`4,240 km`), and orientation dial.

### 📖 Daily Inspiration Panel (30-Day Non-Repeating FIFO)
- **Extensive Authenticated Library**: Authenticated library of 22+ Hadiths and Quranic Ayahs with verified references (Sahih al-Bukhari, Sahih Muslim, Sunan Abi Dawud, Surah Al-Baqarah, etc.).
- **30-Day Non-Repeating Persistence**: Tracks seen history in `AsyncStorage` (`@deen_daily_inspiration_v2`) so users never see repeats across a full month, with an instant refresh roll button.

---

## 📦 Previous Releases

### v1.5.3 - Multi-Session Imam AI & Fast-Path Engine
- Integrated on-device conversation drawer and session history persistence.
- Added regex deterministic in-app tool execution and strict Islamic guardrail refusal.
- Implemented cascading Gemini quota hierarchy (`gemini-3.5-flash-lite` ➔ `gemini-2.5-flash`).

### v1.5.2 - In-App Agent, Mandatory PIN Security & Ergonomic Focus Update
- **In-App Tool Execution**: Imam AI executes in-app tasks (Focus timers, Masjids) via command blocks.
- **Inline Masjid Cards**: Renders interactive cards with distance, address, and Google Maps turn-by-turn navigation.
- **Mandatory PIN Security**: System-Wide Protection requires 4-digit PIN setup before activation.
- **Focus Screen Ergonomic Overhaul**: Unionized hero dial fitting above the fold on all screen sizes.
- **1km Walking Radius Query**: Rapid Overpass OSM queries scoped to 1000m around live GPS.
- **7-Minute Pre-Prayer Notifications**: Exact 7-minute offset restricted strictly to 5 daily prayers.

### v1.5.1 / v1.5.1i - Performance, UI & Warm-Up Update
- **Concurrent Startup Pre-Fetch**: Background engine (`lib/backgroundWarmup.ts`) executes immediately upon launch for 0ms transitions.
- **Streamlined 5-Tab Navigation**: `Home`, `Prayer`, `Focus`, `Imam AI`, `Masjid` with clean top-right settings shortcut.
- **Dual Calendar**: Simultaneous Gregorian and Hijri date displays with next Azan live ticker.
- **Uninstall PIN Lock**: Device settings interception prompts a strictly enforced 4-digit PIN screen.

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
