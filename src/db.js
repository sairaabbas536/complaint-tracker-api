const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(process.env.DB_FILE || path.join(__dirname, '..', 'complaints.db'));
db.exec(`
CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  studentName TEXT NOT NULL,
  rollNo TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending'
);`);
module.exports = db;
