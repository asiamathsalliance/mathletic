# MathExam Prep

A web application to help students prepare for **HSC**, **IB**, and **AP** mathematics exams. Practice past exam questions by topic and use search to find relevant problems.

## Features

- **Curriculum selection** — Choose HSC, IB, or AP from the homepage
- **Topic-based practice** — Navigate to topics (Algebra, Functions, Calculus, Trigonometry, Probability, Vectors) and practice questions
- **Filters** — Filter questions by difficulty, year, and exam source on topic pages
- **Show solution** — Each question has a "Show Solution" button to reveal the answer
- **Search** — Search bar on every page; keyword/tag search across the question bank

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS, Shadcn UI
- **Data:** JSON question bank (`src/data/questions.json`)
- **Search:** Server-side keyword matching (ready to extend with embeddings)

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
    page.tsx              # Home (curriculum cards)
    layout.tsx            # Header with search, footer
    [curriculum]/         # /hsc, /ib, /ap — topic list
    [curriculum]/[topic]/  # e.g. /hsc/calculus — questions + filters
    search/               # /search?q=... — search results
    api/search/           # GET ?q= — search API
  components/
    SearchBar.tsx
    CurriculumCard.tsx
    QuestionCard.tsx
    ui/                   # Shadcn components
  data/
    questions.json        # Question bank
  lib/
    questions.ts          # Load & search questions
  types/
    question.ts           # Question, Curriculum, etc.
```

## Question Data

Each question in `src/data/questions.json` has:

- `id`, `curriculum`, `topic`, `subtopic`
- `year`, `examSource`, `difficulty`
- `questionText`, `solution`, `tags`

Add more entries to grow the bank. Schema matches the spec for future PostgreSQL migration.

## AI-Powered Search (LLM)

The **home page** has an AI search bar (below “Choose your curriculum”) that uses a real LLM to interpret natural language and filter questions (e.g. “I want to practice IB trig questions” → IB + Trigonometry).

### What you need to provide

1. **API key:** OpenAI API key (the app uses `gpt-4o-mini` for fast, low-cost parsing).
2. **Where to set it:**
   - Create a file `.env.local` in the project root (same folder as `package.json`).
   - Add one line:  
     `OPENAI_API_KEY=sk-your-actual-key-here`
   - Replace `sk-your-actual-key-here` with your key. Do not commit `.env.local` (it is gitignored).

### How to get an OpenAI API key

1. Go to [https://platform.openai.com](https://platform.openai.com) and sign in or create an account.
2. Open [API keys](https://platform.openai.com/api-keys) and click “Create new secret key”.
3. Copy the key (it starts with `sk-`) and paste it into `.env.local` as above.
4. Restart the dev server (`npm run dev`) so the new env is loaded.

If `OPENAI_API_KEY` is not set, the AI search bar still works: it will show a short message and redirect to the normal search (keyword-based) so the app remains usable.

## Local AI (Ollama)

AI step help and answer analysis use **Ollama** with a local model (no API key required). Default model is `mightykatun/qwen2.5-math:1.5b` for math-focused, fast responses.

- **Ollama:** Install and run [Ollama](https://ollama.com), then pull the model: `ollama pull mightykatun/qwen2.5-math:1.5b`
- **Env (optional):** In `.env.local` you can set:
  - `OLLAMA_HOST` — default `http://127.0.0.1:11434`
  - `OLLAMA_MODEL` — default `mightykatun/qwen2.5-math:1.5b`. Set to e.g. `deepseek-r1:latest` for higher quality (slower).
  - Legacy: `DEEPSEEK_MODEL` is still supported and overrides the default if `OLLAMA_MODEL` is not set.
