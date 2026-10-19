# Smart Campus Library - Frontend

Welcome to the frontend of the **Smart Campus Library Management System**! This application is built with pure, beginner-friendly **HTML5, CSS3, and vanilla JavaScript** without complicated build tools, frameworks, or dependencies.

---

## 📁 Project Structure

```text
smart-campus-library/
├── backend/                  (Node.js/Express server running at http://localhost:3000)
│   ├── server.js             (Endpoints for catalogue, members, copies, loans & returns)
│   └── ...
└── frontend/
    ├── index.html            (Main HTML with Catalogue, Books Issued, and Issue a Book views)
    ├── css/
    │   └── style.css         (Modern CSS styling, navigation tabs, cards, dropdowns & badges)
    ├── js/
    │   ├── api.js            (API service layer: fetchBooks, fetchActiveLoans, fetchMembers, fetchAvailableCopies, issueLoan, returnLoan)
    │   └── app.js            (Presentation controller: search, states, loans, returns & issue workflow)
    └── README.md             (This documentation)
```

---

## 🔌 API Integration

The frontend connects directly to your live backend Express server:
* **Catalogue**: `GET http://localhost:3000/api/books`
  * Displays: Title, Authors, Publisher, Publication Year, and Available Copies.
  * Real-time search matches across: **Title**, **Author**, **Publisher**, and **ISBN**.
* **Active Loans**: `GET http://localhost:3000/api/loans/active`
  * Displays: Borrower Member Name (`full_name`), Book Title (`title`), Copy Code (`copy_code`), Borrowed Date (`borrowed_at`), and Due Date (`due_at`).
* **Process Return**: `POST http://localhost:3000/api/loans/:id/return`
  * Marks the loan as returned (`returned_at = NOW()`) and restores copy status to `'available'`.
* **Borrowing Members**: `GET http://localhost:3000/api/members`
  * Populates registered students and faculty in the Issue a Book dropdown.
* **Available Physical Copies**: `GET http://localhost:3000/api/copies/available`
  * Populates currently available physical copies in the Issue a Book dropdown.
* **Issue Loan**: `POST http://localhost:3000/api/loans` with `{ "member_id": number, "copy_id": number }`
  * Records a 14-day checkout, sets copy status to `'borrowed'`, and updates catalogue inventory.

---

## 🚀 How to Run and Verify the Features

### 1. Ensure Backend Server is Running
In your backend directory terminal:
```bash
node server.js
```
The server will confirm:
`Library API is running at http://localhost:3000`

### 2. Access the Frontend
Open your browser to:
👉 **`http://localhost:3000/`** (or `http://localhost:3000/index.html`)

---

## 🔍 How to Test and Verify the Complete Circulation Flow

1. **Section Navigation**:
   * Use the top tabs to switch between **"Book Catalogue"**, **"Books Issued"**, and **"Issue a Book"**.

2. **Step-by-Step Test of the Complete Loan Cycle**:
   * **Step A (Return Copy)**: If *LIB-001* is currently issued, go to **"Books Issued"** and click **"Return"**.
     * The loan disappears, and the section updates to "No Books Currently Issued".
   * **Step B (Verify Availability in Catalogue)**:
     * Switch to **"Book Catalogue"**. The copy counter for *The C Programming Language* updates to **"1 Available"**.
   * **Step C (Issue Book Copy)**:
     * Switch to **"Issue a Book"**.
     * Select a member (e.g., *Aarav Sharma (STUDENT)*).
     * Select the available copy: `[LIB-001] The C Programming Language`.
     * Note the 14-day standard loan policy and calculated due date.
     * Click **"Confirm & Issue Book"**.
     * The button disables and shows **"Issuing Book..."** to prevent repeat submissions.
     * A green confirmation banner announces the checkout with the new Loan ID.
   * **Step D (Verify Automatic Cross-View Sync)**:
     * Switch to **"Books Issued"**: The new loan immediately appears with the borrower name, copy code, and calculated due date.
     * Switch to **"Book Catalogue"**: Availability automatically decrements to **"0 Available (Checked Out)"**.
     * Return to **"Issue a Book"**: Copy *LIB-001* is removed from the available dropdown, displaying the empty alert banner.
