const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server.js');

test('getCookie: reads a named cookie from the header', () => {
  const req = { headers: { cookie: 'stance-theme=dark; stance_role=Direction' } };
  assert.equal(app.getCookie(req, 'stance_role'), 'Direction');
});

test('getCookie: returns null when the cookie is absent', () => {
  const req = { headers: { cookie: 'stance-theme=dark' } };
  assert.equal(app.getCookie(req, 'stance_role'), null);
});

test('getCookie: returns null when there is no cookie header at all', () => {
  assert.equal(app.getCookie({ headers: {} }, 'stance_role'), null);
});

test('tenureBucket: buckets years at company into executive-readable ranges', () => {
  assert.equal(app.tenureBucket(0), '0-1y');
  assert.equal(app.tenureBucket(1), '0-1y');
  assert.equal(app.tenureBucket(2), '1-3y');
  assert.equal(app.tenureBucket(3), '1-3y');
  assert.equal(app.tenureBucket(4), '3-5y');
  assert.equal(app.tenureBucket(5), '3-5y');
  assert.equal(app.tenureBucket(6), '5y+');
  assert.equal(app.tenureBucket(undefined), '0-1y');
});

test('computeCockpitSummary: aggregates risk counts org-wide, by department and by tenure', () => {
  const employees = [
    { Department: 'Sales', YearsAtCompany: 0, 'Risk Level': 'Critical' },
    { Department: 'Sales', YearsAtCompany: 2, 'Risk Level': 'High' },
    { Department: 'R&D', YearsAtCompany: 6, 'Risk Level': 'Low' },
    { Department: 'R&D', YearsAtCompany: 6, 'Risk Level': 'Moderate' }
  ];
  const result = app.computeCockpitSummary(employees);

  assert.equal(result.headcount, 4);
  assert.equal(result.critical, 1);
  assert.equal(result.high, 1);
  assert.equal(result.atRisk, 2);
  assert.equal(result.atRiskPct, 50);

  const sales = result.byDepartment.find(d => d.department === 'Sales');
  assert.equal(sales.atRiskPct, 100);
  const rnd = result.byDepartment.find(d => d.department === 'R&D');
  assert.equal(rnd.atRiskPct, 0);

  const tenure5plus = result.byTenure.find(t => t.bucket === '5y+');
  assert.equal(tenure5plus.headcount, 2);
  assert.equal(tenure5plus.atRisk, 0);
});

test('computeCockpitSummary: never surfaces individual employee fields', () => {
  const employees = [{ Department: 'Sales', YearsAtCompany: 1, 'Risk Level': 'Critical', 'First Name': 'Jane', ID: 42 }];
  const result = app.computeCockpitSummary(employees);
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes('Jane'));
  assert.ok(!serialized.includes('"ID"'));
});

test('computeFinancialEstimate: estimates cost from annual salary x ratio for at-risk employees only', () => {
  const employees = [
    { MonthlyIncome: 5000, 'Risk Level': 'Critical' },
    { MonthlyIncome: 4000, 'Risk Level': 'High' },
    { MonthlyIncome: 10000, 'Risk Level': 'Low' }
  ];
  const result = app.computeFinancialEstimate(employees, 0.5);
  assert.equal(result.atRiskCount, 2);
  assert.equal(result.criticalCount, 1);
  assert.equal(result.highCount, 1);
  // (5000*12*0.5) + (4000*12*0.5) = 30000 + 24000
  assert.equal(result.estimatedCost, 54000);
});

test('computeFinancialEstimate: falls back to the default 50% ratio for an invalid ratio', () => {
  const employees = [{ MonthlyIncome: 5000, 'Risk Level': 'Critical' }];
  const result = app.computeFinancialEstimate(employees, 0);
  assert.equal(result.ratio, 0.5);
  assert.equal(result.estimatedCost, 30000);
});
