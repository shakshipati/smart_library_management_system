/**
 * ==============================================================================
 * Smart Campus Library Management System - Main Application Controller (app.js)
 * ==============================================================================
 * 
 * Beginner Guide:
 * This file handles all user interactions and updates what you see on the screen.
 * 
 * Main Responsibilities:
 * 1. Fetching books using the window.LibraryAPI service.
 * 2. Managing UI states (Loading, Success, Empty, Error).
 * 3. Handling live search (by Title, Author, or ISBN).
 * 4. Filtering books by availability status.
 * 5. Rendering book cards dynamically into the HTML.
 */

// Application State Store
const state = {
  allBooks: [],         // Raw books received from API/Mock
  filteredBooks: [],    // Books after search and filter chips are applied
  activeFilter: 'all',  // 'all' | 'available' | 'unavailable'
  searchQuery: '',      // Current search box text
  currentStatus: 'idle' // 'loading' | 'success' | 'empty' | 'error'
};

// Cached DOM Elements
const DOM = {
  // Search & Filter
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  filterChips: document.querySelectorAll('.chip[data-filter]'),

  // State Containers
  loadingState: document.getElementById('loadingState'),
  errorState: document.getElementById('errorState'),
  emptyState: document.getElementById('emptyState'),
  booksCatalogue: document.getElementById('booksCatalogue'),
  booksGrid: document.getElementById('booksGrid'),

  // Feedback & Messages
  errorMessage: document.getElementById('errorMessage'),
  emptyMessage: document.getElementById('emptyMessage'),
  resultsCount: document.getElementById('resultsCount'),
  totalBooksCount: document.getElementById('totalBooksCount'),
  availableBooksCount: document.getElementById('availableBooksCount'),

  // Buttons
  retryBtn: document.getElementById('retryBtn'),
  resetSearchBtn: document.getElementById('resetSearchBtn'),

  // Demo Buttons
  testLoadingBtn: document.getElementById('testLoadingBtn'),
  testEmptyBtn: document.getElementById('testEmptyBtn'),
  testErrorBtn: document.getElementById('testErrorBtn'),
  resetDemoBtn: document.getElementById('resetDemoBtn')
};

/**
 * Switch UI view between: 'loading', 'success', 'empty', or 'error'
 * 
 * @param {'loading'|'success'|'empty'|'error'} viewState - The state to activate
 * @param {string} [customMessage] - Optional message for error or empty states
 */
function setViewState(viewState, customMessage = '') {
  state.currentStatus = viewState;

  // Hide all state containers first
  DOM.loadingState.classList.add('hidden');
  DOM.errorState.classList.add('hidden');
  DOM.emptyState.classList.add('hidden');
  DOM.booksCatalogue.classList.add('hidden');

  // Activate the requested state container
  switch (viewState) {
    case 'loading':
      DOM.loadingState.classList.remove('hidden');
      DOM.resultsCount.textContent = 'Loading catalogue...';
      break;

    case 'error':
      DOM.errorState.classList.remove('hidden');
      DOM.errorMessage.textContent = customMessage || 'An unexpected error occurred while loading books. Please try again.';
      DOM.resultsCount.textContent = 'Error';
      break;

    case 'empty':
      DOM.emptyState.classList.remove('hidden');
      if (customMessage) {
        DOM.emptyMessage.textContent = customMessage;
      } else if (state.searchQuery.trim()) {
        DOM.emptyMessage.textContent = `No books match "${state.searchQuery}". Try searching by another title, author, or ISBN.`;
      } else {
        DOM.emptyMessage.textContent = 'No books are currently registered in this catalogue view.';
      }
      DOM.resultsCount.textContent = '0 books found';
      break;

    case 'success':
      DOM.booksCatalogue.classList.remove('hidden');
      const count = state.filteredBooks.length;
      DOM.resultsCount.textContent = `${count} ${count === 1 ? 'book' : 'books'} found`;
      break;
  }
}

/**
 * Load books from the API layer (window.LibraryAPI)
 * Handles the full async lifecycle: loading -> success OR error
 */
async function loadBooks() {
  setViewState('loading');

  try {
    // Call the API service (currently mock, future: GET /api/books)
    const books = await window.LibraryAPI.fetchBooks();

    // Store raw data in state
    state.allBooks = Array.isArray(books) ? books : [];

    // Update global library header statistics
    updateLibraryStats(state.allBooks);

    // Apply any active search or filter rules
    applySearchAndFilter();

  } catch (error) {
    console.error("Error loading catalogue:", error);
    setViewState('error', error.message || 'Unable to connect to the catalogue service.');
  }
}

/**
 * Updates total and available counters in the top header
 * 
 * @param {Array} books 
 */
function updateLibraryStats(books) {
  const total = books.length;
  const available = books.filter(b => b.available).length;

  DOM.totalBooksCount.textContent = total;
  DOM.availableBooksCount.textContent = available;
}

/**
 * Filters the stored books according to:
 * 1. Text Search: matches title, author, or ISBN (case-insensitive)
 * 2. Availability Filter: 'all', 'available', or 'unavailable'
 */
function applySearchAndFilter() {
  const query = state.searchQuery.trim().toLowerCase();
  const filter = state.activeFilter;

  // Filter the books list
  state.filteredBooks = state.allBooks.filter(book => {
    // 1. Text matching (Title, Author, or ISBN)
    const matchesSearch = 
      !query ||
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query) ||
      book.isbn.toLowerCase().includes(query);

    // 2. Availability matching
    let matchesAvailability = true;
    if (filter === 'available') {
      matchesAvailability = book.available === true;
    } else if (filter === 'unavailable') {
      matchesAvailability = book.available === false;
    }

    return matchesSearch && matchesAvailability;
  });

  // Decide whether to show books or empty state
  if (state.allBooks.length === 0) {
    setViewState('empty', 'The library catalogue is currently empty.');
  } else if (state.filteredBooks.length === 0) {
    setViewState('empty');
  } else {
    renderBookCards(state.filteredBooks);
    setViewState('success');
  }
}

/**
 * Helper to escape HTML characters to prevent XSS injection
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Render the book cards into the #booksGrid element
 * 
 * @param {Array} books 
 */
function renderBookCards(books) {
  // Clear previous cards
  DOM.booksGrid.innerHTML = '';

  // Generate cards
  const cardsHtml = books.map(book => {
    const isAvailable = Boolean(book.available);
    const statusClass = isAvailable ? 'status-available' : 'status-unavailable';
    const statusText = isAvailable ? 'Available' : 'Checked Out';

    return `
      <article class="book-card" data-book-id="${book.id}">
        <div>
          <!-- Top meta: Category & Status Badge -->
          <div class="book-card-top">
            <span class="book-category">${escapeHtml(book.category || 'General')}</span>
            <span class="status-badge ${statusClass}">
              <span class="status-dot"></span>
              ${statusText}
            </span>
          </div>

          <!-- Title -->
          <h3 class="book-title" title="${escapeHtml(book.title)}">
            ${escapeHtml(book.title)}
          </h3>

          <!-- Author with icon -->
          <p class="book-author">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>${escapeHtml(book.author)}</span>
          </p>
        </div>

        <!-- Meta info: ISBN and Shelf Location -->
        <div class="book-meta">
          <div class="meta-row">
            <span class="meta-label">ISBN:</span>
            <span class="meta-value isbn-code">${escapeHtml(book.isbn)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Location:</span>
            <span class="meta-value">${escapeHtml(book.location || 'Campus Stack')}</span>
          </div>
        </div>
      </article>
    `;
  }).join('');

  DOM.booksGrid.innerHTML = cardsHtml;
}

/**
 * Event Listeners Registration
 */
function setupEventListeners() {
  // 1. Live Search Input
  DOM.searchInput.addEventListener('input', (event) => {
    state.searchQuery = event.target.value;
    
    // Toggle visibility of clear button
    if (state.searchQuery.length > 0) {
      DOM.clearSearchBtn.hidden = false;
    } else {
      DOM.clearSearchBtn.hidden = true;
    }

    applySearchAndFilter();
  });

  // 2. Clear Search Button
  DOM.clearSearchBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    state.searchQuery = '';
    DOM.clearSearchBtn.hidden = true;
    DOM.searchInput.focus();
    applySearchAndFilter();
  });

  // 3. Filter Chips (All, Available, Checked Out)
  DOM.filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      // Update UI active state
      DOM.filterChips.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-checked', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-checked', 'true');

      // Update state and re-filter
      state.activeFilter = chip.getAttribute('data-filter');
      applySearchAndFilter();
    });
  });

  // 4. Retry and Reset Search Buttons
  DOM.retryBtn.addEventListener('click', () => {
    window.LibraryAPI.resetDemoStates();
    loadBooks();
  });

  DOM.resetSearchBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    state.searchQuery = '';
    DOM.clearSearchBtn.hidden = true;
    
    // Reset filter chip to 'all'
    DOM.filterChips.forEach(c => {
      const isAll = c.getAttribute('data-filter') === 'all';
      c.classList.toggle('active', isAll);
      c.setAttribute('aria-checked', isAll ? 'true' : 'false');
    });
    state.activeFilter = 'all';

    window.LibraryAPI.resetDemoStates();
    applySearchAndFilter();
  });

  // 5. Interactive Demo Buttons (to preview Loading, Empty, and Error states)
  DOM.testLoadingBtn.addEventListener('click', () => {
    window.LibraryAPI.resetDemoStates();
    loadBooks();
  });

  DOM.testEmptyBtn.addEventListener('click', () => {
    window.LibraryAPI.setForceEmpty(true);
    window.LibraryAPI.setForceError(false);
    loadBooks();
  });

  DOM.testErrorBtn.addEventListener('click', () => {
    window.LibraryAPI.setForceError(true);
    window.LibraryAPI.setForceEmpty(false);
    loadBooks();
  });

  DOM.resetDemoBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    state.searchQuery = '';
    DOM.clearSearchBtn.hidden = true;
    DOM.filterChips.forEach(c => {
      const isAll = c.getAttribute('data-filter') === 'all';
      c.classList.toggle('active', isAll);
      c.setAttribute('aria-checked', isAll ? 'true' : 'false');
    });
    state.activeFilter = 'all';
    window.LibraryAPI.resetDemoStates();
    loadBooks();
  });
}

// Initialize on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadBooks();
});
