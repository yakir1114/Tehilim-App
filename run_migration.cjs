const Database = require('better-sqlite3');
const db = new Database('tehillim.db');
try {
  console.log("Attempting migration...");
  db.exec("ALTER TABLE rooms ADD COLUMN last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP");
  console.log("Migration successful!");
} catch (e) {
  console.error("Migration failed:", e.message);
}
db.close();
