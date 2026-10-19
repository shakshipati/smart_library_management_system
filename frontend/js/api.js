/**
 * ==============================================================================
 * Smart Campus Library Management System - API Service Layer (api.js)
 * ==============================================================================
 * 
 * Beginner Guide:
 * This file handles all data interactions for the frontend.
 * 
 * Right now, it returns realistic MOCK DATA so you can develop and test the UI
 * without needing the MySQL database or Express server running yet.
 * 
 * When your backend is ready at GET /api/books:
 * Simply switch `USE_MOCK_DATA: false` in the API_CONFIG object below!
 */

// Configuration for API and Mock Environment
const API_CONFIG = {
  // Connected to live Express backend
  USE_MOCK_DATA: false,

  // Target API endpoint for Express server (GET /api/books)
  API_BASE_URL: 'http://localhost:3000/api',

  // Simulated delay in milliseconds (for test buttons)
  SIMULATED_DELAY_MS: 400,

  // Demo simulation flags (can also be triggered via the UI buttons)
  forceError: false,
  forceEmpty: false
};

// Sample realistic book catalogue data
const MOCK_BOOKS = [
  {
    id: 1,
    title: "Clean Code: A Handbook of Agile Software Craftsmanship",
    author: "Robert C. Martin",
    isbn: "978-0132350884",
    available: true,
    category: "Software Engineering",
    location: "Floor 2 • Shelf CS-10"
  },
  {
    id: 2,
    title: "Introduction to Algorithms (4th Edition)",
    author: "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest",
    isbn: "978-0262046305",
    available: false,
    category: "Computer Science",
    location: "Floor 2 • Shelf CS-04"
  },
  {
    id: 3,
    title: "Database System Concepts (7th Edition)",
    author: "Abraham Silberschatz, Henry F. Korth, S. Sudarshan",
    isbn: "978-0078022159",
    available: true,
    category: "Database Systems",
    location: "Floor 3 • Shelf DB-02"
  },
  {
    id: 4,
    title: "Artificial Intelligence: A Modern Approach",
    author: "Stuart Russell, Peter Norvig",
    isbn: "978-0134610993",
    available: true,
    category: "Artificial Intelligence",
    location: "Floor 3 • Shelf AI-07"
  },
  {
    id: 5,
    title: "Computer Networking: A Top-Down Approach",
    author: "James Kurose, Keith Ross",
    isbn: "978-0136681557",
    available: false,
    category: "Networking",
    location: "Floor 2 • Shelf NET-01"
  },
  {
    id: 6,
    title: "The Pragmatic Programmer: Your Journey to Mastery",
    author: "David Thomas, Andrew Hunt",
    isbn: "978-0135957059",
    available: true,
    category: "Software Engineering",
    location: "Floor 2 • Shelf CS-12"
  },
  {
    id: 7,
    title: "Operating System Concepts",
    author: "Abraham Silberschatz, Peter B. Galvin, Greg Gagne",
    isbn: "978-1119800361",
    available: true,
    category: "Systems",
    location: "Floor 2 • Shelf OS-03"
  },
  {
    id: 8,
    title: "Design Patterns: Elements of Reusable Object-Oriented Software",
    author: "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides",
    isbn: "978-0201633610",
    available: false,
    category: "Software Engineering",
    location: "Floor 2 • Shelf CS-15"
  }
];

/**
 * Fetch books catalogue
 * Returns a Promise that resolves with an array of book objects.
 * 
 * @returns {Promise<Array>} Array of book records
 */
async function fetchBooks() {
  // Support UI state preview buttons if triggered
  if (API_CONFIG.forceError) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Simulated Server Error: Database connection failed (HTTP 500)")), API_CONFIG.SIMULATED_DELAY_MS);
    });
  }

  if (API_CONFIG.forceEmpty) {
    return new Promise((resolve) => {
      setTimeout(() => resolve([]), API_CONFIG.SIMULATED_DELAY_MS);
    });
  }

  // If mock mode is explicitly turned back on
  if (API_CONFIG.USE_MOCK_DATA) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(JSON.parse(JSON.stringify(MOCK_BOOKS))), API_CONFIG.SIMULATED_DELAY_MS);
    });
  }

  // Real Express API Integration (GET /api/books)
  try {
    const response = await fetch(`${API_CONFIG.API_BASE_URL}/books`);
    if (!response.ok) {
      throw new Error(`Failed to fetch books from backend (Status: ${response.status} ${response.statusText})`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("LibraryAPI Error:", error);
    throw error;
  }
}

/**
 * Fetch currently active loans from GET /api/loans/active
 * @returns {Promise<Array>} Array of active loan records from database
 */
async function fetchActiveLoans() {
  try {
    const response = await fetch(`${API_CONFIG.API_BASE_URL}/loans/active`);
    if (!response.ok) {
      throw new Error(`Failed to load active loans (Status: ${response.status} ${response.statusText})`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("LibraryAPI fetchActiveLoans Error:", error);
    throw error;
  }
}

/**
 * Process book return by loan ID via POST /api/loans/:id/return
 * @param {number|string} loanId
 * @returns {Promise<Object>} API response
 */
async function returnLoan(loanId) {
  try {
    const response = await fetch(`${API_CONFIG.API_BASE_URL}/loans/${loanId}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Could not return book (Status: ${response.status})`);
    }

    return data;
  } catch (error) {
    console.error("LibraryAPI returnLoan Error:", error);
    throw error;
  }
}

/**
 * Fetch registered campus members from GET /api/members
 * @returns {Promise<Array>} Array of member records [{ member_id, full_name, member_type }]
 */
async function fetchMembers() {
  try {
    const response = await fetch(`${API_CONFIG.API_BASE_URL}/members`);
    if (!response.ok) {
      throw new Error(`Failed to load members (Status: ${response.status} ${response.statusText})`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("LibraryAPI fetchMembers Error:", error);
    throw error;
  }
}

/**
 * Fetch available book copies from GET /api/copies/available
 * @returns {Promise<Array>} Array of available copy records [{ copy_id, copy_code, book_id, title, isbn }]
 */
async function fetchAvailableCopies() {
  try {
    const response = await fetch(`${API_CONFIG.API_BASE_URL}/copies/available`);
    if (!response.ok) {
      throw new Error(`Failed to load available copies (Status: ${response.status} ${response.statusText})`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("LibraryAPI fetchAvailableCopies Error:", error);
    throw error;
  }
}

/**
 * Issue a book copy to a member via POST /api/loans
 * @param {number|string} memberId 
 * @param {number|string} copyId 
 * @returns {Promise<Object>} API response
 */
async function issueLoan(memberId, copyId) {
  try {
    const response = await fetch(`${API_CONFIG.API_BASE_URL}/loans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        member_id: Number(memberId),
        copy_id: Number(copyId)
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Could not issue book (Status: ${response.status})`);
    }

    return data;
  } catch (error) {
    console.error("LibraryAPI issueLoan Error:", error);
    throw error;
  }
}

// Expose API module globally to window.LibraryAPI
// (Works seamlessly with plain HTML script tags without CORS module restrictions)
window.LibraryAPI = {
  config: API_CONFIG,
  mockData: MOCK_BOOKS,
  fetchBooks: fetchBooks,
  fetchActiveLoans: fetchActiveLoans,
  returnLoan: returnLoan,
  fetchMembers: fetchMembers,
  fetchAvailableCopies: fetchAvailableCopies,
  issueLoan: issueLoan,
  
  // Helpers for testing states easily
  setForceError: function(value) {
    API_CONFIG.forceError = Boolean(value);
  },
  setForceEmpty: function(value) {
    API_CONFIG.forceEmpty = Boolean(value);
  },
  resetDemoStates: function() {
    API_CONFIG.forceError = false;
    API_CONFIG.forceEmpty = false;
  }
};
