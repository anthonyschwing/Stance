require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { REQUIRED_FIELDS, MAPPABLE_FIELDS, describeFieldsForPrompt } = require('./field-schema');

const app = express();
// Default 100kb limit is too small for a base64-encoded Excel HR export
app.use(express.json({ limit: '15mb' }));

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
  const criticalCount = raw.filter(e => e['Risk Level'] === 'Critical').length;
  const highCount = raw.filter(e => e['Risk Level'] === 'High').length;
  return { total, attritionRate, avgRisk, retentionRate, criticalCount, highCount };
}

// ─── Cockpit (executive aggregates — no individual-level data) ──────────────

const TENURE_BUCKETS = ['0-1y', '1-3y', '3-5y', '5y+'];

function tenureBucket(years) {
  const y = +years || 0;
  if (y <= 1) return '0-1y';
  if (y <= 3) return '1-3y';
  if (y <= 5) return '3-5y';
  return '5y+';
}

function groupRiskCounts(rows) {
  const counts = { Critical: 0, High: 0, Moderate: 0, Low: 0 };
  rows.forEach(e => { if (counts[e['Risk Level']] != null) counts[e['Risk Level']]++; });
  const headcount = rows.length;
  const atRisk = counts.Critical + counts.High;
  return {
    headcount,
    critical: counts.Critical,
    high: counts.High,
    moderate: counts.Moderate,
    low: counts.Low,
    atRisk,
    atRiskPct: headcount ? Math.round((atRisk / headcount) * 1000) / 10 : 0
  };
}

function computeCockpitSummary(employees) {
  const byDeptMap = new Map();
  const byTenureMap = new Map();

  employees.forEach(e => {
    const dept = e.Department || 'Unknown';
    if (!byDeptMap.has(dept)) byDeptMap.set(dept, []);
    byDeptMap.get(dept).push(e);

    const bucket = tenureBucket(e.YearsAtCompany);
    if (!byTenureMap.has(bucket)) byTenureMap.set(bucket, []);
    byTenureMap.get(bucket).push(e);
  });

  const byDepartment = [...byDeptMap.entries()]
    .map(([department, rows]) => ({ department, ...groupRiskCounts(rows) }))
    .sort((a, b) => b.atRiskPct - a.atRiskPct);

  const byTenure = TENURE_BUCKETS
    .filter(b => byTenureMap.has(b))
    .map(bucket => ({ bucket, ...groupRiskCounts(byTenureMap.get(bucket)) }));

  return { ...groupRiskCounts(employees), byDepartment, byTenure };
}

const DEFAULT_REPLACEMENT_COST_RATIO = 0.5;

function computeFinancialEstimate(employees, ratio) {
  const r = typeof ratio === 'number' && ratio > 0 ? ratio : DEFAULT_REPLACEMENT_COST_RATIO;
  const atRisk = employees.filter(e => e['Risk Level'] === 'Critical' || e['Risk Level'] === 'High');
  const estimatedCost = atRisk.reduce((sum, e) => sum + (+e.MonthlyIncome || 0) * 12 * r, 0);
  return {
    ratio: r,
    atRiskCount: atRisk.length,
    criticalCount: atRisk.filter(e => e['Risk Level'] === 'Critical').length,
    highCount: atRisk.filter(e => e['Risk Level'] === 'High').length,
    estimatedCost: Math.round(estimatedCost),
    currency: 'USD'
  };
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
const TABLE_TURNOVER_COST     = process.env.AIRTABLE_TURNOVER_COST_TABLE     || 'Turnover_Cost_Assumptions';
const TABLE_COCKPIT_BRIEFING  = process.env.AIRTABLE_COCKPIT_BRIEFING_TABLE  || 'Cockpit_Briefings';
const TABLE_MAPPING           = process.env.AIRTABLE_MAPPING_TABLE           || 'Client_Field_Mappings';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL   = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

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

// ─── Lightweight role flag (no real session system — see signin.html) ──────
// Set as a plain cookie at sign-in. This is a UX/navigation gate, not a
// security boundary: it differentiates the Cockpit space from the RH
// dashboard so access isn't purely URL-obscurity based, but anyone can
// still forge the cookie. Good enough for the current stage of the product.

function getCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  const match = header.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function mapStabilitySnapshots(records) {
  return records.map(r => ({
    date: r.Date,
    total: r.Total,
    attritionRate: r.AttritionRate,
    retentionRate: r.RetentionRate,
    avgRisk: r.AvgRisk,
    // Only present on snapshots taken after Cockpit shipped — older rows
    // fall back to null so trend charts can skip them instead of plotting 0.
    criticalCount: r.CriticalCount != null ? r.CriticalCount : null,
    highCount: r.HighCount != null ? r.HighCount : null
  }));
}

// ─── Cockpit helpers: replacement-cost ratio + AI briefing ─────────────────

async function getTurnoverCostRatio() {
  if (!API_KEY || !BASE_ID) return DEFAULT_REPLACEMENT_COST_RATIO;
  try {
    const records = await airtableFetch(TABLE_TURNOVER_COST, {
      maxRecords: 1,
      sort: [{ field: 'Effective Date', direction: 'desc' }]
    });
    const ratio = records[0] && +records[0]['Avg Replacement Cost Ratio'];
    return ratio > 0 ? ratio : DEFAULT_REPLACEMENT_COST_RATIO;
  } catch (err) {
    console.warn('[getTurnoverCostRatio] falling back to default:', err.message);
    return DEFAULT_REPLACEMENT_COST_RATIO;
  }
}

const BRIEFING_TOOL = {
  name: 'cockpit_briefing',
  description: 'A short executive-level HR health synthesis, readable in a few seconds. No individual employee data.',
  input_schema: {
    type: 'object',
    properties: {
      synthesis: {
        type: 'string',
        description: '2-3 sentence executive synthesis: overall HR health, the biggest hotspot, and the financial stake. No employee names or individual detail.'
      },
      overall_signal: {
        type: 'string',
        description: 'One of: Low, Moderate, High, Critical — the organization-wide risk signal.'
      }
    },
    required: ['synthesis', 'overall_signal']
  }
};

async function generateCockpitBriefing(summary, financial) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');

  const topDepartments = summary.byDepartment.slice(0, 3)
    .map(d => `${d.department}: ${d.atRiskPct}% at risk (${d.critical} critical, ${d.high} high) of ${d.headcount}`)
    .join('; ');

  const prompt = `Organization-wide HR risk data (aggregated, no individual records):
- Total headcount: ${summary.headcount}
- At risk (critical + high): ${summary.atRisk} (${summary.atRiskPct}%)
- Breakdown: ${summary.critical} critical, ${summary.high} high, ${summary.moderate} moderate, ${summary.low} low
- Top departments by risk: ${topDepartments}
- Estimated turnover cost exposure: $${financial.estimatedCost.toLocaleString('en-US')} (${financial.atRiskCount} at-risk profiles, ${Math.round(financial.ratio * 100)}% of annual salary per replacement)

Write the executive synthesis for a COMEX/board audience who has a few seconds to read it.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 512,
      system: 'You are Stance Cockpit, an executive HR-health briefing generator. Write only in aggregate, executive tone — never mention individual employees.',
      tools: [BRIEFING_TOOL],
      tool_choice: { type: 'tool', name: 'cockpit_briefing' },
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const block = (data.content || []).find(b => b.type === 'tool_use' && b.name === 'cockpit_briefing');
  if (!block) throw new Error('Claude did not return a structured cockpit briefing');
  return block.input;
}

// ─── Client data import — smart column mapping ──────────────────────────────
// Translates a client's raw CSV/Excel export into the IBM-schema column
// names Sentinelle/Make already expect, upstream of the existing
// /api/upload → Make pipeline. Never writes to Airtable/Employee Analytics
// directly and never touches the Make scenario — purely a translation layer.

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase();
}

function parseExcelBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
}

function parseImportFile(fileData, filename) {
  const name = (filename || '').toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseExcelBuffer(Buffer.from(fileData, 'base64'));
  }
  return parseCSV(fileData);
}

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function rowsToCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(csvEscape).join(',')];
  rows.forEach(row => lines.push(headers.map(h => csvEscape(row[h])).join(',')));
  return lines.join('\n');
}

// Renames columns to their mapped internal field name; unmapped source
// columns are dropped. Never guesses — only what the user confirmed.
function applyMapping(rows, mapping) {
  const active = mapping.filter(m => m.internalField && m.internalField !== 'none');
  return rows.map(row => {
    const out = {};
    active.forEach(m => { out[m.internalField] = row[m.sourceColumn]; });
    return out;
  });
}

const MAPPING_TOOL = {
  name: 'propose_field_mapping',
  description: 'Propose which internal Stance field each raw column from a client HR export corresponds to.',
  input_schema: {
    type: 'object',
    properties: {
      mappings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            sourceColumn: { type: 'string' },
            internalField: { type: 'string', description: 'One of the listed internal field keys, or "none" if no confident match exists.' },
            confidence: { type: 'number', description: '0-100' }
          },
          required: ['sourceColumn', 'internalField', 'confidence']
        }
      }
    },
    required: ['mappings']
  }
};

async function suggestFieldMapping(headers, sampleRows) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');

  const columnLines = headers.map(h => {
    const examples = sampleRows.map(r => r[h]).filter(v => v !== undefined && v !== '').slice(0, 3).join(' | ');
    return `- "${h}" — example values: ${examples || '(empty)'}`;
  }).join('\n');

  const prompt = `Internal Stance fields available for mapping:\n${describeFieldsForPrompt()}\n\n` +
    `Raw columns detected in the client's file:\n${columnLines}\n\n` +
    `For every raw column, propose the single best-matching internal field key from the list above, ` +
    `or "none" if nothing matches confidently. Never invent a field key that isn't in the list above.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1536,
      system: 'You are Stance\'s data-import assistant. Map raw HR export columns to a fixed internal schema. Be conservative: if a column\'s meaning is ambiguous, return "none" rather than guessing.',
      tools: [MAPPING_TOOL],
      tool_choice: { type: 'tool', name: 'propose_field_mapping' },
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const block = (data.content || []).find(b => b.type === 'tool_use' && b.name === 'propose_field_mapping');
  if (!block) throw new Error('Claude did not return a structured mapping');
  return block.input.mappings || [];
}

async function getConfirmedMapping(client) {
  if (!API_KEY || !BASE_ID || !client) return {};
  try {
    const records = await airtableFetch(TABLE_MAPPING, {
      filterByFormula: `AND({Client}='${String(client).replace(/'/g, "\\'")}', {Status}='Confirmed')`
    });
    const map = {};
    records.forEach(r => {
      if (r.Source_Column && r.Internal_Field) map[normalizeHeader(r.Source_Column)] = r.Internal_Field;
    });
    return map;
  } catch (err) {
    console.warn('[getConfirmedMapping] falling back to no cached mapping:', err.message);
    return {};
  }
}

async function upsertMappingRecords(client, filename, mapping) {
  if (!API_KEY || !BASE_ID) return;
  const active = mapping.filter(m => m.internalField && m.internalField !== 'none');
  const today = new Date().toISOString().slice(0, 10);

  for (const m of active) {
    try {
      const existing = await airtableFetch(TABLE_MAPPING, {
        filterByFormula: `AND({Client}='${String(client).replace(/'/g, "\\'")}', {Internal_Field}='${m.internalField}')`,
        maxRecords: 1
      });
      const fields = {
        Client: client,
        Internal_Field: m.internalField,
        Source_Column: m.sourceColumn,
        Sample_Value: m.sampleValue != null ? String(m.sampleValue) : '',
        Status: 'Confirmed',
        Confirmed_At: today,
        Source_File: filename || ''
      };
      if (existing.length) await airtableWrite('PATCH', TABLE_MAPPING, fields, existing[0].id);
      else await airtableWrite('POST', TABLE_MAPPING, fields);
    } catch (err) {
      console.warn(`[upsertMappingRecords] could not persist mapping for ${m.internalField}:`, err.message);
    }
  }
}

async function forwardCsvToMake(csvData, filename) {
  if (!MAKE_CSV_WEBHOOK_URL) throw new Error('MAKE_CSV_WEBHOOK_URL not configured');
  const makeRes = await fetch(MAKE_CSV_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv_data: csvData, filename: filename || 'upload.csv' })
  });
  console.log('[forwardCsvToMake] Make responded:', makeRes.status);
  return makeRes.status;
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

    const { total, attritionRate, avgRisk, retentionRate, criticalCount, highCount } = computeStabilityAggregates(raw);
    const today = new Date().toISOString().slice(0, 10);
    const fields = {
      Date: today, Total: total, AttritionRate: attritionRate, RetentionRate: retentionRate, AvgRisk: avgRisk,
      CriticalCount: criticalCount, HighCount: highCount
    };

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

// ─── Cockpit (executive space — aggregates only, see /cockpit below) ───────

app.get('/api/cockpit/summary', async (req, res) => {
  try {
    const employees = await getEmployees();
    if (!employees.length) return res.status(503).json({ error: 'No employee data available' });
    res.json(computeCockpitSummary(employees));
  } catch (err) {
    console.error('[/api/cockpit/summary]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cockpit/trend', async (req, res) => {
  try {
    const records = await airtableFetch(TABLE_STABILITY, {
      sort: [{ field: 'Date', direction: 'asc' }]
    });
    res.json(mapStabilitySnapshots(records));
  } catch (err) {
    console.error('[/api/cockpit/trend]', err.message);
    res.json([]);
  }
});

app.get('/api/cockpit/financial', async (req, res) => {
  try {
    const employees = await getEmployees();
    if (!employees.length) return res.status(503).json({ error: 'No employee data available' });
    const ratio = await getTurnoverCostRatio();
    res.json(computeFinancialEstimate(employees, ratio));
  } catch (err) {
    console.error('[/api/cockpit/financial]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cockpit/briefing', async (req, res) => {
  try {
    const employees = await getEmployees();
    if (!employees.length) return res.status(503).json({ error: 'No employee data available' });

    const today = new Date().toISOString().slice(0, 10);

    if (API_KEY && BASE_ID) {
      try {
        const existing = await airtableFetch(TABLE_COCKPIT_BRIEFING, {
          filterByFormula: `{Date}='${today}'`,
          maxRecords: 1
        });
        if (existing.length) {
          return res.json({
            date: today,
            synthesis: existing[0].Synthesis,
            overallSignal: existing[0].Overall_Signal,
            turnoverCostEstimate: existing[0].Turnover_Cost_Estimate
          });
        }
      } catch (err) {
        console.warn('[/api/cockpit/briefing] Cockpit_Briefings read failed, will regenerate:', err.message);
      }
    }

    const summary = computeCockpitSummary(employees);
    const ratio = await getTurnoverCostRatio();
    const financial = computeFinancialEstimate(employees, ratio);
    const briefing = await generateCockpitBriefing(summary, financial);

    const record = {
      date: today,
      synthesis: briefing.synthesis,
      overallSignal: briefing.overall_signal,
      turnoverCostEstimate: financial.estimatedCost
    };

    if (API_KEY && BASE_ID) {
      airtableWrite('POST', TABLE_COCKPIT_BRIEFING, {
        Date: today,
        Synthesis: briefing.synthesis,
        Overall_Signal: briefing.overall_signal,
        Turnover_Cost_Estimate: financial.estimatedCost,
        Generated_At: new Date().toISOString()
      }).catch(err => console.warn('[/api/cockpit/briefing] could not persist briefing:', err.message));
    }

    res.json(record);
  } catch (err) {
    console.error('[/api/cockpit/briefing]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── CSV Upload → Make Ingestion ────────────────────────────────────────────

app.post('/api/upload', async (req, res) => {
  const { csv_data, filename } = req.body || {};
  if (!csv_data) return res.status(400).json({ error: 'csv_data is required' });

  try {
    await forwardCsvToMake(csv_data, filename);
    res.json({ ok: true });
  } catch (err) {
    console.error('[/api/upload]', err.message);
    const status = err.message === 'MAKE_CSV_WEBHOOK_URL not configured' ? 503 : 500;
    res.status(status).json({ error: err.message });
  }
});

// ─── Client data import — smart column mapping ─────────────────────────────

app.get('/api/import/fields', (req, res) => res.json(MAPPABLE_FIELDS));

app.post('/api/import/inspect', (req, res) => {
  const { file_data, filename } = req.body || {};
  if (!file_data) return res.status(400).json({ error: 'file_data is required' });

  try {
    const rows = parseImportFile(file_data, filename);
    if (!rows.length) return res.status(400).json({ error: 'File has no readable rows' });
    res.json({ headers: Object.keys(rows[0]), sampleRows: rows.slice(0, 5), rowCount: rows.length });
  } catch (err) {
    console.error('[/api/import/inspect]', err.message);
    res.status(400).json({ error: `Could not read file: ${err.message}` });
  }
});

app.post('/api/import/mapping/suggest', async (req, res) => {
  const { file_data, filename, client } = req.body || {};
  if (!file_data) return res.status(400).json({ error: 'file_data is required' });

  try {
    const rows = parseImportFile(file_data, filename);
    if (!rows.length) return res.status(400).json({ error: 'File has no readable rows' });

    const headers = Object.keys(rows[0]);
    const sample = rows.slice(0, 5);

    const cached = await getConfirmedMapping(client);
    const unresolved = headers.filter(h => !cached[normalizeHeader(h)]);

    const suggestions = unresolved.length ? await suggestFieldMapping(unresolved, sample) : [];

    const mapping = headers.map(h => {
      const firstNonEmpty = sample.find(r => r[h] !== undefined && r[h] !== '');
      const sampleValue = firstNonEmpty ? firstNonEmpty[h] : '';
      const cachedField = cached[normalizeHeader(h)];

      if (cachedField) {
        return { sourceColumn: h, internalField: cachedField, confidence: 100, status: 'Reused', sampleValue };
      }
      const s = unresolved.includes(h) ? suggestions.find(x => x.sourceColumn === h) : null;
      const internalField = s && s.internalField !== 'none' ? s.internalField : null;
      return {
        sourceColumn: h,
        internalField,
        confidence: s ? s.confidence : 0,
        status: internalField ? 'Suggested' : 'Unmapped',
        sampleValue
      };
    });

    const missingRequired = REQUIRED_FIELDS.filter(f => !mapping.some(m => m.internalField === f));

    res.json({ mapping, missingRequired, rowCount: rows.length });
  } catch (err) {
    console.error('[/api/import/mapping/suggest]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/import/mapping/confirm', async (req, res) => {
  const { file_data, filename, client, mapping } = req.body || {};
  if (!file_data) return res.status(400).json({ error: 'file_data is required' });
  if (!client || !String(client).trim()) return res.status(400).json({ error: 'client is required to save this mapping' });
  if (!Array.isArray(mapping) || !mapping.length) return res.status(400).json({ error: 'mapping is required' });

  const seen = new Map();
  for (const m of mapping) {
    if (!m.internalField || m.internalField === 'none') continue;
    if (seen.has(m.internalField)) {
      return res.status(400).json({ error: `Two columns are both mapped to "${m.internalField}" — pick one before confirming.` });
    }
    seen.set(m.internalField, m.sourceColumn);
  }

  const missingRequired = REQUIRED_FIELDS.filter(f => !seen.has(f));
  if (missingRequired.length) {
    return res.status(400).json({ error: 'Required fields are not mapped', missingRequired });
  }

  try {
    const rows = parseImportFile(file_data, filename);
    if (!rows.length) return res.status(400).json({ error: 'File has no readable rows' });

    const transformed = applyMapping(rows, mapping);
    const csvText = rowsToCSV(transformed);

    await upsertMappingRecords(client, filename, mapping);
    await forwardCsvToMake(csvText, filename || 'import.csv');

    res.json({ ok: true, client, rowsImported: transformed.length });
  } catch (err) {
    console.error('[/api/import/mapping/confirm]', err.message);
    const status = err.message === 'MAKE_CSV_WEBHOOK_URL not configured' ? 503 : 500;
    res.status(status).json({ error: err.message });
  }
});

app.get('/api/import/mapping/:client', async (req, res) => {
  try {
    const records = await airtableFetch(TABLE_MAPPING, {
      filterByFormula: `AND({Client}='${req.params.client.replace(/'/g, "\\'")}', {Status}='Confirmed')`
    });
    res.json(records.map(r => ({
      internalField: r.Internal_Field,
      sourceColumn: r.Source_Column,
      confirmedAt: r.Confirmed_At
    })));
  } catch (err) {
    console.error('[/api/import/mapping/:client]', err.message);
    res.json([]);
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
    tables: {
      employee: TABLE_EMPLOYEE, department: TABLE_DEPARTMENT, executive: TABLE_EXECUTIVE,
      turnoverCost: TABLE_TURNOVER_COST, cockpitBriefing: TABLE_COCKPIT_BRIEFING
    },
    anthropicConfigured: !!ANTHROPIC_API_KEY
  });
});

// ─── Static files ────────────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'Stance Landing.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'Stance Dashboard.html')));
app.get('/employee', (req, res) => res.redirect('/dashboard#employee'));
app.get('/sign-in', (req, res) => res.sendFile(path.join(__dirname, 'signin.html')));

// Cockpit is a distinct navigation space for Direction/COMEX — gated by the
// lightweight `stance_role` cookie set at sign-in (see signin.html). This is
// not a real permission system (no session, no server-side auth anywhere in
// this app yet) — it just means access is role-differentiated rather than
// purely URL-obscurity based.
app.get('/cockpit', (req, res) => {
  const role = getCookie(req, 'stance_role');
  if (!role) return res.redirect('/sign-in');
  if (role !== 'Direction') return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, 'Stance Cockpit.html'));
});

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

Object.assign(app, {
  getEmployees, computeStabilityAggregates, isValidCronAuth, mapStabilitySnapshots,
  getCookie, tenureBucket, computeCockpitSummary, computeFinancialEstimate,
  normalizeHeader, applyMapping, rowsToCSV, csvEscape, parseImportFile
});

module.exports = app;
