-- Sprint two-mode redesign: Multiplication + Problem Pool
-- Run after 001_init.sql. Wipes existing sprint data (clean slate).

delete from public.sprint_attempts;
delete from public.sprint_sessions;

-- ============================================================
-- sprint_sessions: new mode_type + session fields
-- ============================================================

alter table public.sprint_sessions drop constraint if exists sprint_sessions_mode_check;

alter table public.sprint_sessions rename column mode to mode_type;
alter table public.sprint_sessions rename column finished_at to ended_at;
alter table public.sprint_sessions rename column questions_correct to problems_solved;
alter table public.sprint_sessions rename column questions_answered to attempts_count;

alter table public.sprint_sessions drop column if exists topic;

alter table public.sprint_sessions
  add column if not exists is_complete boolean not null default false,
  add column if not exists best_streak int not null default 0;

alter table public.sprint_sessions
  add constraint sprint_sessions_mode_type_check
  check (mode_type in ('MULTIPLICATION', 'PROBLEM_POOL'));

-- ============================================================
-- sprint_attempts: support multiplication + problem pool
-- ============================================================

alter table public.sprint_attempts alter column question_id drop not null;

alter table public.sprint_attempts
  add column if not exists operand_a int,
  add column if not exists operand_b int,
  add column if not exists user_answer_value int,
  add column if not exists selected_answer text,
  add column if not exists order_index int not null default 0,
  add column if not exists time_taken_seconds numeric not null default 0;

-- Backfill order_index for any future rows from time_ms
update public.sprint_attempts
set time_taken_seconds = round(time_ms::numeric / 1000.0, 2)
where time_taken_seconds = 0 and time_ms is not null;

-- ============================================================
-- Achievements
-- ============================================================

create table if not exists public.achievements (
  key text primary key,
  title text not null,
  mode_scope text not null check (mode_scope in ('ANY', 'MULTIPLICATION', 'PROBLEM_POOL')),
  description text
);

create table if not exists public.user_achievements (
  user_id uuid not null references public.users (id) on delete cascade,
  achievement_key text not null references public.achievements (key) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_key)
);

create index if not exists user_achievements_user_idx on public.user_achievements (user_id);

alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

create policy "achievements are public read" on public.achievements
  for select using (true);

create policy "user achievements are public read" on public.user_achievements
  for select using (true);

create policy "user achievements insert own" on public.user_achievements
  for insert with check (auth.uid() = user_id);

-- Seed starter sprint achievements
insert into public.achievements (key, title, mode_scope, description) values
  ('first_sprint', 'First Sprint', 'ANY', 'Complete any sprint session'),
  ('century_multiplication', 'Century Club', 'MULTIPLICATION', 'Solve 100 total multiplication problems across all sessions'),
  ('streak_10', 'On Fire', 'MULTIPLICATION', 'Hit a 10-correct streak in one session'),
  ('speed_demon', 'Speed Demon', 'MULTIPLICATION', 'Solve 30+ problems in a single 5-minute session'),
  ('sharp_shooter', 'Sharp Shooter', 'PROBLEM_POOL', '100% accuracy in a session with 10+ attempts'),
  ('easy_grinder', 'Easy Grinder', 'PROBLEM_POOL', 'Solve 15+ problems in a single 5-minute session')
on conflict (key) do nothing;
