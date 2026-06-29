/* HUMIND — real data layer
   Fetches /api/employees, transforms to HUMIND format, patches window.HUMIND,
   then dispatches 'stance:data' so the dashboard re-renders. */
(async function () {

  function mapRiskLevel(v) {
    if (!v) return 'Low';
    const u = v.toLowerCase();
    if (u === 'critical') return 'Critical';
    if (u === 'high')     return 'High';
    if (u === 'medium' || u === 'moderate') return 'Moderate';
    return 'Low';
  }

  function clamp(v) { return Math.min(100, Math.max(0, Math.round(v || 0))); }

  function deriveStats(e) {
    return [
      clamp((e.JobLevel || 1) * 14 + (e.PerformanceRating || 3) * 8),
      clamp((e.PerformanceRating || 3) * 22),
      clamp((e.JobSatisfaction || 2) * 18 + (e.JobInvolvement || 2) * 8),
      clamp((e.WorkLifeBalance || 2) * 18 + (e.EnvironmentSatisfaction || 2) * 8),
      clamp(100 - (e['Risk Score'] || 50)),
      clamp((e.TrainingTimesLastYear || 2) * 10 + (e.Education || 2) * 8),
      clamp((e.RelationshipSatisfaction || 2) * 22),
      clamp(Math.min(1, (e.YearsAtCompany || 1) / Math.max(1, e.TotalWorkingYears || 1)) * 80)
    ];
  }

  function parseActions(rec) {
    if (!rec) return [{ p: 'A', title: 'Manager check-in recommended', impact: 'Early intervention', effort: 'Low', pr: 'hi' }];
    const lines = rec.replace(/\n/g, ' ').split(/\d+[.)]\s+/).map(s => s.trim()).filter(s => s.length > 10).slice(0, 3);
    if (!lines.length) return [{ p: 'A', title: rec.slice(0, 60), impact: '', effort: 'Low', pr: 'hi' }];
    return lines.map((s, i) => ({
      p: String.fromCharCode(65 + i),
      title: s.split('.')[0].trim().slice(0, 70),
      impact: s.includes('.') ? s.split('.').slice(1).join('.').trim().slice(0, 60) : '',
      effort: i === 0 ? 'Low' : 'Medium',
      pr: i === 0 ? 'hi' : 'md'
    }));
  }

  function parseFactors(insights) {
    if (!insights) return [{ label: 'Risk factors unavailable', w: 100, trend: 'flat' }];
    const lines = insights.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4);
    const weights = [42, 28, 18, 12];
    return lines.map((l, i) => ({ label: l.slice(0, 45), w: weights[i] || 10, trend: i < 2 ? 'up' : 'flat' }));
  }

  function posAbbrev(role) {
    const m = {
      'Sales Executive': 'SALES', 'Research Scientist': 'SCI', 'Manager': 'MGR',
      'Laboratory Technician': 'TECH', 'Manufacturing Director': 'DIR',
      'Healthcare Representative': 'HC', 'Human Resources': 'HR',
      'Sales Representative': 'REP', 'Research Director': 'R&D'
    };
    return m[role] || (role || 'EMP').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4);
  }

  function deriveArchetype(riskLevel) {
    const m = { Critical: 'The Flight Risk', High: 'At Risk', Moderate: 'Watch Closely', Low: 'Stable Performer' };
    return m[riskLevel] || 'Unknown';
  }

  try {
    const res = await fetch('/api/employees');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const raw = await res.json();
    if (!Array.isArray(raw) || !raw.length) throw new Error('No employee data');

    const sorted = raw
      .filter(e => e['Risk Score'] != null)
      .sort((a, b) => (b['Risk Score'] || 0) - (a['Risk Score'] || 0));

    // ── Employees (top 10 by risk for the player cards) ──────────────────────
    const employees = sorted.slice(0, 10).map(e => {
      const fn = (e['First Name'] || '').trim();
      const ln = (e['Last Name'] || '').trim();
      const riskLevel = mapRiskLevel(e['Risk Level']);
      return {
        id: String(e.ID || e.id),
        name: `${fn} ${ln}`.trim(),
        initials: (fn[0] || '?') + (ln[0] || '?'),
        role: e.JobRole || 'Employee',
        pos: posAbbrev(e.JobRole),
        dept: e.Department || '',
        region: e.Department || '',
        tenure: `${e.YearsAtCompany || 0}y`,
        age: e['﻿Age'] || e.Age || 0,
        reports: (e.JobLevel || 1) >= 4 ? 'Manager' : 'IC',
        riskScore: e['Risk Score'] || 0,
        riskLevel,
        archetype: deriveArchetype(riskLevel),
        archetypeLine: (e.AI_Insights || '').split(',')[0].trim(),
        stats: deriveStats(e),
        deltas: [0, 0, 0, 0, 0, 0, 0, 0],
        summary: e.HR_Recommendation || e.AI_Insights || '',
        actions: parseActions(e.HR_Recommendation),
        factors: parseFactors(e.AI_Insights),
        fr: {}
      };
    });

    // ── High risk table (Attrition view) ─────────────────────────────────────
    const highRisk = sorted.slice(0, 8).map(e => ({
      name: `${(e['First Name'] || '').trim()} ${(e['Last Name'] || '').trim()}`.trim(),
      dept: e.Department || '',
      tenure: `${e.YearsAtCompany || 0}y`,
      risk: e['Risk Score'] || 0,
      driver: (e.AI_Insights || '').split(',')[0].replace(/^[A-Z][a-z]+ (is |are )?/, '').slice(0, 30) || 'Unknown',
      salary: e.MonthlyIncome ? `$${Number(e.MonthlyIncome).toLocaleString()}` : '—'
    }));

    // ── Departments (aggregated from employee data) ───────────────────────────
    const deptMap = {};
    raw.forEach(e => {
      const d = e.Department || 'Unknown';
      if (!deptMap[d]) deptMap[d] = { name: d, head: 0, riskSum: 0, engSum: 0, otCount: 0 };
      deptMap[d].head++;
      deptMap[d].riskSum += e['Risk Score'] || 0;
      deptMap[d].engSum  += (e.JobSatisfaction || 2) * 22;
      deptMap[d].otCount += (e.OverTime === 'Yes' || e.Overtime === 'Yes') ? 1 : 0;
    });
    const departments = Object.values(deptMap)
      .sort((a, b) => (b.riskSum / b.head) - (a.riskSum / a.head))
      .map(d => ({
        name: d.name,
        head: d.head,
        risk: Math.min(1, (d.riskSum / d.head) / 100),
        eng: clamp(d.engSum / d.head),
        otime: Math.round((d.otCount / d.head) * 100) / 100,
        region: 'MIXED'
      }));

    // ── KPIs ─────────────────────────────────────────────────────────────────
    const total = raw.length;
    const hasAttrition = raw.some(e => e.Attrition != null);
    const attritionCount = hasAttrition ? raw.filter(e => e.Attrition === 'Yes').length : null;
    const attritionRate = hasAttrition ? ((attritionCount / total) * 100).toFixed(1) : null;
    const avgRisk = total ? Math.round(raw.reduce((s, e) => s + (e['Risk Score'] || 0), 0) / total) : 0;
    const retentionRate = attritionRate ? (100 - parseFloat(attritionRate)).toFixed(1) : null;

    // ── All employees (basic fields) for search ──────────────────────────────
    const _searchEmps = raw.map(e => {
      const fn = (e['First Name'] || '').trim();
      const ln = (e['Last Name'] || '').trim();
      const riskLevel = mapRiskLevel(e['Risk Level']);
      return {
        id: String(e.ID || e.id || ''),
        name: `${fn} ${ln}`.trim(),
        role: e.JobRole || 'Employee',
        dept: e.Department || '',
        riskScore: e['Risk Score'] || 0,
        riskLevel
      };
    }).sort((a, b) => b.riskScore - a.riskScore);

    // ── Patch HUMIND ─────────────────────────────────────────────────────────
    Object.assign(window.HUMIND, {
      employees,
      highRisk,
      departments,
      _searchEmps,
      _kpis: { total, attritionRate, avgRisk, retentionRate }
    });

    window.dispatchEvent(new CustomEvent('stance:data', {
      detail: { total, attritionRate, avgRisk, retentionRate }
    }));

    console.log(`[Stance] Real data loaded — ${total} employees, attrition ${attritionRate}%, avg risk ${avgRisk}`);

  } catch (err) {
    console.warn('[Stance] Could not load Airtable data, using mock:', err.message);
  }
})();
