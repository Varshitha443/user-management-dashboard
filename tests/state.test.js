// Unit tests for js/state.js — the pure data-processing logic of the app
// (search, filter, sort, pagination, validation, API-shape normalization).
// Run with: npm test  (or: node --test tests/)
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeUser,
  applySearch,
  applyFilters,
  applySort,
  paginate,
  countActiveFilters,
  validateUserForm,
} from '../js/state.js';

// Shared fixture used across multiple test groups below.
const sampleUsers = [
  { id: 3, firstName: 'Carlos', lastName: 'Rivera', email: 'carlos@example.com', department: 'Sales' },
  { id: 1, firstName: 'Anita', lastName: 'Mehta', email: 'anita@example.com', department: 'Engineering' },
  { id: 2, firstName: 'Sophie', lastName: 'Muller', email: 'sophie@example.com', department: 'Marketing' },
];

describe('normalizeUser', () => {
  test('splits a full name into firstName and lastName', () => {
    const result = normalizeUser({ id: 1, name: 'Leanne Graham', email: 'leanne@example.com', company: { name: 'Romaguera-Crona' } });
    assert.equal(result.firstName, 'Leanne');
    assert.equal(result.lastName, 'Graham');
  });

  test('handles multi-word last names', () => {
    const result = normalizeUser({ id: 2, name: 'Clementine Von Bauch', email: 'c@example.com', company: { name: 'Romaguera-Crona' } });
    assert.equal(result.firstName, 'Clementine');
    assert.equal(result.lastName, 'Von Bauch');
  });

  test('maps company.name to department', () => {
    const result = normalizeUser({ id: 3, name: 'Test User', email: 't@example.com', company: { name: 'Acme Corp' } });
    assert.equal(result.department, 'Acme Corp');
  });

  test('falls back to "Unknown" when no company is present', () => {
    const result = normalizeUser({ id: 4, name: 'No Company', email: 'nc@example.com' });
    assert.equal(result.department, 'Unknown');
  });

  test('handles a missing/blank name without throwing', () => {
    const result = normalizeUser({ id: 5, email: 'blank@example.com' });
    assert.equal(result.firstName, '');
    assert.equal(result.lastName, '');
  });
});

describe('applySearch', () => {
  test('returns all users when the query is empty', () => {
    assert.deepEqual(applySearch(sampleUsers, ''), sampleUsers);
  });

  test('returns all users when the query is only whitespace', () => {
    assert.deepEqual(applySearch(sampleUsers, '   '), sampleUsers);
  });

  test('matches on first name, case-insensitively', () => {
    const result = applySearch(sampleUsers, 'CARLOS');
    assert.equal(result.length, 1);
    assert.equal(result[0].firstName, 'Carlos');
  });

  test('matches on department', () => {
    const result = applySearch(sampleUsers, 'engineering');
    assert.equal(result.length, 1);
    assert.equal(result[0].firstName, 'Anita');
  });

  test('matches on combined "firstName lastName"', () => {
    const result = applySearch(sampleUsers, 'sophie muller');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 2);
  });

  test('returns an empty array when nothing matches', () => {
    assert.deepEqual(applySearch(sampleUsers, 'nonexistent'), []);
  });
});

describe('applyFilters', () => {
  test('returns all users when no filters are set', () => {
    const filters = { firstName: '', lastName: '', email: '', department: '' };
    assert.deepEqual(applyFilters(sampleUsers, filters), sampleUsers);
  });

  test('filters by partial, case-insensitive firstName', () => {
    const filters = { firstName: 'an', lastName: '', email: '', department: '' };
    const result = applyFilters(sampleUsers, filters);
    assert.equal(result.length, 1);
    assert.equal(result[0].firstName, 'Anita');
  });

  test('filters by exact department match', () => {
    const filters = { firstName: '', lastName: '', email: '', department: 'Sales' };
    const result = applyFilters(sampleUsers, filters);
    assert.equal(result.length, 1);
    assert.equal(result[0].department, 'Sales');
  });

  test('combines multiple filters with AND logic', () => {
    const filters = { firstName: 'Sophie', lastName: '', email: '', department: 'Engineering' };
    const result = applyFilters(sampleUsers, filters);
    assert.equal(result.length, 0);
  });
});

describe('applySort', () => {
  test('sorts numerically by id, ascending', () => {
    const result = applySort(sampleUsers, { field: 'id', direction: 'asc' });
    assert.deepEqual(result.map((u) => u.id), [1, 2, 3]);
  });

  test('sorts numerically by id, descending', () => {
    const result = applySort(sampleUsers, { field: 'id', direction: 'desc' });
    assert.deepEqual(result.map((u) => u.id), [3, 2, 1]);
  });

  test('sorts alphabetically by firstName', () => {
    const result = applySort(sampleUsers, { field: 'firstName', direction: 'asc' });
    assert.deepEqual(result.map((u) => u.firstName), ['Anita', 'Carlos', 'Sophie']);
  });

  test('does not mutate the original array', () => {
    const original = [...sampleUsers];
    applySort(sampleUsers, { field: 'id', direction: 'desc' });
    assert.deepEqual(sampleUsers, original);
  });
});

describe('paginate', () => {
  const fortySevenUsers = Array.from({ length: 47 }, (_, i) => ({ id: i + 1 }));

  test('returns the correct slice for the first page', () => {
    const result = paginate(fortySevenUsers, { page: 1, pageSize: 10 });
    assert.equal(result.items.length, 10);
    assert.equal(result.items[0].id, 1);
    assert.equal(result.startIndex, 1);
    assert.equal(result.endIndex, 10);
  });

  test('returns a partial slice on the last page', () => {
    const result = paginate(fortySevenUsers, { page: 5, pageSize: 10 });
    assert.equal(result.items.length, 7);
    assert.equal(result.totalPages, 5);
  });

  test('clamps an out-of-range page back to the last valid page', () => {
    const result = paginate(fortySevenUsers, { page: 99, pageSize: 10 });
    assert.equal(result.currentPage, 5);
  });

  test('clamps a page below 1 up to page 1', () => {
    const result = paginate(fortySevenUsers, { page: 0, pageSize: 10 });
    assert.equal(result.currentPage, 1);
  });

  test('handles an empty list without dividing by zero', () => {
    const result = paginate([], { page: 1, pageSize: 10 });
    assert.equal(result.totalItems, 0);
    assert.equal(result.totalPages, 1);
    assert.equal(result.startIndex, 0);
    assert.equal(result.endIndex, 0);
  });
});

describe('countActiveFilters', () => {
  test('returns 0 when all filters are blank', () => {
    assert.equal(countActiveFilters({ firstName: '', lastName: '  ', email: '', department: '' }), 0);
  });

  test('counts only non-blank filters', () => {
    assert.equal(
      countActiveFilters({ firstName: 'Sam', lastName: '', email: 'x@y.com', department: '' }),
      2
    );
  });
});

describe('validateUserForm', () => {
  const validForm = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    department: 'Engineering',
  };

  test('returns no errors for fully valid input', () => {
    assert.deepEqual(validateUserForm(validForm), {});
  });

  test('flags a missing first name', () => {
    const errors = validateUserForm({ ...validForm, firstName: '' });
    assert.ok(errors.firstName);
  });

  test('flags a first name that is too short', () => {
    const errors = validateUserForm({ ...validForm, firstName: 'J' });
    assert.ok(errors.firstName);
  });

  test('flags a missing email', () => {
    const errors = validateUserForm({ ...validForm, email: '' });
    assert.ok(errors.email);
  });

  test('flags a malformed email', () => {
    const errors = validateUserForm({ ...validForm, email: 'not-an-email' });
    assert.ok(errors.email);
  });

  test('flags a missing department', () => {
    const errors = validateUserForm({ ...validForm, department: '' });
    assert.ok(errors.department);
  });

  test('reports multiple errors at once when several fields are invalid', () => {
    const errors = validateUserForm({ firstName: '', lastName: '', email: '', department: '' });
    assert.equal(Object.keys(errors).length, 4);
  });
});
