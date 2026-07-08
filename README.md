# Mathletic

A LeetCode-style practice platform for **HSC**, **IB**, **AP**, and **A-Level** mathematics. Browse problems by topic, track progress on your dashboard, and optionally run timed challenge sessions.

## Features

- **Home** — Filterable problem table with solved status, difficulty, curriculum, and type
- **Browse** — Curriculum and olympiad topic tree
- **Question detail** — Vertical MCQ layout, long-answer checking, AI step help, solution reveal
- **Dashboard** — Solved counts, activity heatmap, recent activity, milestone badges
- **Challenge mode** — Timed MCQ speed round + long-answer boss check (HSC, IB, A-Level)
- **Search** — Keyword and AI-powered natural language search

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS, Shadcn UI
- **Data:** JSON question bank (`src/data/questions.json`)
- **AI:** OpenAI for search parsing; local Ollama or API for answer checking

## Getting Started

```bash
cd math-exam-prep
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/
    page.tsx                    # Home — problem table
    dashboard/                  # Progress report
    browse/                     # Curriculum / olympiad tree
    challenge/                  # Timed challenge mode
    questions/[id]/             # Problem detail
    search/                     # Search results
    [curriculum]/[stream]/[topic]/  # Topic question lists
  components/
    problems/                   # ProblemFilters, ProblemTable
    QuestionDetail.tsx
    challenge/                  # Challenge setup & run clients
    play/                       # SpeedRound, Boss, SessionResults
  lib/
    questions.ts
    progress.ts
    gameProfile.ts
    questionTable.ts
    progressStats.ts
```

## Routes

| Path | Purpose |
|------|---------|
| `/` | Problem table (landing) |
| `/questions/[id]` | Single problem view |
| `/browse` | Topic explorer |
| `/dashboard` | Progress & stats |
| `/challenge` | Timed session setup |
| `/search?q=...` | Search results |

Legacy `/play/*` URLs redirect to `/challenge/*` or `/dashboard`.

## Question Data

Each question in `src/data/questions.json` has:

- `id`, `curriculum`, `topic`, `subtopic`
- `year`, `examSource`, `difficulty`
- `questionText`, `solution`, `tags`

## AI Setup

Create `.env.local` in the project root:

```
OPENAI_API_KEY=sk-your-key-here
```

For local answer checking, run [Ollama](https://ollama.com) with a model such as `llama3.2:1b`.
