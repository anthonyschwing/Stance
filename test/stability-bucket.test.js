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
