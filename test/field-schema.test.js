const test = require('node:test');
const assert = require('node:assert/strict');
const { INTERNAL_FIELDS, REQUIRED_FIELDS, MAPPABLE_FIELDS, describeFieldsForPrompt } = require('../field-schema.js');

test('REQUIRED_FIELDS matches the fields server.js riskScore/aiInsights actually read', () => {
  const expected = [
    'Department', 'YearsAtCompany', 'MonthlyIncome', 'OverTime', 'JobSatisfaction',
    'EnvironmentSatisfaction', 'WorkLifeBalance', 'JobInvolvement', 'JobLevel', 'NumCompaniesWorked'
  ];
  assert.deepEqual(REQUIRED_FIELDS.slice().sort(), expected.slice().sort());
});

test('MAPPABLE_FIELDS excludes nothing tagged "ignore" and includes every required field', () => {
  assert.ok(MAPPABLE_FIELDS.every(f => f.tier !== 'ignore'));
  REQUIRED_FIELDS.forEach(key => {
    assert.ok(MAPPABLE_FIELDS.some(f => f.key === key), `${key} missing from MAPPABLE_FIELDS`);
  });
});

test('every internal field has a unique key', () => {
  const keys = INTERNAL_FIELDS.map(f => f.key);
  assert.equal(new Set(keys).size, keys.length);
});

test('describeFieldsForPrompt lists every mappable field key', () => {
  const text = describeFieldsForPrompt();
  MAPPABLE_FIELDS.forEach(f => assert.ok(text.includes(f.key), `${f.key} missing from prompt text`));
});
