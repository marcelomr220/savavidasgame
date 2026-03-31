import Database from 'better-sqlite3';
const db = new Database('community.db');
const tasks = db.prepare("SELECT COUNT(*) as count FROM tasks").get();
console.log("Tasks count in SQLite:", tasks.count);
const activeTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE is_active = 1").get();
console.log("Active tasks count in SQLite:", activeTasks.count);
const sample = db.prepare("SELECT * FROM tasks LIMIT 1").get();
console.log("Sample task:", sample);
