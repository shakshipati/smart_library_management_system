# Smart Campus Library - Frontend

Welcome to the frontend of the **Smart Campus Library Management System**! This application is built with pure, beginner-friendly **HTML5, CSS3, and vanilla JavaScript** without complicated build tools, frameworks, or dependencies.

---

## 📁 Project Structure

```text
smart-campus-library/
├── backend/                  (Preserved untouched for future Node.js/Express development)
└── frontend/
    ├── index.html            (Main HTML page structure & state containers)
    ├── css/
    │   └── style.css         (Modern CSS styling, responsive grid, badges & animations)
    ├── js/
    │   ├── api.js            (Data service layer: mock data & future fetch connection)
    │   └── app.js            (UI controller: state management, search & rendering)
    └── README.md             (This guide)
```

---

## 🚀 How to Run the Frontend

Because this is built with standard web technologies, you don't need `npm install` or any build tool:

### Option 1: Direct File Opening
1. Open your file explorer and navigate to:
   `c:\Users\hp\Documents\DBE_PROJECT\smart-campus-library\frontend\`
2. Double-click **`index.html`** to open it directly in Google Chrome, Microsoft Edge, or Firefox.

### Option 2: Live Server (VS Code / Antigravity)
If you have an extension like *Live Server*, right-click `index.html` and choose **"Open with Live Server"**.

---

## ✨ Features Implemented

1. **Responsive Book Catalogue**:
   - Displays each book with **Title**, **Author**, **ISBN**, and **Availability Status**.
   - Available items display an emerald status badge with an animated pulsing indicator.
   - Checked out items display an amber "Checked Out" badge.
   - Includes campus stack/shelf location tags.

2. **Real-Time Search Box**:
   - Instant search across **Title**, **Author**, and **ISBN**.
   - Includes a one-click clear button (`×`).
   - Availability filters (`All Books`, `Available Only`, `Checked Out`).

3. **All Required UI States**:
   - **Loading State**: Displays an animated spinner and shimmering placeholder cards while books are being fetched.
   - **Success State**: Displays the full grid of book cards along with live item counters.
   - **Empty State**: Friendly illustration and message when no books match the search or when the catalogue has no entries, plus a "Clear Search" button.
   - **Error State**: Clear, styled alert card with an explanation and an interactive **"Try Again"** button.

4. **Built-In Interactive Test Toolbar**:
   - Notice the buttons in the toolbar: **Loading**, **Empty**, **Error**, and **Reset**.
   - You can click these anytime in your browser to verify how each UI state behaves!

---

## 🔌 How to Connect to Express & MySQL Later

The frontend is specifically structured to make connecting to your future Node.js/Express backend seamless.

Open `frontend/js/api.js`:

```javascript
const API_CONFIG = {
  // 1. When your Express server is running, change this to false:
  USE_MOCK_DATA: false,

  // 2. Point this to your backend server URL:
  API_BASE_URL: 'http://localhost:5000/api',
  ...
};
```

When `USE_MOCK_DATA: false`, `api.js` will automatically execute:
```javascript
fetch('http://localhost:5000/api/books')
```
and pass the JSON response directly into the existing card renderer!
