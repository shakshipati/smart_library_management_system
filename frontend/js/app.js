/**
 * ==============================================================================
 * Smart Campus Library Management System - Main Application Controller (app.js)
 * ==============================================================================
 * 
 * Workflows:
 * 1. Book Catalogue: real-time search, availability filtering, copy inventory count.
 * 2. Books Issued (Active Loans): borrower member, title, copy code, borrowed & due dates,
 *    and Book Return action with button locking and immediate sync.
 * 3. Issue a Book (Circulation Desk): select member, select available copy, 14-day loan terms,
 *    submits to POST /api/loans, prevents repeat clicks, and refreshes all views on success.
 */

// Application State Store
const state = {
  // Catalogue State
  allBooks: [],            // Books from GET /api/books
  filteredBooks: [],       // Filtered books
  activeFilter: 'all',     // 'all' | 'available' | 'unavailable'
  searchQuery: '',         // Current search string
  currentStatus: 'idle',   // 'loading' | 'success' | 'empty' | 'error'

  // Active Loans State
  activeLoans: [],         // Loans from GET /api/loans/active
  loansStatus: 'idle',

  // Issue a Book State
  members: [],             // Members from GET /api/members
  availableCopies: [],     // Available copies from GET /api/copies/available
  activeSection: 'catalogue' // 'catalogue' | 'loans' | 'issue'
};

// Cached DOM Elements
const DOM = {
  // Navigation Tabs & Views
  tabCatalogue: document.getElementById('tabCatalogue'),
  tabLoans: document.getElementById('tabLoans'),
  tabIssue: document.getElementById('tabIssue'),
  catalogueView: document.getElementById('catalogueView'),
  loansView: document.getElementById('loansView'),
  issueView: document.getElementById('issueView'),
  loansBadge: document.getElementById('loansBadge'),
  goToIssueBtn: document.getElementById('goToIssueBtn'),

  // Header Counters
  totalBooksCount: document.getElementById('totalBooksCount'),
  availableBooksCount: document.getElementById('availableBooksCount'),
  activeLoansCount: document.getElementById('activeLoansCount'),

  // Catalogue Search & Filters
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  filterChips: document.querySelectorAll('.chip[data-filter]'),

  // Catalogue State Containers
  loadingState: document.getElementById('loadingState'),
  errorState: document.getElementById('errorState'),
  emptyState: document.getElementById('emptyState'),
  booksCatalogue: document.getElementById('booksCatalogue'),
  booksGrid: document.getElementById('booksGrid'),
  errorMessage: document.getElementById('errorMessage'),
  emptyMessage: document.getElementById('emptyMessage'),
  resultsCount: document.getElementById('resultsCount'),
  retryBtn: document.getElementById('retryBtn'),
  resetSearchBtn: document.getElementById('resetSearchBtn'),

  // Loans State Containers
  loansLoadingState: document.getElementById('loansLoadingState'),
  loansErrorState: document.getElementById('loansErrorState'),
  loansErrorMessage: document.getElementById('loansErrorMessage'),
  loansEmptyState: document.getElementById('loansEmptyState'),
  loansContent: document.getElementById('loansContent'),
  loansList: document.getElementById('loansList'),
  refreshLoansBtn: document.getElementById('refreshLoansBtn'),
  retryLoansBtn: document.getElementById('retryLoansBtn'),
  loanFeedback: document.getElementById('loanFeedback'),
  overdueReportMessage: document.getElementById('overdueReportMessage'),
  overdueReportRows: document.getElementById('overdueReportRows'),

  // Issue a Book Elements
  issueFeedback: document.getElementById('issueFeedback'),
  issueLoadingState: document.getElementById('issueLoadingState'),
  issueErrorState: document.getElementById('issueErrorState'),
  issueErrorMessage: document.getElementById('issueErrorMessage'),
  retryIssueOptionsBtn: document.getElementById('retryIssueOptionsBtn'),
  issueFormCard: document.getElementById('issueFormCard'),
  issueBookForm: document.getElementById('issueBookForm'),
  issueMemberSelect: document.getElementById('issueMemberSelect'),
  issueCopySelect: document.getElementById('issueCopySelect'),
  noCopiesAlert: document.getElementById('noCopiesAlert'),
  calculatedDueDate: document.getElementById('calculatedDueDate'),
  issueSubmitBtn: document.getElementById('issueSubmitBtn'),
  issueResetBtn: document.getElementById('issueResetBtn'),

    addBookForm: document.getElementById('addBookForm'),
  addBookTitle: document.getElementById('addBookTitle'),
  addBookIsbn: document.getElementById('addBookIsbn'),
  addBookPublisher: document.getElementById('addBookPublisher'),
  addBookYear: document.getElementById('addBookYear'),
  addBookCopyCode: document.getElementById('addBookCopyCode'),
  addBookAuthors: document.getElementById('addBookAuthors'),
  addBookSubmitBtn: document.getElementById('addBookSubmitBtn'),
  addBookResetBtn: document.getElementById('addBookResetBtn'),
  addBookFeedback: document.getElementById('addBookFeedback'),
  toggleAddBookBtn: document.getElementById('toggleAddBookBtn'),
  toggleAddBookIcon: document.querySelector('#toggleAddBookBtn .toggle-icon'),
  addBookFormContainer: document.getElementById('addBookFormContainer'),

    memberRegistrationForm: document.getElementById('memberRegistrationForm'),
  memberFullName: document.getElementById('memberFullName'),
  memberEmail: document.getElementById('memberEmail'),
  memberType: document.getElementById('memberType'),
  memberRegistrationFeedback: document.getElementById('memberRegistrationFeedback'),
  registeredMembersMessage: document.getElementById('registeredMembersMessage'),
  registeredMembersList: document.getElementById('registeredMembersList'),
  registerMemberSubmitBtn: document.getElementById('registerMemberSubmitBtn')
};

// --- Utility Helpers ---

/**
 * Escapes HTML characters to prevent XSS injection
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return text ?? '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats ISO date string into readable format (e.g. "Oct 19, 2026")
 */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Checks if a due date has passed
 */
function checkOverdue(dueStr) {
  if (!dueStr) return false;
  const dueDate = new Date(dueStr);
  if (isNaN(dueDate.getTime())) return false;
  return dueDate.getTime() < Date.now();
}

/**
 * Shows temporary alert banner in the Books Issued section
 */
function showLoanFeedback(message, type = 'success') {
  DOM.loanFeedback.className = `loan-feedback ${type}`;
  DOM.loanFeedback.textContent = message;
  DOM.loanFeedback.classList.remove('hidden');

  clearTimeout(DOM.loanFeedback._timer);
  DOM.loanFeedback._timer = setTimeout(() => {
    DOM.loanFeedback.classList.add('hidden');
  }, 6000);
}

/**
 * Shows temporary alert banner in the Issue a Book section
 */
function showIssueFeedback(message, type = 'success') {
  DOM.issueFeedback.className = `loan-feedback ${type}`;
  DOM.issueFeedback.textContent = message;
  DOM.issueFeedback.classList.remove('hidden');

  clearTimeout(DOM.issueFeedback._timer);
  DOM.issueFeedback._timer = setTimeout(() => {
    DOM.issueFeedback.classList.add('hidden');
  }, 6000);
}

function showBookFeedback(message, type = 'success') {
  DOM.addBookFeedback.className = `loan-feedback ${type}`;
  DOM.addBookFeedback.textContent = message;
  DOM.addBookFeedback.classList.remove('hidden');

  clearTimeout(DOM.addBookFeedback._timer);
  DOM.addBookFeedback._timer = setTimeout(() => {
    DOM.addBookFeedback.classList.add('hidden');
  }, 6000);
}

// --- Navigation Section Handling ---

function switchSection(section) {
  state.activeSection = section;

  // Reset tab active states
  [DOM.tabCatalogue, DOM.tabLoans, DOM.tabIssue].forEach(tab => {
    if (tab) {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    }
  });

  // Hide all view panels
  [DOM.catalogueView, DOM.loansView, DOM.issueView].forEach(view => {
    if (view) {
      view.classList.add('hidden');
    }
  });

  if (section === 'catalogue') {
    DOM.tabCatalogue.classList.add('active');
    DOM.tabCatalogue.setAttribute('aria-selected', 'true');
    DOM.catalogueView.classList.remove('hidden');
  } else if (section === 'loans') {
    DOM.tabLoans.classList.add('active');
    DOM.tabLoans.setAttribute('aria-selected', 'true');
    DOM.loansView.classList.remove('hidden');
    loadActiveLoans();
  } else if (section === 'issue') {
    DOM.tabIssue.classList.add('active');
    DOM.tabIssue.setAttribute('aria-selected', 'true');
    DOM.issueView.classList.remove('hidden');
    // Ensure checkout dropdown options are up to date
    loadIssueOptions();
  }
}

// --- View 1: Catalogue Logic ---

/**
 * Switch Catalogue view between: 'loading', 'success', 'empty', or 'error'
 */
function setViewState(viewState, customMessage = '') {
  state.currentStatus = viewState;

  DOM.loadingState.classList.add('hidden');
  DOM.errorState.classList.add('hidden');
  DOM.emptyState.classList.add('hidden');
  DOM.booksCatalogue.classList.add('hidden');

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
        DOM.emptyMessage.textContent = `No books match "${state.searchQuery}". Try searching by another title, author, publisher, or ISBN.`;
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
 * Load books from GET /api/books
 */
async function loadBooks() {
  setViewState('loading');

  try {
    const books = await window.LibraryAPI.fetchBooks();
    state.allBooks = Array.isArray(books) ? books : [];

    updateLibraryStats(state.allBooks);
    applySearchAndFilter();
  } catch (error) {
    console.error("Error loading catalogue:", error);
    setViewState('error', error.message || 'Unable to connect to the catalogue service.');
  }
}

function updateLibraryStats(books) {
  const total = books.length;
  const available = books.filter(b => (Number(b.available_copies) || 0) > 0).length;

  DOM.totalBooksCount.textContent = total;
  DOM.availableBooksCount.textContent = available;
}

function applySearchAndFilter() {
  const query = state.searchQuery.trim().toLowerCase();
  const filter = state.activeFilter;

  state.filteredBooks = state.allBooks.filter(book => {
    const titleMatch = book.title ? book.title.toLowerCase().includes(query) : false;
    const authorMatch = book.authors ? book.authors.toLowerCase().includes(query) : false;
    const publisherMatch = book.publisher ? book.publisher.toLowerCase().includes(query) : false;
    const isbnMatch = book.isbn ? String(book.isbn).toLowerCase().includes(query) : false;
    const matchesSearch = !query || titleMatch || authorMatch || publisherMatch || isbnMatch;

    const availableCopies = Number(book.available_copies) || 0;
    let matchesAvailability = true;
    if (filter === 'available') {
      matchesAvailability = availableCopies > 0;
    } else if (filter === 'unavailable') {
      matchesAvailability = availableCopies === 0;
    }

    return matchesSearch && matchesAvailability;
  });

  if (state.allBooks.length === 0) {
    setViewState('empty', 'The library catalogue is currently empty.');
  } else if (state.filteredBooks.length === 0) {
    setViewState('empty');
  } else {
    renderBookCards(state.filteredBooks);
    setViewState('success');
  }
}

function renderBookCards(books) {
  DOM.booksGrid.innerHTML = '';

  const cardsHtml = books.map(book => {
    const totalCopies = Number(book.total_copies) || 0;
    const availableCopies = Number(book.available_copies) || 0;
    const isAvailable = availableCopies > 0;
    const statusClass = isAvailable ? 'status-available' : 'status-unavailable';
    const statusText = isAvailable ? `${availableCopies} Available` : 'Checked Out';

    return `
      <article class="book-card" data-book-id="${book.book_id}">
        <div>
          <div class="book-card-top">
            <span class="book-category">${escapeHtml(book.publication_year ? `Year ${book.publication_year}` : 'Book')}</span>
            <span class="status-badge ${statusClass}">
              <span class="status-dot"></span>
              ${statusText}
            </span>
          </div>

          <h3 class="book-title" title="${escapeHtml(book.title)}">
            ${escapeHtml(book.title)}
          </h3>

          <!-- Author displayed clearly near the title -->
          <p class="book-author" title="Author(s)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>${escapeHtml(book.authors || 'Author Unknown')}</span>
          </p>
        </div>

        <div class="book-meta">
          <div class="meta-row">
            <span class="meta-label">Publisher:</span>
            <span class="meta-value">${escapeHtml(book.publisher || 'N/A')}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">ISBN:</span>
            <span class="meta-value isbn-code">${escapeHtml(book.isbn || 'N/A')}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Copies Available:</span>
            <span class="meta-value ${isAvailable ? 'text-success' : ''}"><strong>${availableCopies}</strong> / ${totalCopies} total</span>
          </div>
          <button type="button" class="btn-remove-book" data-book-id="${escapeHtml(String(book.book_id))}" data-book-title="${escapeHtml(book.title || 'this book')}" aria-label="Remove ${escapeHtml(book.title || 'this book')} from catalogue">
            Remove book
          </button>
        </div>
      </article>
    `;
  }).join('');

  DOM.booksGrid.innerHTML = cardsHtml;
}

async function handleRemoveBook(button) {
  const bookId = button.getAttribute('data-book-id');
  const bookTitle = button.getAttribute('data-book-title') || 'this book';
  if (!bookId) return;

  if (!window.confirm(`Remove "${bookTitle}" from the catalogue? Books with any loan history cannot be removed.`)) {
    return;
  }

  button.disabled = true;
  button.textContent = 'Removing...';
  showBookFeedback(`Removing "${bookTitle}"...`, 'success');
  DOM.addBookFeedback.scrollIntoView({ behavior: 'smooth', block: 'center' });

  try {
    const result = await window.LibraryAPI.deleteBook(bookId);
    showBookFeedback(result.message || 'Book removed successfully.', 'success');
    DOM.addBookFeedback.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await loadBooks();
  } catch (error) {
    console.error('Could not remove book:', error);
    showBookFeedback(error.message || 'Could not remove the book.', 'error');
    DOM.addBookFeedback.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (button.isConnected) {
      button.disabled = false;
      button.textContent = 'Remove book';
    }
  }
}

// --- View 2: Books Issued (Active Loans) Logic ---

/**
 * Switch Loans view between: 'loading', 'success', 'empty', or 'error'
 */
function setLoansViewState(viewState, customMessage = '') {
  state.loansStatus = viewState;

  DOM.loansLoadingState.classList.add('hidden');
  DOM.loansErrorState.classList.add('hidden');
  DOM.loansEmptyState.classList.add('hidden');
  DOM.loansContent.classList.add('hidden');

  switch (viewState) {
    case 'loading':
      DOM.loansLoadingState.classList.remove('hidden');
      break;

    case 'error':
      DOM.loansErrorState.classList.remove('hidden');
      DOM.loansErrorMessage.textContent = customMessage || 'Could not load active loans from the database.';
      break;

    case 'empty':
      DOM.loansEmptyState.classList.remove('hidden');
      DOM.loansContent.classList.remove('hidden');
      break;

    case 'success':
      DOM.loansContent.classList.remove('hidden');
      break;
  }
}

/**
 * Fetch and render active loans from GET /api/loans/active
 */
async function loadActiveLoans() {
  setLoansViewState('loading');
  loadOverdueReport();

  try {
    const loans = await window.LibraryAPI.fetchActiveLoans();
    state.activeLoans = Array.isArray(loans) ? loans : [];

    const count = state.activeLoans.length;
    DOM.activeLoansCount.textContent = count;
    DOM.loansBadge.textContent = count;

    if (count === 0) {
      setLoansViewState('empty');
    } else {
      renderActiveLoans(state.activeLoans);
      setLoansViewState('success');
    }
  } catch (error) {
    console.error("Error loading active loans:", error);
    DOM.activeLoansCount.textContent = '!';
    DOM.loansBadge.textContent = '!';
    setLoansViewState('error', error.message || 'Unable to connect to active loans service.');
  }
}

/**
 * Fetch and render the overdue report from GET /api/reports/overdue
 */
async function loadOverdueReport() {
  DOM.overdueReportMessage.className = 'report-message';
  DOM.overdueReportMessage.textContent = 'Loading overdue loans...';
  DOM.overdueReportRows.innerHTML = '';

  try {
    const overdueLoans = await window.LibraryAPI.fetchOverdueLoans();
    if (!Array.isArray(overdueLoans)) {
      throw new Error('Unexpected response while loading overdue loans.');
    }

    if (overdueLoans.length === 0) {
      DOM.overdueReportMessage.textContent = 'No overdue loans';
      return;
    }

    DOM.overdueReportRows.innerHTML = overdueLoans.map(loan => `
      <tr>
        <td>${escapeHtml(loan.full_name || 'Anonymous Member')}</td>
        <td>${escapeHtml(loan.title || 'Untitled Book')}</td>
        <td>${escapeHtml(loan.copy_code || 'N/A')}</td>
        <td>${escapeHtml(formatDate(loan.due_at))}</td>
        <td>${escapeHtml(loan.days_overdue ?? 'N/A')}</td>
      </tr>
    `).join('');
    DOM.overdueReportMessage.textContent = '';
  } catch (error) {
    console.error('Error loading overdue report:', error);
    DOM.overdueReportMessage.className = 'report-message error';
    DOM.overdueReportMessage.textContent = `Could not load overdue loans: ${error.message || 'Please try again.'}`;
  }
}

/**
 * Render active loans in the circulation table
 */
function renderActiveLoans(loans) {
  DOM.loansList.innerHTML = '';

  const html = loans.map(loan => {
    const isOverdue = Number(loan.is_overdue) === 1;
    const borrowedFormatted = formatDate(loan.borrowed_at);
    const dueFormatted = formatDate(loan.due_at);

    return `
      <tr>
        <td>
          <span class="table-primary-text">${escapeHtml(loan.title || 'Untitled Book')}</span>
          <span class="copy-badge">${escapeHtml(loan.copy_code || 'Copy')}</span>
        </td>
        <td>${escapeHtml(loan.full_name || 'Anonymous Member')}</td>
        <td>${escapeHtml(borrowedFormatted)}</td>
        <td><span class="due-pill ${isOverdue ? 'due-overdue' : 'due-normal'}">${isOverdue ? 'Overdue · ' : ''}${escapeHtml(dueFormatted)}</span></td>
        <td class="table-action-cell">
          <button class="btn-return" data-loan-id="${escapeHtml(String(loan.loan_id))}" data-book-title="${escapeHtml(loan.title || 'Book')}" aria-label="Return ${escapeHtml(loan.title || 'Book')}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="9 14 4 9 9 4"/>
              <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
            </svg>
            <span>Return</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  DOM.loansList.innerHTML = `
    <div class="table-wrapper" role="region" aria-label="Active book loans table" tabindex="0">
      <table class="data-table loans-table">
        <caption class="visually-hidden">Active book loans</caption>
        <thead>
          <tr>
            <th scope="col">Book / Copy</th>
            <th scope="col">Member</th>
            <th scope="col">Checked out</th>
            <th scope="col">Due date</th>
            <th scope="col" aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>${html}</tbody>
      </table>
    </div>
  `;
}

/**
 * Handle "Return" button click
 */
async function handleReturnBook(button) {
  const loanId = button.getAttribute('data-loan-id');
  const bookTitle = button.getAttribute('data-book-title') || 'Book';
  if (!loanId) return;

  // Prevent multiple clicks while return is pending
  button.disabled = true;
  const originalHtml = button.innerHTML;
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinner-inline">
      <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10"/>
    </svg>
    <span>Returning...</span>
  `;

  try {
    const result = await window.LibraryAPI.returnLoan(loanId);
    showLoanFeedback(result.message || `"${bookTitle}" returned successfully.`, 'success');

    // Refresh active loans list, catalogue availability, and issue dropdown choices
    await Promise.all([
      loadActiveLoans(),
      loadBooks(),
      loadIssueOptions()
    ]);
  } catch (error) {
    console.error("Return loan failed:", error);
    showLoanFeedback(`Could not return book: ${error.message}`, 'error');

    button.disabled = false;
    button.innerHTML = originalHtml;
  }
}

// --- View 3: Issue a Book (Circulation Desk) Logic ---

/**
 * Fetch members and available copies to populate the Issue Form
 */
async function loadIssueOptions() {
  DOM.issueLoadingState.classList.remove('hidden');
  DOM.issueErrorState.classList.add('hidden');
  DOM.issueFormCard.classList.add('hidden');

  // Compute standard 14 days due date
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  DOM.calculatedDueDate.textContent = dueDate.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  try {
    const [members, availableCopies] = await Promise.all([
      window.LibraryAPI.fetchMembers(),
      window.LibraryAPI.fetchAvailableCopies()
    ]);

    state.members = Array.isArray(members) ? members : [];
    state.availableCopies = Array.isArray(availableCopies) ? availableCopies : [];
    renderRegisteredMembers(state.members);

    // 1. Populate Member Select
    if (state.members.length === 0) {
      DOM.issueMemberSelect.innerHTML = '<option value="" disabled selected>No registered members found</option>';
      DOM.issueMemberSelect.disabled = true;
    } else {
      DOM.issueMemberSelect.disabled = false;
      DOM.issueMemberSelect.innerHTML = 
        '<option value="" disabled selected>-- Select Member --</option>' +
        state.members.map(m => `
          <option value="${m.member_id}">
            ${escapeHtml(m.full_name)} (${escapeHtml(m.member_type ? m.member_type.toUpperCase() : 'MEMBER')})
          </option>
        `).join('');
    }

    // 2. Populate Available Copies Select
    if (state.availableCopies.length === 0) {
      DOM.issueCopySelect.innerHTML = '<option value="" disabled selected>No physical copies available</option>';
      DOM.issueCopySelect.disabled = true;
      DOM.noCopiesAlert.classList.remove('hidden');
      DOM.issueSubmitBtn.disabled = true;
    } else {
      DOM.issueCopySelect.disabled = false;
      DOM.noCopiesAlert.classList.add('hidden');
      DOM.issueSubmitBtn.disabled = false;
      DOM.issueCopySelect.innerHTML = 
        '<option value="" disabled selected>-- Select Available Copy --</option>' +
        state.availableCopies.map(c => `
          <option value="${c.copy_id}">
            [${escapeHtml(c.copy_code)}] ${escapeHtml(c.title)} (ISBN: ${escapeHtml(c.isbn || 'N/A')})
          </option>
        `).join('');
    }

    DOM.issueLoadingState.classList.add('hidden');
    DOM.issueFormCard.classList.remove('hidden');

  } catch (error) {
    console.error("Error loading issue options:", error);
    DOM.registeredMembersMessage.textContent = `Could not load members: ${error.message || 'Please try again.'}`;
    DOM.registeredMembersList.innerHTML = '';
    DOM.issueLoadingState.classList.add('hidden');
    DOM.issueErrorMessage.textContent = error.message || 'Could not load members or available copies from database.';
    DOM.issueErrorState.classList.remove('hidden');
  }
}

function renderRegisteredMembers(members) {
  DOM.registeredMembersList.innerHTML = '';

  if (members.length === 0) {
    DOM.registeredMembersMessage.className = 'member-list-message';
    DOM.registeredMembersMessage.textContent = 'No registered members.';
    return;
  }

  DOM.registeredMembersMessage.className = 'member-list-message';
  DOM.registeredMembersMessage.textContent = '';
  DOM.registeredMembersList.innerHTML = `
    <div class="table-wrapper" role="region" aria-label="Registered members table" tabindex="0">
      <table class="data-table members-table">
        <caption class="visually-hidden">Registered library members</caption>
        <thead>
          <tr>
            <th scope="col">Member</th>
            <th scope="col">Type</th>
            <th scope="col" aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>
          ${members.map(member => `
            <tr>
              <td class="member-name">${escapeHtml(member.full_name || 'Unnamed member')}</td>
              <td>${escapeHtml(member.member_type ? member.member_type.toUpperCase() : 'MEMBER')}</td>
              <td class="table-action-cell">
                <button type="button" class="btn-remove-member" data-member-id="${escapeHtml(String(member.member_id))}" data-member-name="${escapeHtml(member.full_name || 'this member')}" aria-label="Remove ${escapeHtml(member.full_name || 'this member')}">
                  Remove
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function handleRemoveMember(button) {
  const memberId = button.getAttribute('data-member-id');
  const memberName = button.getAttribute('data-member-name') || 'this member';
  if (!memberId) return;

  if (!window.confirm(`Remove ${memberName}? Members with any loan history cannot be removed.`)) {
    return;
  }

  button.disabled = true;
  button.textContent = 'Removing...';

  try {
    const result = await window.LibraryAPI.deleteMember(memberId);
    await loadIssueOptions();
    DOM.registeredMembersMessage.className = 'member-list-message success';
    DOM.registeredMembersMessage.textContent = result.message || 'Member removed successfully.';
  } catch (error) {
    console.error('Could not remove member:', error);
    DOM.registeredMembersMessage.className = 'member-list-message error';
    DOM.registeredMembersMessage.textContent = error.message || 'Could not remove the member.';
    if (button.isConnected) {
      button.disabled = false;
      button.textContent = 'Remove';
    }
  }
}

/**
 * Handle "Issue Book" form submission
 */
async function handleIssueSubmit(event) {
  event.preventDefault();

  const memberId = DOM.issueMemberSelect.value;
  const copyId = DOM.issueCopySelect.value;

  if (!memberId || !copyId) {
    showIssueFeedback('Please select both a borrowing member and an available copy.', 'error');
    return;
  }

  // Prevent repeat submissions while request is in progress
  DOM.issueSubmitBtn.disabled = true;
  const originalBtnHtml = DOM.issueSubmitBtn.innerHTML;
  DOM.issueSubmitBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinner-inline">
      <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10"/>
    </svg>
    <span>Issuing Book...</span>
  `;

  try {
    const result = await window.LibraryAPI.issueLoan(memberId, copyId);
    showIssueFeedback(result.message || 'Book checked out successfully!', 'success');

    // Reset form inputs
    DOM.issueBookForm.reset();

    // Immediately refresh catalogue, active loans, and available copy choices
    await Promise.all([
      loadBooks(),
      loadActiveLoans(),
      loadIssueOptions()
    ]);

  } catch (error) {
    console.error("Issue loan failed:", error);
    showIssueFeedback(`Checkout failed: ${error.message}`, 'error');
  } finally {
    DOM.issueSubmitBtn.disabled = false;
    DOM.issueSubmitBtn.innerHTML = originalBtnHtml;
  }
}

async function handleAddBookSubmit(event) {
  event.preventDefault();

  if (!DOM.addBookForm.reportValidity()) return;

  const authors = DOM.addBookAuthors.value
    .split(/\r?\n/)
    .map(name => name.trim())
    .filter(Boolean);

  if (authors.some(name => name.length > 120)) {
    showBookFeedback('Each author name must be 120 characters or fewer.', 'error');
    return;
  }

  const yearText = DOM.addBookYear.value.trim();

  const book = {
    title: DOM.addBookTitle.value.trim(),
    isbn: DOM.addBookIsbn.value.trim() || null,
    publisher: DOM.addBookPublisher.value.trim() || null,
    publication_year: yearText ? Number(yearText) : null,
    authors,
    copy_code: DOM.addBookCopyCode.value.trim()
  };

  const originalButton = DOM.addBookSubmitBtn.innerHTML;
  DOM.addBookSubmitBtn.disabled = true;
  DOM.addBookSubmitBtn.textContent = 'Saving…';

  try {
    const result = await window.LibraryAPI.addBook(book);
    showBookFeedback(result.message, 'success');
    DOM.addBookForm.reset();

    await Promise.all([
      loadBooks(),
      loadIssueOptions()
    ]);
  } catch (error) {
    showBookFeedback(error.message || 'Could not add the book.', 'error');
  } finally {
    DOM.addBookSubmitBtn.disabled = false;
    DOM.addBookSubmitBtn.innerHTML = originalButton;
  }
}

async function handleMemberRegistration(event) {
  event.preventDefault();

  if (!DOM.memberRegistrationForm.reportValidity()) return;

  const member = {
    full_name: DOM.memberFullName.value.trim(),
    email: DOM.memberEmail.value.trim(),
    member_type: DOM.memberType.value
  };

  const originalButtonText = DOM.registerMemberSubmitBtn.textContent;
  DOM.registerMemberSubmitBtn.disabled = true;
  DOM.registerMemberSubmitBtn.textContent = 'Registering…';

  try {
    const result = await window.LibraryAPI.registerMember(member);

    DOM.memberRegistrationFeedback.className = 'loan-feedback success';
    DOM.memberRegistrationFeedback.textContent = result.message;
    DOM.memberRegistrationForm.reset();

    await loadIssueOptions();
    DOM.issueMemberSelect.value = String(result.member_id);
  } catch (error) {
    DOM.memberRegistrationFeedback.className = 'loan-feedback error';
    DOM.memberRegistrationFeedback.textContent = error.message || 'Could not register member.';
  } finally {
    DOM.registerMemberSubmitBtn.disabled = false;
    DOM.registerMemberSubmitBtn.textContent = originalButtonText;
  }
}
// --- Event Listeners Setup ---
function setupEventListeners() {
  // Navigation Tabs
  DOM.tabCatalogue.addEventListener('click', () => switchSection('catalogue'));
  DOM.tabLoans.addEventListener('click', () => switchSection('loans'));
  DOM.tabIssue.addEventListener('click', () => switchSection('issue'));
  if (DOM.goToIssueBtn) {
    DOM.goToIssueBtn.addEventListener('click', () => switchSection('issue'));
  }

  // Live Search Input
  DOM.searchInput.addEventListener('input', (event) => {
    state.searchQuery = event.target.value;
    DOM.clearSearchBtn.hidden = state.searchQuery.length === 0;
    applySearchAndFilter();
  });

  // Clear Search Button
  DOM.clearSearchBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    state.searchQuery = '';
    DOM.clearSearchBtn.hidden = true;
    DOM.searchInput.focus();
    applySearchAndFilter();
  });

  // Filter Chips
  DOM.filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      DOM.filterChips.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-checked', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-checked', 'true');
      state.activeFilter = chip.getAttribute('data-filter');
      applySearchAndFilter();
    });
  });

  // Catalogue Retry and Reset
  DOM.retryBtn.addEventListener('click', () => {
    window.LibraryAPI.resetDemoStates();
    loadBooks();
  });

  DOM.resetSearchBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    state.searchQuery = '';
    DOM.clearSearchBtn.hidden = true;
    DOM.filterChips.forEach(c => {
      const isAll = c.getAttribute('data-filter') === 'all';
      c.classList.toggle('active', isAll);
      c.setAttribute('aria-checked', isAll ? 'true' : 'false');
    });
    state.activeFilter = 'all';
    applySearchAndFilter();
  });

  // Catalogue: Remove Book Button (Event Delegation)
  DOM.booksGrid.addEventListener('click', (event) => {
    const removeButton = event.target.closest('.btn-remove-book');
    if (removeButton && !removeButton.disabled) {
      handleRemoveBook(removeButton);
    }
  });

  DOM.registeredMembersList.addEventListener('click', (event) => {
    const removeButton = event.target.closest('.btn-remove-member');
    if (removeButton && !removeButton.disabled) {
      handleRemoveMember(removeButton);
    }
  });

  // Books Issued: Return Button (Event Delegation)
  DOM.loansList.addEventListener('click', (event) => {
    const returnBtn = event.target.closest('.btn-return');
    if (returnBtn && !returnBtn.disabled) {
      handleReturnBook(returnBtn);
    }
  });

  // Loans: Refresh and Retry Buttons
  DOM.refreshLoansBtn.addEventListener('click', () => {
    loadActiveLoans();
    loadBooks();
  });

  DOM.retryLoansBtn.addEventListener('click', () => {
    loadActiveLoans();
  });

  // Issue Form: Submit and Reset
  DOM.issueBookForm.addEventListener('submit', handleIssueSubmit);
  DOM.issueResetBtn.addEventListener('click', () => {
    DOM.issueBookForm.reset();
    DOM.issueFeedback.classList.add('hidden');
  });
  DOM.retryIssueOptionsBtn.addEventListener('click', () => {
    loadIssueOptions();
  });

  DOM.toggleAddBookBtn.addEventListener('click', () => {
    const isExpanded = DOM.toggleAddBookBtn.getAttribute('aria-expanded') === 'true';
    const nextExpanded = !isExpanded;

    DOM.addBookFormContainer.classList.toggle('hidden', !nextExpanded);
    DOM.toggleAddBookBtn.setAttribute('aria-expanded', String(nextExpanded));
    DOM.toggleAddBookBtn.querySelector('.toggle-text').textContent =
      nextExpanded ? 'Collapse Form' : 'Expand Form';
    DOM.toggleAddBookIcon.classList.toggle('is-collapsed', !nextExpanded);
  });

    DOM.addBookForm.addEventListener('submit', handleAddBookSubmit);

  DOM.addBookResetBtn.addEventListener('click', () => {
    DOM.addBookFeedback.classList.add('hidden');
  });
    DOM.memberRegistrationForm.addEventListener('submit', handleMemberRegistration);
}

// Initialize on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadBooks();
  loadActiveLoans();
  loadIssueOptions();
});
