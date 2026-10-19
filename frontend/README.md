# Smart Campus Library - Frontend

Welcome to the frontend of the **Smart Campus Library Management System**! This application is built with pure, beginner-friendly **HTML5, CSS3, and vanilla JavaScript** without complicated build tools, frameworks, or dependencies.

---

## 📁 Project Structure

```text
smart-campus-library/
├── backend/                  (Node.js/Express server running at http://localhost:3000)
│   ├── server.js             (GET /api/books endpoint querying MySQL)
│   └── ...
└── frontend/
    ├── index.html            (Main HTML page structure & state containers)
    ├── css/
    │   └── style.css         (Modern CSS styling, responsive grid, badges & animations)
    ├── js/
    │   ├── api.js            (Data service layer: configured to fetch from http://localhost:3000/api)
    │   └── app.js            (UI controller: state management, search & rendering)
    └── README.md             (This guide)
```

---

## 🔌 API Integration

The frontend is connected directly to your running Express API:
- **Endpoint**: `GET http://localhost:3000/api/books`
- **Fields Utilized**:
  - `book_id`: Unique identifier for each book record.
  - `title`: Main book title.
  - `isbn`: Unique ISBN code.
  - `publisher`: Publishing house.
  - `publication_year`: Release year.
  - `total_copies`: Total inventory count.
  - `available_copies`: Copies currently in the library (determines availability status).

---

## 🚀 How to Run and Verify the Page

### Step 1: Ensure Your Backend is Running
Verify in your terminal that your backend server is active:
```bash
node server.js
```
It should report:
`Library API is running at http://localhost:3000`

### Step 2: Open the Frontend
1. Navigate to:
   `c:\Users\hp\Documents\DBE_PROJECT\smart-campus-library\frontend\`
2. Open **`index.html`** in your browser (e.g. Chrome, Edge, Firefox), or use **Live Server**.

### Step 3: Verify the Interface
- **Loading State**: When the page opens, it briefly displays the loading spinner and placeholder cards while contacting `http://localhost:3000/api/books`.
- **Catalogue Cards**: Real book records from MySQL will render showing Title, ISBN, Publisher, Publication Year, and Available Copies.
- **Search**: Type any part of the book title, publisher, or ISBN in the search box to see live filtering.
- **Availability Filter**: Click **"Available Only"** or **"Checked Out"** to filter books by available copy count.
- **Error & Empty States**: Click the **"Empty"** or **"Error"** preview buttons in the top toolbar to test the UI states, then click **"Reset"** to reload live data.
