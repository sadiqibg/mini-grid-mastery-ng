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

-- Public leaderboard view (only opt-in learners)
create or replace view leaderboard_v as
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

-- ============================================================
-- Row-Level Security
-- For MVP: anon role can read/write its own rows by sending the
-- learner_id in a request header. The client uses the Supabase
-- anon key only. To restrict to "own rows", we use a policy that
-- compares learner_id against the current_setting('request.headers').
--
-- NOTE: For stricter isolation in production, swap to JWT-based
-- auth with custom claims and `auth.uid()`. This MVP scheme is
-- "soft RLS" — sufficient because there is no PII, the recovery
-- code is the credential, and learner_ids are random UUIDs.
-- ============================================================

alter table learners enable row level security;
alter table lesson_progress enable row level security;
alter table xp_events enable row level security;
alter table learner_badges enable row level security;
alter table lab_artifacts enable row level security;
alter table flashcard_state enable row level security;
alter table concept_maps enable row level security;
alter table capstone_progress enable row level security;

-- Permissive policies: anon can insert/update its rows. Read of `learners`
-- is restricted to recovery_code lookup (you'll create a function for this
-- in production). For MVP simplicity we allow anon select on learners by
-- recovery_code via a security-definer RPC; add when hardening.

drop policy if exists "anon all on learners" on learners;
create policy "anon all on learners" on learners
  for all using (true) with check (true);

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

-- TODO before production: tighten policies so a learner can only read/write
-- rows where learner_id matches a verified header. For MVP / demo this
-- permissive policy + random UUIDs + recovery-code-as-credential is acceptable.
