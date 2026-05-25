/**
 * 迁移记录修复脚本
 *
 * 用于修复"数据库列/表已存在但迁移记录缺失"的不同步状态。
 * 常见原因：曾经使用 drizzle push（直接推送 schema）而非 migrate，
 * 或旧版本通过其他方式创建了表结构。
 *
 * 用法：node scripts/fix-migrations.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const ROOT = process.cwd();
const dbPath = process.env.DATABASE_URL ?? join(ROOT, "data", "sillytavern.db");
const migrationsDir = join(ROOT, "drizzle");
const journalPath = join(migrationsDir, "meta", "_journal.json");

if (!existsSync(dbPath)) {
  console.error("[fix-migrations] 数据库文件不存在:", dbPath);
  process.exit(1);
}
if (!existsSync(journalPath)) {
  console.error("[fix-migrations] 找不到迁移 journal 文件:", journalPath);
  process.exit(1);
}

const journal = JSON.parse(readFileSync(journalPath, "utf8"));
const db = new Database(dbPath);

// 获取数据库中已记录的 hash 集合
const existing = new Set(
  db.prepare("SELECT hash FROM __drizzle_migrations").all().map((r) => r.hash)
);

let fixed = 0;
for (const entry of journal.entries) {
  const sqlPath = join(migrationsDir, `${entry.tag}.sql`);
  if (!existsSync(sqlPath)) {
    console.warn(`[fix-migrations] 找不到迁移文件，跳过: ${sqlPath}`);
    continue;
  }
  const sql = readFileSync(sqlPath, "utf8");
  const hash = createHash("sha256").update(sql).digest("hex");

  if (existing.has(hash)) {
    console.log(`[fix-migrations] ✓ ${entry.tag} 已记录，跳过`);
    continue;
  }

  // 迁移未记录 —— 尝试执行 SQL，成功则插入记录
  console.log(`[fix-migrations] 尝试修复: ${entry.tag}`);
  const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  let allOk = true;
  for (const stmt of statements) {
    try {
      db.exec(stmt);
    } catch (e) {
      if (e.message?.includes("duplicate column") || e.message?.includes("already exists")) {
        // 列/表已存在，说明该迁移在 schema 层面已完成，仅需标记记录
        console.log(`  → 列/表已存在，标记为完成`);
      } else {
        console.error(`  → 执行失败: ${e.message}`);
        allOk = false;
        break;
      }
    }
  }

  if (allOk) {
    db.prepare("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)").run(
      hash,
      entry.when ?? Date.now()
    );
    console.log(`  → 记录已插入，hash: ${hash.slice(0, 16)}...`);
    fixed++;
  } else {
    console.error(`  → 修复失败，请手动处理: ${entry.tag}`);
  }
}

db.close();

if (fixed > 0) {
  console.log(`\n[fix-migrations] 完成，共修复 ${fixed} 条迁移记录。`);
  console.log("[fix-migrations] 现在可以重新运行 npm run setup");
} else {
  console.log("\n[fix-migrations] 所有迁移记录均正常，无需修复。");
}
