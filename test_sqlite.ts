import Database from "better-sqlite3";
try {
  const db = new Database(":memory:");
  console.log("SQLite works!");
} catch (e) {
  console.error("SQLite failed:", e);
}
