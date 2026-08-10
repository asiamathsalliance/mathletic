-- Cached leaderboard rows — refreshed by /api/cron/leaderboard-refresh.
-- Reads are a single indexed SELECT instead of live aggregation.

create table if not exists public.leaderboard_cache (
  id bigserial primary key,
  board text not null check (board in ('solved', 'sprint', 'topic')),
  time_window text not null check (time_window in ('daily', 'weekly', 'all')),
  mode text not null default '', -- MULTIPLICATION | PROBLEM_POOL | '' for non-sprint
  topic text not null default '', -- simple topic key for topic board; '' otherwise
  user_id uuid not null references public.users (id) on delete cascade,
  value numeric not null default 0,
  rank int not null,
  refreshed_at timestamptz not null default now()
);

create unique index if not exists leaderboard_cache_key_uidx
  on public.leaderboard_cache (board, time_window, mode, topic, user_id);

create index if not exists leaderboard_cache_lookup_idx
  on public.leaderboard_cache (board, time_window, mode, topic, rank);

alter table public.leaderboard_cache enable row level security;

drop policy if exists "leaderboard cache is public read" on public.leaderboard_cache;
create policy "leaderboard cache is public read"
  on public.leaderboard_cache
  for select
  using (true);
