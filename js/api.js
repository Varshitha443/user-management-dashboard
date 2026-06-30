// JSONPlaceholder is a free, no-auth REST API used here to simulate a real
// backend for CRUD operations (it doesn't actually persist writes — see
// the README for how the app compensates for that).
const BASE_URL = 'https://jsonplaceholder.typicode.com';

export { BASE_URL };

// Documents which HTTP verb + path each operation maps to. Mainly used to
// render the "Endpoints used" list in the API info panel, not by the
// request logic itself, but kept here so the mapping lives next to the
// functions that implement it.
export const API_ENDPOINTS = {
  list:   { method: 'GET',    path: '/users' },
  get:    { method: 'GET',    path: '/users/:id' },
  create: { method: 'POST',   path: '/users' },
  update: { method: 'PUT',    path: '/users/:id' },
  remove: { method: 'DELETE', path: '/users/:id' },
};

// In-memory log of recent API calls, shown in the "API Log" panel so the
// integration is visibly working rather than happening silently.
const activityLog = [];
const activityListeners = new Set();
const MAX_LOG = 8;

// Pub/sub so the UI layer can react to new API calls in real time without
// api.js needing to know anything about the DOM.
export function onApiActivity(listener) {
  activityListeners.add(listener);
  return () => activityListeners.delete(listener);
}

// Lets late subscribers (e.g. panel opened after some requests already
// happened) backfill the log instead of starting blank.
export function getApiActivityLog() {
  return [...activityLog];
}

function logActivity(method, url, status) {
  const entry = {
    method,
    url,
    status,
    time: new Date().toLocaleTimeString(),
  };
  activityLog.unshift(entry);
  if (activityLog.length > MAX_LOG) activityLog.pop();
  activityListeners.forEach((fn) => fn(entry));
}

// Single low-level fetch wrapper that every CRUD function below goes
// through. Centralizing this avoids duplicating headers, error handling,
// and activity logging in five separate places (DRY) and guarantees every
// request — successful or not — gets logged exactly once.
async function request(url, options = {}) {
  const method = options.method || 'GET';

  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });

    logActivity(method, url.replace(BASE_URL, ''), response.status);

    if (!response.ok) {
      // Non-2xx is still a "successful" fetch from the browser's point of
      // view, so we manually turn it into a thrown Error here — this lets
      // every caller use a single try/catch instead of checking response.ok
      // everywhere it calls the API.
      const error = new Error(`Request failed: ${response.status} ${response.statusText}`);
      error.status = response.status;
      throw error;
    }

    // DELETE typically returns 204 No Content — there's no body to parse.
    if (response.status === 204) {
      return null;
    }

    return response.json();
  } catch (err) {
    // Network-level failures (offline, CORS, DNS) never reach response.ok
    // above, so they wouldn't otherwise get logged. err.status is only set
    // for the HTTP-error case we threw ourselves, so its absence here means
    // this was a genuine network failure.
    if (!err.status) {
      logActivity(method, url.replace(BASE_URL, ''), 'ERR');
    }
    throw err;
  }
}

/** Ping JSONPlaceholder to verify the free API is reachable. */
export async function checkApiConnection() {
  try {
    const response = await fetch(`${BASE_URL}/users?_limit=1`);
    return { connected: response.ok, status: response.status };
  } catch {
    return { connected: false, status: 0 };
  }
}

export function fetchUsers() {
  return request(`${BASE_URL}/users`);
}

export function fetchUser(id) {
  return request(`${BASE_URL}/users/${id}`);
}

export function createUser(userPayload) {
  return request(`${BASE_URL}/users`, {
    method: 'POST',
    body: JSON.stringify(userPayload),
  });
}

export function updateUser(id, userPayload) {
  return request(`${BASE_URL}/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userPayload),
  });
}

export function deleteUser(id) {
  return request(`${BASE_URL}/users/${id}`, {
    method: 'DELETE',
  });
}

// Inverse of normalizeUser() in state.js: converts our internal
// firstName/lastName/department shape back into the name/company.name
// shape JSONPlaceholder expects, so writes match what the API was seeded
// with for reads.
export function toApiPayload(user) {
  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    company: { name: user.department },
  };
}
