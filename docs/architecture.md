# Architecture Specification — Task Management Application

| Item | Value |
|---|---|
| Project type | Learning project: CRUD to-do dashboard |
| Frontend | React (Vite, JavaScript) |
| Backend | Node.js + Express, REST API, MVC |
| Database | MySQL 8.x |
| API style | JSON over HTTP, `/api` prefix |
| Document status | Approved baseline |

This document defines the folder layout, layer responsibilities, and conventions for the
application. It describes the target structure; only `docs/` exists at the time of writing.

---

## 1. Goals and non-goals

**Goals**

- One obvious place for every concern (route, controller, model, config).
- Thin controllers, SQL isolated in models, no ORM.
- A structure a beginner can read top to bottom without hidden magic.
- Contract-first: the API shape is defined in `api_contract.md`, the schema in `database.md`.

**Non-goals (explicitly out of scope)**

- Authentication, authorization, multi-user data isolation.
- Pagination, filtering, sorting, full-text search.
- File uploads, WebSockets, background jobs, caching.
- Docker, CI/CD, production deployment hardening.
- A shared TypeScript package or monorepo tooling.

---

## 2. Target repository layout

```
planning/
├── client/                          React client (Vite)
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   └── tasks.js             fetch wrapper for /api/tasks
│   │   ├── components/
│   │   │   ├── TaskForm.jsx         create + edit form
│   │   │   ├── TaskItem.jsx         single row: toggle status, delete
│   │   │   ├── TaskList.jsx         renders the collection
│   │   │   └── StatusFilter.jsx     pending / in_progress / completed
│   │   ├── hooks/
│   │   │   └── useTasks.js          loading, error, CRUD state
│   │   ├── pages/
│   │   │   └── Dashboard.jsx        page composition
│   │   ├── styles/
│   │   │   └── app.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js               dev proxy: /api -> http://localhost:5000
│
├── server/                          Node.js + Express backend (MVC)
│   ├── config/
│   │   ├── constants.js             TASK_STATUSES, field limits
│   │   ├── db.js                    mysql2/promise connection pool
│   │   └── env.js                   reads and validates environment variables
│   ├── controllers/
│   │   └── taskController.js        HTTP in -> validation -> model -> JSON out
│   ├── middleware/
│   │   ├── asyncHandler.js          wraps async controllers
│   │   ├── errorHandler.js          single JSON error formatter
│   │   ├── notFound.js              404 for unmatched routes
│   │   └── validateTask.js          body validation for POST/PUT
│   ├── models/
│   │   └── taskModel.js             all SQL; returns plain row objects
│   ├── routes/
│   │   ├── index.js                 mounts /api/tasks
│   │   └── taskRoutes.js            maps verbs + paths to controller actions
│   ├── .env.example
│   ├── app.js                       express app: CORS, JSON, routes, errors
│   ├── package.json
│   └── server.js                    loads app, listens on PORT
│
├── docs/
│   ├── architecture.md              this file
│   ├── database.md                  schema + DDL
│   └── api_contract.md              endpoint contract
└── README.md
```

**Rule:** `client/` never imports from `server/`. The HTTP contract is the only coupling.

---

## 3. MVC mapping

| MVC role | Location | Responsibility | Must not |
|---|---|---|---|
| Model | `server/models/taskModel.js` | Execute prepared SQL statements, map rows, return data | Access `req`/`res`, build HTTP responses, validate HTTP input |
| View | `client/src/**` | Render tasks, forms, loading and error states | Hold SQL or database credentials |
| Controller | `server/controllers/taskController.js` | Read params/body, validate, call model, choose status code and body | Build SQL strings, know about React |
| Router | `server/routes/**` | Map `METHOD /path` to a controller function | Contain business logic |
| Config | `server/config/**` | Connection pool, environment values, constants | Import controllers or models |

---

## 4. Request flow

```
Browser (React)
   │  fetch("/api/tasks")
   ▼
Vite dev server ──proxy──► Express (http://localhost:5000)
                              │
                              ├─ cors + express.json()
                              ├─ routes/index.js
                              ├─ routes/taskRoutes.js
                              ├─ middleware/validateTask.js   (writes only)
                              ├─ controllers/taskController.js
                              ├─ models/taskModel.js
                              └─ config/db.js ──► MySQL (task_manager.tasks)
   ◄────────────────────────── JSON response
```

**POST /api/tasks, step by step**

1. `TaskForm` calls `createTask()` in `client/src/api/tasks.js`.
2. Vite proxies `/api/*` to Express on port 5000.
3. `app.js` parses the JSON body and matches `POST /api/tasks` in `taskRoutes.js`.
4. `validateTask` rejects missing/oversized fields and unknown properties.
5. `taskController.createTask` calls `taskModel.create({ title, description, status })`.
6. The model runs a parameterized `INSERT` and reads the new row by `insertId`.
7. The controller responds `201` with the created task.
8. `useTasks` prepends the task to local state; React re-renders.

---

## 5. Layer conventions

### Controllers

- One exported function per action: `listTasks`, `getTask`, `createTask`, `updateTask`, `deleteTask`.
- Every function is wrapped in `asyncHandler`; no `try/catch` duplication.
- Return through helpers: `res.status(code).json({ success: true, data })`.
- Throw an `AppError(statusCode, code, message, details)` (exported from
  `middleware/errorHandler.js`) for expected failures.
- Never trust `req.params.id`; parse and validate before calling the model.

### Models

- Export plain async functions: `findAll`, `findById`, `create`, `update`, `remove`.
- Always use `?` placeholders; never concatenate user input into SQL.
- Return plain JSON-safe objects (`Date` values are serialized to ISO strings by Express).
- Return `null` when a row is absent; the controller decides 404.

### Validation

- `validateTask` handles `POST` (required `title`) and `PUT` (at least one field).
- Allowed body fields: `title`, `description`, `status`. Anything else is a 400.
- `id`, `created_at` are server-owned and rejected if present in a body.
- Reuse `TASK_STATUSES` and length limits from `config/constants.js`.

### Errors

- One shape for every failure: `{ success: false, error: { code, message, details } }`.
- `errorHandler` maps `AppError` to its status; unknown errors become `500 INTERNAL_ERROR`
  with a generic message, and the stack is logged server-side only.
- Malformed JSON is caught by a JSON parse guard and returned as `400 INVALID_JSON`.

### Configuration

| Variable | Used by | Example |
|---|---|---|
| `PORT` | `server.js` | `5000` |
| `DB_HOST` | `config/db.js` | `localhost` |
| `DB_PORT` | `config/db.js` | `3306` |
| `DB_USER` | `config/db.js` | `root` |
| `DB_PASSWORD` | `config/db.js` | `change-me` |
| `DB_NAME` | `config/db.js` | `task_manager` |
| `CLIENT_ORIGIN` | `app.js` (CORS) | `http://localhost:3000` |
| `VITE_API_BASE_URL` | client (optional) | `/api` |

- `config/env.js` fails fast on startup if a required variable is missing.
- `.env` files are never committed; `.env.example` documents the keys.
- The pool sets `timezone: "Z"` so `TIMESTAMP` values are read and returned as UTC.

### HTTP and CORS

- JSON only: `Content-Type: application/json`.
- Body limit: `100kb`.
- CORS allows exactly `CLIENT_ORIGIN` with `GET, POST, PUT, DELETE`.
- In development the Vite proxy makes requests same-origin, so CORS applies mainly
  when the client and server run on separate ports without the proxy.

---

## 6. Local development sequence

1. Create the database and table using `docs/database.md`.
2. `server/`: `npm install express mysql2 cors dotenv`, copy `.env.example` to `.env`.
3. `server/`: `npm run dev` (nodemon) or `node server.js`; expect "listening on 5000".
4. `client/`: `npm install`, copy `.env.example`, `npm run dev`; expect port 3000.
5. Verify with `curl http://localhost:5000/api/tasks` before building UI.

---

## 7. Extension points

- Add `updated_at` to `tasks` and surface it in the contract in one coordinated change.
- Add `?status=` filtering: validate against `TASK_STATUSES`, add one `WHERE` clause.
- Add pagination: `?limit=&offset=` with a documented maximum.
- Add tests: `node:test` + `supertest` against `app.js`, with the model mocked.

Any of the above requires updating `database.md` and/or `api_contract.md` in the same change,
because those two files are the source of truth for their respective boundaries.
