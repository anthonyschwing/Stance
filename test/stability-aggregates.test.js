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
