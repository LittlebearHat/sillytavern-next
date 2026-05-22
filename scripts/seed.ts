import Database from "better-sqlite3";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";

const dbPath = path.join(process.cwd(), "data", "sillytavern.db");
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbPath);

const existing = sqlite.prepare("SELECT id FROM users WHERE handle = ?").get("admin");
if (existing) {
  console.log("Admin user already exists, skipping.");
  process.exit(0);
}

const salt = crypto.randomBytes(32).toString("hex");
const password = crypto.scryptSync("admin", salt, 64).toString("hex");
const id = crypto.randomUUID();

sqlite.prepare(`INSERT INTO users (id, name, handle, password, salt, admin, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, "Admin", "admin", password, salt, 1, 1);

console.log("Default admin user created (handle: admin, password: admin)");
sqlite.close();
