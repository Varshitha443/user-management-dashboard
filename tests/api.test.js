// Unit tests for js/api.js. We replace the global `fetch` with a mock so
// these tests run instantly and offline, without hitting the real
// JSONPlaceholder API or depending on network conditions.
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchUsers,
  createUser,
  deleteUser,
  toApiPayload,
  checkApiConnection,
} from '../js/api.js';

const originalFetch = global.fetch;

function mockFetchOnce({ ok = true, status = 200, json = async () => ({}) } = {}) {
  global.fetch = async () => ({ ok, status, statusText: 'Mock', json });
}

beforeEach(() => {
  // Each test gets a clean mock so one test's fetch behavior can't leak
  // into the next.
  global.fetch = originalFetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('toApiPayload', () => {
  test('combines firstName and lastName into a single "name" field', () => {
    const payload = toApiPayload({ id: 1, firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', department: 'Sales' });
    assert.equal(payload.name, 'Jane Doe');
  });

  test('nests department under company.name to match the JSONPlaceholder schema', () => {
    const payload = toApiPayload({ id: 1, firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', department: 'Sales' });
    assert.deepEqual(payload.company, { name: 'Sales' });
  });
});

describe('fetchUsers', () => {
  test('returns parsed JSON on a successful response', async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => ([{ id: 1, name: 'Test User' }]) });
    const result = await fetchUsers();
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Test User');
  });

  test('throws an error when the response is not ok', async () => {
    mockFetchOnce({ ok: false, status: 500 });
    await assert.rejects(() => fetchUsers());
  });
});

describe('createUser', () => {
  test('sends a POST request and resolves with the response body', async () => {
    let capturedOptions;
    global.fetch = async (url, options) => {
      capturedOptions = options;
      return { ok: true, status: 201, json: async () => ({ id: 11 }) };
    };

    const result = await createUser({ name: 'New User', email: 'new@example.com' });
    assert.equal(capturedOptions.method, 'POST');
    assert.equal(result.id, 11);
  });
});

describe('deleteUser', () => {
  test('returns null for a 204 No Content response', async () => {
    mockFetchOnce({ ok: true, status: 204, json: async () => { throw new Error('should not be called'); } });
    const result = await deleteUser(1);
    assert.equal(result, null);
  });
});

describe('checkApiConnection', () => {
  test('reports connected: true when the API responds ok', async () => {
    mockFetchOnce({ ok: true, status: 200 });
    const result = await checkApiConnection();
    assert.equal(result.connected, true);
  });

  test('reports connected: false when fetch throws (e.g. offline)', async () => {
    global.fetch = async () => { throw new Error('Network error'); };
    const result = await checkApiConnection();
    assert.equal(result.connected, false);
    assert.equal(result.status, 0);
  });
});
