const Database = require('better-sqlite3');
const path = require('path');
const config = require('./index');

const dbPath = path.join(__dirname, '../../', config.database.path);

let db = null;

function getDatabase() {
  if (!db) {
    db = new Database(dbPath);
    // 启用外键约束
    db.pragma('foreign_keys = ON');
    // 性能优化
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  getDatabase,
  closeDatabase
};
