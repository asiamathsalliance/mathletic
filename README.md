# Mathletic

A LeetCode-style practice platform for **AMC 10/12** competition math plus **HSC**, **IB**, **AP**, and **A-Level** curricula. Questions live in Supabase Postgres, progress syncs to your Google account, and a 5-minute **Sprint** mode feeds public leaderboards.

## Features

- **Practice** — Filterable problem table (subject/competition, AMC variant, difficulty, topic, status, type) with solved status and a personal stats strip
- **Sprint** — Two 5-minute modes: **Multiplication Sprint** (times tables 1–20, streak bonuses) and **Problem Sprint** (random Easy MCQs from the full bank); personal bests and mode-specific leaderboards
- **Leaderboard** — Most Solved / Best Sprint / By Topic, each with Daily / Weekly / All-Time windows; sprint board filters by multiplication or problem mode
- **Question detail** — Vertical MCQ layout, long-answer checking, solution reveal
- **Dashboard** — Solved counts, activity heatmap, recent activity
- **Search** — Keyword and AI-powered natural language search
- **Auth** — Google sign-in via Supabase; logged-out users keep localStorage progress as a preview, which is imported into the DB on first sign-in

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS, Shadcn UI
- **Backend:** Supabase (Postgres + Auth) via `@supabase/ssr`; JSON files in `src/data/` remain as source-of-record backup and local fallback
- **AI:** OpenAI for search parsing; local Ollama or API for answer checking

## Setup

### 1. Supabase project

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard) (free tier is fine).
2. Open **SQL Editor**, paste the contents of `supabase/migrations/001_init.sql`, and run it.
3. From **Settings → API**, copy into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-only, never exposed to the browser
```

Without these vars the app still runs — it falls back to the bundled JSON question bank and localStorage progress, but auth, Sprint, and leaderboards are disabled.

### 2. Import the question bank

```bash
node scripts/import-questions.mjs
```

Upserts all bundled JSON questions (AMC 10/12, HSC, IB, AP, A-Level) into the `questions` table (safe to re-run).

### 3. Rebuild / re-import AMC problems

AMC 10/12 problems are bundled in `src/data/questions-amc.json` (sourced from AoPS wiki mirrors). Rebuild from the public datasets with:

```bash
node scripts/build-amc-bank.mjs
node scripts/import-amc.mjs scripts/tmp-amc/amc-import.json
```

The home practice list defaults to AMC 10/12 via `DEFAULT_COMPETITION_FILTERS` in `src/lib/competitions.ts`.

### 4. Google OAuth

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create an **OAuth client ID** (type: Web application).
   - Authorized JavaScript origins: `http://localhost:3000` and your production URL
   - Authorized redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
2. In Supabase **Authentication → Sign In / Providers → Google**: enable it and paste the client ID + secret.
3. In Supabase **Authentication → URL Configuration**: set Site URL to your production URL and add `http://localhost:3000/**` to Redirect URLs.

### 5. Run

```bash
cd math-exam-prep
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

1. Import the repo in Vercel; set the project root to `math-exam-prep`.
2. Add the three Supabase env vars (plus `OPENAI_API_KEY` if used) in **Project → Settings → Environment Variables**.
3. Add your production domain to the Google OAuth client's origins and to Supabase's Redirect URLs (`https://your-domain.com/**`).

## Project Structure

```
supabase/migrations/001_init.sql   # Schema, RLS policies, users trigger
scripts/
  import-questions.mjs             # JSON bank -> Postgres
  import-amc.mjs                   # AMC problems -> Postgres (validated)
src/
  app/
    page.tsx                       # Practice — problem table
    sprint/                        # Sprint entry + /multiplication + /problem play routes
    leaderboard/                   # Public leaderboards
    dashboard/                     # Progress & stats
    browse/                        # Curriculum / olympiad tree
    questions/[id]/                # Problem detail
    search/                        # Search results
    api/attempts/                  # Attempt upsert + localStorage import
    api/sprint/{start,answer,finish}/
    auth/callback/                 # OAuth code exchange
  lib/
    questions.ts                   # Async DB queries (JSON fallback)
    questionUtils.ts               # Pure helpers (client-safe)
    sprint.ts                      # Sprint types, scoring, streak helpers
    sprintMultiplication.ts / sprintProblemPool.ts / sprintAchievements.ts
    competitions.ts                # DEFAULT_COMPETITIONS and labels
    useProgress.ts                 # Progress facade (DB + localStorage)
    supabase/{client,server}.ts
```

## Routes

| Path | Purpose |
|------|---------|
| `/` | Problem table (landing) |
| `/questions/[id]` | Single problem view |
| `/sprint` | Choose multiplication or problem sprint |
| `/sprint/multiplication` | 5-minute multiplication tables sprint |
| `/sprint/problem` | 5-minute easy problem sprint |
| `/leaderboard` | Most Solved / Best Sprint / By Topic |
| `/browse` | Topic explorer |
| `/dashboard` | Progress & stats |
| `/search?q=...` | Search results |

Run `supabase/migrations/002_sprint_redesign.sql` after `001_init.sql` to enable the two sprint modes and achievement tables.

Legacy `/challenge/*` and `/play/*` URLs redirect to `/sprint`.

## AI Setup (optional)

Add to `.env.local`:

```
OPENAI_API_KEY=sk-your-key-here
```

For local answer checking, run [Ollama](https://ollama.com) with a model such as `llama3.2:1b`.
