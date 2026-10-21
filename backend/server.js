require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

// Serve the frontend files from the sibling frontend folder.
app.use(express.static(path.join(__dirname, "..", "frontend")));
app.use(express.json());

app.get("/api/books", async (req, res) => {
  try {
    const [books] = await pool.query(`
      SELECT
        b.book_id,
        b.isbn,
        b.title,
        b.publisher,
        b.publication_year,
        (
          SELECT GROUP_CONCAT(a.full_name ORDER BY a.full_name SEPARATOR ', ')
          FROM book_authors AS ba
          JOIN authors AS a ON ba.author_id = a.author_id
          WHERE ba.book_id = b.book_id
        ) AS authors,
        COALESCE(c.total_copies, 0) AS total_copies,
        COALESCE(c.available_copies, 0) AS available_copies
      FROM books AS b
      LEFT JOIN (
        SELECT
          book_id,
          COUNT(*) AS total_copies,
          SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available_copies
        FROM book_copies
        GROUP BY book_id
      ) AS c ON c.book_id = b.book_id
      ORDER BY b.title
    `);

    res.json(books);
  } catch (error) {
    console.error("Could not load books:", error.message);
    res.status(500).json({ error: "Could not load books from the database." });
  }
});
app.post("/api/loans/:id/return", async (req, res) => {
  const loanId = Number(req.params.id);
  let connection;

  if (!Number.isInteger(loanId) || loanId < 1) {
    return res.status(400).json({ error: "Invalid loan ID." });
  }

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [loans] = await connection.query(
      "SELECT copy_id, returned_at FROM loans WHERE loan_id = ? FOR UPDATE",
      [loanId]
    );

    if (loans.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Loan not found." });
    }

    if (loans[0].returned_at !== null) {
      await connection.rollback();
      return res.status(409).json({ error: "This loan has already been returned." });
    }

    await connection.query(
      "UPDATE loans SET returned_at = NOW() WHERE loan_id = ?",
      [loanId]
    );

    await connection.query(
      "UPDATE book_copies SET status = 'available' WHERE copy_id = ?",
      [loans[0].copy_id]
    );

    await connection.commit();

    res.json({ message: "Book returned successfully.", loan_id: loanId });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Could not return book:", error.message);
    res.status(500).json({ error: "Could not return the book." });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});
app.post("/api/loans", async (req, res) => {
  const memberId = Number(req.body.member_id);
  const copyId = Number(req.body.copy_id);
  let connection;

  if (!Number.isInteger(memberId) || memberId < 1 ||
      !Number.isInteger(copyId) || copyId < 1) {
    return res.status(400).json({ error: "Valid member_id and copy_id are required." });
  }

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [copies] = await connection.query(
      "SELECT status FROM book_copies WHERE copy_id = ? FOR UPDATE",
      [copyId]
    );

    if (copies.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Book copy not found." });
    }

    if (copies[0].status !== "available") {
      await connection.rollback();
      return res.status(409).json({ error: "This copy is not available." });
    }

    const [result] = await connection.query(
      `INSERT INTO loans (member_id, copy_id, borrowed_at, due_at)
       VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY))`,
      [memberId, copyId]
    );

    await connection.query(
      "UPDATE book_copies SET status = 'borrowed' WHERE copy_id = ?",
      [copyId]
    );

    await connection.commit();

    res.status(201).json({
      message: "Book checked out successfully.",
      loan_id: result.insertId,
      member_id: memberId,
      copy_id: copyId
    });
  } catch (error) {
    if (connection) await connection.rollback();

    console.error("Could not check out book:", error.message);
    res.status(500).json({ error: "Could not check out the book." });
  } finally {
    if (connection) connection.release();
  }
});

app.get("/api/loans/active", async (req, res) => {
  try {
    const [loans] = await pool.query(`
      SELECT
        loans.loan_id,
        members.full_name,
        books.title,
        book_copies.copy_code,
        loans.borrowed_at,
        loans.due_at
      FROM loans
      JOIN members ON loans.member_id = members.member_id
      JOIN book_copies ON loans.copy_id = book_copies.copy_id
      JOIN books ON book_copies.book_id = books.book_id
      WHERE loans.returned_at IS NULL
      ORDER BY loans.due_at
    `);

    res.json(loans);
  } catch (error) {
    console.error("Could not load active loans:", error.message);
    res.status(500).json({ error: "Could not load active loans." });
  }
});

app.get("/api/members", async (req, res) => {
  try {
    const [members] = await pool.query(`
      SELECT member_id, full_name, member_type
      FROM members
      ORDER BY full_name
    `);

    res.json(members);
  } catch (error) {
    console.error("Could not load members:", error.message);
    res.status(500).json({ error: "Could not load members." });
  }
});

app.get("/api/copies/available", async (req, res) => {
  try {
    const [copies] = await pool.query(`
      SELECT
        book_copies.copy_id,
        book_copies.copy_code,
        books.book_id,
        books.title,
        books.isbn
      FROM book_copies
      JOIN books ON book_copies.book_id = books.book_id
      WHERE book_copies.status = 'available'
      ORDER BY books.title, book_copies.copy_code
    `);

    res.json(copies);
  } catch (error) {
    console.error("Could not load available copies:", error.message);
    res.status(500).json({ error: "Could not load available copies." });
  }
});

app.post("/api/books", async (req, res) => {
  const title = String(req.body.title || "").trim();
  const isbn = String(req.body.isbn || "").trim() || null;
  const publisher = String(req.body.publisher || "").trim() || null;
  const copyCode = String(req.body.copy_code || "").trim();

  const yearValue = req.body.publication_year;
  const publicationYear =
    yearValue === "" || yearValue === null || yearValue === undefined
      ? null
      : Number(yearValue);

  const authorNames = Array.isArray(req.body.authors)
    ? [...new Set(req.body.authors.map(name => String(name).trim()).filter(Boolean))]
    : [];

  if (!title || title.length > 200) {
    return res.status(400).json({ error: "A title of up to 200 characters is required." });
  }

  if (isbn && isbn.length > 20) {
    return res.status(400).json({ error: "ISBN must be 20 characters or fewer." });
  }

  if (publisher && publisher.length > 100) {
    return res.status(400).json({ error: "Publisher must be 100 characters or fewer." });
  }

  if (!copyCode || copyCode.length > 30) {
    return res.status(400).json({ error: "A copy code of up to 30 characters is required." });
  }

  if (
    publicationYear !== null &&
    (!Number.isInteger(publicationYear) || publicationYear < 1000 || publicationYear > 2100)
  ) {
    return res.status(400).json({ error: "Enter a valid publication year." });
  }

  if (authorNames.some(name => name.length > 120)) {
    return res.status(400).json({ error: "Author names must be 120 characters or fewer." });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [bookResult] = await connection.query(
      `INSERT INTO books (isbn, title, publisher, publication_year)
       VALUES (?, ?, ?, ?)`,
      [isbn, title, publisher, publicationYear]
    );

    const bookId = bookResult.insertId;

    for (const authorName of authorNames) {
      await connection.query(
        "INSERT IGNORE INTO authors (full_name) VALUES (?)",
        [authorName]
      );

      const [authorRows] = await connection.query(
        "SELECT author_id FROM authors WHERE full_name = ?",
        [authorName]
      );

      if (authorRows.length > 0) {
        await connection.query(
          "INSERT INTO book_authors (book_id, author_id) VALUES (?, ?)",
          [bookId, authorRows[0].author_id]
        );
      }
    }

    const [copyResult] = await connection.query(
      "INSERT INTO book_copies (book_id, copy_code) VALUES (?, ?)",
      [bookId, copyCode]
    );

    await connection.commit();

    res.status(201).json({
      message: "Book and first copy added successfully.",
      book_id: bookId,
      copy_id: copyResult.insertId
    });
  } catch (error) {
    if (connection) await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "That ISBN or copy code is already in use."
      });
    }

    console.error("Could not add book:", error.message);
    res.status(500).json({ error: "Could not add the book." });
  } finally {
    if (connection) connection.release();
  }
});
 app.post("/api/members", async (req, res) => {
  const fullName = String(req.body.full_name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const memberType = String(req.body.member_type || "").trim().toLowerCase();

  if (!fullName || fullName.length > 100) {
    return res.status(400).json({ error: "Enter a name of up to 100 characters." });
  }

  if (
    email.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }

  if (!["student", "faculty"].includes(memberType)) {
    return res.status(400).json({ error: "Member type must be student or faculty." });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO members (full_name, email, member_type)
       VALUES (?, ?, ?)`,
      [fullName, email, memberType]
    );

    res.status(201).json({
      message: "Member registered successfully.",
      member_id: result.insertId
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "That email is already registered." });
    }

    console.error("Could not register member:", error.message);
    res.status(500).json({ error: "Could not register member." });
  }
});
app.listen(port, () => {
  console.log(`Library API is running at http://localhost:${port}`);
});