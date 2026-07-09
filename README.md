# Mathletic

A LeetCode-style practice platform for **AMC 10/12** competition math plus **HSC**, **IB**, **AP**, and **A-Level** curricula. Questions live in Supabase Postgres, progress syncs to your Google account, and a 5-minute **Sprint** mode feeds public leaderboards.

## Features

- **Practice** — Filterable problem table (subject/competition, AMC variant, difficulty, topic, status, type) with solved status and a personal stats strip
- **Sprint** — 5-minute timed run: answer as many MCQs as you can; harder problems and faster answers score more (base 10/20/35 × speed multiplier 0.5–1.5); Mixed mode ramps difficulty as the clock runs
- **Leaderboard** — Most Solved / Best Sprint / By Topic, each with Daily / Weekly / All-Time windows; your row is highlighted and pinned when off-screen
- **Question detail** — Vertical MCQ layout, long-answer checking, AI step help, solution reveal
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

Upserts all HSC/IB/AP/A-Level JSON questions into the `questions` table (safe to re-run).

### 3. Import AMC problems (when you have them)

```bash
node scripts/import-amc.mjs path/to/amc-problems.json
```

The expected JSON format is documented at the top of `scripts/import-amc.mjs` (5 choices A–E, answer letter, problem number 1–25; difficulty bucket is derived). After importing, flip `DEFAULT_COMPETITIONS` in `src/lib/competitions.ts` to `["AMC10", "AMC12"]` so the home list defaults to AMC.

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
    sprint/                        # 5-minute sprint mode
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
    sprint.ts / sprintServer.ts    # Sprint scoring + question curve
    competitions.ts                # DEFAULT_COMPETITIONS and labels
    useProgress.ts                 # Progress facade (DB + localStorage)
    supabase/{client,server}.ts
```

## Routes

| Path | Purpose |
|------|---------|
| `/` | Problem table (landing) |
| `/questions/[id]` | Single problem view |
| `/sprint` | 5-minute timed sprint |
| `/leaderboard` | Most Solved / Best Sprint / By Topic |
| `/browse` | Topic explorer |
| `/dashboard` | Progress & stats |
| `/search?q=...` | Search results |

Legacy `/challenge/*` and `/play/*` URLs redirect to `/sprint`.

## AI Setup (optional)

Add to `.env.local`:

```
OPENAI_API_KEY=sk-your-key-here
```

For local answer checking, run [Ollama](https://ollama.com) with a model such as `llama3.2:1b`.
