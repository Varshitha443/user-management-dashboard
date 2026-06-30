// Fixed department list used by both the Add/Edit form and the Filter form,
// so the two stay in sync and users can't type a department that doesn't
// exist anywhere else in the app (keeps filtering/sorting predictable).
export const DEPARTMENTS = [
  'Engineering',
  'Marketing',
  'Sales',
  'Human Resources',
  'Finance',
  'Operations',
  'Customer Support',
  'Product',
  'Design',
  'Legal',
];

// JSONPlaceholder's /users endpoint returns a single "name" field and a
// nested "company.name", but our UI works with firstName/lastName/department.
// This adapter converts the API shape into our internal shape in one place,
// so the rest of the app never has to know about JSONPlaceholder's schema.
export function normalizeUser(raw) {
  // Naive split: first word is treated as the first name, everything after
  // it is the last name. Good enough for JSONPlaceholder's seed data, but
  // would need a real name-parsing rule for production use.
  const nameParts = (raw.name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return {
    id: raw.id,
    firstName,
    lastName,
    email: raw.email || '',
    department: raw.company?.name || raw.department || 'Unknown',
  };
}

// Single source of truth for the whole app's UI state. Keeping it as one
// plain object (rather than scattered globals) makes it easy to reset,
// inspect, and reason about — there's exactly one place that "owns" state.
export function createInitialState() {
  return {
    allUsers: [],
    loading: true,
    error: null,
    search: '',
    filters: {
      firstName: '',
      lastName: '',
      email: '',
      department: '',
    },
    sort: { field: 'id', direction: 'asc' },
    pagination: { page: 1, pageSize: 10 },
    deleteTargetId: null,
    formMode: 'add',
  };
}

// Case-insensitive substring search across name/email/department.
// We build one combined "haystack" string per user instead of running
// four separate .includes() checks, which avoids repeating the same
// lowercase/includes logic four times (DRY) and reads as one clear check.
export function applySearch(users, query) {
  if (!query.trim()) return users;

  const q = query.trim().toLowerCase();
  return users.filter((user) => {
    const haystack = [
      user.firstName,
      user.lastName,
      `${user.firstName} ${user.lastName}`,
      user.email,
      user.department,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

// Applies the "Filter" modal's field-by-field criteria. Unlike search,
// each field here is matched independently (AND logic) and department
// uses an exact match since it's a fixed dropdown, not free text.
export function applyFilters(users, filters) {
  return users.filter((user) => {
    if (filters.firstName && !user.firstName.toLowerCase().includes(filters.firstName.toLowerCase())) {
      return false;
    }
    if (filters.lastName && !user.lastName.toLowerCase().includes(filters.lastName.toLowerCase())) {
      return false;
    }
    if (filters.email && !user.email.toLowerCase().includes(filters.email.toLowerCase())) {
      return false;
    }
    if (filters.department && user.department !== filters.department) {
      return false;
    }
    return true;
  });
}

// Sorts a copy of the array (never mutates the original) so re-sorting
// never has side effects on other parts of the app holding the same array.
// "id" is sorted numerically; every other column is compared as text,
// since the table's other fields (name, email, department) are strings.
export function applySort(users, sort) {
  const sorted = [...users];
  const { field, direction } = sort;
  const multiplier = direction === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    let valA = a[field];
    let valB = b[field];

    if (field === 'id') {
      return (valA - valB) * multiplier;
    }

    valA = String(valA || '').toLowerCase();
    valB = String(valB || '').toLowerCase();

    if (valA < valB) return -1 * multiplier;
    if (valA > valB) return 1 * multiplier;
    return 0;
  });

  return sorted;
}

// Slices the already-filtered/sorted list into one page's worth of rows.
// "safePage" guards against being stuck on a page number that no longer
// exists (e.g. user was on page 5, then a filter shrinks results to 2 pages).
export function paginate(users, { page, pageSize }) {
  const totalItems = users.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;

  return {
    items: users.slice(start, end),
    totalItems,
    totalPages,
    currentPage: safePage,
    pageSize,
    startIndex: totalItems === 0 ? 0 : start + 1,
    endIndex: Math.min(end, totalItems),
  };
}

// The full "view pipeline" for the users table: search narrows the set,
// filters narrow it further, sort orders what's left, then paginate slices
// out the current page. Order matters here — sorting before pagination
// (not after) ensures pages stay correct when sort direction changes.
export function getProcessedUsers(state) {
  let users = [...state.allUsers];
  users = applySearch(users, state.search);
  users = applyFilters(users, state.filters);
  users = applySort(users, state.sort);
  const pageData = paginate(users, state.pagination);

  return { users, pageData };
}

// Used to drive the "Filters (N)" badge on the toolbar button — counts
// only filters that actually have a non-blank value set.
export function countActiveFilters(filters) {
  return Object.values(filters).filter((v) => v && v.trim()).length;
}

// Client-side validation for the Add/Edit User form. Runs before any
// network request is made, so bad input never reaches the API and the
// user gets instant feedback instead of waiting on a round trip.
// Returns an object keyed by field name; an empty object means "valid".
export function validateUserForm({ firstName, lastName, email, department }) {
  const errors = {};

  if (!firstName.trim()) {
    errors.firstName = 'First name is required.';
  } else if (firstName.trim().length < 2) {
    errors.firstName = 'First name must be at least 2 characters.';
  }

  if (!lastName.trim()) {
    errors.lastName = 'Last name is required.';
  } else if (lastName.trim().length < 2) {
    errors.lastName = 'Last name must be at least 2 characters.';
  }

  if (!email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!department) {
    errors.department = 'Please select a department.';
  }

  return errors;
}
