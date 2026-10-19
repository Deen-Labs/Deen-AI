# Deen AI — Mobile App

The official mobile client for **Deen AI**, built with **React Native (0.86.2)**, **Expo (SDK 57)**, **Expo Router**, and **NativeWind**.

---

## 📱 Features (v1.5.1)

- **⚡ Zero-Latency Background Warm-Up**:
  Concurrently pre-fetches prayer times and nearby masjids into memory and `AsyncStorage` on app launch (`lib/backgroundWarmup.ts`), ensuring 0ms navigation lag when switching to the Prayer or Masjid screens.
- **🧭 5-Tab Ergonomic Navigation**:
  Streamlined bottom navigation with Feather vector icons:
  - `Home`: Daily inspiration, live Salah countdown ticker, protection status pill.
  - `Prayer`: Bilingual dual calendar (Hijri in Arabic calligraphy + Gregorian), prayer countdown hero, and timetable.
  - `Focus`: Timed distraction-free focus sessions with custom durations.
  - `Imam AI`: Islamic Q&A with instant tap suggestion chips.
  - `Masjid`: Real-time nearby masjids powered by OpenStreetMap/Overpass with offline fallback.
- **🕋 Live Azan Countdown Ticker**:
  Real-time counter updating every second to the exact next prayer.
- **📜 Daily Ayah & Hadith Inspiration**:
  Bilingual card with authentic Arabic calligraphy typography, English translation, source citation, and a one-tap copy button.
- **🛡️ Native Android Protection**:
  Native `AccessibilityService` and `VpnService` intercept inappropriate content and unauthorized app deletions (with a 4-digit PIN unlock screen).
- **🔧 Hidden Developer Mode**:
  Rapidly tap the streak counter 7 times on the home dashboard to access developer debugging options (streak retention/overrides).

---

## 🛠️ Project Structure

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

## 🚀 Getting Started

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
