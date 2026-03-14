const Database = require('better-sqlite3');
const db = new Database('tehillim.db');
try {
  console.log("Attempting migration with parenthesized default...");
  db.exec("ALTER TABLE rooms ADD COLUMN last_active_at DATETIME DEFAULT (CURRENT_TIMESTAMP)");
  console.log("Migration successful!");
} catch (e) {
  console.error("Migration failed:", e.message);
  try {
     console.log("Attempting migration without default...");
     db.exec("ALTER TABLE rooms ADD COLUMN last_active_at DATETIME");
     console.log("Migration successful (no default)!");
     db.exec("UPDATE rooms SET last_active_at = CURRENT_TIMESTAMP");
     console.log("Updated existing rows.");
  } catch (e2) {
     console.error("Migration failed again:", e2.message);
  }
}
db.close();
