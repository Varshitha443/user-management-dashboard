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

const state = createInitialState();
let searchDebounceTimer = null;

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
      if (!newUser.id) {
        newUser.id = Math.max(0, ...state.allUsers.map((u) => u.id)) + 1;
      }
      state.allUsers.push(newUser);
      showToast('User added successfully.');
    } else {
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

function handleSearchInput(value) {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    state.search = value;
    state.pagination.page = 1;
    render();
  }, 300);
}

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

async function init() {
  const { connected } = await checkApiConnection();
  renderApiStatus(connected);
  if (!connected) {
    showToast('Cannot reach JSONPlaceholder API. Check your internet connection.', 'error');
  }
  loadUsers();
}

init();
