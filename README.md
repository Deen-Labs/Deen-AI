# Deen AI

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