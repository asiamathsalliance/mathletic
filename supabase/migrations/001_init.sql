-- Mathletic — initial schema for the AMC practice platform.
-- Run this in the Supabase SQL editor (or `supabase db push`) once per project.

-- ============================================================
-- Tables
-- ============================================================

-- Mirrors auth.users; populated by trigger below.
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  -- text PK preserves existing ids like "hsc-gen-001" so URLs and
  -- localStorage progress survive the migration.
  id text primary key,
  competition text not null check (competition in ('AMC10', 'AMC12', 'HSC', 'IB', 'AP', 'A_LEVEL')),
  stream text,
  topic text not null,
  subtopic text,
  year int,
  exam_source text,
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  -- AMC-specific fields
  amc_year int,
  amc_variant text check (amc_variant in ('A', 'B')),
  problem_number int,
  difficulty_bucket text check (difficulty_bucket in ('1-10', '11-20', '21-25')),
  question_text text not null,
  image_url text,
  -- 4-element arrays for the legacy bank, 5-element (A–E) for AMC.
  -- Null for long-answer questions.
  choices jsonb,
  correct_index int,
  solution text,
  solution_image_url text,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists questions_competition_idx on public.questions (competition);
create index if not exists questions_topic_idx on public.questions (topic);
create index if not exists questions_difficulty_idx on public.questions (difficulty);

create table if not exists public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  question_id text not null references public.questions (id) on delete cascade,
  status text not null check (status in ('solved', 'attempted')),
  attempt_count int not null default 1,
  first_attempted_at timestamptz not null default now(),
  solved_at timestamptz,
  unique (user_id, question_id)
);

create index if not exists question_attempts_user_idx on public.question_attempts (user_id);
create index if not exists question_attempts_question_idx on public.question_attempts (question_id);
create index if not exists question_attempts_solved_at_idx on public.question_attempts (solved_at);

create table if not exists public.sprint_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  mode text not null check (mode in ('easy', 'medium', 'hard', 'mixed')),
  topic text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_seconds int not null default 300,
  score int not null default 0,
  questions_answered int not null default 0,
  questions_correct int not null default 0
);

create index if not exists sprint_sessions_user_idx on public.sprint_sessions (user_id);
create index if not exists sprint_sessions_score_idx on public.sprint_sessions (score desc);
create index if not exists sprint_sessions_started_idx on public.sprint_sessions (started_at);

create table if not exists public.sprint_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sprint_sessions (id) on delete cascade,
  question_id text not null references public.questions (id) on delete cascade,
  answer_index int,
  correct boolean not null,
  time_ms int not null,
  points int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sprint_attempts_session_idx on public.sprint_attempts (session_id);

-- ============================================================
-- Trigger: mirror new auth users into public.users
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Row-level security
-- ============================================================

alter table public.users enable row level security;
alter table public.questions enable row level security;
alter table public.question_attempts enable row level security;
alter table public.sprint_sessions enable row level security;
alter table public.sprint_attempts enable row level security;

-- Questions: public read; writes only via service role (bypasses RLS).
create policy "questions are public" on public.questions
  for select using (true);

-- Users: public read (leaderboard names/avatars), self-update only.
create policy "users are public" on public.users
  for select using (true);
create policy "users update self" on public.users
  for update using (auth.uid() = id);

-- Question attempts: public read (leaderboard aggregates), owner-only writes.
create policy "attempts are public read" on public.question_attempts
  for select using (true);
create policy "attempts insert own" on public.question_attempts
  for insert with check (auth.uid() = user_id);
create policy "attempts update own" on public.question_attempts
  for update using (auth.uid() = user_id);

-- Sprint sessions: public read (leaderboards), owner-only writes.
create policy "sprints are public read" on public.sprint_sessions
  for select using (true);
create policy "sprints insert own" on public.sprint_sessions
  for insert with check (auth.uid() = user_id);
create policy "sprints update own" on public.sprint_sessions
  for update using (auth.uid() = user_id);

-- Sprint attempts: public read, insert only into own sessions.
create policy "sprint attempts are public read" on public.sprint_attempts
  for select using (true);
create policy "sprint attempts insert own" on public.sprint_attempts
  for insert with check (
    exists (
      select 1 from public.sprint_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );
