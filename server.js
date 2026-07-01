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

const PORT = process.env.PORT || 3000;

const BASE_URL = 'https://api.airtable.com/v0';
const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const MAKE_WEBHOOK_URL     = process.env.MAKE_WEBHOOK_URL;
const MAKE_CSV_WEBHOOK_URL = process.env.MAKE_CSV_WEBHOOK_URL;

const TABLE_EMPLOYEE   = process.env.AIRTABLE_EMPLOYEE_TABLE   || 'Employee Analytics';
const TABLE_DEPARTMENT = process.env.AIRTABLE_DEPARTMENT_TABLE || 'Department_rollups';
const TABLE_EXECUTIVE  = process.env.AIRTABLE_EXECUTIVE_TABLE  || 'Executive_Summaries';

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

// ─── API routes ──────────────────────────────────────────────────────────────

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

// ─── Ask Stance (Make → Airtable → Claude) ──────────────────────────────────
// Make scenario must: receive {question}, fetch Airtable data, call Claude,
// and respond with: { summary, risk_level, recommendations[], confidence_score }

app.post('/api/ask', async (req, res) => {
  const { question } = req.body || {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question is required' });
  }

  if (!MAKE_WEBHOOK_URL) {
    return res.status(503).json({ error: 'MAKE_WEBHOOK_URL not configured — add it to .env' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  try {
    const makeRes = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!makeRes.ok) {
      const body = await makeRes.text();
      throw new Error(`Make ${makeRes.status}: ${body}`);
    }

    let raw = await makeRes.text();
    // Strip markdown code fences Claude sometimes adds
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const data = JSON.parse(raw);
    res.json(data);
  } catch (err) {
    clearTimeout(timer);
    const msg = err.name === 'AbortError' ? 'Make webhook timed out (60s)' : err.message;
    console.error('[/api/ask]', msg);
    res.status(500).json({ error: msg });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    configured: !!(API_KEY && BASE_ID),
    makeWebhook: !!MAKE_WEBHOOK_URL,
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

module.exports = app;
