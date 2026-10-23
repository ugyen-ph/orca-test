# API Contract — Task Management Application

| Item | Value |
|---|---|
| Base URL (dev) | `http://localhost:5000/api` |
| Content type | `application/json; charset=utf-8` |
| Contract status | Approved baseline |
| Source of truth for data | `docs/database.md` |

All endpoints are synchronous request/response. There is no authentication, no pagination,
and no partial-content support in this version.

---

## 1. Conventions

### Resource shape

A task is always serialized with exactly these fields:

```json
{
  "id": 1,
  "title": "Set up project folders",
  "description": "Create client and server skeletons.",
  "status": "pending",
  "created_at": "2026-10-21T10:00:00.000Z"
}
```

| Field | Type | Writable | Notes |
|---|---|---|---|
| `id` | integer > 0 | No | Server-assigned. |
| `title` | string | Yes | Required on create; 1–255 characters after trimming. |
| `description` | string or `null` | Yes | Optional; maximum 5,000 characters. `null` clears it. |
| `status` | string enum | Yes | One of `pending`, `in_progress`, `completed`. Defaults to `pending`. |
| `created_at` | string (ISO 8601, UTC) | No | Server-assigned. |

Field names are `snake_case` and match the database columns, so no mapping layer is needed.

### Success envelope

```json
{ "success": true, "data": <object or array> }
```

### Error envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body is invalid.",
    "details": [
      { "field": "title", "message": "title is required." }
    ]
  }
}
```

`details` is always an array; it is empty when the error is not field-specific.

### Error codes

| HTTP | `code` | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body or field violates the contract. |
| 400 | `INVALID_ID` | `:id` is missing, non-numeric, zero, or negative. |
| 400 | `INVALID_JSON` | Body is not parseable JSON. |
| 404 | `TASK_NOT_FOUND` | No task exists for the given id. |
| 500 | `INTERNAL_ERROR` | Unexpected server or database failure. No internals leaked. |

### Rules applied to every endpoint

- `Content-Type: application/json` is required when a body is sent.
- Unknown body fields are rejected with `VALIDATION_ERROR` (`"Unknown field."`).
- `id` and `created_at` are read-only; sending them is rejected.
- Strings are trimmed of leading/trailing whitespace before validation and storage.
- `created_at` is always returned as UTC ISO 8601 with milliseconds.

---

## 2. GET /api/tasks — list all tasks

Fetch every task, newest first (`created_at DESC, id DESC`). An empty table is a success,
not a 404.

**Request**

```
GET /api/tasks
```

No body, no required headers.

**Success — 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "title": "Write API contract",
      "description": "Document every endpoint and error shape.",
      "status": "completed",
      "created_at": "2026-10-23T08:40:12.000Z"
    },
    {
      "id": 2,
      "title": "Review database schema",
      "description": null,
      "status": "in_progress",
      "created_at": "2026-10-22T14:05:31.000Z"
    },
    {
      "id": 1,
      "title": "Set up project folders",
      "description": "Create client and server skeletons.",
      "status": "pending",
      "created_at": "2026-10-21T10:00:00.000Z"
    }
  ]
}
```

Empty state:

```json
{ "success": true, "data": [] }
```

**Failure — 500 Internal Server Error**

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred.",
    "details": []
  }
}
```

---

## 3. POST /api/tasks — create a task

**Request**

```
POST /api/tasks
Content-Type: application/json
```

Body fields: `title` (required), `description` (optional), `status` (optional).

```json
{
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "status": "pending"
}
```

Minimal valid body:

```json
{ "title": "Buy groceries" }
```

**Success — 201 Created**

```json
{
  "success": true,
  "data": {
    "id": 4,
    "title": "Buy groceries",
    "description": "Milk, eggs, bread",
    "status": "pending",
    "created_at": "2026-10-23T09:15:00.000Z"
  }
}
```

**Failure — 400 Validation Error** (missing title)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body is invalid.",
    "details": [
      { "field": "title", "message": "title is required." }
    ]
  }
}
```

**Failure — 400 Validation Error** (bad status and unknown field)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body is invalid.",
    "details": [
      {
        "field": "status",
        "message": "status must be one of: pending, in_progress, completed."
      },
      {
        "field": "completed",
        "message": "Unknown field."
      }
    ]
  }
}
```

**Failure — 400 Invalid JSON**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_JSON",
    "message": "Request body must be valid JSON.",
    "details": []
  }
}
```

**Failure — 500 Internal Server Error**

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred.",
    "details": []
  }
}
```

Server behavior: absent `description` is stored as `NULL`; absent `status` defaults to
`pending`; `id` and `created_at` are assigned by the server.

---

## 4. PUT /api/tasks/:id — update a task

Partial update: send only the fields that change. At least one writable field is required.
`PUT` is not a full replacement in this contract; fields omitted from the body are left
untouched.

**Request**

```
PUT /api/tasks/4
Content-Type: application/json
```

Update status only:

```json
{ "status": "completed" }
```

Update details:

```json
{
  "title": "Buy groceries and coffee",
  "description": null
}
```

**Success — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 4,
    "title": "Buy groceries and coffee",
    "description": null,
    "status": "completed",
    "created_at": "2026-10-23T09:15:00.000Z"
  }
}
```

The response always contains the complete, post-update task.

**Failure — 400 Invalid ID**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_ID",
    "message": "id must be a positive integer.",
    "details": []
  }
}
```

**Failure — 400 Validation Error** (empty body)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body is invalid.",
    "details": [
      {
        "field": "body",
        "message": "At least one of title, description, status is required."
      }
    ]
  }
}
```

**Failure — 400 Validation Error** (empty title)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body is invalid.",
    "details": [
      { "field": "title", "message": "title must not be empty." }
    ]
  }
}
```

**Failure — 404 Task Not Found**

```json
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task 999 was not found.",
    "details": []
  }
}
```

**Failure — 500 Internal Server Error**

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred.",
    "details": []
  }
}
```

Server behavior: sending `description: null` clears the description; sending `id` or
`created_at` is rejected with `VALIDATION_ERROR`; an unchanged value is still a valid
update and returns 200.

---

## 5. DELETE /api/tasks/:id — remove a task

**Request**

```
DELETE /api/tasks/4
```

No body.

**Success — 200 OK**

```json
{
  "success": true,
  "data": { "id": 4 }
}
```

The deleted resource is not returned; the id confirms what was removed.

**Failure — 400 Invalid ID**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_ID",
    "message": "id must be a positive integer.",
    "details": []
  }
}
```

**Failure — 404 Task Not Found**

```json
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task 999 was not found.",
    "details": []
  }
}
```

**Failure — 500 Internal Server Error**

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred.",
    "details": []
  }
}
```

Deleting an already-deleted task is a 404, not a 200. Clients should remove the row locally
only after receiving 200.

---

## 6. Validation matrix

| Field | Rule | Error message |
|---|---|---|
| `title` | Required on POST; string after trim; 1–255 chars | `title is required.` / `title must be a string.` / `title must be 1-255 characters.` / `title must not be empty.` |
| `description` | Optional; `null` or string; max 5,000 chars | `description must be a string or null.` / `description must be at most 5000 characters.` |
| `status` | Optional; exact enum value | `status must be one of: pending, in_progress, completed.` |
| `id` (body) | Must not be sent | `id is read-only.` |
| `created_at` (body) | Must not be sent | `created_at is read-only.` |
| any other key | Must not be sent | `Unknown field.` |
| `:id` (path) | Integer, `> 0` | `id must be a positive integer.` |

Multiple violations are returned together in `details`, in the order the fields appear in
the request body.

---

## 7. Status code summary

| Endpoint | Success | Client errors | Server error |
|---|---|---|---|
| `GET /api/tasks` | 200 | — | 500 |
| `POST /api/tasks` | 201 | 400 (`VALIDATION_ERROR`, `INVALID_JSON`) | 500 |
| `PUT /api/tasks/:id` | 200 | 400 (`INVALID_ID`, `VALIDATION_ERROR`, `INVALID_JSON`), 404 | 500 |
| `DELETE /api/tasks/:id` | 200 | 400 (`INVALID_ID`), 404 | 500 |

---

## 8. Client usage examples

```js
const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json();
  if (!body.success) {
    throw new Error(body.error.message);
  }
  return body.data;
}

export const listTasks = () => request("/tasks");

export const createTask = (task) =>
  request("/tasks", { method: "POST", body: JSON.stringify(task) });

export const updateTask = (id, patch) =>
  request(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(patch) });

export const deleteTask = (id) =>
  request(`/tasks/${id}`, { method: "DELETE" });
```

Terminal checks:

```bash
curl http://localhost:5000/api/tasks

curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Buy groceries\"}"

curl -X PUT http://localhost:5000/api/tasks/4 \
  -H "Content-Type: application/json" \
  -d "{\"status\":\"completed\"}"

curl -X DELETE http://localhost:5000/api/tasks/4
```

---

## 9. Contract change policy

This file and `docs/database.md` are the source of truth for the API boundary and the data
model. Any change to a field name, type, status value, envelope, or status code must update
this document and the affected tests in the same change. Additive changes (new optional
response field) are preferred over renames. There is no versioning scheme in this learning
project; breaking changes are made directly and recorded here.
