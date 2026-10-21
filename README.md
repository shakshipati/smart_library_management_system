# Smart Campus Library

A database engineering project for managing a campus library catalogue, physical book copies, members, and circulation. The app provides a browser-based interface backed by an Express API and MySQL.

## Features

- Browse the catalogue, search by title, author, publisher, or ISBN, and filter by availability.
- Add books with author names and an initial physical copy.
- Register students and faculty members.
- Issue available copies with a 14-day loan period and view active loans.
- Return loans and refresh catalogue availability.
- View an overdue-loan report with due dates and days overdue.

## Technology and architecture

- **Frontend:** HTML, CSS, and vanilla JavaScript; no frontend build step or package manifest.
- **Backend:** Node.js, Express 5, `mysql2` promise-based client, and `dotenv`.
- **Database:** MySQL.

Express serves the static frontend from `frontend/` and exposes the API on port `3000` by default. The frontend API helper sends requests to `http://localhost:3000/api`, so keep the backend on port `3000` unless you also update the frontend API base URL. The backend reads its database connection settings from environment variables and queries MySQL; the browser does not connect to the database directly.

## Setup and run (Windows PowerShell)

Prerequisites: Node.js/npm and a running MySQL 5.5 server.

1. Open PowerShell in the repository root and install backend dependencies:

   ```powershell
   Set-Location .\backend
   npm install
   ```

2. Load the schema into a fresh MySQL 5.5 database. From PowerShell, start the MySQL command-line client:

   ```powershell
   mysql -u <your-mysql-user> -p
   ```

   At the MySQL prompt, run `source` with the path to the schema file. Replace the clearly marked placeholder path with the absolute path on your computer:

   ```sql
   source C:/path/to/smart-campus-library/database/schema.sql;
   ```

   The script creates and selects the `smart_campus_library` database. It is intended for a fresh database. It contains `DROP TABLE IF EXISTS` statements, so running it where these tables already exist drops and recreates them and can destroy existing data; do not use it on a database you need to preserve.

3. In the current `backend` folder, create `.env` (for example, with `notepad .env`) and set the values for your local environment:

   ```dotenv
   PORT=3000
   DB_HOST=<your-mysql-host>
   DB_USER=<your-mysql-user>
   DB_PASSWORD=<your-mysql-password>
   DB_NAME=smart_campus_library
   ```

   Keep real credentials local and do not commit `.env`.

4. Start the API and static frontend server:

   ```powershell
   node .\server.js
   ```

5. Open [http://localhost:3000/](http://localhost:3000/) in a browser.

**Setup item to verify:** Ensure the MySQL server is reachable with the host and user configured in `backend\.env`, and that the account has permission to create and use the database.

There is no configured start or test script in `backend/package.json`; run the server directly with `node .\server.js`.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/books` | Catalogue with authors and total/available copy counts |
| `POST` | `/api/books` | Add a book, its author associations, and its first copy |
| `GET` | `/api/members` | List registered members |
| `POST` | `/api/members` | Register a student or faculty member |
| `GET` | `/api/copies/available` | List available copies for checkout |
| `GET` | `/api/loans/active` | List loans that have not been returned |
| `POST` | `/api/loans` | Check out a copy to a member |
| `POST` | `/api/loans/:id/return` | Return an active loan |
| `GET` | `/api/reports/overdue` | List unreturned loans past their due date, including days overdue |

## Database engineering concepts

- **Relational structure and normalization:** Books, authors, members, physical copies, and loans are queried as separate entities. The `book_authors` association table supports the many-to-many relationship between books and authors; copies belong to books, and loans associate members with copies.
- **Keys and constraints:** The schema defines primary keys, foreign keys between related entities, unique ISBN, copy-code, member-email, and author-name constraints, and a composite primary key for `book_authors`. API validation checks required values and handles duplicate-entry conflicts. The schema does not define `CHECK` constraints.
- **Checkout and return transactions:** Checkout inserts a loan and marks its copy borrowed within one transaction. Return marks the loan returned and the copy available within one transaction. Both paths commit on success and roll back on failure.
- **Concurrency handling:** Checkout selects the copy `FOR UPDATE` and checks that it is still available before creating the loan. Return locks the loan row and checks that it has not already been returned. This prevents competing requests from silently checking out the same copy or returning the same loan twice.
- **Overdue reporting:** The report selects active loans with `due_at < NOW()` and calculates `days_overdue` with MySQL `DATEDIFF`.
- **Indexes and `EXPLAIN`:** The overdue report uses `idx_loans_due_returned` on `loans`, with `eq_ref` primary-key lookups for joined tables. `EXPLAIN` can be applied to the report query to inspect its plan; verify the plan on the target database.

## Repository layout

```text
database/
  schema.sql
backend/
  package.json
  server.js
frontend/
  index.html
  css/style.css
  js/api.js
  js/app.js
  README.md
```
