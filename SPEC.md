# Mini-Grid Mastery Nigeria — MVP Build Spec

Source-of-truth content document: `Mini grid training website.md` (referred to below as the **Course Doc**). This spec is the buildable MVP layer. Anything not listed here is out of scope for v1.

---

## 1. Stack & Deployment

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | React Server Components for content pages, Client Components for labs. |
| Styling | **Tailwind CSS** | Plus `@tailwindcss/typography` for MDX prose. |
| Content | **MDX** files in `/content` | Lessons authored as markdown; updates via git. No CMS, no admin UI. |
| Backend | **Supabase (Postgres + REST + Row-Level Security)** | Anonymous progress sync only. No auth provider used. |
| Hosting | Vercel (web) + Supabase (db) | Static where possible, server actions for sync writes. |
| State (client) | Zustand + IndexedDB persistence (`idb-keyval`) | LocalStorage is too small for lab outputs. |
| Charts | Recharts | Load profile, LCoE sensitivity. |
| Graph editor | **React Flow** (`@xyflow/react`) + dagre auto-layout | Concept maps. Lazy-loaded on map routes only (~60kb gz). |

Out of scope for MVP: file uploads, free-text capstone memos, admin panel, peer review, AI tutor, simulation API integration.

---

## 2. Information Architecture (MVP routes)

```
/                          Landing + "Start learning" / "Restore progress" CTAs
/dashboard                 Current rank, XP, next mission, module progress bars
/learning-map              Visual module graph with lock states
/modules/[slug]            Module index page
/modules/[slug]/[lesson]   Lesson page (MDX)
/labs/load-survey          Load Survey Lab
/labs/pv-sizing            PV Sizing Lab
/labs/regulatory-tree      Regulatory Decision Tree
/concept-maps/[mapId]      Open-ended concept map builder (React Flow)
/flashcards/[deck]         Spaced-repetition deck
/portfolio                 Read-only view of all stored lab outputs + capstone status
/capstone                  Capstone milestone tracker + final upload (text+JSON only in MVP)
/restore                   Enter 3-word code to restore progress on a new device
/settings                  Show recovery code, copy button, reset progress, opt-out of leaderboard
```

MVP **excludes** these routes from the Course Doc: `/critique-room`, `/case-library` (cases referenced inline in lessons instead), `/admin`, `/labs/sld-lab`, `/labs/boq-builder`, `/labs/tariff-and-lcoe-workbench`, `/labs/site-selection-simulator`, `/labs/commissioning-checklist`, `/labs/battery-sizing-lab`. These ship in v2.

MVP labs = **Load Survey, PV Sizing, Regulatory Decision Tree** (matches Course Doc §20).

---

## 3. Progress Model — No Accounts

### 3.1 Identity

On first visit:

1. Generate a UUID v4 → `learner_id`.
2. Generate a 3-word recovery code from a curated wordlist (~1500 words → ~3.4B combinations, e.g. `plum-river-42` where `42` is a 2-digit checksum).
3. Store `{learner_id, recovery_code}` in IndexedDB **and** insert a `learner` row in Supabase.
4. Show recovery code once on a "Save this code" modal; remind in `/settings`.

### 3.2 Restore flow

`/restore` takes the 3-word code → server looks up `learner_id` → returns full progress snapshot → client hydrates IndexedDB. No email, no password.

### 3.3 Sync strategy

- **Local first**: every action writes to IndexedDB immediately so the app works offline.
- **Background sync**: a debounced (3s) server action pushes deltas to Supabase. Conflict policy = last-write-wins per row (acceptable; one learner rarely edits two devices simultaneously).
- **Hydration on load**: if `last_synced_at` is older than the server's `updated_at`, pull server state.

### 3.4 Privacy

- No PII collected. Recovery code is the only credential.
- Leaderboard shows learner-chosen display name (default = adjective+noun, e.g. "Curious Egret"). Opt-out hides from leaderboard but progress still syncs.

---

## 4. Database Schema (Supabase / Postgres)

```sql
-- Identity
create table learners (
  id uuid primary key,
  recovery_code text unique not null,        -- e.g. "plum-river-42"
  display_name text not null,
  role text check (role in ('beginner','developer','technical','finance')),
  community_scenario text,                   -- chosen in Module 0
  leaderboard_opt_in boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Progress per lesson
create table lesson_progress (
  learner_id uuid references learners(id) on delete cascade,
  lesson_id text not null,                   -- matches Course Doc IDs e.g. "lesson-2-04"
  status text check (status in ('locked','unlocked','in_progress','completed','mastered')),
  pacer_action_done boolean default false,
  quiz_best_score numeric,                   -- 0-100
  quiz_attempts int default 0,
  completed_at timestamptz,
  updated_at timestamptz default now(),
  primary key (learner_id, lesson_id)
);

-- XP ledger (append-only, audit-friendly)
create table xp_events (
  id bigserial primary key,
  learner_id uuid references learners(id) on delete cascade,
  source_type text,                          -- 'lesson','quiz','lab','badge','capstone'
  source_id text,
  xp int not null,
  created_at timestamptz default now()
);

-- Badges earned
create table learner_badges (
  learner_id uuid references learners(id) on delete cascade,
  badge_id text,
  earned_at timestamptz default now(),
  primary key (learner_id, badge_id)
);

-- Lab outputs (the only artifact type in MVP)
create table lab_artifacts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid references learners(id) on delete cascade,
  lab_id text not null,                      -- 'load-survey','pv-sizing','regulatory-tree'
  payload jsonb not null,                    -- inputs + computed outputs
  version int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Flashcard SRS state (Leitner / SM-2-lite)
create table flashcard_state (
  learner_id uuid references learners(id) on delete cascade,
  card_id text,
  ease numeric default 2.5,
  interval_days int default 0,
  due_on date,
  last_grade int,                            -- 0=again,1=hard,2=good,3=easy
  primary key (learner_id, card_id)
);

-- Concept map attempts (open-ended, not scored)
create table concept_maps (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid references learners(id) on delete cascade,
  map_id text not null,                      -- e.g. 'nesi-overview', 'pv-fundamentals'
  payload jsonb not null,                    -- { nodes:[{id,label,x,y,custom?}], edges:[{from,to,label}] }
  node_count int generated always as ((jsonb_array_length(payload->'nodes'))) stored,
  edge_count int generated always as ((jsonb_array_length(payload->'edges'))) stored,
  submitted_at timestamptz,                  -- non-null = learner marked it done
  updated_at timestamptz default now(),
  unique (learner_id, map_id)
);

-- Capstone milestone progress (text + structured only in MVP)
create table capstone_progress (
  learner_id uuid primary key references learners(id) on delete cascade,
  sections jsonb not null default '{}',      -- { "executive_summary": {status, updated_at}, ... }
  total_score numeric,
  updated_at timestamptz default now()
);
```

### 4.1 Row-Level Security

- Anonymous Supabase key only. Every table has RLS: a row is readable/writable only when the request includes a header `x-learner-id` matching the row's `learner_id`. The server action attaches this header from the verified session cookie (HttpOnly, signed) that holds the `learner_id`.
- Public-readable views: `leaderboard_v` (display_name, total_xp, rank — only where `leaderboard_opt_in=true`).

---

## 5. Content Pipeline (MDX)

```
/content
  /modules
    /00-onboarding
      _meta.json           module title, order, unlock rule
      01-what-is-mini-grid.mdx
      ...
    /01-nigeria-electricity-system
    ...
  /flashcards
    electricity-basics.json
    pv-terms.json
    ...
  /labs
    /regulatory-tree
      decision-tree.json   nodes + edges per Course Doc §12
```

Every lesson MDX file has frontmatter matching the Course Doc §11 Content Object Model:

```yaml
---
id: lesson-2-04
title: Daily Load Profiles
module: load-demand-and-solar-resource
difficulty: beginner
pacer_type: procedural
nigerian_context: true
learning_objective: Build a 24-hour load profile for a Nigerian mini-grid community.
estimated_minutes: 25
xp: 20
prerequisites: [lesson-2-01, lesson-2-02]
assessment_type: practice          # 'quiz' | 'practice' | 'reading'
mastery_threshold: 80
flashcard_deck: load-analysis      # optional
quiz: ./quiz.json                  # optional sibling file
---
```

A build-time script validates frontmatter, prerequisite graph (no cycles), and that every `pacer_type` has a matching digestion component on the page.

### 5.1 PACER digestion components (MVP set)

| PACER type | MVP component | v2 plan |
|---|---|---|
| Procedural | `<PracticeTask>` (links to relevant Lab) | unchanged |
| Reference | `<FlashcardPrompt deck="...">` | unchanged |
| Evidence | `<EvidenceQuote>` (read-only fact card; learner clicks "I have stored this") | learner-editable Evidence Vault |
| Conceptual | `<ConceptMapPrompt mapId="...">` — opens the open-ended map builder | unchanged |
| Analogous | `<CritiquePrompt>` (multiple-choice "which trade-off is right") | open critique room |

Conceptual lessons get a real concept map builder in MVP (see §7.4). Analogous lessons stay as structured critique prompts in MVP — open critique room ships in v2.

---

## 6. MVP Curriculum Surface

All 9 modules from Course Doc are scaffolded, but lesson depth varies in MVP:

| Module | MVP depth | Notes |
|---|---|---|
| 0 Onboarding | full | Diagnostic quiz, role + scenario picker writes to `learners`. |
| 1 Nigeria Electricity | full | All lessons authored. |
| 2 Load & Solar Resource | full | Drives Load Survey Lab. |
| 3 PV Components & Sizing | full | Drives PV Sizing Lab. |
| 4 Hybrid Topologies | partial | Lessons authored; no SLD lab in MVP. |
| 5 Sizing/BoQ/Protection/O&M | partial | Lessons + quizzes only; no BoQ Builder. |
| 6 Regulation & Finance | full | Drives Regulatory Decision Tree Lab. |
| 7 Site Selection | partial | Lessons + quizzes only; no Site Sim. |
| 8 Simulation | reading-only | Concepts only; no simulation tooling. |
| 9 Capstone | tracker only | 22-section checklist with status + structured JSON inputs pulled from labs. No file upload, no reviewer panel. |

---

## 7. Labs — MVP Detailed Specs

### 7.1 Load Survey Lab (`/labs/load-survey`)

**Inputs (per row, learner adds N rows):**
`customer_class` enum, `appliance` text, `quantity` int, `power_w` number, `hours_per_day` number, `coincidence_factor` 0-1, `seasonal_factor` 0-1, `productive_use` boolean.

**Computed outputs:**
- daily Wh = Σ(qty × power × hours × seasonal)
- peak W = Σ(qty × power × coincidence)
- 24-hour load profile chart (uses an hour-of-use distribution preset per appliance class; learner can override)
- load class mix donut
- demand-risk flags (e.g. motor surge if any appliance > 1500 W with `inductive=true`)

**Persistence:** one `lab_artifacts` row with `lab_id='load-survey'`, payload = `{rows, computed, profile_hourly[24]}`.

### 7.2 PV Sizing Lab (`/labs/pv-sizing`)

**Inputs:** `daily_demand_wh`, `psh` (default 5.0 with regional presets — North 5.5, South 4.5), `derating` (default 0.75), `module_w`, `system_voltage` (12/24/48), `autonomy_days`, `battery_dod` (default 0.5 lead-acid, 0.8 Li-ion).

**Computed:**
- PV array W = demand / (psh × derating)
- module count = ceil(array_w / module_w)
- battery Wh = (demand × autonomy) / dod
- warning flags: voltage mismatch, undersized for autonomy, derating too aggressive.

**Cross-link:** prefills `daily_demand_wh` from latest `load-survey` artifact if present.

### 7.3 Regulatory Decision Tree (`/labs/regulatory-tree`)

Static decision tree authored in `decision-tree.json` (Course Doc §12). Inputs from radios/selects → renders the path with the **2026 NERC framework** (5 MW isolated / 10 MW interconnected, 100 kW registration threshold, 30-business-day NERC clock, 15-business-day DisCo silence rule, Tripartite Agreement requirement).

Outputs: regulator (NERC vs SERC), pathway (registration vs permit), required documents, NEMSA / SONCAP / MANCAP / COREN / NESREA checklist, community documentation needs.

Stored as `lab_artifacts` with `lab_id='regulatory-tree'`, payload = `{answers, derived_pathway}`.

### 7.4 Concept Map Builder (`/concept-maps/[mapId]`)

**Pedagogical stance: not scored.** PACER's conceptual digestion is about the learner constructing their *own* mental model. There is no single correct map. The system stores what the learner builds and rewards the act of building, not conformity to an answer key.

**Authoring** (one JSON file per map in `/content/concept-maps/*.json`):

```json
{
  "id": "nesi-overview",
  "title": "Nigeria Electricity System",
  "prompt": "Map how electricity reaches a Nigerian community today, and where a mini-grid fits.",
  "concept_pool": [
    { "id": "gencos", "label": "GenCos" },
    { "id": "tcn", "label": "Transmission (TCN, 330kV/132kV)" },
    { "id": "discos", "label": "DisCos (33kV/11kV/LV)" },
    { "id": "mini_grid", "label": "Mini-grid" },
    { "id": "captive", "label": "Captive generator" },
    { "id": "shs", "label": "Solar home system" },
    { "id": "community", "label": "Community / customer" },
    { "id": "nerc", "label": "NERC" },
    { "id": "serc", "label": "SERC" }
  ],
  "relatedness_hints": [
    ["gencos", "tcn", "these are connected — you decide how"],
    ["tcn", "discos", "these are connected — you decide how"],
    ["mini_grid", "community", "these are connected — you decide how"],
    ["nerc", "mini_grid", "one regulates the other under some conditions — figure out which"]
  ],
  "allow_custom_nodes": true,
  "min_nodes_to_submit": 5,
  "min_edges_to_submit": 3
}
```

**Editor behaviour:**
- React Flow canvas. Concept pool sits in a left palette; learner drags nodes in.
- Learner draws edges between any two nodes and **types their own relationship label** (e.g. "powers", "regulates", "competes with", "depends on PSH"). No dropdown of approved verbs.
- `allow_custom_nodes: true` lets the learner add concepts that aren't in the pool — important so the map reflects *their* understanding, not just the author's framing.
- "Show hints" toggle reveals `relatedness_hints` as faint dashed lines between concept pairs the author thinks are worth thinking about. The hint never says *how* they relate. Hints are off by default.
- Auto-save (debounced 2s) to `concept_maps` table; submit button sets `submitted_at` once `min_nodes` and `min_edges` thresholds are met.

**No scoring. No "correct" map. No comparison view in MVP.** A learner can revisit and revise the map any time; revisions overwrite the payload but `submitted_at` stays set so XP is awarded once.

**MVP map set** (per Course Doc §13, the highest-value 5):
1. `nesi-overview` — Nigeria Electricity System (Module 1)
2. `mini-grid-architecture` — Mini-grid system architecture (Module 3)
3. `pv-fundamentals` — PV physics & components (Module 3)
4. `hybrid-topology` — Hybrid topology trade-offs (Module 4)
5. `regulatory-ecosystem` — Regulator/developer/community/DisCo/financier (Module 6)

Remaining maps from Course Doc §13 (load & demand, financial model, project lifecycle, capstone integration) ship in v2.

---

## 8. Gamification (MVP)

Per Course Doc §7 — implement as-is, but only for the actions reachable in MVP:

| Action | XP | Available in MVP |
|---|---:|---|
| Complete lesson | 20 | yes |
| Complete PACER digestion | 10 | yes |
| Submit lab artifact | 40 | yes (3 labs) |
| Pass quiz ≥80% | 50 | yes |
| Improve failed quiz | 25 | yes |
| Complete capstone milestone | 150 | yes (status flip) |
| Build concept map (per map, on first submit) | 60 | yes |
| Site assessment / peer review | 80/40 | **v2** |

Ranks computed from completed module set (Course Doc §7 table). Badges awarded by rule engine after each progress write — rules live in `/lib/badges.ts` and read the learner's progress snapshot.

Leaderboard: top 50 by `total_xp` from `xp_events` aggregate, opt-in only.

---

## 9. Flashcards

Decks are JSON files in `/content/flashcards/*.json`. SRS = SM-2-lite (ease 1.3–2.5, intervals doubling on "good", reset on "again"). State per learner per card in `flashcard_state`. Daily review queue = `due_on <= today`.

---

## 10. Capstone Studio (MVP)

`/capstone` shows 22 sections from Course Doc §9. Each section status is `not_started | drafting | complete`. For sections with a corresponding lab, "complete" auto-fires when the lab artifact exists. For sections without a lab in MVP (e.g. Executive Summary, Risk Register, O&M Plan), the learner only marks status manually — no text editor in MVP. v2 adds rich text + reviewer scoring.

Capstone export: a `/capstone/export.json` route returns all of the learner's lab artifacts + section statuses as a single JSON file the learner can download. PDF export is v2.

---

## 11. Regulation Update Layer

`/content/regulation-updates.json` is a static file matching Course Doc §18. Lessons whose IDs appear in any update's `affected_lessons` render an inline alert banner ("Regulation changed — 2026 framework applies"). No live feed in MVP; updates ship by editing the JSON and redeploying.

---

## 12. Build Order (suggested 6 sprints, 2 weeks each)

1. **Foundation** — Next.js scaffold, Supabase project, schema, anonymous-ID + recovery code, `/settings`, `/restore`.
2. **Content engine** — MDX pipeline, lesson page template, frontmatter validator, Module 0 + Module 1 authored, lesson progress tracking, dashboard.
3. **PACER + assessment** — Quizzes, PACER digestion components, flashcards + SRS, XP ledger, badges, ranks.
4. **Labs + concept maps** — Load Survey, PV Sizing, Regulatory Decision Tree, React Flow concept map builder + 5 authored maps; cross-lab data flow; portfolio page.
5. **Curriculum fill** — Modules 2–8 authored to MVP depth, regulation update banners, leaderboard.
6. **Capstone + polish** — Capstone tracker, export JSON, learning map visual, recovery flow QA, perf pass, accessibility (WCAG AA), Lighthouse ≥90.

---

## 13. Acceptance Criteria (MVP done = all true)

- A learner can land on `/`, complete onboarding, and reach their dashboard without ever seeing a sign-up form.
- Closing the browser and reopening it preserves progress (IndexedDB).
- Entering the 3-word code on a fresh browser fully restores progress.
- All 9 modules are reachable; Modules 0, 1, 2, 3, 6 are full-depth; others meet the depths in §6.
- The 3 MVP labs save inputs, compute outputs, and the PV Sizing Lab prefills from Load Survey.
- The 5 MVP concept maps load in the React Flow editor; learner can add nodes (including custom ones), draw edges with self-written labels, toggle hints, save, and submit. No correctness scoring is shown anywhere.
- Quiz scores, XP, ranks, and badges update in real time and persist through reload.
- Regulatory Decision Tree reflects the **2026** NERC thresholds and timelines.
- A learner can export their full portfolio as a single JSON file.
- All Supabase tables enforce RLS keyed on `learner_id`; no cross-learner reads possible from the client.
- Lighthouse Performance + Accessibility ≥ 90 on `/dashboard` and a representative lesson page.

---

## 14. Explicitly Deferred to v2+

Critique Room · concept map comparison/sharing views · remaining 4 concept maps from Course Doc §13 · open-text capstone authoring · file uploads · SLD lab · BoQ Builder · Tariff/LCoE Workbench · Site Selection Simulator · Commissioning Checklist lab · Battery Sizing Lab · Admin/authoring UI · reviewer scoring panel · PDF export · live regulation feed · Hausa/Yoruba/Igbo glossary · DisCo territory map · AI tutor · HOMER/PVSyst integration.
