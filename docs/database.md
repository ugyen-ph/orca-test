# Database Specification — Task Management Application

| Item | Value |
|---|---|
| Engine | MySQL 8.x (InnoDB) |
| Schema | `task_manager` |
| Table | `tasks` |
| Character set | `utf8mb4` / `utf8mb4_unicode_ci` |
| Timezone policy | Store UTC; connection pool sets `timezone: "Z"` |

---

## 1. Raw SQL DDL

```sql
CREATE DATABASE IF NOT EXISTS task_manager
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE task_manager;

CREATE TABLE IF NOT EXISTS tasks (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title       VARCHAR(255) NOT NULL,
  description TEXT         NULL,
  status      ENUM('pending', 'in_progress', 'completed')
                           NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tasks_status (status),
  KEY idx_tasks_created_at (created_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
```

---

## 2. Column dictionary

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `INT UNSIGNED` | No | `AUTO_INCREMENT` | Primary key. Exposed as a positive integer in the API. |
| `title` | `VARCHAR(255)` | No | none | Required. Trimmed before insert; 1–255 characters. 255 fits the utf8mb4 index/row budget comfortably for this project. |
| `description` | `TEXT` | Yes | `NULL` | Optional free text. API caps it at 5,000 characters to keep payloads small even though `TEXT` allows more. `NULL` means "no description". |
| `status` | `ENUM('pending','in_progress','completed')` | No | `'pending'` | Lifecycle state. See section 3 for why ENUM over BOOLEAN. |
| `created_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | Server-assigned creation time, stored in UTC. Never accepted from a client. |

---

## 3. Design decisions

### ENUM instead of BOOLEAN

`BOOLEAN` is an alias for `TINYINT(1)` and only models two states. The dashboard needs
three: not started, being worked on, finished. Encoding those as `0/1/2` pushes the meaning
into application code and makes raw queries unreadable. The ENUM keeps the values
self-describing in SQL, is validated by the database, and is indexable.

Trade-off: adding or reordering a value requires `ALTER TABLE`. For a fixed three-state
learning project this is acceptable. If states become user-configurable, move to a
`statuses` lookup table with a foreign key.

### `created_at` only

The approved field list does not include `updated_at`, so it is deliberately absent. The
API contract reflects this. Adding it later is additive:

```sql
ALTER TABLE tasks
  ADD COLUMN updated_at TIMESTAMP NOT NULL
    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  AFTER created_at;
```

### Indexes

- `PRIMARY KEY (id)` — primary access path (`PUT`/`DELETE` by id).
- `idx_tasks_status` — supports an eventual `WHERE status = ?` filter.
- `idx_tasks_created_at` — supports the default `ORDER BY created_at DESC` listing.

No unique constraint on `title`: duplicate task titles are legitimate.

### No foreign keys

There are no users, projects, or tags in scope, so there is nothing to reference. Adding a
`user_id` later requires a `users` table and a foreign key with an explicit
`ON DELETE CASCADE` or `ON DELETE RESTRICT` decision.

---

## 4. Seed data (optional, development only)

```sql
INSERT INTO tasks (title, description, status) VALUES
  ('Set up project folders',
   'Create client and server skeletons.',
   'pending'),
  ('Review database schema',
   NULL,
   'in_progress'),
  ('Write API contract',
   'Document every endpoint and error shape.',
   'completed');
```

Expected result: three rows with `id` 1–3 and server-assigned `created_at` values.

Reset while iterating:

```sql
TRUNCATE TABLE tasks;
```

`TRUNCATE` resets `AUTO_INCREMENT` to 1 and cannot be rolled back. It is a development
convenience, not part of any application flow.

---

## 5. Verification queries

```sql
-- Structure
DESCRIBE tasks;
SHOW CREATE TABLE tasks;

-- Constraints and indexes
SHOW INDEX FROM tasks;

-- Current contents, newest first (matches GET /api/tasks ordering)
SELECT id, title, description, status, created_at
FROM tasks
ORDER BY created_at DESC, id DESC;
```

Sample read:

```
+----+--------------------------+----------------------------------------+-------------+---------------------+
| id | title                    | description                            | status      | created_at          |
+----+--------------------------+----------------------------------------+-------------+---------------------+
|  3 | Write API contract       | Document every endpoint and error shape| completed   | 2026-10-23 08:40:12 |
|  2 | Review database schema   | NULL                                   | in_progress | 2026-10-22 14:05:31 |
|  1 | Set up project folders   | Create client and server skeletons.    | pending     | 2026-10-21 10:00:00 |
+----+--------------------------+----------------------------------------+-------------+---------------------+
```

---

## 6. Data rules enforced by the application

| Rule | Enforced in |
|---|---|
| `title` trimmed, non-empty, length 1–255 | `middleware/validateTask.js` |
| `description` null or length 0–5,000 | `middleware/validateTask.js` |
| `status` in `('pending','in_progress','completed')` | `validateTask.js` + ENUM |
| `id` positive integer | controller param parsing |
| `created_at` never client-supplied | validator rejects unknown/read-only fields |
| All values passed as SQL parameters | `models/taskModel.js` |

The database is the last line of defense; the API validator produces the readable 400s.

---

## 7. Storage and encoding notes

- `utf8mb4` supports the full Unicode range, including emoji in task titles.
- InnoDB provides row-level locking and crash recovery; it is the MySQL default and the
  correct choice even for a learning project.
- `TIMESTAMP` is stored as UTC and converted by the session time zone. The Node pool pins
  `timezone: "Z"` so values arrive as correct UTC `Date` objects.
- `TEXT` columns are stored off-page; this table is small enough that the distinction has
  no practical performance impact.
