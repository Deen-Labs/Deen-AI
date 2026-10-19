# Deen AI — Mobile App

The official mobile client for **Deen AI**, built with **React Native (0.86.2)**, **Expo (SDK 57)**, **Expo Router**, and **NativeWind**.

---

## Features (v2.1.1)

- **Multi-Session Imam AI**: Complete on-device conversation drawer and session history persistence (`AsyncStorage`) with auto-generated contextual titles.
- **Deterministic String Fast-Path Recall**: Sub-300ms execution of in-app agent actions (timers, masjids, prayer timings) with $0 token overhead and strict secular guardrails.
- **Precision Qibla Compass**: Great-circle spherical azimuth calculation with live bearing and distance to the Kaaba in Makkah.
- **Zero-Latency Background Warm-Up**: Concurrently pre-fetches prayer times and nearby masjids into memory on app launch (`lib/backgroundWarmup.ts`).
- **5-Tab Ergonomic Navigation**: Bottom navigation (`Home`, `Prayer`, `Focus`, `Imam AI`, `Masjid`) with settings shortcut.
- **Live Azan Countdown Ticker**: Real-time ticker to the exact next prayer with 7-minute pre-prayer notification alerts.
- **30-Day Non-Repeating Daily Inspiration**: Authenticated Hadith & Ayah library with verified citations and refresh capability.
- **Native Android Protection & Mandatory PIN**: Device-level `VpnService` content shielding with enforced 4-digit PIN setup.

---

## Project Structure

```
mobile-app/
├── android/                 # Native Android project (Gradle 8.13, NDK 27.1)
├── app/                     # Expo Router file-based navigation
│   ├── (tabs)/              # Primary 5 tabs (index, prayer, focus, chat, masjid, settings)
│   ├── _layout.tsx          # Root layout with warm-up trigger & status bar
│   └── modal.tsx            # Modals and sub-views
├── assets/                  # App icons, splash screens, and illustrations
├── lib/                     # Business logic and background services
│   ├── backgroundWarmup.ts  # Parallel pre-fetch engine
│   ├── prayerTimes.ts       # AlAdhan API client + offline cache
│   ├── masjid.ts            # Nearby masjids locator + offline cache
│   ├── salahNotifications.ts# Notification scheduling & Expo Go crash guard
│   └── streak.ts            # Streak tracking & developer overrides
├── package.json
└── tailwind.config.js       # NativeWind Tailwind configuration
```

---

## Getting Started

### Prerequisites
- **Node.js**: `v20.x` or later
- **Java**: `JDK 21 LTS` (for native Android builds)
- **Android SDK**: Build tools `36.0.0`, NDK `27.1.12297006`

### 1. Installation
```bash
cd mobile-app
npm install
```

### 2. Run in Development (Expo)
```bash
npx expo start
```
Scan the QR code with **Expo Go** on your Android/iOS device.

### 3. Build Standalone Release APK
```bash
cd android
.\gradlew.bat assembleRelease
```
The output APK is generated at:
```
android/app/build/outputs/apk/release/app-release.apk
```
Pre-signed with debug keystore for immediate sideloading and testing on physical Android devices.
