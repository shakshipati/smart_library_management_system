USE `smart_campus_library`;

INSERT IGNORE INTO `members` (`full_name`, `email`, `member_type`) VALUES
  ('Riley Morgan', 'riley.morgan@example.test', 'student'),
  ('Casey Bennett', 'casey.bennett@example.test', 'student'),
  ('Jordan Ellis', 'jordan.ellis@example.test', 'faculty');

INSERT IGNORE INTO `books` (`isbn`, `title`, `publisher`, `publication_year`) VALUES
  ('9780000000101', 'The Lantern Archive', 'Northstar Press', 2021),
  ('9780000000102', 'Patterns in the Glass', 'Cedar House', 2023),
  ('9780000000103', 'A Map of Quiet Rivers', 'Northstar Press', 2020);

INSERT IGNORE INTO `authors` (`full_name`) VALUES
  ('Avery Rowan'),
  ('Morgan Vale'),
  ('Taylor Quinn'),
  ('Sam Linden');

INSERT IGNORE INTO `book_authors` (`book_id`, `author_id`)
SELECT b.`book_id`, a.`author_id`
FROM `books` AS b
JOIN `authors` AS a
  ON (b.`isbn` = '9780000000101' AND a.`full_name` = 'Avery Rowan')
  OR (b.`isbn` = '9780000000101' AND a.`full_name` = 'Morgan Vale')
  OR (b.`isbn` = '9780000000102' AND a.`full_name` = 'Taylor Quinn')
  OR (b.`isbn` = '9780000000103' AND a.`full_name` = 'Sam Linden');

INSERT IGNORE INTO `book_copies` (`book_id`, `copy_code`, `status`)
SELECT `book_id`, 'DEMO-LA-001', 'available'
FROM `books`
WHERE `isbn` = '9780000000101';

INSERT IGNORE INTO `book_copies` (`book_id`, `copy_code`, `status`)
SELECT `book_id`, 'DEMO-LA-002', 'available'
FROM `books`
WHERE `isbn` = '9780000000101';

INSERT IGNORE INTO `book_copies` (`book_id`, `copy_code`, `status`)
SELECT `book_id`, 'DEMO-PG-001', 'available'
FROM `books`
WHERE `isbn` = '9780000000102';

INSERT IGNORE INTO `book_copies` (`book_id`, `copy_code`, `status`)
SELECT `book_id`, 'DEMO-MQ-001', 'available'
FROM `books`
WHERE `isbn` = '9780000000103';
