const Database = require('better-sqlite3');
const db = new Database('tehillim.db');
const info = db.prepare('PRAGMA table_info(rooms)').all();
console.log(JSON.stringify(info, null, 2));
db.close();
