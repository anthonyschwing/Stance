const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server.js');

test('isValidCronAuth: accepts a matching bearer token', () => {
  assert.equal(app.isValidCronAuth('Bearer abc123', 'abc123'), true);
});

test('isValidCronAuth: rejects a missing header', () => {
  assert.equal(app.isValidCronAuth(undefined, 'abc123'), false);
});

test('isValidCronAuth: rejects a mismatched token', () => {
  assert.equal(app.isValidCronAuth('Bearer wrong', 'abc123'), false);
});

test('isValidCronAuth: rejects when no secret is configured', () => {
  assert.equal(app.isValidCronAuth('Bearer abc123', undefined), false);
});
