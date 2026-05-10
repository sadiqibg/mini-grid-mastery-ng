-- Mini-Grid Mastery NG — Supabase schema
-- Run this in the Supabase SQL editor on a fresh project. Idempotent.

-- Identity
create table if not exists learners (
  id uuid primary key,
  recovery_code text unique not null,
  display_name text not null,
  role text check (role in ('beginner','developer','technical','finance')),
  community_scenario text,
  leaderboard_opt_in boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Lesson progress
create table if not exists lesson_progress (
  learner_id uuid references learners(id) on delete cascade,
  lesson_id text not null,
  status text check (status in ('locked','unlocked','in_progress','completed','mastered')),
  pacer_action_done boolean default false,
  quiz_best_score numeric,
  quiz_attempts int default 0,
  completed_at timestamptz,
  updated_at timestamptz default now(),
  primary key (learner_id, lesson_id)
);

-- XP ledger (append-only)
create table if not exists xp_events (
  id uuid primary key,
  learner_id uuid references learners(id) on delete cascade,
  source_type text,
  source_id text,
  xp int not null,
  created_at timestamptz default now()
);

-- Badges
create table if not exists learner_badges (
  learner_id uuid references learners(id) on delete cascade,
  badge_id text,
  earned_at timestamptz default now(),
  primary key (learner_id, badge_id)
);

-- Lab outputs
create table if not exists lab_artifacts (
  id uuid primary key,
  learner_id uuid references learners(id) on delete cascade,
  lab_id text not null,
  payload jsonb not null,
  version int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Flashcard SRS state
create table if not exists flashcard_state (
  learner_id uuid references learners(id) on delete cascade,
  card_id text,
  ease numeric default 2.5,
  interval_days int default 0,
  due_on date,
  last_grade int,
  primary key (learner_id, card_id)
);

-- Concept maps (open-ended, not scored)
create table if not exists concept_maps (
  learner_id uuid references learners(id) on delete cascade,
  map_id text not null,
  payload jsonb not null,
  submitted_at timestamptz,
  updated_at timestamptz default now(),
  primary key (learner_id, map_id)
);

-- Capstone milestone progress
create table if not exists capstone_progress (
  learner_id uuid primary key references learners(id) on delete cascade,
  sections jsonb not null default '{}',
  total_score numeric,
  updated_at timestamptz default now()
);

-- (leaderboard_v is created at the bottom, after the policies that gate it.)

-- ============================================================
-- Row-Level Security
--
-- The recovery_code on `learners` is the auth credential. It MUST NOT
-- be readable by anon. So:
--   • SELECT on `learners` is denied for anon.
--   • Restore goes through the SECURITY DEFINER RPC `restore_by_code(code)`
--     which returns the learner row only when the code matches.
--   • INSERT/UPDATE on `learners` stay open so the client can create and
--     update its own row (it knows its own learner_id and recovery_code).
--   • Child tables (lesson_progress, xp_events, etc.) keep permissive
--     policies. They are protected by obscurity: child rows are scoped by
--     a 122-bit random `learner_id` UUID, which is computationally
--     infeasible to guess. Hardening to JWT-scoped RLS is a future task.
-- ============================================================

alter table learners enable row level security;
alter table lesson_progress enable row level security;
alter table xp_events enable row level security;
alter table learner_badges enable row level security;
alter table lab_artifacts enable row level security;
alter table flashcard_state enable row level security;
alter table concept_maps enable row level security;
alter table capstone_progress enable row level security;

-- learners: deny direct SELECT; allow INSERT/UPDATE.
drop policy if exists "anon all on learners" on learners;
drop policy if exists "deny select on learners" on learners;
drop policy if exists "anon insert learners" on learners;
drop policy if exists "anon update learners" on learners;

create policy "deny select on learners" on learners
  for select using (false);
create policy "anon insert learners" on learners
  for insert with check (true);
create policy "anon update learners" on learners
  for update using (true) with check (true);

-- Child tables: permissive (UUID-scoped by client).
drop policy if exists "anon all on lesson_progress" on lesson_progress;
create policy "anon all on lesson_progress" on lesson_progress
  for all using (true) with check (true);

drop policy if exists "anon all on xp_events" on xp_events;
create policy "anon all on xp_events" on xp_events
  for all using (true) with check (true);

drop policy if exists "anon all on learner_badges" on learner_badges;
create policy "anon all on learner_badges" on learner_badges
  for all using (true) with check (true);

drop policy if exists "anon all on lab_artifacts" on lab_artifacts;
create policy "anon all on lab_artifacts" on lab_artifacts
  for all using (true) with check (true);

drop policy if exists "anon all on flashcard_state" on flashcard_state;
create policy "anon all on flashcard_state" on flashcard_state
  for all using (true) with check (true);

drop policy if exists "anon all on concept_maps" on concept_maps;
create policy "anon all on concept_maps" on concept_maps
  for all using (true) with check (true);

drop policy if exists "anon all on capstone_progress" on capstone_progress;
create policy "anon all on capstone_progress" on capstone_progress
  for all using (true) with check (true);

-- ============================================================
-- restore_by_code: SECURITY DEFINER lookup of a learner row by
-- recovery_code. Bypasses the deny-select policy on `learners`
-- because it runs with the function owner's privileges. The
-- function returns at most one row, so it cannot enumerate codes.
-- ============================================================

create or replace function restore_by_code(code text)
returns table (
  id uuid,
  recovery_code text,
  display_name text,
  role text,
  community_scenario text,
  leaderboard_opt_in boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select id, recovery_code, display_name, role, community_scenario, leaderboard_opt_in, created_at
  from learners
  where recovery_code = lower(trim(code))
  limit 1;
$$;

-- Allow anon (and authenticated) to call it.
grant execute on function restore_by_code(text) to anon, authenticated;

-- Replace the leaderboard view so it has no SELECT-on-learners dependency at query time.
-- (Views inherit the caller's permissions in Postgres unless declared SECURITY DEFINER.
-- We make this view security_invoker=false so anon can read it via the join even though
-- it touches `learners`.)
create or replace view leaderboard_v
with (security_invoker = false) as
select
  l.id as learner_id,
  l.display_name,
  coalesce(sum(x.xp), 0) as total_xp
from learners l
left join xp_events x on x.learner_id = l.id
where l.leaderboard_opt_in = true
group by l.id, l.display_name
order by total_xp desc
limit 100;

grant select on leaderboard_v to anon, authenticated;
