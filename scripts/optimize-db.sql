-- Mathletic DB optimize (safe for current product features)
-- Run in Supabase SQL editor. Review the preview SELECTs first, then run the DELETEs.
--
-- KEEPS (do not delete):
--   • question_attempts (solved + attempted) → progress, heatmap, streaks, ranks, "attempting"
--   • completed sprint_sessions aggregates → leaderboard / best scores / achievements
--   • user_achievements / achievements
--   • users / questions
--
-- REMOVES (safe):
--   • abandoned/incomplete sprint sessions older than 7 days (+ their attempt rows)
--   • per-question sprint_attempts for completed sessions older than 90 days
--     (session score/streak totals stay on sprint_sessions; century achievement
--      now sums problems_solved, so detail rows are not required)

begin;

-- ---------------------------------------------------------------------------
-- 0) Preview what would be removed
-- ---------------------------------------------------------------------------
select 'incomplete_sprint_sessions_gt_7d' as bucket, count(*)::bigint as rows
from public.sprint_sessions
where coalesce(is_complete, false) = false
  and started_at < now() - interval '7 days'
union all
select 'sprint_attempts_on_old_completed_sessions_gt_90d', count(*)::bigint
from public.sprint_attempts sa
join public.sprint_sessions ss on ss.id = sa.session_id
where ss.is_complete = true
  and coalesce(ss.ended_at, ss.started_at) < now() - interval '90 days';

-- ---------------------------------------------------------------------------
-- 1) Helpful indexes for remaining features (idempotent)
-- ---------------------------------------------------------------------------
create index if not exists question_attempts_user_status_idx
  on public.question_attempts (user_id, status);

create index if not exists question_attempts_user_solved_at_idx
  on public.question_attempts (user_id, solved_at desc)
  where status = 'solved' and solved_at is not null;

create index if not exists sprint_sessions_user_complete_score_idx
  on public.sprint_sessions (user_id, score desc)
  where is_complete = true;

create index if not exists sprint_sessions_complete_started_idx
  on public.sprint_sessions (started_at)
  where is_complete = true;

-- ---------------------------------------------------------------------------
-- 2) Delete abandoned incomplete sprints (> 7 days)
--    Attempts cascade via FK on sprint_attempts.session_id
-- ---------------------------------------------------------------------------
delete from public.sprint_attempts sa
using public.sprint_sessions ss
where sa.session_id = ss.id
  and coalesce(ss.is_complete, false) = false
  and ss.started_at < now() - interval '7 days';

delete from public.sprint_sessions
where coalesce(is_complete, false) = false
  and started_at < now() - interval '7 days';

-- ---------------------------------------------------------------------------
-- 3) Drop detail rows for old completed sprints (> 90 days)
--    Keeps sprint_sessions row (score, problems_solved, best_streak, …)
-- ---------------------------------------------------------------------------
delete from public.sprint_attempts sa
using public.sprint_sessions ss
where sa.session_id = ss.id
  and ss.is_complete = true
  and coalesce(ss.ended_at, ss.started_at) < now() - interval '90 days';

commit;

-- ---------------------------------------------------------------------------
-- 4) Planner stats (run after commit; outside transaction on some hosts)
-- ---------------------------------------------------------------------------
analyze public.question_attempts;
analyze public.sprint_sessions;
analyze public.sprint_attempts;
analyze public.users;

-- Optional (Supabase Pro / when you have permission; skip if it errors):
-- vacuum (analyze) public.sprint_attempts;
-- vacuum (analyze) public.sprint_sessions;
