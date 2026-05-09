# Mini-Grid Mastery Nigeria

A gamified learning platform that takes a complete beginner from basic electricity concepts to expert-level Nigerian mini-grid project judgement. Built around the **PACER** learning method (Procedural · Analogous · Conceptual · Evidence · Reference).

> Source-of-truth content brief: [`Mini grid training website.md`](./Mini%20grid%20training%20website.md)
> Buildable MVP spec: [`SPEC.md`](./SPEC.md)

---

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + `@tailwindcss/typography`
- **MDX** (lessons authored as files in `/content`)
- **Zustand** + **idb-keyval** for client-side state and IndexedDB persistence
- **Supabase** (Postgres) for anonymous-ID cross-device sync — *optional*; the app falls back to local-only mode if env vars are missing
- **React Flow** for open-ended concept maps (no auto-scoring)
- **Recharts** for load profiles and LCoE sensitivity charts

## Local development

```bash
npm install
cp .env.example .env.local      # optional — fill in Supabase creds if you want cloud sync
npm run dev
```

App runs at <http://localhost:3000>.

## How accounts work (or don't)

There are no accounts. On first visit, the app:

1. Generates a UUID v4 → your `learnerId`.
2. Generates a 3-word recovery code (e.g. `plum-river-42` — last two digits are a checksum).
3. Stores everything in IndexedDB and shows you the recovery code once.

To restore on another device, visit `/restore` and enter the code. There's no email reset — the code is the only credential. See [`/settings`](/settings) at any time to view or copy your code.

If Supabase env vars aren't set, cloud sync is disabled and progress is local-only — the app still works, you just can't restore on another device.

## Supabase setup (optional)

1. Create a Supabase project.
2. Open the SQL editor and paste/run [`supabase/schema.sql`](./supabase/schema.sql).
3. Copy the project URL and anon key into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
   ```
4. Restart `npm run dev`.

The schema uses permissive RLS for the MVP (acceptable because there's no PII and learner IDs are random UUIDs). Tighten before production — see the comment at the bottom of `schema.sql`.

## Deploying to Netlify

1. Push this repo to GitHub.
2. In Netlify, *Add new site → Import from Git → pick the repo*.
3. Netlify auto-detects Next.js. The `netlify.toml` in this repo wires in `@netlify/plugin-nextjs`.
4. Add env vars in *Site settings → Environment variables* (only needed if using Supabase):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy.

## Pushing to GitHub

`gh` CLI isn't installed on this machine. From the repo root:

```bash
git init
git add -A
git commit -m "feat: scaffold Mini-Grid Mastery NG (sprints 1–3)"
git branch -M main

# Then on github.com → New repository → name it (don't initialize with README/license).
# Copy the URL it gives you and:
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

## Content authoring

Lessons live as MDX in [`content/modules/`](./content/modules). Each lesson has YAML frontmatter:

```yaml
---
id: lesson-1-01
title: Nigeria's Electricity System
module: 01-nigeria-electricity
difficulty: beginner
pacer_type: conceptual
nigerian_context: true
learning_objective: Map how electricity reaches a Nigerian community.
estimated_minutes: 20
xp: 20
prerequisites: []
assessment_type: quiz
mastery_threshold: 80
---
```

Run `npm run validate-content` to check frontmatter and the prerequisite graph.

## What's in MVP vs deferred

See [`SPEC.md`](./SPEC.md) for the full breakdown. Short version:

**In MVP**: identity, sync, dashboard, learning map, all 9 modules scaffolded (5 full-depth), MDX lessons, quizzes, PACER digestion components, flashcards with SRS, 3 labs (Load Survey, PV Sizing, Regulatory Decision Tree), 5 open-ended concept maps, XP/ranks/badges, capstone tracker, JSON portfolio export.

**Deferred to v2**: critique room, BoQ Builder, Tariff/LCoE Workbench, SLD Lab, Site Selection Simulator, Commissioning Checklist, file uploads, admin UI, reviewer scoring panel, PDF export, AI tutor, HOMER/PVSyst integration.

## License

TBD.
