-- Privacy harden: stop anon/authenticated from reading emails and answer keys.
-- Service role (admin) retains full access for grading / leaderboards / cron.
-- Run in Supabase SQL editor after review.

-- ============================================================
-- 1) public.users — hide email from public/anon reads
-- ============================================================
-- RLS still applies; column privileges further restrict PostgREST.
revoke select on table public.users from anon, authenticated;
grant select (id, display_name, avatar_url, created_at) on table public.users to anon, authenticated;
grant update (display_name, avatar_url) on table public.users to authenticated;

-- Authenticated users can still read their own email via Auth (`auth.getUser()`),
-- not via a public table dump.

-- ============================================================
-- 2) public.questions — hide solutions / keys from PostgREST clients
-- ============================================================
-- Public flag so lists can mark MCQ without exposing correct_index.
alter table public.questions
  add column if not exists is_mcq boolean
  generated always as (
    choices is not null
    and jsonb_typeof(choices) = 'array'
    and jsonb_array_length(choices) >= 4
  ) stored;

-- App grading/solution unlock must use service role or JSON secrets server-side.
revoke select on table public.questions from anon, authenticated;
grant select (
  id,
  competition,
  stream,
  topic,
  subtopic,
  year,
  exam_source,
  difficulty,
  amc_year,
  amc_variant,
  problem_number,
  difficulty_bucket,
  question_text,
  image_url,
  choices,
  tags,
  created_at,
  verified,
  is_mcq
) on table public.questions to anon, authenticated;

-- Do NOT grant: correct_index, solution, solution_image_url, answer_value, answer_type

-- ============================================================
-- 3) Optional: keep attempt aggregates public for leaderboards, but
--    document that sprint_attempts contain selected answers.
--    Narrowing sprint_attempts is a product decision (see audit).
-- ============================================================

comment on table public.users is
  'Public profile fields only for anon/authenticated; email revoked at column level (migration 006).';
comment on table public.questions is
  'Public question text/choices only for anon/authenticated; solutions/keys revoked (migration 006).';
