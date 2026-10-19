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

app.get("/api/books", async (req, res) => {
  try {
    const [books] = await pool.query(`
      SELECT
        b.book_id,
        b.isbn,
        b.title,
        b.publisher,
        b.publication_year,
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

app.listen(port, () => {
  console.log(`Library API is running at http://localhost:${port}`);
});