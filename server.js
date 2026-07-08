require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// ─── IBM HR CSV fallback helpers ─────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  if (!lines.length) return [];
  const headers = lines[0]
    .replace(/^﻿/, '') // strip BOM (IBM CSV starts with ﻿Age)
    .split(',')
    .map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = lines[i].split(',');
    const obj = {};
    headers.forEach((h, j) => { obj[h] = (vals[j] || '').replace(/^"|"$/g, '').trim(); });
    rows.push(obj);
  }
  return rows;
}

const FIRST = ['James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda',
  'William','Barbara','David','Elizabeth','Richard','Susan','Joseph','Jessica',
  'Thomas','Sarah','Charles','Karen','Christopher','Lisa','Daniel','Nancy',
  'Matthew','Betty','Anthony','Margaret','Donald','Sandra','Mark','Ashley',
  'Paul','Dorothy','Steven','Kimberly','Andrew','Emily','Kenneth','Donna',
  'Joshua','Michelle','Kevin','Carol','Brian','Amanda','George','Melissa',
  'Timothy','Deborah','Ronald','Stephanie','Edward','Rebecca','Jason','Sharon',
  'Jeffrey','Laura','Ryan','Cynthia','Jacob','Kathleen','Gary','Amy',
  'Nicholas','Angela','Eric','Shirley','Jonathan','Anna','Stephen','Brenda'];

const LAST = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis',
  'Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson',
  'Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White',
  'Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young',
  'Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Green',
  'Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter',
  'Roberts','Chen','Patel','Kim','Singh','Kumar','Park','Reyes','Cruz',
  'Reed','Cook','Morgan','Bell','Murphy','Bailey','Cooper','Richardson'];

function nameFor(n) {
  n = parseInt(n) || 1;
  return { first: FIRST[(n * 7) % FIRST.length], last: LAST[(n * 13) % LAST.length] };
}

function riskScore(e) {
  let s = 5;
  if (e.OverTime === 'Yes') s += 25;
  s += Math.max(0, (4 - (+e.JobSatisfaction        || 3)) * 8);
  s += Math.max(0, (4 - (+e.EnvironmentSatisfaction || 3)) * 6);
  s += Math.max(0, (4 - (+e.WorkLifeBalance         || 3)) * 7);
  s += Math.max(0, (4 - (+e.JobInvolvement          || 3)) * 5);
  const inc = +e.MonthlyIncome || 5000;
  s += inc < 3000 ? 15 : inc < 5000 ? 8 : inc < 7000 ? 3 : 0;
  const yrs = +e.YearsAtCompany || 0;
  s += yrs <= 1 ? 12 : yrs <= 3 ? 6 : 0;
  const lvl = +e.JobLevel || 2;
  s += lvl <= 1 ? 8 : lvl <= 2 ? 4 : 0;
  const nco = +e.NumCompaniesWorked || 0;
  s += nco >= 5 ? 8 : nco >= 3 ? 4 : 0;
  return Math.min(100, Math.max(5, s));
}

function riskLevel(score) {
  return score >= 80 ? 'Critical' : score >= 65 ? 'High' : score >= 45 ? 'Moderate' : 'Low';
}

function aiInsights(e) {
  const f = [];
  if (e.OverTime === 'Yes')                           f.push('Overtime load');
  if ((+e.JobSatisfaction        || 3) <= 2)          f.push('Low job satisfaction');
  if ((+e.EnvironmentSatisfaction || 3) <= 2)         f.push('Poor work environment');
  if ((+e.WorkLifeBalance         || 3) <= 2)         f.push('Work-life imbalance');
  if ((+e.MonthlyIncome           || 5000) < 3500)    f.push('Below-market compensation');
  else if ((+e.MonthlyIncome      || 5000) < 5000)    f.push('Compensation review needed');
  if ((+e.YearsAtCompany          || 0) <= 2)         f.push('Short tenure risk');
  if ((+e.JobLevel                || 2) <= 1)         f.push('Limited career progression');
  if ((+e.NumCompaniesWorked      || 0) >= 5)         f.push('High job mobility history');
  if (!f.length) f.push('Low overall risk profile');
  return f.slice(0, 4).join(', ');
}

function hrRecommendation(e, level) {
  if (level === 'Critical' || level === 'High') {
    if (e.OverTime === 'Yes')
      return '1. Reduce overtime load and review on-call distribution. 2. Schedule manager check-in within 48h. 3. Review compensation vs market band.';
    if ((+e.JobSatisfaction || 3) <= 2)
      return '1. Schedule skip-level conversation to surface concerns. 2. Review role clarity and growth path. 3. Consider internal mobility options.';
    return '1. Manager retention check-in. 2. Review compensation and career trajectory. 3. Assess workload and engagement signals.';
  }
  if (level === 'Moderate')
    return '1. Include in next engagement pulse cohort. 2. Monitor overtime and satisfaction signals. 3. Ensure development plan is current.';
  return '1. Maintain regular check-in cadence. 2. Continue development investment. 3. No immediate action required.';
}

function enrichIBM(rows) {
  return rows.map(e => {
    const num = +(e.EmployeeNumber || e['Employee Number']) || 1;
    const { first, last } = nameFor(num);
    const score = riskScore(e);
    const level = riskLevel(score);
    return {
      ...e,
      Age: +(e.Age || e['﻿Age']) || 0,  // handle BOM on first field
      ID: num,
      'First Name': first,
      'Last Name': last,
      'Risk Score': score,
      'Risk Level': level,
      AI_Insights: aiInsights(e),
      HR_Recommendation: hrRecommendation(e, level)
    };
  });
}

function computeStabilityAggregates(raw) {
  const total = raw.length;
  const hasAttrition = raw.some(e => e.Attrition != null);
  const attritionCount = hasAttrition ? raw.filter(e => e.Attrition === 'Yes').length : 0;
  const attritionRate = hasAttrition ? Math.round((attritionCount / total) * 1000) / 10 : null;
  const avgRisk = total ? Math.round(raw.reduce((s, e) => s + (e['Risk Score'] || 0), 0) / total) : 0;
  const retentionRate = attritionRate != null ? Math.round((100 - attritionRate) * 10) / 10 : null;
  return { total, attritionRate, avgRisk, retentionRate };
}

const PORT = process.env.PORT || 3000;

const BASE_URL = 'https://api.airtable.com/v0';
const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const MAKE_CSV_WEBHOOK_URL = process.env.MAKE_CSV_WEBHOOK_URL;
// Internal-only override for local testing (e.g. `vercel dev`); in production
// this resolves to the same deployment's own /api/rag-ask (Python function).
const RAG_API_URL = process.env.RAG_API_URL;
const CRON_SECRET = process.env.CRON_SECRET;

const TABLE_EMPLOYEE   = process.env.AIRTABLE_EMPLOYEE_TABLE   || 'Employee Analytics';
const TABLE_DEPARTMENT = process.env.AIRTABLE_DEPARTMENT_TABLE || 'Department_rollups';
const TABLE_EXECUTIVE  = process.env.AIRTABLE_EXECUTIVE_TABLE  || 'Executive_Summaries';
const TABLE_STABILITY  = process.env.AIRTABLE_STABILITY_TABLE  || 'Workforce_Stability_Snapshots';

// ─── Airtable helper ────────────────────────────────────────────────────────

async function airtableFetch(tableName, options = {}) {
  if (!API_KEY || !BASE_ID) {
    throw new Error('AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set in .env');
  }

  const url = new URL(`${BASE_URL}/${BASE_ID}/${encodeURIComponent(tableName)}`);

  if (options.maxRecords) url.searchParams.set('maxRecords', options.maxRecords);
  if (options.view)       url.searchParams.set('view', options.view);
  if (options.sort)       options.sort.forEach((s, i) => {
    url.searchParams.set(`sort[${i}][field]`, s.field);
    url.searchParams.set(`sort[${i}][direction]`, s.direction || 'desc');
  });
  if (options.filterByFormula) {
    url.searchParams.set('filterByFormula', options.filterByFormula);
  }

  const records = [];
  let offset = null;

  do {
    if (offset) url.searchParams.set('offset', offset);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable ${res.status}: ${body}`);
    }

    const json = await res.json();
    records.push(...json.records);
    offset = json.offset || null;
  } while (offset && !options.maxRecords);

  return records.map(r => ({ id: r.id, ...r.fields }));
}

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

function mapStabilitySnapshots(records) {
  return records.map(r => ({
    date: r.Date,
    total: r.Total,
    attritionRate: r.AttritionRate,
    retentionRate: r.RetentionRate,
    avgRisk: r.AvgRisk
  }));
}

// ─── API routes ──────────────────────────────────────────────────────────────

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

app.get('/api/departments', async (req, res) => {
  try {
    const data = await airtableFetch(TABLE_DEPARTMENT);
    res.json(data);
  } catch (err) {
    console.error('[/api/departments]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/summary', async (req, res) => {
  try {
    const data = await airtableFetch(TABLE_EXECUTIVE, {
      maxRecords: 1,
      sort: [{ field: 'Date', direction: 'desc' }]
    });
    res.json(data[0] || null);
  } catch (err) {
    console.error('[/api/summary]', err.message);
    res.status(500).json({ error: err.message });
  }
});

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

// ─── CSV Upload → Make Ingestion ────────────────────────────────────────────

app.post('/api/upload', async (req, res) => {
  const { csv_data, filename } = req.body || {};
  if (!csv_data) return res.status(400).json({ error: 'csv_data is required' });

  if (!MAKE_CSV_WEBHOOK_URL) {
    return res.status(503).json({ error: 'MAKE_CSV_WEBHOOK_URL not configured' });
  }

  try {
    const makeRes = await fetch(MAKE_CSV_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv_data, filename: filename || 'upload.csv' })
    });
    console.log('[/api/upload] Make responded:', makeRes.status);
    res.json({ ok: true });
  } catch (err) {
    console.error('[/api/upload]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Ask Stance (server.js → Python RAG function → Airtable + Claude) ──────
// /api/rag-ask (api/ask.py) does retrieval + generation and responds with:
// { summary, risk_level, recommendations[], confidence_score }

app.post('/api/ask', async (req, res) => {
  const { question } = req.body || {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question is required' });
  }

  const target = RAG_API_URL || `https://${req.get('host')}/api/rag-ask`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  try {
    const ragRes = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal: controller.signal
    });
    clearTimeout(timer);

    const data = await ragRes.json();
    if (!ragRes.ok) {
      throw new Error(data.error || `RAG endpoint ${ragRes.status}`);
    }
    res.json(data);
  } catch (err) {
    clearTimeout(timer);
    const msg = err.name === 'AbortError' ? 'Ask Stance RAG endpoint timed out (60s)' : err.message;
    console.error('[/api/ask]', msg);
    res.status(500).json({ error: msg });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    configured: !!(API_KEY && BASE_ID),
    csvUploadWebhook: !!MAKE_CSV_WEBHOOK_URL,
    tables: { employee: TABLE_EMPLOYEE, department: TABLE_DEPARTMENT, executive: TABLE_EXECUTIVE }
  });
});

// ─── Static files ────────────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'Stance Landing.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'Stance Dashboard.html')));
app.get('/employee', (req, res) => res.redirect('/dashboard#employee'));
app.get('/sign-in', (req, res) => res.sendFile(path.join(__dirname, 'signin.html')));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  Stance running → http://localhost:${PORT}`);
    if (!API_KEY || !BASE_ID) {
      console.log('  ⚠  No Airtable credentials — copy .env.example to .env and fill in your keys\n');
    } else {
      console.log('  ✓  Airtable configured\n');
    }
  });
}

Object.assign(app, { getEmployees, computeStabilityAggregates, isValidCronAuth, mapStabilitySnapshots });

module.exports = app;
