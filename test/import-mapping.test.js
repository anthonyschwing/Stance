const test = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');
const app = require('../server.js');

test('normalizeHeader: trims and lowercases for cache-key matching', () => {
  assert.equal(app.normalizeHeader('  Department '), 'department');
  assert.equal(app.normalizeHeader('DEPARTMENT'), 'department');
  assert.equal(app.normalizeHeader(undefined), '');
});

test('applyMapping: renames mapped columns and drops unmapped ones', () => {
  const rows = [{ 'Dept Name': 'Sales', 'Base Salary': '5000', Notes: 'ignore me' }];
  const mapping = [
    { sourceColumn: 'Dept Name', internalField: 'Department' },
    { sourceColumn: 'Base Salary', internalField: 'MonthlyIncome' },
    { sourceColumn: 'Notes', internalField: 'none' }
  ];
  const result = app.applyMapping(rows, mapping);
  assert.deepEqual(result, [{ Department: 'Sales', MonthlyIncome: '5000' }]);
});

test('applyMapping: a null internalField is treated the same as "none"', () => {
  const rows = [{ A: '1', B: '2' }];
  const mapping = [{ sourceColumn: 'A', internalField: 'Age' }, { sourceColumn: 'B', internalField: null }];
  assert.deepEqual(app.applyMapping(rows, mapping), [{ Age: '1' }]);
});

test('rowsToCSV: quotes values containing commas, quotes or newlines', () => {
  const rows = [{ Department: 'Sales, EMEA', Note: 'He said "hi"' }];
  const csv = app.rowsToCSV(rows);
  assert.equal(csv, 'Department,Note\n"Sales, EMEA","He said ""hi"""');
});

test('rowsToCSV: empty input yields an empty string', () => {
  assert.equal(app.rowsToCSV([]), '');
});

test('parseImportFile: parses a .csv file from raw text', () => {
  const rows = app.parseImportFile('Department,MonthlyIncome\nSales,5000\n', 'export.csv');
  assert.deepEqual(rows, [{ Department: 'Sales', MonthlyIncome: '5000' }]);
});

test('parseImportFile: parses a .xlsx file from a base64 buffer', () => {
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([['Dept', 'Salaire'], ['R&D', 6000]]);
  XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const rows = app.parseImportFile(buffer.toString('base64'), 'export.xlsx');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].Dept, 'R&D');
  assert.equal(String(rows[0].Salaire), '6000');
});
