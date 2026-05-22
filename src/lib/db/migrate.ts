import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "./index";
import path from "node:path";
import fs from "node:fs";

/**
 * 运行数据库迁移
 * 在应用启动时自动执行
 */
export async function runMigrations() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");

  // 确保迁移目录存在
  if (!fs.existsSync(migrationsFolder)) {
    console.log("[DB] No migrations folder found, skipping migrations.");
    return;
  }

  try {
    migrate(db, { migrationsFolder });
    console.log("[DB] Migrations completed successfully.");
  } catch (error) {
    console.error("[DB] Migration failed:", error);
    throw error;
  }
}

/**
 * 关闭数据库连接
 */
export function closeDatabase() {
  sqlite.close();
}
