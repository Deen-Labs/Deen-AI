# Deen AI

Deen AI is an Islamic-focused AI assistant and digital wellness companion by **Deen Labs**. It combines proactive prayer reminders, daily dhikr & Quran/Hadith inspiration, halal content protection, and authentic Islamic Q&A powered by Retrieval-Augmented Generation (RAG).

---

## 🚀 Latest Release (v1.5.3) - Multi-Session Imam AI, String Fast-Path Recall & Qibla Compass

### 💬 Multi-Session Client-Side Chat Engine
- **Independent Conversation Sessions**: Imam AI now supports full multi-session chats stored securely on-device via `AsyncStorage` (`@deen_imam_chat_sessions_v1`). Users can start new conversations, switch between previous discussions without context overloading, and delete past sessions.
- **Auto-Generated Contextual Titles**: Each session automatically names itself from the user's initial inquiry (e.g. *"Tahajjud timings and rulings"*, *"Masjid Azizia direction"*).
- **Session History Drawer Modal**: Clean dark-emerald modal displays conversation titles, last-active timestamps, query counts, and delete actions.

### ⚡ String-Based Fast-Path Recall ($0 Token Cost & <300ms Latency)
- **Zero-Latency In-App Agent Actions**: Queries like *"start a focus timer for 10 mins"*, *"find Azizia masjid"*, *"what are today's prayer times"*, *"show my streak"*, or *"disable protection"* are intercepted directly via deterministic regex fast-paths and local APIs without invoking the remote LLM.
- **Strict Guardrail Direct Refusal**: Secular programming, coding, math, and homework queries are courteously declined instantly via on-device checks, preserving reverence and saving API tokens.

### 🌐 High-Quota Cascading Gemini Hierarchy
- **Optimized Model Selection**: Tailored strictly to available Google Cloud API quota tiers:
  - **Primary Default**: `gemini-3.5-flash-lite` (500 Requests/Day, 15 RPM, 250K TPM)
  - **Tier 1 Fallback**: `gemini-3.1-flash-lite` (500 Requests/Day, 15 RPM, 250K TPM)
  - **Tier 2 Fallback**: `gemini-3-flash` (20 Requests/Day, 5 RPM)
  - **Tier 3 Fallback**: `gemini-2.5-flash` (20 Requests/Day, 5 RPM)
- **Automatic HTTP 429 Cascade**: If a model hits a rate or quota limit, requests cascade seamlessly down the hierarchy without error alerts.

### 🧭 Precision Qibla Compass Modal
- **Spherical Great-Circle Azimuth**: Calculates true bearing towards the Kaaba in Makkah (`21.422487° N, 39.826206° E`) from user's live GPS coordinates.
- **Interactive Compass Dial**: Replaced the previous placeholder redirect with a dedicated dark-gold compass modal showing exact bearing (e.g. `292° WNW`), distance in km (`4,240 km`), and orientation dial.

### 📖 Daily Inspiration Panel (30-Day Non-Repeating FIFO)
- **Extensive Authenticated Library**: Replaced the 7-day hardcoded cycle with an authenticated library of 22+ Hadiths and Quranic Ayahs with verified references (Sahih al-Bukhari, Sahih Muslim, Sunan Abi Dawud, Surah Al-Baqarah, etc.).
- **30-Day Non-Repeating Persistence**: Tracks seen history in `AsyncStorage` (`@deen_daily_inspiration_v2`) so users never see repeats across a full month, with an instant refresh roll button.

---

## 📦 Previous Releases (v1.5.2) - In-App Agent, Mandatory PIN Security & Ergonomic Focus Update

### 🤖 Imam AI In-App Agent & Strict Guardrails
- **In-App Tool Execution**: Imam AI can now directly execute in-app tasks via structured command blocks. Ask *"Find Azizia masjid"* or *"Start a 10 min focus timer"*, and Imam AI will automatically trigger the respective action inside the app.
- **Inline Masjid Cards & Directions**: When searching for masjids through Imam AI, the chat bubble renders interactive masjid cards showing verified distance, address, school of thought, and an emerald **"Get Directions (Google Maps)"** button that opens direct turn-by-turn navigation.
- **Strict Content Guardrails**: Imam AI is strictly locked to authentic Islamic guidance (Quran, Sunnah, Hadith, Fiqh, Seerah, Adhkar) and app management. It firmly and courteously declines any secular coding, programming, homework, or general chit-chat queries to prevent misuse and maintain reverence.

### 🛡️ Interactive Protection Pill & Mandatory PIN Architecture
- **Interactive Status Pill**: The dashboard status pill (`PROTECTED` / `OFFLINE`) is now interactive. Tapping `OFFLINE` directly launches the protection activation flow.
- **Mandatory PIN Security Rule**: Users *cannot* enable System-Wide Protection without first creating and confirming a 4-digit PIN. If no PIN is configured, protection remains disabled until PIN setup is finalized.
- **Modern In-App Emerald Modal**: Replaced outdated system dialogs with a bespoke dark-emerald modal detailing on-device VPN privacy and zero-logging architecture, completely stripped of emoji clutter.

### 🎯 Focus Screen Ergonomic Overhaul
- **Unionized Hero Dial**: Integrated the 200px circular progress dial, duration chips (15m, 25m, 45m, 60m), and Start/Pause button into a single unified card that fits completely above the fold on all device sizes without scrolling.
- **Streak Header Sync**: Focus header displays live streak days (`🔥 X Days`) synchronized directly with the dashboard streak counter.
- **Unified Protection Toggle**: Merged duplicate NSFW and System-Wide Protection toggles into one single synchronized toggle matching the Home dashboard.
- **Prominent Block Apps Button**: Replaced nested toggles with a dedicated `#e2a23b` amber button displaying the count of selected apps and toggling the app checklist.

### 🕌 Precision Masjid Finder (1km Radius & Distance Fix)
- **1km Walking Radius Query**: Overpass OSM queries are scoped to 1000m around live GPS coordinates, cutting query times from >15s down to <1s while returning up to 10 genuinely walkable masjids.
- **Dynamic Proximity Fallback**: Intelligently expands to 2500m if fewer masjids are detected, ensuring sparse communities still see local prayer halls.
- **Fixed Distance Metric**: Distance displays standard spacing (`X m` / `X.X km`) calculated via true Haversine distance against live GPS.

### ⏰ 7-Minute Pre-Prayer Notifications
- **Pre-Prayer Reminder Offset**: Updated from 15 minutes to exactly 7 minutes before the prayer start time (`Fajr`, `Dhuhr`, `Asr`, `Maghrib`, `Isha`).
- **Obligatory Isolation**: Restricted strictly to the 5 daily prayers, ignoring non-obligatory astronomical periods (Sunrise, Sunset, Imsak).

---

## 📦 Previous Releases

### v1.5.1 / v1.5.1i - Performance, UI & Warm-Up Update
- **Concurrent Startup Pre-Fetch**: Background engine (`lib/backgroundWarmup.ts`) executes immediately upon app launch, querying prayer times and nearby masjids concurrently for 0ms transitions.
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
