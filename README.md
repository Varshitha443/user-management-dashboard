# User Management Dashboard

This is my submission for the Ajackus JavaScript Basics Assignment. It's a small web app that lets you view, add, edit, and delete users, backed by the JSONPlaceholder API (https://jsonplaceholder.typicode.com).

I built it with plain HTML, CSS, and JavaScript — no frameworks, no build tools, no npm install needed to run it. It just needs a local server to serve the files (browsers block ES module imports when opened directly as a file).

## How to run it

**Windows, easiest way:**

1. Open the project folder
2. Double-click `START.bat`
3. Go to http://localhost:8080 in your browser

**Or manually, from Command Prompt:**

```cmd
cd path\to\user-mgmt-dashboard
python -m http.server 8080
```

If `python` doesn't work, try `py -m http.server 8080` instead. Then open http://localhost:8080.

## What it does

- Shows all users in a table — ID, First Name, Last Name, Email, Department
- Add, Edit, and Delete users through a form modal, with a confirmation step before deleting
- Pagination with 10/25/50/100 rows per page
- A filter popup to narrow results by first name, last name, email, or department, with removable filter chips
- Live search across name, email, and department
- Click any column header to sort by it, ascending or descending
- Works on mobile — the table switches to a stacked card layout on small screens
- Shows loading, empty, and error states, with a retry button if a request fails
- Form validation on the client side before anything is sent to the API

## Connecting to JSONPlaceholder

All the API calls live in `js/api.js`:

| What it does | Method | Endpoint |
|---|---|---|
| Load all users | GET | `/users` |
| Load one user (for editing) | GET | `/users/:id` |
| Add a user | POST | `/users` |
| Update a user | PUT | `/users/:id` |
| Delete a user | DELETE | `/users/:id` |

There's a small "API Log" panel (button in the header) that shows the actual requests going out as you use the app, and a green/red status dot showing whether JSONPlaceholder is reachable. You can also just open DevTools → Network and watch the real calls go to jsonplaceholder.typicode.com.

One thing worth knowing: JSONPlaceholder's data doesn't quite match what the assignment asks for. It returns a single `name` field and a `company.name`, not separate first name, last name, and department fields. I handle this with a small adapter function (`normalizeUser` in `state.js`) that splits the name and remaps company to department, and the reverse (`toApiPayload`) when sending data back.

Also — since this is a mock/test API, it doesn't actually save anything server-side. Add/Edit/Delete requests succeed and return a response, but nothing persists. To make the app still feel functional, I update the local list right after a successful request so the UI reflects your changes for the rest of your session. Refreshing the page resets it back to the original 10 users.

## Project structure

```
user-mgmt-dashboard/
├── index.html          → page markup, modals, table layout
├── css/style.css       → all the styling
├── js/
│   ├── api.js          → talks to JSONPlaceholder, logs requests
│   ├── state.js         → search/filter/sort/paginate logic + validation
│   ├── ui.js            → renders things to the DOM
│   └── app.js            → wires everything together
├── tests/
│   ├── state.test.js    → tests for state.js
│   └── api.test.js      → tests for api.js
├── package.json
├── START.bat
└── README.md
```

I split it this way to keep things separated — `api.js` only knows how to talk to the network, `state.js` only deals with data/logic and doesn't touch the DOM at all, `ui.js` only renders things, and `app.js` is the glue that listens for clicks/input and decides what should happen. Made it a lot easier to write tests for `state.js` and `api.js` since neither of them depends on having a browser DOM around.

## Tests

I added unit tests for the logic in `state.js` (search, filtering, sorting, pagination, validation, the JSONPlaceholder data mapping) and `api.js` (the CRUD functions, with `fetch` mocked so tests don't need an internet connection). Using Node's built-in test runner, so no extra packages to install.

```cmd
npm test
```

Currently passing 41 tests across both files.

## Assumptions I made

- Department is a fixed dropdown list rather than free text, mainly so filtering and sorting by department stays consistent.
- Since the API doesn't persist writes, I treat a successful response as "this should now reflect in the UI" and update local state directly rather than re-fetching.

## Challenges I ran into

- Getting the JSONPlaceholder fields to line up with what the assignment wanted (firstName/lastName/department vs. name/company) took a bit of back-and-forth before I settled on the normalize/de-normalize functions.
- Since the mock API doesn't actually save anything, I had to think through how to keep the UI in sync manually after each operation instead of just refetching.
- Getting search, filters, sorting, and pagination to all work together correctly (without stepping on each other) meant settling on one clear order: filter first, then sort, then paginate, every time the table renders.

## What I'd improve with more time

- Add infinite scroll as an alternative to pagination
- Save the current filters/sort/search to the URL or sessionStorage so they survive a refresh
- Roll back the UI properly if a request fails partway through, instead of just showing a toast
- Add tests for the `ui.js` rendering functions too — skipped these for now since they need a DOM environment to test properly
