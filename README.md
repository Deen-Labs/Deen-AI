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
- `ai-engine/` — RAG pipeline, LLM connectors, Docker
- `backend-data/` — DB schemas, ETL for Quran/Hadith, API (FastAPI)
- `frontend-web/` — Web/Next.js UI (chat, prayer timeline)

## Tech Stack (initial)
- AI: Python, FastAPI, RAG with embeddings (e.g., OpenAI/Bedrock + pgvector/Pinecone)
- Data: Postgres/Supabase, ETL scripts for Quran/Hadith datasets
- Frontend: React/Next.js, Tailwind (optional)
- DevOps: Docker, GitHub Actions (later)

## Team Roles (suggested)
- AI/DevOps (you): AI pipeline, Docker, CI/CD
- Data (Friend 1): Quran/Hadith datasets, ETL, DB schemas
- Web (Friend 2): UI, chat, prayer times card

## Git Workflow
- `main`: protected, no direct pushes.
- `dev`: optional integration branch.
- Feature branches:
  - `feature/ai-pipeline`
  - `feature/db-setup`
  - `feature/ui-chat`
- Use PRs with ≥1 review.

## Next Steps (Sprint 0)
- AI/DevOps: Add Dockerfile + simple FastAPI stub in `ai-engine/`.
- Data: Add initial Quran JSON sample + ETL stub in `backend-data/etl_scripts/`.
- Web: Scaffold Next.js app in `frontend-web/` with a chat box and dummy prayer times card.

## Local Setup (high-level)
- Python ≥3.10, Node ≥18, Docker.
- Create a `.env` per service (API keys, DB URLs).
- Run services via Docker (compose file to be added).