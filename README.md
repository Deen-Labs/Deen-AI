# Deen AI

Deen AI is an Islamic-focused AI assistant and digital wellness companion by **Deen Labs**. It combines proactive prayer reminders, daily dhikr & Quran/Hadith inspiration, halal content protection, and authentic Islamic Q&A powered by Retrieval-Augmented Generation (RAG).

---

## Latest Release (v3.1.1) - Scunthorpe Problem Elimination, Native SharedPreferences Focus Blocking, Background-Safe Timers & Spatial Accuracy

### Key Enhancements & Upgrades (v3.1.1)
- **Scunthorpe Problem Elimination & Bounded Regex Content Filter**: Replaced naive substring matching in `ContentFilterAccessibilityService` with compiled word-boundary regular expressions, preventing false positive blocks on legitimate words (e.g. "Essex", "Sussex", "sextant", "sixth").
- **Native SharedPreferences Focus Mode App Blocking**: Added `@ReactMethod syncFocusBlocking` in `ContentProtectionModule` bridging React Native focus sessions directly to Android's `AccessibilityService` via `deen_ai_prefs` (`is_focus_mode_active`, `focus_blocked_packages`), intercepting unauthorized app launches in real time and routing to `focus-blocked` deep link banner.
- **Background-Safe Focus Mode Countdown Timer**: Implemented wall-clock timestamp synchronization (`targetEndTimeRef` based on `Date.now() + remaining`) with `AppState` change listeners in `focus.tsx` to ensure timers remain accurate and never freeze or drift when switching apps or locking the device.
- **Prayer Calculation Method Parameter Plumbing & Live Chat Integration**: Fixed calculation method parsing in `prayerTimes.ts` (`PRAYER_TIMES_${todayStr}_${lat}_${lng}_M${method}`) and wired dynamic cached prayer times directly into the AI Imam chat command response.
- **Masjid Spatial Accuracy & Navigation Safety**: Replaced synthetic/fake coordinate generation in `masjid.ts` with filtered fallback masjids, and patched `masjid.tsx` & `chat.tsx` navigation handlers to redirect fallback/simulated IDs to genuine Google Maps search queries by masjid name instead of misleading GPS routing.
- **Non-Blocking UI Feedback & PIN Submissions**: Wrapped PIN submission verification in `PINModal` within a micro-task delay (`setTimeout(..., 16)`) to ensure ripple and button press feedback renders smoothly on the UI thread without JS hitching.
- **Direct Sideload Production APK (`Deen-AI-v3.1.1.apk`)**: Packaged standalone release APK with Proguard/R8 optimization, Hermes JS bytecode compilation, updated version codes (`versionCode 11`, `versionName "3.1.1"`), and zero external dependency on Expo Go.
- **Unified Website Distribution**: Integrated directly into the [Deen Labs](https://deenlabs.tech) showcase website with instant 1-click download (`Download App (v3.1.1)`).

---

## Previous Releases

### v2.2.1 - Critical Security Hardening, Multi-Round SHA-256 PBKDF2 PIN Shield, Anti-Tamper Guardrails & RAG Injection Defense
- **Multi-Round Iterative SHA-256 PIN Shield (VULN-05)**: Replaced legacy bitwise hashing with a hardened 10,000-round pure JS SHA-256 hash combined with a per-device cryptographically random 16-byte salt (`@deen_ai_pin_salt`), featuring transparent automatic legacy migration.
- **Progressive Brute-Force Rate Limiting (VULN-08)**: Enforced anti-automation lockout cooldowns (60s at 5 failures, 120s at 10, 300s at 15+) with a dynamic real-time lockout countdown in `PINModal`.
- **RAG Context Isolation & Prompt Injection Defense (VULN-02)**: Strict isolation of untrusted external reference material inside `<reference_context>` tags in user turns; `SYSTEM_INSTRUCTION` remains immutable, and all metadata fields are sanitized.
- **Protected Anti-Tamper & Accessibility Self-Disable Interception (VULN-04)**: Fixed PackageInstaller detection logic to require both target app ID and uninstall actions; intercepts settings navigation attempting to disable Deen AI Accessibility Service.
- **Service State Integrity & Secure Teardown (VULN-09)**: `stopVPNService` validates active PIN lock status, stops the VPN service, directs to Accessibility settings, and persists lifecycle states.
- **Bounded DOM Tree Scanning & Throttling (VULN-10)**: Implemented strict 12-level depth limit (`maxDepth = 12`) on node and URL traversal with 350ms debouncing on browser DOM updates to eliminate UI freezes and ANRs.
- **Overpass QL Regex Sanitization (VULN-06)**: Added `sanitizeOverpassRegex()` to strip syntax terminators and escape regex metacharacters in spatial Masjid searches.
- **Component Attack Surface Reduction (VULN-12, VULN-13)**: Closed `ContentFilterVPNService` to third-party apps (`android:exported="false"`), disabled ADB backup (`android:allowBackup="false"`), and turned off network inspection in production configurations.
- **Production PII Privacy Gate (VULN-14)**: Gated all sensitive user typing, clicked nodes, and URL logs behind `if (BuildConfig.DEBUG)`.
- **Direct Sideload Production APK (`Deen-AI-v2.2.1.apk`)**: Packaged standalone release APK with Proguard/R8 optimization, Hermes JS bytecode compilation, and full security hardening.

---

## Previous Releases

### v2.1.5 - Standalone Android Production Packaging, Live Sensor Qibla Compass & Privacy Anti-Tamper Shield
- **Direct Sideload Production APK (`Deen-AI-v2.1.5.apk`)**: Packaged standalone release APK pre-optimized with R8/Proguard, Hermes JavaScript bytecode compilation, and zero external dependency on Expo Go.
- **Multi-Session Client-Side Chat Engine**: Independent conversation sessions with immediate contextual titles and drawer history modal.
- **String-Based Fast-Path Recall**: Sub-300ms in-app agent actions with $0 LLM token cost.
- **Live Sensor Qibla Compass**: Native motion sensor fusion with dynamic orientation and Kaaba alignment.
- **Action-Level Anti-Tamper Protection**: Selective destruction interception in Settings.
- **Daily Inspiration Panel**: 30-day non-repeating FIFO with authenticated Hadith and Quranic Ayahs.

### v1.5.3 - Multi-Session Imam AI & Fast-Path Engine
- Integrated on-device conversation drawer and session history persistence.
- Added regex deterministic in-app tool execution and strict Islamic guardrail refusal.
- Implemented cascading Gemini quota hierarchy (`gemini-3.5-flash-lite` -> `gemini-2.5-flash`).

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

## Monorepo Layout

- `mobile-app/` — React Native & Expo mobile application for Android & iOS.
- `frontend-web/` — Web landing page and interactive showcase (`deenlabs.tech`).
- `ai-engine/` — RAG pipeline, embeddings, and LLM connectors.
- `backend-data/` — Database schemas, ETL pipelines for Quran, Hadith, and Tafsir data.

---

## Tech Stack

- **Mobile Framework**: React Native (0.86.2), Expo (SDK 57), Expo Router (v57)
- **Styling**: NativeWind (Tailwind CSS v4)
- **Vector Icons**: Expo Vector Icons (Feather)
- **AI Core**: Google Gemini API & Local LLMs
- **Native Android Security**: Custom `AccessibilityService` and `VpnService`
- **Build Tools**: Gradle 8.13, Android SDK 36, NDK 27.1.12297006, Java 21 LTS

---

## Local Setup & Development

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

## Git Workflow

- **`main`**: Production-ready branch. Protected.
- **`progress`**: Active feature integration and testing branch.
- Submit Pull Requests with at least 1 review prior to merging into `main`.
