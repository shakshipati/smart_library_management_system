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

Prerequisites: Node.js/npm and a running MySQL server with the project database and tables available.

1. Open PowerShell in the repository root and install backend dependencies:

   ```powershell
   Set-Location .\backend
   npm install
   ```

2. In the current `backend` folder, create `.env` (for example, with `notepad .env`) and set the values for your local environment:

   ```dotenv
   PORT=3000
   DB_HOST=<your-mysql-host>
   DB_USER=<your-mysql-user>
   DB_PASSWORD=<your-mysql-password>
   DB_NAME=<your-database-name>
   ```

   Keep real credentials local and do not commit `.env`.

3. Ensure the MySQL database and required tables are set up, then start the API and static frontend server:

   ```powershell
   node .\server.js
   ```

4. Open [http://localhost:3000/](http://localhost:3000/) in a browser.

**Setup item to verify:** No SQL schema or migration file is included in the repository. Create or obtain the database schema separately before running the application. The backend expects tables named `books`, `authors`, `book_authors`, `book_copies`, `members`, and `loans`, with columns used by the queries below. Exact column definitions, foreign keys, unique constraints, and SQL setup instructions must be verified against the database used for the project.

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
- **Keys and constraints:** Queries use entity ID columns such as `book_id`, `author_id`, `member_id`, `copy_id`, and `loan_id` to identify and join records. API validation checks required values and handles duplicate-entry conflicts for ISBNs, copy codes, and member email addresses. **Verify:** the actual primary-key, foreign-key, unique, and check constraint definitions in the MySQL schema; the schema DDL is not included.
- **Checkout and return transactions:** Checkout inserts a loan and marks its copy borrowed within one transaction. Return marks the loan returned and the copy available within one transaction. Both paths commit on success and roll back on failure.
- **Concurrency handling:** Checkout selects the copy `FOR UPDATE` and checks that it is still available before creating the loan. Return locks the loan row and checks that it has not already been returned. This prevents competing requests from silently checking out the same copy or returning the same loan twice.
- **Overdue reporting:** The report selects active loans with `due_at < NOW()` and calculates `days_overdue` with MySQL `DATEDIFF`.
- **Indexes and `EXPLAIN`:** The overdue report uses `idx_loans_due_returned` on `loans`, with `eq_ref` primary-key lookups for joined tables. `EXPLAIN` can be applied to the report query to inspect this plan. The schema and saved `EXPLAIN` output are not included, so verify this plan against the target database if reproducing the analysis.

## Repository layout

```text
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
