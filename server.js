require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());

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
  try {
    const data = await airtableFetch(TABLE_EMPLOYEE, { maxRecords: 200 });
    res.json(data);
  } catch (err) {
    console.error('[/api/employees]', err.message);
    res.status(500).json({ error: err.message });
  }
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
