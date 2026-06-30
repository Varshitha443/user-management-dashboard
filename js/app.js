import {
  fetchUsers,
  fetchUser,
  createUser,
  updateUser,
  deleteUser,
  toApiPayload,
  checkApiConnection,
  onApiActivity,
  getApiActivityLog,
} from './api.js';
import {
  createInitialState,
  normalizeUser,
  getProcessedUsers,
  validateUserForm,
  countActiveFilters,
} from './state.js';
import {
  $,
  $$,
  showToast,
  openModal,
  closeModal,
  closeAllModals,
  renderLoading,
  renderError,
  renderEmpty,
  renderTable,
  renderSortIndicators,
  renderPagination,
  renderFilterChips,
  clearFormErrors,
  showFormErrors,
  fillUserForm,
  fillFilterForm,
  getUserFormData,
  getFilterFormData,
  setSubmitLoading,
  setDeleteLoading,
  renderApiStatus,
  appendApiActivity,
  toggleApiPanel,
} from './ui.js';

// app.js is the only file that mutates `state` directly. api.js and
// ui.js are kept stateless/pure-ish so this file is the single place
// that ties "what happened" (events) to "what changed" (state) to
// "what's shown" (render).
const state = createInitialState();
let searchDebounceTimer = null;

// The app's one render function. Every event handler below ends by
// mutating `state` and then calling render() — there's no two-way data
// binding, so this is the single point where state becomes DOM.
function render() {
  renderSortIndicators(state.sort);

  if (state.loading) {
    renderLoading(true);
    renderError(false);
    renderEmpty(false);
    return;
  }

  renderLoading(false);

  if (state.error) {
    renderError(true, state.error);
    $('#pagination-bar').hidden = true;
    return;
  }

  renderError(false);
  $('#pagination-bar').hidden = false;

  const { users, pageData } = getProcessedUsers(state);

  // If filtering/sorting shrank the result set, the page we were on may no
  // longer exist — getProcessedUsers() already clamps it, so we just sync
  // state back to whatever page it actually landed on.
  if (state.pagination.page !== pageData.currentPage) {
    state.pagination.page = pageData.currentPage;
  }

  if (users.length === 0) {
    const hasQuery =
      state.search.trim() || countActiveFilters(state.filters) > 0;
    renderEmpty(
      true,
      hasQuery
        ? 'No users match your search or filters.'
        : 'No users found.'
    );
    renderTable([]);
  } else {
    renderEmpty(false);
    renderTable(pageData.items);
  }

  renderPagination(pageData);
  renderFilterChips(state.filters, removeFilter);
  $('#page-size').value = String(state.pagination.pageSize);
}

// Initial data load (and the "Retry" button's handler). Sets loading/error
// flags around the fetch so render() can show the right state at each step,
// then always re-renders at the end regardless of success or failure.
async function loadUsers() {
  state.loading = true;
  state.error = null;
  render();

  try {
    const raw = await fetchUsers();
    state.allUsers = raw.map(normalizeUser);
    state.loading = false;
  } catch (err) {
    state.loading = false;
    state.error = err.message || 'Failed to load users. Please try again.';
  }

  render();
}

function removeFilter(key) {
  state.filters[key] = '';
  state.pagination.page = 1;
  fillFilterForm(state.filters);
  render();
}

async function handleAddUser() {
  state.formMode = 'add';
  clearFormErrors();
  fillUserForm(null);
  $('#user-modal-title').textContent = 'Add User';
  openModal($('#user-modal'));
}

// Edit flow tries to reuse the already-loaded user first (instant, no
// network) and only falls back to a fresh GET /users/:id if it's somehow
// not in local state — covers the JSONPlaceholder integration requirement
// without forcing an unnecessary round trip on the common path.
async function handleEditUser(id) {
  state.formMode = 'edit';
  clearFormErrors();

  let user = state.allUsers.find((u) => u.id === id);
  if (!user) {
    try {
      const raw = await fetchUser(id);
      user = normalizeUser(raw);
    } catch {
      showToast('Failed to load user details.', 'error');
      return;
    }
  }

  fillUserForm(user);
  $('#user-modal-title').textContent = 'Edit User';
  openModal($('#user-modal'));
}

function handleDeleteUser(id) {
  const user = state.allUsers.find((u) => u.id === id);
  state.deleteTargetId = id;
  $('#delete-modal-message').textContent = user
    ? `Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`
    : 'Are you sure you want to delete this user?';
  openModal($('#delete-modal'));
}

// Handles both Add and Edit, since they share the same form and the only
// difference is which API call + local state update runs (state.formMode
// decides which branch). Validation always runs first so an invalid form
// never reaches the network.
async function handleFormSubmit(e) {
  e.preventDefault();
  clearFormErrors();

  const formData = getUserFormData();
  const errors = validateUserForm(formData);

  if (Object.keys(errors).length > 0) {
    showFormErrors(errors);
    return;
  }

  setSubmitLoading(true);

  try {
    const payload = toApiPayload(formData);

    if (state.formMode === 'add') {
      const response = await createUser(payload);
      const newUser = normalizeUser({
        ...response,
        name: payload.name,
        email: payload.email,
        company: payload.company,
      });
      // JSONPlaceholder's mock POST doesn't reliably return a usable new
      // id, so if normalizeUser ended up without one, we synthesize the
      // next available id locally to keep the table consistent.
      if (!newUser.id) {
        newUser.id = Math.max(0, ...state.allUsers.map((u) => u.id)) + 1;
      }
      state.allUsers.push(newUser);
      showToast('User added successfully.');
    } else {
      // PUT here succeeds against the mock API but doesn't persist
      // server-side, so we apply the same update to local state directly
      // rather than trusting whatever the response body contains.
      await updateUser(formData.id, payload);
      const index = state.allUsers.findIndex((u) => u.id === formData.id);
      if (index !== -1) {
        state.allUsers[index] = { ...formData };
      }
      showToast('User updated successfully.');
    }

    closeModal($('#user-modal'));
    render();
  } catch (err) {
    showToast(err.message || 'Failed to save user.', 'error');
  } finally {
    setSubmitLoading(false);
  }
}

async function handleConfirmDelete() {
  const id = state.deleteTargetId;
  if (!id) return;

  setDeleteLoading(true);

  try {
    await deleteUser(id);
    state.allUsers = state.allUsers.filter((u) => u.id !== id);
    state.deleteTargetId = null;
    closeModal($('#delete-modal'));
    showToast('User deleted successfully.');
    render();
  } catch (err) {
    showToast(err.message || 'Failed to delete user.', 'error');
  } finally {
    setDeleteLoading(false);
  }
}

function handleSort(field) {
  if (state.sort.field === field) {
    state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    state.sort.field = field;
    state.sort.direction = 'asc';
  }
  render();
}

// Debounces search input so we don't re-filter/re-render on every
// keystroke — only after the user pauses typing for 300ms. Resetting
// page to 1 prevents landing on an empty/out-of-range page after a new
// search narrows the result set.
function handleSearchInput(value) {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    state.search = value;
    state.pagination.page = 1;
    render();
  }, 300);
}

// Wires up every DOM event exactly once, on load. Table row actions
// (edit/delete) use event delegation on the tbody rather than per-row
// listeners, since renderTable() rebuilds rows from scratch on every
// render and per-row listeners would otherwise need re-attaching each time.
function bindEvents() {
  $('#btn-add-user').addEventListener('click', handleAddUser);
  $('#btn-retry').addEventListener('click', loadUsers);

  $('#search-input').addEventListener('input', (e) => {
    handleSearchInput(e.target.value);
  });

  $('#btn-filter').addEventListener('click', () => {
    fillFilterForm(state.filters);
    openModal($('#filter-modal'));
  });

  $('#filter-form').addEventListener('submit', (e) => {
    e.preventDefault();
    state.filters = getFilterFormData();
    state.pagination.page = 1;
    closeModal($('#filter-modal'));
    render();
  });

  $('#btn-clear-filters').addEventListener('click', () => {
    state.filters = { firstName: '', lastName: '', email: '', department: '' };
    fillFilterForm(state.filters);
    state.pagination.page = 1;
    closeModal($('#filter-modal'));
    render();
  });

  $$('.sort-btn').forEach((btn) => {
    btn.addEventListener('click', () => handleSort(btn.dataset.sort));
  });

  $('#page-size').addEventListener('change', (e) => {
    state.pagination.pageSize = Number(e.target.value);
    state.pagination.page = 1;
    render();
  });

  $('#pagination').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    const page = Number(btn.dataset.page);
    if (page >= 1) {
      state.pagination.page = page;
      render();
    }
  });

  $('#users-tbody').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.action === 'edit') handleEditUser(id);
    if (btn.dataset.action === 'delete') handleDeleteUser(id);
  });

  $('#user-form').addEventListener('submit', handleFormSubmit);

  $('#btn-confirm-delete').addEventListener('click', handleConfirmDelete);

  $('#btn-api-log').addEventListener('click', () => toggleApiPanel(true));
  $('#btn-close-api-panel').addEventListener('click', () => toggleApiPanel(false));

  onApiActivity(appendApiActivity);
  getApiActivityLog().forEach(appendApiActivity);

  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-close-modal]')) {
      const modal = e.target.closest('.modal');
      if (modal) closeModal(modal);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });
}

bindEvents();

// App bootstrap: verify the JSONPlaceholder API is reachable first (so the
// status dot and offline toast are accurate), then load the actual user
// list regardless — loadUsers() has its own error handling if the
// subsequent fetch fails too.
async function init() {
  const { connected } = await checkApiConnection();
  renderApiStatus(connected);
  if (!connected) {
    showToast('Cannot reach JSONPlaceholder API. Check your internet connection.', 'error');
  }
  loadUsers();
}

init();
