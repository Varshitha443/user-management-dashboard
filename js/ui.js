export function $(selector, root = document) {
  return root.querySelector(selector);
}

export function $$(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function showToast(message, type = 'success') {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

export function openModal(modal) {
  modal.hidden = false;
  document.body.classList.add('modal-open');
  const focusable = modal.querySelector('input, select, button, textarea');
  if (focusable) focusable.focus();
}

export function closeModal(modal) {
  modal.hidden = true;
  if ($$('.modal:not([hidden])').length === 0) {
    document.body.classList.remove('modal-open');
  }
}

export function closeAllModals() {
  $$('.modal').forEach((modal) => closeModal(modal));
}

export function renderLoading(show) {
  $('#loading-state').hidden = !show;
  $('#table-wrapper').hidden = show;
}

export function renderError(show, message = '') {
  const el = $('#error-state');
  el.hidden = !show;
  if (message) $('#error-message').textContent = message;
  $('#table-wrapper').hidden = show;
  $('#empty-state').hidden = true;
}

export function renderEmpty(show, message = 'No users found.') {
  const el = $('#empty-state');
  el.hidden = !show;
  $('#empty-message').textContent = message;
  $('#table-wrapper').hidden = show;
}

export function renderTable(users) {
  const tbody = $('#users-tbody');
  tbody.innerHTML = users
    .map(
      (user) => `
    <tr data-id="${user.id}">
      <td data-label="ID">${escapeHtml(String(user.id))}</td>
      <td data-label="First Name">${escapeHtml(user.firstName)}</td>
      <td data-label="Last Name">${escapeHtml(user.lastName)}</td>
      <td data-label="Email"><a href="mailto:${escapeHtml(user.email)}">${escapeHtml(user.email)}</a></td>
      <td data-label="Department"><span class="dept-badge">${escapeHtml(user.department)}</span></td>
      <td class="col-actions" data-label="Actions">
        <div class="row-actions">
          <button type="button" class="btn btn--icon btn--edit" data-action="edit" data-id="${user.id}" aria-label="Edit ${escapeHtml(user.firstName)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button type="button" class="btn btn--icon btn--delete" data-action="delete" data-id="${user.id}" aria-label="Delete ${escapeHtml(user.firstName)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>`
    )
    .join('');
}

export function renderSortIndicators(sort) {
  $$('.sort-btn').forEach((btn) => {
    const field = btn.dataset.sort;
    const indicator = btn.querySelector('.sort-indicator');
    btn.classList.toggle('sort-btn--active', field === sort.field);
    indicator.textContent =
      field === sort.field ? (sort.direction === 'asc' ? ' ▲' : ' ▼') : '';
    btn.setAttribute(
      'aria-sort',
      field === sort.field ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
    );
  });
}

export function renderPagination(pageData) {
  const { currentPage, totalPages, totalItems, startIndex, endIndex } = pageData;
  const info = $('#pagination-info');

  if (totalItems === 0) {
    info.textContent = 'Showing 0 users';
  } else {
    info.textContent = `Showing ${startIndex}–${endIndex} of ${totalItems}`;
  }

  const nav = $('#pagination');
  if (totalPages <= 1) {
    nav.innerHTML = '';
    return;
  }

  const pages = buildPageNumbers(currentPage, totalPages);
  nav.innerHTML = `
    <button type="button" class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>
    ${pages
      .map((p) =>
        p === '…'
          ? `<span class="page-ellipsis" aria-hidden="true">…</span>`
          : `<button type="button" class="page-btn${p === currentPage ? ' page-btn--active' : ''}" data-page="${p}" ${p === currentPage ? 'aria-current="page"' : ''}>${p}</button>`
      )
      .join('')}
    <button type="button" class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Next page">›</button>
  `;
}

function buildPageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = [1];
  if (current > 3) pages.push('…');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('…');
  pages.push(total);
  return pages;
}

export function renderFilterChips(filters, onRemove) {
  const container = $('#filter-chips');
  const entries = Object.entries(filters).filter(([, v]) => v && v.trim());

  const countEl = $('#filter-count');
  if (entries.length > 0) {
    countEl.textContent = String(entries.length);
    countEl.classList.remove('badge--hidden');
  } else {
    countEl.classList.add('badge--hidden');
  }

  if (entries.length === 0) {
    container.innerHTML = '';
    return;
  }

  const labels = {
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    department: 'Department',
  };

  container.innerHTML = entries
    .map(
      ([key, value]) => `
    <span class="chip">
      <span class="chip__label">${escapeHtml(labels[key])}: ${escapeHtml(value)}</span>
      <button type="button" class="chip__remove" data-filter-key="${key}" aria-label="Remove ${escapeHtml(labels[key])} filter">&times;</button>
    </span>`
    )
    .join('');

  container.querySelectorAll('.chip__remove').forEach((btn) => {
    btn.addEventListener('click', () => onRemove(btn.dataset.filterKey));
  });
}

export function clearFormErrors() {
  $$('.field-error').forEach((el) => {
    el.textContent = '';
  });
  $$('.form-group input, .form-group select').forEach((el) => {
    el.classList.remove('input--error');
  });
}

export function showFormErrors(errors) {
  clearFormErrors();
  Object.entries(errors).forEach(([field, message]) => {
    const errorEl = $(`#error-${field}`);
    const fieldMap = {
      firstName: '#first-name',
      lastName: '#last-name',
      email: '#email',
      department: '#department',
    };
    const input = $(fieldMap[field]);
    if (errorEl) errorEl.textContent = message;
    if (input) input.classList.add('input--error');
  });
}

export function fillUserForm(user) {
  $('#user-id').value = user?.id ?? '';
  $('#first-name').value = user?.firstName ?? '';
  $('#last-name').value = user?.lastName ?? '';
  $('#email').value = user?.email ?? '';
  $('#department').value = user?.department ?? '';
}

export function fillFilterForm(filters) {
  $('#filter-firstName').value = filters.firstName;
  $('#filter-lastName').value = filters.lastName;
  $('#filter-email').value = filters.email;
  $('#filter-department').value = filters.department;
}

export function getUserFormData() {
  return {
    id: $('#user-id').value ? Number($('#user-id').value) : null,
    firstName: $('#first-name').value.trim(),
    lastName: $('#last-name').value.trim(),
    email: $('#email').value.trim(),
    department: $('#department').value,
  };
}

export function getFilterFormData() {
  return {
    firstName: $('#filter-firstName').value.trim(),
    lastName: $('#filter-lastName').value.trim(),
    email: $('#filter-email').value.trim(),
    department: $('#filter-department').value,
  };
}

export function setSubmitLoading(loading) {
  const btn = $('#user-form-submit');
  btn.disabled = loading;
  btn.textContent = loading ? 'Saving…' : 'Save';
}

export function setDeleteLoading(loading) {
  const btn = $('#btn-confirm-delete');
  btn.disabled = loading;
  btn.textContent = loading ? 'Deleting…' : 'Delete';
}

export function renderApiStatus(connected) {
  const dot = $('#api-status-dot');
  const text = $('#api-status-text');
  if (!dot || !text) return;

  dot.classList.toggle('api-status__dot--online', connected);
  dot.classList.toggle('api-status__dot--offline', !connected);
  text.textContent = connected
    ? 'Connected to JSONPlaceholder API'
    : 'JSONPlaceholder API offline — check internet';
}

export function appendApiActivity(entry) {
  const list = $('#api-activity-list');
  if (!list) return;

  const empty = list.querySelector('.activity-list__empty');
  if (empty) empty.remove();

  const li = document.createElement('li');
  const methodClass = `method--${entry.method.toLowerCase()}`;
  const statusClass = entry.status === 'ERR' || entry.status >= 400 ? 'status--error' : 'status--ok';
  li.innerHTML = `
    <span class="activity-time">${escapeHtml(entry.time)}</span>
    <span class="method ${methodClass}">${escapeHtml(entry.method)}</span>
    <code>${escapeHtml(entry.url)}</code>
    <span class="activity-status ${statusClass}">${escapeHtml(String(entry.status))}</span>
  `;
  list.prepend(li);

  while (list.children.length > 8) {
    list.lastElementChild.remove();
  }
}

export function toggleApiPanel(show) {
  const panel = $('#api-panel');
  if (!panel) return;
  panel.hidden = !show;
}
