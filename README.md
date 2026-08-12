# Deen AI

## Latest Release (v1.5.1i) - Internal Update
- **Aggressive Text Blocking**: Native service now actively scans keystrokes and loaded screen text. Search queries matching blocked words are instantly intercepted.
- **Uninstall PIN Unlock**: Uninstall attempts via Settings now instantly trigger a PIN screen. Entering the correct PIN grants exactly 2 minutes to safely uninstall the app.
- **Imaam AI Enhancements**: Focus mode durations of any length can now be passed via Imaam AI (e.g. "start focus mode for 1 minute"). The focus mode will automatically route and start immediately.
- **Background Initialization**: Location, Prayer Times, and Masjids fetch silently in the background on app startup for instantaneous loading.
- **UI & UX Fixes**: 
  - Strictly enforced 4-digit PIN lock.
  - Prayer calculation method hardcoded to Umm Al-Qura University, Makkah (panel removed).
  - Helper texts ("Tap for more details") added to dashboard cards.
  - Renamed the dashboard lock button for clarity.
- **Hidden Developer Menu**: Rapidly tap the Streak circle 7 times in the dashboard to access developer tools (streak override) without needing a separate Dev APK.

An Islamic-focused AI assistant (by Deen Labs) that provides proactive prayer reminders, dhikr prompts, and safe Q&A via Retrieval Augmented Generation (RAG).

## Monorepo Layout
- `ai-engine/` — RAG pipeline, LLM connectors
- `backend-data/` — DB schemas, ETL for Quran/Hadith, API (FastAPI)
- `frontend-web/` — Web/Next.js UI (chat, prayer timeline)

## Tech Stack (Current)
- **Frontend/Mobile**: React Native, Expo (SDK 57)
- **AI**: Google Gemini API (integrated directly in client)
- **Native Android Security**: Custom AccessibilityService and VPNService for system-wide content protection
- **Data/State**: AsyncStorage, Local JSON caches (Prayer times, Hadith data)


## Git Workflow
- `main`: protected, no direct pushes.
- `progress`: optional integration branch.
- Use PRs with ≥1 review.

## Next Steps
- Continue refining native Android blocking capabilities.
- Implement comprehensive offline prayer time scheduling (notifications).
- Release on app stores.

## Local Setup
- Requires Node ≥18.
- Navigate to `mobile-app/` and run `npm install`.
- Run `npx expo start` or build via `./gradlew assembleRelease` in the `android/` directory for testing native modules.
