const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server.js');

test('mapStabilitySnapshots: maps Airtable field names to a plain history entry', () => {
  const records = [
    { id: 'rec1', Date: '2026-01-01', Total: 100, AttritionRate: 12.5, RetentionRate: 87.5, AvgRisk: 40 }
  ];
  const result = app.mapStabilitySnapshots(records);
  assert.deepEqual(result, [
    { date: '2026-01-01', total: 100, attritionRate: 12.5, retentionRate: 87.5, avgRisk: 40, criticalCount: null, highCount: null }
  ]);
});

test('mapStabilitySnapshots: maps an empty list to an empty list', () => {
  assert.deepEqual(app.mapStabilitySnapshots([]), []);
});

test('mapStabilitySnapshots: passes through CriticalCount/HighCount when present', () => {
  const records = [
    { id: 'rec2', Date: '2026-02-01', Total: 100, AttritionRate: 10, RetentionRate: 90, AvgRisk: 38, CriticalCount: 5, HighCount: 12 }
  ];
  const result = app.mapStabilitySnapshots(records);
  assert.equal(result[0].criticalCount, 5);
  assert.equal(result[0].highCount, 12);
});
