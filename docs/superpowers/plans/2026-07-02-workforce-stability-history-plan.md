# Workforce Stability History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded demo curves behind the Workforce Stability chart's 3M/6M/1A/3A filters with a real, daily-accumulating history read from Airtable, without ever presenting synthetic numbers as real.

**Architecture:** A Vercel Cron job hits a new authenticated Express endpoint once a day, which computes a retention-rate snapshot from the existing employee data and upserts it into a new Airtable table. A second endpoint reads the full history back; the frontend buckets it into 12 points per range and only switches a given range from demo to real once its history spans that range's full duration, showing a "Demo data" badge until then.

**Tech Stack:** Express (existing `server.js`), Airtable REST API, Vercel Cron, vanilla JS + React/JSX (Babel standalone, existing `assets/*.jsx`), Node's built-in `node:test` runner (no new dependency — Node ≥18 already required by `package.json`).

## Global Constraints

- Metric plotted = retention rate, i.e. `100 - attritionRate`, computed the same way as `dashboard-realdata.js:137-141` already does client-side.
- New Airtable table name: `Workforce_Stability_Snapshots`, fields: `Date` (text, ISO `YYYY-MM-DD`), `Total` (number), `AttritionRate` (number), `RetentionRate` (number), `AvgRisk` (number). Must be created manually in Airtable (no schema-write API access assumed).
- Capture cadence: once daily via Vercel Cron (`0 6 * * *`), compatible with the Hobby plan's once-per-day cron limit. Snapshot capture must be idempotent per day (upsert, never duplicate).
- A range (3M/6M/1A/3A) only switches from demo to real data once available history spans at least: 3M ≥ 90 days, 6M ≥ 180 days, 1A ≥ 365 days, 3A ≥ 1095 days. This is a pure date comparison re-evaluated on every render.
- While a range is in demo mode, its subtitle must visibly append a "Demo data" badge (translated via `i18n.js`). Never show demo numbers without this badge.
- If the history endpoint fails or returns empty, every range falls back to demo mode with the badge — no error surfaced to the user, matching the existing `console.warn`-only error style in `dashboard-realdata.js:214-216`.
- No backfill from any external source (none exists) and no composite metric — out of scope for this plan.
- Follow existing project conventions: no new npm dependencies, no test framework beyond Node's built-in `node:test`, plain CommonJS in `server.js`, plain global-attaching scripts in `assets/`.

---

### Task 1: `computeStabilityAggregates` + `getEmployees` helper in `server.js`

**Files:**
- Modify: `server.js:179-208` (the `/api/employees` route body becomes a reusable `getEmployees()` helper)
- Modify: `server.js` (add `computeStabilityAggregates` near the other data-shaping helpers, e.g. directly after `enrichIBM`, before the `PORT` constant around line 122)
- Modify: `server.js` (near the bottom, just before `module.exports = app;`, attach internals for testability)
- Modify: `package.json` (add a `test` script)
- Test: `test/stability-aggregates.test.js`

**Interfaces:**
- Produces: `async function getEmployees(): Promise<Array<object>>` — returns Airtable employee records if configured and non-empty, otherwise the enriched IBM CSV fallback, otherwise `[]`. Attached as `app.getEmployees`.
- Produces: `function computeStabilityAggregates(raw: Array<object>): { total: number, attritionRate: number|null, avgRisk: number, retentionRate: number|null }`. Attached as `app.computeStabilityAggregates`.
- Consumed by: Task 3 (`/api/snapshot-stability` route).

- [ ] **Step 1: Write the failing test**

Create `test/stability-aggregates.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server.js');

test('computeStabilityAggregates: computes rates from mixed attrition data', () => {
  const raw = [
    { Attrition: 'Yes', 'Risk Score': 80 },
    { Attrition: 'No', 'Risk Score': 40 },
    { Attrition: 'No', 'Risk Score': 20 },
    { Attrition: 'No', 'Risk Score': 60 }
  ];
  const result = app.computeStabilityAggregates(raw);
  assert.equal(result.total, 4);
  assert.equal(result.attritionRate, 25);
  assert.equal(result.retentionRate, 75);
  assert.equal(result.avgRisk, 50);
});

test('computeStabilityAggregates: no Attrition field anywhere yields null rates', () => {
  const raw = [{ 'Risk Score': 50 }, { 'Risk Score': 30 }];
  const result = app.computeStabilityAggregates(raw);
  assert.equal(result.total, 2);
  assert.equal(result.attritionRate, null);
  assert.equal(result.retentionRate, null);
  assert.equal(result.avgRisk, 40);
});

test('computeStabilityAggregates: empty input yields zeroed totals', () => {
  const result = app.computeStabilityAggregates([]);
  assert.equal(result.total, 0);
  assert.equal(result.attritionRate, null);
  assert.equal(result.retentionRate, null);
  assert.equal(result.avgRisk, 0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/stability-aggregates.test.js`
Expected: FAIL — `TypeError: app.computeStabilityAggregates is not a function` (the function doesn't exist yet).

- [ ] **Step 3: Implement `computeStabilityAggregates` and refactor `getEmployees`**

In `server.js`, add this function directly after `enrichIBM` (currently ending around line 121, right before `const PORT = ...`):

```js
function computeStabilityAggregates(raw) {
  const total = raw.length;
  const hasAttrition = raw.some(e => e.Attrition != null);
  const attritionCount = hasAttrition ? raw.filter(e => e.Attrition === 'Yes').length : 0;
  const attritionRate = hasAttrition ? Math.round((attritionCount / total) * 1000) / 10 : null;
  const avgRisk = total ? Math.round(raw.reduce((s, e) => s + (e['Risk Score'] || 0), 0) / total) : 0;
  const retentionRate = attritionRate != null ? Math.round((100 - attritionRate) * 10) / 10 : null;
  return { total, attritionRate, avgRisk, retentionRate };
}
```

Replace the existing `/api/employees` route (`server.js:179-208`):

```js
app.get('/api/employees', async (req, res) => {
  // 1. Try Airtable (enriched data with AI fields already computed by Make)
  if (API_KEY && BASE_ID) {
    try {
      const data = await airtableFetch(TABLE_EMPLOYEE, { maxRecords: 1500 });
      if (data.length) return res.json(data);
    } catch (err) {
      console.warn('[/api/employees] Airtable failed:', err.message);
    }
  }

  // 2. Fallback: IBM HR CSV in assets/ibm-hr.csv (raw IBM + computed fields)
  const csvPath = path.join(__dirname, 'assets', 'ibm-hr.csv');
  if (fs.existsSync(csvPath)) {
    try {
      const text = fs.readFileSync(csvPath, 'utf8');
      const rows = parseCSV(text);
      if (!rows.length) throw new Error('CSV empty');
      const enriched = enrichIBM(rows);
      console.log(`[/api/employees] Serving IBM HR CSV — ${enriched.length} employees`);
      return res.json(enriched);
    } catch (csvErr) {
      console.error('[/api/employees] CSV parse error:', csvErr.message);
    }
  }

  res.status(503).json({
    error: 'No data source available. Configure Airtable in .env OR place ibm-hr.csv in assets/.'
  });
});
```

with this (extracting the fetch/fallback logic into `getEmployees()` and reusing it):

```js
async function getEmployees() {
  if (API_KEY && BASE_ID) {
    try {
      const data = await airtableFetch(TABLE_EMPLOYEE, { maxRecords: 1500 });
      if (data.length) return data;
    } catch (err) {
      console.warn('[getEmployees] Airtable failed:', err.message);
    }
  }

  const csvPath = path.join(__dirname, 'assets', 'ibm-hr.csv');
  if (fs.existsSync(csvPath)) {
    try {
      const text = fs.readFileSync(csvPath, 'utf8');
      const rows = parseCSV(text);
      if (!rows.length) throw new Error('CSV empty');
      const enriched = enrichIBM(rows);
      console.log(`[getEmployees] Serving IBM HR CSV — ${enriched.length} employees`);
      return enriched;
    } catch (csvErr) {
      console.error('[getEmployees] CSV parse error:', csvErr.message);
    }
  }

  return [];
}

app.get('/api/employees', async (req, res) => {
  const data = await getEmployees();
  if (data.length) return res.json(data);
  res.status(503).json({
    error: 'No data source available. Configure Airtable in .env OR place ibm-hr.csv in assets/.'
  });
});
```

Just before `module.exports = app;` at the bottom of `server.js`, add:

```js
Object.assign(app, { getEmployees, computeStabilityAggregates });

module.exports = app;
```

(replacing the bare `module.exports = app;` line.)

In `package.json`, update the `scripts` block to:

```json
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js",
    "test": "node --test test/"
  },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/stability-aggregates.test.js`
Expected: PASS — 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add server.js package.json test/stability-aggregates.test.js
git commit -m "feat: extract getEmployees helper, add computeStabilityAggregates"
```

---

### Task 2: Deployment config — Vercel Cron + env vars + Airtable table

**Files:**
- Modify: `vercel.json`
- Modify: `.env.example`
- Manual (outside this repo, cannot be automated): create the Airtable table; set `CRON_SECRET` in the Vercel project's environment variables.

**Interfaces:**
- Produces: `CRON_SECRET` and `AIRTABLE_STABILITY_TABLE` env vars, consumed by Task 3.
- Produces: a daily request from Vercel Cron to `GET /api/snapshot-stability`, which Task 3 implements.

- [ ] **Step 1: Add the cron entry to `vercel.json`**

Replace the full contents of `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node",
      "config": {
        "includeFiles": ["*.html", "*.css", "*.js", "*.jsx", "*.png", "assets/**/*"],
        "maxDuration": 60
      }
    }
  ],
  "routes": [{ "src": "/(.*)", "dest": "server.js" }],
  "crons": [
    { "path": "/api/snapshot-stability", "schedule": "0 6 * * *" }
  ]
}
```

- [ ] **Step 2: Verify the JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('vercel.json', 'utf8')); console.log('valid')"`
Expected: prints `valid`.

- [ ] **Step 3: Document the new env vars in `.env.example`**

Append to `.env.example`, after the existing `PORT=3000` line:

```

# ─── Workforce Stability history (cron snapshot) ──────────
# Créez manuellement une table Airtable "Workforce_Stability_Snapshots"
# avec les champs : Date (texte, format YYYY-MM-DD), Total (nombre),
# AttritionRate (nombre), RetentionRate (nombre), AvgRisk (nombre).
AIRTABLE_STABILITY_TABLE=Workforce_Stability_Snapshots

# Secret partagé avec Vercel Cron pour authentifier l'appel à
# /api/snapshot-stability. Générez une valeur aléatoire (ex: openssl rand -hex 32)
# et ajoutez-la aussi dans Project Settings → Environment Variables sur Vercel.
CRON_SECRET=
```

- [ ] **Step 4: Manual prerequisites (cannot be done by an agent — flag to the user)**

1. In Airtable, create the table `Workforce_Stability_Snapshots` in the same base as `Employee Analytics`, with fields `Date` (single line text), `Total` (number), `AttritionRate` (number), `RetentionRate` (number), `AvgRisk` (number).
2. Generate a random secret (e.g. `openssl rand -hex 32`), add it to the local `.env` as `CRON_SECRET=<value>`, and add the same value to the Vercel project's Production environment variables.

- [ ] **Step 5: Commit**

```bash
git add vercel.json .env.example
git commit -m "chore: add Vercel Cron entry and env vars for stability snapshots"
```

---

### Task 3: `/api/snapshot-stability` endpoint

**Files:**
- Modify: `server.js` (add `TABLE_STABILITY`/`CRON_SECRET` consts, `airtableWrite` helper, `isValidCronAuth` helper, new route, extend the `Object.assign` internals)
- Test: `test/cron-auth.test.js`

**Interfaces:**
- Consumes: `getEmployees()`, `computeStabilityAggregates()` from Task 1; `airtableFetch()` (existing, `server.js:137-175`).
- Produces: `function isValidCronAuth(authHeader: string|undefined, secret: string|undefined): boolean`, attached as `app.isValidCronAuth`.
- Produces: route `GET /api/snapshot-stability` — verified manually (network/Airtable-dependent, not unit tested).

- [ ] **Step 1: Write the failing test**

Create `test/cron-auth.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server.js');

test('isValidCronAuth: accepts a matching bearer token', () => {
  assert.equal(app.isValidCronAuth('Bearer abc123', 'abc123'), true);
});

test('isValidCronAuth: rejects a missing header', () => {
  assert.equal(app.isValidCronAuth(undefined, 'abc123'), false);
});

test('isValidCronAuth: rejects a mismatched token', () => {
  assert.equal(app.isValidCronAuth('Bearer wrong', 'abc123'), false);
});

test('isValidCronAuth: rejects when no secret is configured', () => {
  assert.equal(app.isValidCronAuth('Bearer abc123', undefined), false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/cron-auth.test.js`
Expected: FAIL — `TypeError: app.isValidCronAuth is not a function`.

- [ ] **Step 3: Implement the endpoint**

In `server.js`, add `TABLE_STABILITY` next to the other `TABLE_*` consts (around line 131-133):

```js
const TABLE_STABILITY = process.env.AIRTABLE_STABILITY_TABLE || 'Workforce_Stability_Snapshots';
```

Add `CRON_SECRET` next to `MAKE_WEBHOOK_URL`/`MAKE_CSV_WEBHOOK_URL` (around line 128-129):

```js
const CRON_SECRET = process.env.CRON_SECRET;
```

Add `airtableWrite` directly after the existing `airtableFetch` function (`server.js:137-175`):

```js
async function airtableWrite(method, tableName, fields, recordId) {
  const url = `${BASE_URL}/${BASE_ID}/${encodeURIComponent(tableName)}${recordId ? '/' + recordId : ''}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable ${res.status}: ${body}`);
  }
  return res.json();
}

function isValidCronAuth(authHeader, secret) {
  return !!secret && authHeader === `Bearer ${secret}`;
}
```

Add the new route directly after the existing `/api/summary` route (`server.js:220-231`), before the `// ─── CSV Upload` comment:

```js
app.get('/api/snapshot-stability', async (req, res) => {
  if (!isValidCronAuth(req.headers['authorization'], CRON_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!API_KEY || !BASE_ID) {
    return res.status(503).json({ error: 'Airtable not configured' });
  }

  try {
    const raw = await getEmployees();
    if (!raw.length) return res.status(503).json({ error: 'No employee data available' });

    const { total, attritionRate, avgRisk, retentionRate } = computeStabilityAggregates(raw);
    const today = new Date().toISOString().slice(0, 10);
    const fields = { Date: today, Total: total, AttritionRate: attritionRate, RetentionRate: retentionRate, AvgRisk: avgRisk };

    const existing = await airtableFetch(TABLE_STABILITY, {
      filterByFormula: `{Date}='${today}'`,
      maxRecords: 1
    });

    if (existing.length) {
      await airtableWrite('PATCH', TABLE_STABILITY, fields, existing[0].id);
    } else {
      await airtableWrite('POST', TABLE_STABILITY, fields);
    }

    res.json({ ok: true, date: today, ...fields });
  } catch (err) {
    console.error('[/api/snapshot-stability]', err.message);
    res.status(500).json({ error: err.message });
  }
});
```

Update the `Object.assign` call added in Task 1 to also expose `isValidCronAuth`:

```js
Object.assign(app, { getEmployees, computeStabilityAggregates, isValidCronAuth });
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/cron-auth.test.js`
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Manual verification against a running server**

Start the server: `npm run dev`

```bash
curl -i http://localhost:3000/api/snapshot-stability
```
Expected: `HTTP/1.1 401` with body `{"error":"Unauthorized"}` (no `CRON_SECRET` header sent).

```bash
curl -i http://localhost:3000/api/snapshot-stability -H "Authorization: Bearer $CRON_SECRET"
```
Expected (once Task 2's manual Airtable table creation is done and `.env` has `CRON_SECRET`/Airtable keys set): `HTTP/1.1 200` with a JSON body like `{"ok":true,"date":"2026-07-02","Total":100,"AttritionRate":16.0,"RetentionRate":84.0,"AvgRisk":42}`, and a new row visible in the `Workforce_Stability_Snapshots` Airtable table. Running the same command twice must not create a second row for the same date (check the table's row count stays the same).

- [ ] **Step 6: Commit**

```bash
git add server.js test/cron-auth.test.js
git commit -m "feat: add authenticated /api/snapshot-stability cron endpoint"
```

---

### Task 4: `/api/stability-history` endpoint

**Files:**
- Modify: `server.js` (add `mapStabilitySnapshots` helper, new route, extend `Object.assign`)
- Test: `test/stability-history.test.js`

**Interfaces:**
- Consumes: `airtableFetch()` (existing), `TABLE_STABILITY` (Task 3).
- Produces: `function mapStabilitySnapshots(records: Array<object>): Array<{date, total, attritionRate, retentionRate, avgRisk}>`, attached as `app.mapStabilitySnapshots`.
- Produces: route `GET /api/stability-history` returning that mapped array, ascending by date.
- Consumed by: Task 6 (`assets/dashboard-stability-history.js`).

- [ ] **Step 1: Write the failing test**

Create `test/stability-history.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server.js');

test('mapStabilitySnapshots: maps Airtable field names to a plain history entry', () => {
  const records = [
    { id: 'rec1', Date: '2026-01-01', Total: 100, AttritionRate: 12.5, RetentionRate: 87.5, AvgRisk: 40 }
  ];
  const result = app.mapStabilitySnapshots(records);
  assert.deepEqual(result, [
    { date: '2026-01-01', total: 100, attritionRate: 12.5, retentionRate: 87.5, avgRisk: 40 }
  ]);
});

test('mapStabilitySnapshots: maps an empty list to an empty list', () => {
  assert.deepEqual(app.mapStabilitySnapshots([]), []);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/stability-history.test.js`
Expected: FAIL — `TypeError: app.mapStabilitySnapshots is not a function`.

- [ ] **Step 3: Implement the endpoint**

In `server.js`, add directly after the `isValidCronAuth` function from Task 3:

```js
function mapStabilitySnapshots(records) {
  return records.map(r => ({
    date: r.Date,
    total: r.Total,
    attritionRate: r.AttritionRate,
    retentionRate: r.RetentionRate,
    avgRisk: r.AvgRisk
  }));
}
```

Add the route directly after the `/api/snapshot-stability` route from Task 3:

```js
app.get('/api/stability-history', async (req, res) => {
  try {
    const records = await airtableFetch(TABLE_STABILITY, {
      sort: [{ field: 'Date', direction: 'asc' }]
    });
    res.json(mapStabilitySnapshots(records));
  } catch (err) {
    console.error('[/api/stability-history]', err.message);
    res.json([]);
  }
});
```

Update the `Object.assign` call to also expose `mapStabilitySnapshots`:

```js
Object.assign(app, { getEmployees, computeStabilityAggregates, isValidCronAuth, mapStabilitySnapshots });
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/stability-history.test.js`
Expected: PASS — 2 tests passing.

- [ ] **Step 5: Manual verification against a running server**

With the server running (`npm run dev`):

```bash
curl -s http://localhost:3000/api/stability-history
```
Expected: a JSON array, ascending by `date` (e.g. `[]` if Task 3's manual snapshot hasn't been created yet, or `[{"date":"2026-07-02","total":100,...}]` if it has).

- [ ] **Step 6: Commit**

```bash
git add server.js test/stability-history.test.js
git commit -m "feat: add /api/stability-history endpoint"
```

---

### Task 5: `assets/stability-bucket.js` — pure bucketing logic

**Files:**
- Create: `assets/stability-bucket.js`
- Test: `test/stability-bucket.test.js`

**Interfaces:**
- Produces: `bucketStability(history: Array<{date: string, retentionRate: number}>, rangeDays: number, bucketCount?: number): Array<number>|null` — returns `null` if history is empty or doesn't span `rangeDays` yet; otherwise 12 (default) averaged values, with the last one always equal to the most recent snapshot.
- Produces: `bucketAxisLabels(rangeDays: number, tickCount?: number): Array<string>` — 7 (default) short date labels (`d/M`), the last one always `'Now'`.
- Exposed as `window.StanceStability` in the browser, and via `module.exports` under Node (used directly by the test file).
- Consumed by: Task 7 (`assets/dashboard-briefing.jsx`).

- [ ] **Step 1: Write the failing tests**

Create `test/stability-bucket.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { bucketStability, bucketAxisLabels } = require('../assets/stability-bucket.js');

function daysAgoISO(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

test('bucketStability: returns null when history is empty', () => {
  assert.equal(bucketStability([], 90), null);
});

test('bucketStability: returns null when history does not span the full range', () => {
  const history = [
    { date: daysAgoISO(10), retentionRate: 90 },
    { date: daysAgoISO(0), retentionRate: 92 }
  ];
  assert.equal(bucketStability(history, 90), null);
});

test('bucketStability: returns 12 buckets once history spans the full range', () => {
  const history = [];
  for (let i = 90; i >= 0; i--) history.push({ date: daysAgoISO(i), retentionRate: 88 });
  const result = bucketStability(history, 90);
  assert.equal(result.length, 12);
  result.forEach(v => assert.ok(Math.abs(v - 88) < 0.001));
});

test('bucketStability: last bucket always equals the most recent snapshot', () => {
  const history = [];
  for (let i = 90; i >= 1; i--) history.push({ date: daysAgoISO(i), retentionRate: 80 });
  history.push({ date: daysAgoISO(0), retentionRate: 97 });
  const result = bucketStability(history, 90);
  assert.equal(result[result.length - 1], 97);
});

test('bucketAxisLabels: returns 7 labels ending in "Now"', () => {
  const labels = bucketAxisLabels(90);
  assert.equal(labels.length, 7);
  assert.equal(labels[labels.length - 1], 'Now');
  labels.slice(0, -1).forEach(l => assert.match(l, /^\d{1,2}\/\d{1,2}$/));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/stability-bucket.test.js`
Expected: FAIL — `Cannot find module '../assets/stability-bucket.js'`.

- [ ] **Step 3: Implement `assets/stability-bucket.js`**

```js
/* HUMIND — Workforce Stability bucketing (pure logic, no DOM/React deps)
   Exposed as window.StanceStability in the browser, module.exports under Node. */
;(function (global) {
  'use strict';

  var DAY_MS = 86400000;

  function bucketStability(history, rangeDays, bucketCount) {
    bucketCount = bucketCount || 12;
    if (!history || !history.length) return null;

    var sorted = history.slice().sort(function (a, b) {
      return new Date(a.date) - new Date(b.date);
    });
    var now = new Date();
    var oldest = new Date(sorted[0].date);
    var spanDays = (now - oldest) / DAY_MS;
    if (spanDays < rangeDays) return null;

    var windowStart = new Date(now.getTime() - rangeDays * DAY_MS);
    var inWindow = sorted.filter(function (h) { return new Date(h.date) >= windowStart; });
    if (!inWindow.length) return null;

    var bucketMs = (rangeDays * DAY_MS) / bucketCount;
    var sums = new Array(bucketCount).fill(0);
    var counts = new Array(bucketCount).fill(0);

    inWindow.forEach(function (h) {
      var age = now - new Date(h.date);
      var idx = bucketCount - 1 - Math.floor(age / bucketMs);
      idx = Math.max(0, Math.min(bucketCount - 1, idx));
      sums[idx] += h.retentionRate;
      counts[idx] += 1;
    });

    var values = sums.map(function (s, i) { return counts[i] ? s / counts[i] : null; });
    var last = inWindow[0].retentionRate;
    for (var i = 0; i < values.length; i++) {
      if (values[i] == null) values[i] = last;
      else last = values[i];
    }
    values[bucketCount - 1] = inWindow[inWindow.length - 1].retentionRate;
    return values;
  }

  function bucketAxisLabels(rangeDays, tickCount) {
    tickCount = tickCount || 7;
    var now = new Date();
    var labels = [];
    for (var i = 0; i < tickCount; i++) {
      if (i === tickCount - 1) { labels.push('Now'); continue; }
      var daysAgo = Math.round(rangeDays * (1 - i / (tickCount - 1)));
      var d = new Date(now.getTime() - daysAgo * DAY_MS);
      labels.push(d.getDate() + '/' + (d.getMonth() + 1));
    }
    return labels;
  }

  var api = { bucketStability: bucketStability, bucketAxisLabels: bucketAxisLabels };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.StanceStability = api;
  }
}(typeof window !== 'undefined' ? window : this));
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/stability-bucket.test.js`
Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add assets/stability-bucket.js test/stability-bucket.test.js
git commit -m "feat: add pure Workforce Stability bucketing logic"
```

---

### Task 6: `assets/dashboard-stability-history.js` — fetch-on-mount loader

**Files:**
- Create: `assets/dashboard-stability-history.js`
- Modify: `Stance Dashboard.html:28-30`

**Interfaces:**
- Consumes: `GET /api/stability-history` (Task 4).
- Produces: `window.HUMIND._stabilityHistory: Array<{date, total, attritionRate, retentionRate, avgRisk}>`, and dispatches `window.dispatchEvent(new CustomEvent('stance:data', ...))` on completion (success or failure).
- Consumed by: Task 7 (`assets/dashboard-briefing.jsx`).

- [ ] **Step 1: Create the loader**

Create `assets/dashboard-stability-history.js`:

```js
/* HUMIND — Workforce Stability history loader
   Fetches /api/stability-history once, patches window.HUMIND._stabilityHistory,
   then dispatches 'stance:data' so StabilityChart can react to real history. */
(async function () {
  const H = window.HUMIND;
  try {
    const res = await fetch('/api/stability-history');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const history = await res.json();
    H._stabilityHistory = Array.isArray(history) ? history : [];
  } catch (err) {
    H._stabilityHistory = [];
    console.warn('[Stance] Could not load stability history:', err.message);
  }
  window.dispatchEvent(new CustomEvent('stance:data', { detail: { stabilityHistory: H._stabilityHistory } }));
})();
```

- [ ] **Step 2: Wire it into `Stance Dashboard.html`**

Replace:

```html
<script src="assets/dashboard-data.js"></script>
<script src="assets/dashboard-realdata.js"></script>
<script src="assets/i18n.js"></script>
```

with:

```html
<script src="assets/dashboard-data.js"></script>
<script src="assets/dashboard-realdata.js"></script>
<script src="assets/stability-bucket.js"></script>
<script src="assets/dashboard-stability-history.js"></script>
<script src="assets/i18n.js"></script>
```

- [ ] **Step 3: Manual verification**

Start the server: `npm run dev`. Open `http://localhost:3000/dashboard` in a browser, open devtools console, and run:

```js
window.HUMIND._stabilityHistory
```

Expected: an array (`[]` if no snapshots exist yet in Airtable, or one entry per captured day). No errors in the console.

- [ ] **Step 4: Commit**

```bash
git add assets/dashboard-stability-history.js "Stance Dashboard.html"
git commit -m "feat: load real Workforce Stability history into window.HUMIND"
```

---

### Task 7: Wire real/demo switch and "Demo data" badge into `StabilityChart`

**Files:**
- Modify: `assets/dashboard-briefing.jsx:55-140`
- Modify: `assets/i18n.js` (add `bf.stabDemoBadge` French translation, next to `bf.stab.note` around line 327)

**Interfaces:**
- Consumes: `window.StanceStability.bucketStability`/`bucketAxisLabels` (Task 5), `window.HUMIND._stabilityHistory` (Task 6), `T(key, fallback)` (existing `i18n.js`).

- [ ] **Step 1: Add the French translation**

In `assets/i18n.js`, directly after the line `'bf.stab.note': "IA Insight : ...",` (around line 327), add:

```js
    'bf.stabDemoBadge':     'Données de démo',
```

- [ ] **Step 2: Replace the `STAB_RANGE_META`/`StabilityChart` block**

In `assets/dashboard-briefing.jsx`, replace everything from the `/* DONNÉES DE DÉMONSTRATION` comment (line 55) through the closing `}` of `StabilityChart` (line 140) with:

```jsx
/* DONNÉES DE DÉMONSTRATION — utilisées tant que l'historique réel
   (window.HUMIND._stabilityHistory, alimenté par dashboard-stability-history.js)
   ne couvre pas encore toute la durée du range sélectionné. */
const STAB_RANGE_ORDER = ['3M', '6M', '1A', '3A'];
const STAB_RANGE_DAYS = { '3M': 90, '6M': 180, '1A': 365, '3A': 1095 };
const STAB_RANGE_META = {
  '3M': {
    subKey: 'bf.stabSub', subFb: 'Last 12 weeks',
    axis: ['W1', 'W2', 'W4', 'W6', 'W8', 'W10', 'Now'],
    values: [58, 62, 66, 68, 65, 70, 74, 72, 76, 78, 79, 81]
  },
  '6M': {
    subKey: 'bf.stabSub.6m', subFb: 'Last 6 months',
    axis: ['S1', 'S3', 'S5', 'S7', 'S9', 'S11', 'Now'],
    values: [52, 55, 59, 57, 62, 65, 63, 68, 71, 70, 75, 79]
  },
  '1A': {
    subKey: 'bf.stabSub.1a', subFb: 'Last 12 months',
    axis: ['Jan', 'Mar', 'Mai', 'Jul', 'Sep', 'Nov', 'Now'],
    values: [48, 52, 55, 53, 58, 61, 64, 67, 70, 73, 77, 81]
  },
  '3A': {
    subKey: 'bf.stabSub.3a', subFb: 'Last 3 years',
    axis: ['T1 24', 'T3 24', 'T1 25', 'T3 25', 'T1 26', 'Now'],
    values: [40, 45, 49, 52, 56, 59, 62, 65, 69, 73, 77, 81]
  }
};

function stabilityDataFor(range) {
  const demo = STAB_RANGE_META[range];
  const history = (window.HUMIND && window.HUMIND._stabilityHistory) || [];
  const realValues = window.StanceStability.bucketStability(history, STAB_RANGE_DAYS[range]);
  if (!realValues) {
    return { values: demo.values, axis: demo.axis, isDemo: true };
  }
  return { values: realValues, axis: window.StanceStability.bucketAxisLabels(STAB_RANGE_DAYS[range]), isDemo: false };
}

function StabilityChart() {
  const [range, setRange] = useB('3M');
  const meta = STAB_RANGE_META[range];
  const initial = stabilityDataFor(range);
  const [dispValues, setDispValues] = useB(() => initial.values.slice());
  const dispRef = React.useRef(initial.values.slice());
  const rafRef = React.useRef(0);
  const mounted = React.useRef(false);

  const { values: toValues, axis, isDemo } = stabilityDataFor(range);

  useE(() => {
    const to = toValues;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!mounted.current) { mounted.current = true; dispRef.current = to.slice(); setDispValues(to.slice()); return; }
    if (reduce) { dispRef.current = to.slice(); setDispValues(to.slice()); return; }
    const from = dispRef.current.slice();
    const dur = 400;
    const t0 = performance.now ? performance.now() : Date.now();
    const ease = t => 1 - Math.pow(1 - t, 3); // ease-out
    cancelAnimationFrame(rafRef.current);
    const finish = () => { dispRef.current = to.slice(); setDispValues(to.slice()); };
    const step = (now) => {
      const p = Math.min(1, ((now || Date.now()) - t0) / dur);
      const e = ease(p);
      const cur = to.map((v, i) => from[i] + (v - from[i]) * e);
      dispRef.current = cur; setDispValues(cur);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else finish();
    };
    rafRef.current = requestAnimationFrame(step);
    const guard = setTimeout(finish, dur + 160);
    return () => { cancelAnimationFrame(rafRef.current); clearTimeout(guard); };
  }, [range]);

  const subText = T(meta.subKey, meta.subFb) + (isDemo ? ' · ' + T('bf.stabDemoBadge', 'Demo data') : '');

  return (
    <BentoCard
      className="bc-primary" glass beam
      sub={subText}
      title={T('bf.stabTitle', 'Workforce Stability is Improving')}
      right={
        <div className="time-filter-group">
          {STAB_RANGE_ORDER.map(r => (
            <button
              key={r}
              className={'time-filter' + (range === r ? ' active' : '')}
              onClick={() => setRange(r)}>
              {r}
            </button>
          ))}
        </div>
      }>
      <AreaChart
        values={dispValues}
        h={160} color="var(--green)" fillId="bfStab" min={35} max={90} />
      <div className="axis-x">
        {axis.map((a, i) => <span key={i}>{a}</span>)}
      </div>
      <BriefAIRead>{T('bf.stab.note', 'AI Insight: Removing the top 3 exit drivers is modeled to sustain this improving trend into Q2.')}</BriefAIRead>
    </BentoCard>
  );
}
```

- [ ] **Step 3: Manual verification**

Start the server: `npm run dev`. Open `http://localhost:3000/dashboard`:

1. For each of the 4 filters (3M, 6M, 1A, 3A): click it, confirm the curve animates, confirm the subtitle reads e.g. `"Last 12 weeks · Demo data"` (all four should show the badge, since no real history exists yet), and confirm no console errors.
2. Toggle the language switch to French, confirm the badge text switches to `"... · Données de démo"`.
3. Reload the page and immediately click through all 4 filters before the history fetch could plausibly resolve — confirm no crash (values fall back to demo, per the `|| []` guard in `stabilityDataFor`).

- [ ] **Step 4: Commit**

```bash
git add assets/dashboard-briefing.jsx assets/i18n.js
git commit -m "feat: switch Workforce Stability chart to real history with demo-data badge"
```

---

## Self-Review

**Spec coverage:**
- New Airtable table + schema → Task 2.
- Vercel Cron capture, idempotent upsert, `CRON_SECRET` auth → Tasks 2, 3.
- `/api/stability-history` read endpoint → Task 4.
- Frontend bucketing (week/fortnight/month/quarter → 12 points) → Task 5 (`bucketStability` is range-agnostic on `rangeDays`, matching the spec's per-range bucket sizes since each range always resolves to 12 buckets regardless of unit).
- Per-range demo→real threshold → Task 5 (`bucketStability` returning `null` below threshold) + Task 7 (consuming that `null` as the demo/real switch).
- "Demo data" badge, disappearing per range independently → Task 7.
- Error handling (empty/failed history → demo mode, no user-facing error) → Task 6 (`catch` sets `[]`) + Task 5 (`bucketStability([])` → `null`) + Task 7 (`null` → demo).
- Testing plan (401 check, idempotency check, sorted history check, visual badge check) → Tasks 3, 4, 7 manual verification steps.
- Out-of-scope items (backfill, composite metric, Make scenario) — untouched by this plan, consistent with the spec.

**Placeholder scan:** no TBD/TODO; every step has complete, runnable code or exact commands.

**Type consistency:** `getEmployees`/`computeStabilityAggregates`/`isValidCronAuth`/`mapStabilitySnapshots` are attached once via a single evolving `Object.assign(app, {...})` call, with each task's diff shown against the previous task's version — names match exactly across Tasks 1, 3, 4. `bucketStability`/`bucketAxisLabels` signatures in Task 5 match their usage in Task 7 (`window.StanceStability.bucketStability(history, STAB_RANGE_DAYS[range])`, `window.StanceStability.bucketAxisLabels(STAB_RANGE_DAYS[range])`). The history shape (`{date, total, attritionRate, retentionRate, avgRisk}`) is identical across Task 4's `mapStabilitySnapshots`, Task 6's loader, and Task 5/7's consumers of `.date`/`.retentionRate`.
