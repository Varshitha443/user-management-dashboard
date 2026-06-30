const BASE_URL = 'https://jsonplaceholder.typicode.com';

export { BASE_URL };

export const API_ENDPOINTS = {
  list:   { method: 'GET',    path: '/users' },
  get:    { method: 'GET',    path: '/users/:id' },
  create: { method: 'POST',   path: '/users' },
  update: { method: 'PUT',    path: '/users/:id' },
  remove: { method: 'DELETE', path: '/users/:id' },
};

const activityLog = [];
const activityListeners = new Set();
const MAX_LOG = 8;

export function onApiActivity(listener) {
  activityListeners.add(listener);
  return () => activityListeners.delete(listener);
}

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

async function request(url, options = {}) {
  const method = options.method || 'GET';

  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });

    logActivity(method, url.replace(BASE_URL, ''), response.status);

    if (!response.ok) {
      const error = new Error(`Request failed: ${response.status} ${response.statusText}`);
      error.status = response.status;
      throw error;
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  } catch (err) {
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

export function toApiPayload(user) {
  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    company: { name: user.department },
  };
}
