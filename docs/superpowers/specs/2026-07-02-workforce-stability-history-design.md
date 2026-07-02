# Workforce Stability — real Airtable history for 3M/6M/1A/3A

## Context

The Workforce Stability chart on the Executive Briefing dashboard (`assets/dashboard-briefing.jsx`) currently offers four time-range filters (3M/6M/1A/3A), all backed by hardcoded demo arrays (`STAB_RANGE_META`, lines 58-80). No time-series data exists anywhere in the stack today — the Airtable tables (`Employee Analytics`, `Department_rollups`, `Executive_Summaries`, `HR_Uploads`) are all current-state snapshots, not history. There is no prior export or backfill source available; the historical series must be built from scratch starting from today.

The app runs as an Express app deployed on Vercel (`vercel.json`, `@vercel/node`), i.e. no long-running process is available for an in-memory scheduler — periodic capture must be driven externally.

## Goal

Replace the demo data backing 3M/6M/1A/3A with a real, accumulating history of a "Workforce Stability" metric, without ever presenting synthetic numbers as if they were real.

## Metric definition

Workforce Stability = **retention rate** (`100 - attritionRate`), the same metric already computed client-side in `assets/dashboard-realdata.js:137-141` from the `Attrition` field on `Employee Analytics` records. One value per snapshot.

## Part 1 — Capture & storage

### New Airtable table: `Workforce_Stability_Snapshots`

One record per calendar day, fields:

| Field | Type | Notes |
|---|---|---|
| `Date` | text (ISO `YYYY-MM-DD`) | one record per day, used as the upsert key |
| `Total` | number | employee count at capture time |
| `AttritionRate` | number (%) | same formula as `dashboard-realdata.js` |
| `RetentionRate` | number (%) | `100 - AttritionRate`; the value plotted |
| `AvgRisk` | number | average `Risk Score`, kept for future use |

This table must be created manually in Airtable by the user (no Airtable schema-write scope assumed on the current API token).

### Capture mechanism: Vercel Cron

- `vercel.json` gains a `crons` entry: `{ "path": "/api/snapshot-stability", "schedule": "0 6 * * *" }` (once daily, compatible with the Hobby plan's once-per-day limit).
- New env var `CRON_SECRET`, added to `.env` / Vercel project settings.
- New route in `server.js`: `GET /api/snapshot-stability`.
  - Rejects with `401` unless `Authorization: Bearer <CRON_SECRET>` header matches `process.env.CRON_SECRET`.
  - Fetches `/api/employees`-equivalent data via the existing `airtableFetch(TABLE_EMPLOYEE, ...)` helper (or the IBM CSV fallback, matching whatever `/api/employees` currently serves).
  - Computes `total`, `attritionRate`, `retentionRate`, `avgRisk` using the same formulas as `dashboard-realdata.js:136-141`.
  - Upsert by date: queries `Workforce_Stability_Snapshots` with `filterByFormula={Date}='<today ISO>'`; if a record exists, `PATCH` it; otherwise `POST` a new record. This makes the endpoint safe to call more than once on the same day (manual re-trigger, retries).

## Part 2 — Reading, bucketing, demo fallback

### New read endpoint: `GET /api/stability-history`

Returns the full snapshot history, sorted ascending by `Date`, as a plain array: `[{ date, total, attritionRate, retentionRate, avgRisk }, ...]`. No range filtering server-side — the frontend receives the full history and buckets it, consistent with the existing pattern where `dashboard-realdata.js` does all derivation client-side from raw records.

### Frontend bucketing (in `dashboard-briefing.jsx`, alongside `StabilityChart`)

A new fetch-on-mount (same shape as `dashboard-realdata.js`'s IIFE) loads `/api/stability-history` once and stores the raw snapshot list in `window.HUMIND` (e.g. `H._stabilityHistory`), dispatching `stance:data` on completion so `StabilityChart` re-renders.

For each range, snapshots are grouped into 12 buckets by averaging `retentionRate` within each window; the final bucket ("Now") is always the most recent snapshot:

| Range | Bucket size |
|---|---|
| 3M | 1 week |
| 6M | 1 fortnight |
| 1A | 1 month |
| 3A | 1 quarter |

### Demo → real switch-over, per range

Each range independently switches from demo to real data once the available history spans at least the full duration of that range:

- 3M → real once history spans ≥ 90 days
- 6M → real once history spans ≥ 180 days
- 1A → real once history spans ≥ 365 days
- 3A → real once history spans ≥ 1095 days

This is a pure date comparison (`oldest snapshot date` vs. `today - range duration`) re-evaluated on every render — no manual toggle, no stored config. Until a given range crosses its threshold, it keeps rendering today's `STAB_RANGE_META` demo values unchanged.

### Demo data badge

While a given range is still in demo mode, its subtitle (the `sub` prop passed to `BentoCard`) appends `· Demo data` (translated via `i18n.js`, e.g. `bf.stabDemoBadge`). The badge disappears automatically the moment that range crosses its real-data threshold.

### Error handling

If `/api/stability-history` fails, times out, or returns an empty array, every range falls back to demo mode with the badge — identical to the "not enough history yet" case. No error state is surfaced to the end user; a `console.warn` is logged, matching the existing error-handling style in `dashboard-realdata.js:214-216`.

## Testing plan

- Manual: call `/api/snapshot-stability` without/with a wrong `Authorization` header → expect `401`.
- Manual: call `/api/snapshot-stability` twice on the same day → expect exactly one Airtable record for that date (upsert, not duplicate).
- Manual: call `/api/stability-history` → expect an ascending-by-date array matching what's in Airtable.
- Visual: immediately after deploy (zero real history), all four range filters show the existing demo curves with the "Demo data" badge visible.

## Out of scope

- Backfilling history from any external source (none exists).
- Any metric other than retention rate (e.g. composite stability score) — can be revisited later without changing the storage shape (`AvgRisk` is already captured for that purpose).
- Make scenario alternative for capture (Vercel Cron was chosen instead, see decision above).
