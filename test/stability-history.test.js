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
