# Deen AI — Mobile App

The official mobile client for **Deen AI**, built with **React Native (0.86.2)**, **Expo (SDK 57)**, **Expo Router**, and **NativeWind**.

---

## Features (v2.1.5)

- **Multi-Session Imam AI**: Complete on-device conversation drawer and session history persistence (`AsyncStorage`) with instant dynamic titles generated from the user's first question.
- **Deterministic String Fast-Path Recall**: Sub-300ms execution of in-app agent actions (timers, masjids, prayer timings) with $0 token overhead and strict secular guardrails.
- **Live Qibla Sensor Compass**: Native accelerometer and magnetometer sensor fusion (`expo-location` `watchHeadingAsync`) driving real-time 360-degree compass rotation with emerald alignment targets.
- **Zero-Latency Background Warm-Up**: Concurrently pre-fetches prayer times and nearby masjids into memory on app launch (`lib/backgroundWarmup.ts`).
- **5-Tab Ergonomic Navigation**: Bottom navigation (`Home`, `Prayer`, `Focus`, `Imam AI`, `Masjid`) with settings shortcut.
- **Live Azan Countdown Ticker**: Real-time ticker to the exact next prayer with 7-minute pre-prayer notification alerts.
- **30-Day Non-Repeating Daily Inspiration**: Authenticated Hadith & Ayah library with verified citations and refresh capability.
- **Action-Level Anti-Tamper & Privacy Controls**: Intercepts destructive Force Stop, Uninstall, and Clear Storage attempts while allowing complete user control over Android system permissions and privacy.

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
