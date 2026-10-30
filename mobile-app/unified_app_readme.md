# Deen-AI / SalahTime

[![Version](https://img.shields.io/badge/version-3.2.0--unified-blue.svg)](https://github.com/mohdqasim/salahTime/tree/Deen-AI-X-salat-times)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/mohdqasim/salahTime/tree/Deen-AI-X-salat-times)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](#license)

**Deen-AI / SalahTime** brings together **Deen-AI** and **SalahTime** into a single, cohesive cross-platform mobile application built on React Native and Expo SDK 58. By consolidating standalone implementations into a unified architecture, this repository eliminates cross-platform friction, centralizes state and authentication, and provides a seamless community masjid timing and spiritual productivity experience.

---

## Table of Contents

- [Overview & Motivation](#overview--motivation)
- [Unification Changelog (v3.2.0)](#unification-changelog-v320)
  - [Architectural Changes](#architectural-changes)
  - [Authentication & Role-Based Access Control](#authentication--role-based-access-control)
  - [UI/UX & Design System](#uiux--design-system)
  - [Data Layer & State Management](#data-layer--state-management)
  - [Prayer Engine & Notification Infrastructure](#prayer-engine--notification-infrastructure)
  - [Breaking Changes & Deprecations](#breaking-changes--deprecations)
- [Unified Features](#unified-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Running](#installation--running)
  - [Running Test Suites](#running-test-suites)
- [License](#license)

---

## Overview & Motivation

Previously, our ecosystem consisted of separate native Android and prototype codebases for SalahTime and Deen-AI. This led to fragmented user sessions, duplicated business logic, and inconsistent prayer time schedules.

With the **v3.2.0 Unification Release**, all core modules operate under a single application shell and unified Firestore backend architecture, enabling:
- **Unified Identity:** Authenticate once and access Musalli, Muazzin, Imam, and Committee features seamlessly.
- **Shared Data Context:** Real-time synchronization between live community masjid timings (`/salah_time`) and directory entries (`/masjids`).
- **Standardized Design System:** Polished light/dark theming, responsive typography, and tactile UI across all screens.
- **Streamlined DX:** Single command to install dependencies, run tests, and boot Metro or Android dev builds.

---

## Unification Changelog (v3.2.0)

### Architectural Changes
- **Codebase Consolidation:** Migrated legacy Android native code into an Expo SDK 58, Expo Router, and TypeScript architecture.
- **Root Repository Promotion:** All screens, assets, components, native modules, and configurations now live directly at repository root.
- **Shared Core Libraries:** Unified prayer calculations, GPS distance utilities, audio engines, and validation guards under `lib/`.
- **Dependency Standardization:** Audited all dependencies for React Native 0.76+ and Expo SDK 58 compatibility.

### Authentication & Role-Based Access Control
- **5-Tier RBAC Engine:** Implemented permission hierarchy (`USER`, `SUPER_USER`, `SUPER_USER2`, `ADMIN`) mapped to community titles (`Musalli`, `Verified Updater`, `Area Coordinator`, `Imam`, `Muazzin`, `President`, `Secretary`).
- **Role Upgrade Workflow:** Users can submit in-app role elevation requests directly from their Profile view.
- **Default Musalli Registration:** Clean onboarding where new accounts default to Musalli with clear escalation paths.

### UI/UX & Design System
- **Centralized Navigation:** File-based Expo Router routing with bottom tabs (`(tabs)/_layout.tsx`) and expandable hub routes (`hub/_layout.tsx`).
- **Masjid Board Priority:** Pinned default masjids override distance serialization to guarantee immediate 1:1 visibility.
- **Tactile LED Masjid Display:** Visual board for live Jama'at and Athan schedules with verification indicators.
- **Bilingual & Localization Support:** Complete English, Urdu, and Arabic localization with dynamic font rendering.

### Data Layer & State Management
- **Multi-Key Relational Sync:** Dual-write mechanism that synchronizes edits across `salah_time` (by `masjid_id`, `id`, `masjidName`) and `masjids` documents.
- **Community Leaderboard & Scoring:** Real-time score calculator awarding points for verified timing contributions and new masjid additions.
- **JazakAllah Counter:** Community gratitude counter pre-populated with deterministic baseline values to prevent zero counts.

### Prayer Engine & Notification Infrastructure
- **Dual-Layer Timing Engine:** Offline-first local astronomical solar calculations paired with warm-boot Al-Adhan live API fallback.
- **Persistent Muazzin Reminders:** Automated local notifications triggered 15 minutes post-Dhuhr and post-Maghrib for unverified or stale timings.
- **Automatic Kill-Switch:** Immediate cancellation of reminder notifications upon verified timing submission.

### Breaking Changes & Deprecations
- **Legacy Native Android Repositories:** Standalone Java/Kotlin modules have been archived. All updates now flow through this repository.
- **Legacy Settings Tab:** Replaced by the comprehensive Deen Hub and dedicated Profile views.

---

## Unified Features

- **Masjid Jama'at Timing Tracker:** Live verified prayer schedules with real-time Firestore synchronization.
- **Daily Solar Calculations:** Precise Athan and Iqamah times calculated locally and cached dynamically.
- **Community Leaderboard:** Gamified Sadqah points system rewarding verified community timing updaters.
- **Asma-ul-Husna:** Audio playback, transliteration, and multi-column grid view of the 99 Names of Allah.
- **Daily Azkar & Supplications:** Morning and evening adhkar with tap-to-count tasbih tracking.
- **Friday Khutbah Topics & Feedback:** Interactive sermon topic submissions and community feedback channels.
- **Content Protection Module:** System accessibility and distraction-blocking service for spiritual focus.

---

## Tech Stack

| Category | Technology |
| :--- | :--- |
| **Framework** | React Native, Expo SDK 58, Expo Router |
| **Language** | TypeScript, Kotlin (Native Android Modules) |
| **State & Storage** | React Context, AsyncStorage, Firebase Firestore |
| **Notifications** | Expo Notifications (Local daily triggers) |
| **Audio** | Expo AV |
| **Location & Maps** | Expo Location, Geolib |
| **Styling** | React Native StyleSheet, Dynamic Design Tokens |

---

## Project Structure

```text
.
├── android/                   # Native Android project configuration and accessibility modules
├── app/                       # Expo Router file-based routes
│   ├── (tabs)/                # Main bottom navigation tabs (home, masjid, prayer, chat, more)
│   ├── auth/                  # Login, Signup, and Profile management routes
│   ├── hub/                   # Deen Hub features (leaderboard, azkar, settings, admin)
│   ├── _layout.tsx            # Global app layout provider
│   └── index.tsx              # Root entry point
├── assets/                    # Icons, splash screens, and image assets
├── components/                # Reusable UI components (modals, LED board, compass)
├── lib/                       # Core business logic, RBAC, sync engine, and tests
│   ├── __tests__/             # Core functionality test suites
│   ├── auth.ts                # Dual-layer RBAC and permission guards
│   ├── masjidTimingSync.ts    # Firestore multi-key synchronization
│   ├── muazzinNotifications.ts# Dhuhr & Maghrib reminder scheduler
│   └── prayerTimes.ts         # Astronomical solar calculations
├── plugins/                   # Custom Expo config plugins
├── scripts/                   # Test runners, verification scripts, and utilities
├── app.json                   # Expo application manifest
├── babel.config.js            # Babel configuration
├── metro.config.js            # Metro bundler configuration
├── package.json               # Dependencies and scripts
└── tsconfig.json              # TypeScript configuration
```

---

## Getting Started

### Prerequisites
- **Node.js:** `>= 20.x`
- **Package Manager:** `npm` (or `yarn`)
- **Expo Go** or **Android Studio** for device/emulator execution

### Installation & Running

1. **Clone the repository:**
   ```bash
   git clone -b Deen-AI-X-salat-times https://github.com/mohdqasim/salahTime.git
   cd salahTime
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the Expo development server:**
   ```bash
   npx expo start
   ```

4. **Run on Android Emulator or Device:**
   ```bash
   npx expo run:android
   ```

### Running Test Suites

Run the automated core functionality verification suite:
```bash
npm test
```
Or execute directly with Node:
```bash
node scripts/runTests.js
```

---

## License

Proprietary and confidential. All rights reserved. Unauthorized copying, modification, distribution, or use of this software is strictly prohibited.
