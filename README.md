# User Management Dashboard

A responsive web app to view, add, edit, and delete users — built for the **Ajackus JavaScript Basics Assignment**, integrated with the free **[JSONPlaceholder](https://jsonplaceholder.typicode.com)** REST API.

Built with **vanilla HTML / CSS / JavaScript** — no build step, no frameworks, no dependencies.

---

## Quick Start (Easiest Way)

### Windows — double-click to run

1. Open folder: `C:\Users\dell\user-mgmt-dashboard`
2. **Double-click `START.bat`**
3. Open browser → **http://localhost:8080**

### Manual start (Command Prompt)

Run these as **two separate commands** (press Enter after each):

```cmd
cd C:\Users\dell\user-mgmt-dashboard
python -m http.server 8080
```

If `python` is not found, try:

```cmd
py -m http.server 8080
```

Then visit **http://localhost:8080**

---

## Assignment Requirements Checklist

| Requirement | Status | Implementation |
|---|---|---|
| Display users (ID, First Name, Last Name, Email, Department) | ✅ | Table in `index.html`, data from `/users` |
| Add / Edit / Delete buttons | ✅ | Header + row action buttons |
| Add/Edit form modal | ✅ | `#user-modal` with validation |
| Pagination (10, 25, 50, 100) | ✅ | Footer page-size selector + page controls |
| Filter popup (first name, last name, email, department) | ✅ | `#filter-modal` + removable chips |
| Search and sort | ✅ | Debounced search + sortable column headers |
| Responsive UI | ✅ | Mobile card layout in `style.css` |
| JSONPlaceholder `/users` API | ✅ | All CRUD via Fetch in `js/api.js` |
| View — GET `/users` | ✅ | `fetchUsers()` |
| Add — POST `/users` | ✅ | `createUser()` |
| Edit — GET + PUT `/users/:id` | ✅ | `fetchUser()` + `updateUser()` |
| Delete — DELETE `/users/:id` | ✅ | `deleteUser()` |
| Error handling | ✅ | Error state, retry, toasts |
| Client-side validation | ✅ | `validateUserForm()` in `state.js` |
| Modular & scalable code | ✅ | Split into `api.js`, `state.js`, `ui.js`, `app.js` |
| Unit tests | ✅ | `tests/state.test.js`, `tests/api.test.js` (Node's built-in test runner) |

---

## JSONPlaceholder Integration (Free API)

This project uses **[JSONPlaceholder](https://jsonplaceholder.typicode.com)** — a free online REST API for testing and prototyping. No API key or signup required.

### Endpoints used

| Method | Endpoint | Action |
|--------|----------|--------|
| `GET` | `/users` | Load all users on page start |
| `GET` | `/users/:id` | Fetch single user when editing |
| `POST` | `/users` | Add a new user |
| `PUT` | `/users/:id` | Update existing user |
| `DELETE` | `/users/:id` | Delete user |

### How to see the integration working

1. Run the app (see Quick Start above)
2. Look for the green dot: **"Connected to JSONPlaceholder API"**
3. Click **API Log** in the header to see live requests as you Add / Edit / Delete
4. Open browser DevTools → **Network** tab to watch real HTTP calls to `jsonplaceholder.typicode.com`

### Data mapping

JSONPlaceholder returns `name` and `company.name`, not `firstName`/`lastName`/`department`. The app normalizes this in `normalizeUser()` (`state.js`):

- `name` → split into **First Name** + **Last Name**
- `company.name` → **Department**

### Mock API note

POST/PUT/DELETE succeed but **don't persist** on the server. The app updates local state so changes appear immediately during your session. Refreshing the page reloads the original 10 users from the API.

---

## Features

- **View** — fetches and lists all users
- **Add** — modal form posts to `/users`, merges into local state
- **Edit** — pre-filled modal, `PUT`s to `/users/:id`
- **Delete** — confirmation modal, `DELETE /users/:id`
- **Pagination** — 10 / 25 / 50 / 100 per page
- **Filter popup** — filter by name, email, department (removable chips)
- **Search** — debounced instant search
- **Sort** — all columns, asc/desc
- **Validation** — required fields, min length, email format
- **Error handling** — loading / empty / error states, retry, toasts
- **API status & live log** — shows JSONPlaceholder connection + request history

## Running Tests

Unit tests cover the pure logic in `js/state.js` (search, filter, sort, pagination,
validation, JSONPlaceholder data normalization) and the request logic in `js/api.js`
(using a mocked `fetch`, so no network or real API calls happen during tests).

Requires [Node.js](https://nodejs.org) (v18+) — no extra dependencies, uses Node's
built-in test runner.

```cmd
npm test
```

## Project Structure

```
user-mgmt-dashboard/
├── START.bat           # One-click Windows launcher
├── index.html          # Markup, modals, table shell
├── css/style.css       # All styling
├── js/
│   ├── api.js          # JSONPlaceholder Fetch wrappers + activity log
│   ├── state.js        # State, filter, sort, paginate, validation
│   ├── ui.js           # DOM rendering helpers
│   └── app.js          # Event wiring + business logic
├── tests/
│   ├── state.test.js   # Unit tests for state.js
│   └── api.test.js     # Unit tests for api.js (mocked fetch)
├── package.json        # npm test script
└── README.md
```

## Assumptions

- Department uses a fixed dropdown for consistent filtering/sorting.
- Local state syncs after every successful Add/Edit/Delete since the mock API doesn't persist writes.

## Challenges Faced

- JSONPlaceholder schema differs from the assignment schema — solved with `normalizeUser()`.
- Mock API doesn't persist writes — local `allUsers` array kept in sync after each operation.
- Search + filters + sort + pagination all active together — single render pipeline: filter → sort → paginate → draw.

## Improvements With More Time

- Infinite scrolling as alternative to pagination
- Persist filters/sort to `sessionStorage` or URL query string
- Optimistic UI rollback on failed requests
- Expand test coverage to `ui.js` rendering functions (currently untested since they require a DOM)
