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

export function normalizeUser(raw) {
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

export function getProcessedUsers(state) {
  let users = [...state.allUsers];
  users = applySearch(users, state.search);
  users = applyFilters(users, state.filters);
  users = applySort(users, state.sort);
  const pageData = paginate(users, state.pagination);

  return { users, pageData };
}

export function countActiveFilters(filters) {
  return Object.values(filters).filter((v) => v && v.trim()).length;
}

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
