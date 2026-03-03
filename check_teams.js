
const Database = require("better-sqlite3");
const db = new Database("community.db");

const teams = db.prepare("SELECT id, name FROM teams").all();
console.log(JSON.stringify(teams, null, 2));
