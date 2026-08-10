-- Format verification + typed-answer grading fields.
-- Run after 001–003.

alter table public.questions
  add column if not exists verified boolean not null default true,
  add column if not exists format_issues text,
  add column if not exists answer_value text,
  add column if not exists answer_type text
    check (answer_type is null or answer_type in ('numeric', 'symbolic', 'expression'));

create index if not exists questions_verified_idx
  on public.questions (verified)
  where verified = true;

-- Confirm attempt/session indexes used by RLS and stats (idempotent).
create index if not exists question_attempts_user_idx
  on public.question_attempts (user_id);
create index if not exists sprint_sessions_user_idx
  on public.sprint_sessions (user_id);
create index if not exists sprint_attempts_session_idx
  on public.sprint_attempts (session_id);
