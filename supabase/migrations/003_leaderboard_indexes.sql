-- Leaderboard query indexes for windowed aggregates

create index if not exists question_attempts_solved_window_idx
  on public.question_attempts (status, solved_at desc)
  where status = 'solved';

create index if not exists sprint_sessions_leaderboard_idx
  on public.sprint_sessions (mode_type, is_complete, started_at desc)
  where is_complete = true;
