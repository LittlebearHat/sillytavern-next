/**
 * 一键初始化脚本
 * 执行：（已存在则）自动备份 → drizzle 数据库迁移 → 创建默认管理员账号（admin/admin）
 *
 * 用法：
 *   npm run setup        # 本地开发首次启动 / 升级
 *   tsx scripts/start.ts # 容器 entrypoint 调用
 */
import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const ROOT = process.cwd();
const dbPath = process.env.DATABASE_URL || path.join(ROOT, "data", "sillytavern.db");
const dataDir = path.dirname(dbPath);
const KEEP_BACKUPS = 5;

// 1. 确保 data 目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`[setup] 创建数据目录: ${dataDir}`);
}

// 2. 迁移前自动备份（仅当数据库已存在时）
let lastBackup: string | null = null;
function backupDatabase(): void {
  if (!fs.existsSync(dbPath)) {
    console.log("[setup] 首次启动，无需备份");
    return;
  }
  const backupDir = path.join(dataDir, "backups");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const dbName = path.basename(dbPath);
  const backupFile = path.join(backupDir, `${dbName}.bak.${ts}`);
  console.log(`[setup] 创建启动前备份: ${backupFile}`);
  fs.copyFileSync(dbPath, backupFile);
  // WAL 模式下连同 -wal/-shm 一并备份，避免漏掉未 checkpoint 的事务
  for (const suffix of ["-wal", "-shm"]) {
    const src = `${dbPath}${suffix}`;
    if (fs.existsSync(src)) fs.copyFileSync(src, `${backupFile}${suffix}`);
  }
  lastBackup = backupFile;
  // 仅保留最近 N 份
  const all = fs
    .readdirSync(backupDir)
    .filter(
      (f) => f.startsWith(`${dbName}.bak.`) && !f.endsWith("-wal") && !f.endsWith("-shm"),
    )
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(backupDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  for (const f of all.slice(KEEP_BACKUPS)) {
    const full = path.join(backupDir, f.name);
    try { fs.unlinkSync(full); } catch { /* ignore */ }
    for (const suffix of ["-wal", "-shm"]) {
      try { fs.unlinkSync(`${full}${suffix}`); } catch { /* ignore */ }
    }
  }
  console.log(`[setup] 备份完成（保留最近 ${KEEP_BACKUPS} 份）`);
}
backupDatabase();

// 3. 运行 drizzle 迁移
console.log("[setup] 执行数据库迁移...");
try {
  const result = execSync("npx drizzle-kit migrate", { stdio: "pipe", cwd: ROOT });
  if (result) process.stdout.write(result);
  console.log("[setup] 数据库迁移完成");
} catch (e) {
  const err = e as Error & { stdout?: Buffer; stderr?: Buffer };
  const stdout = err.stdout?.toString() ?? "";
  const stderr = err.stderr?.toString() ?? "";
  const combined = stdout + stderr + err.message;
  process.stdout.write(stdout);
  process.stderr.write(stderr);

  if (combined.includes("duplicate column")) {
    console.error(
      "\n[setup][ERROR] 迁移失败：数据库列已存在（duplicate column）。",
      "\n[setup][ERROR] 这通常是由 drizzle push 或旧版本直接修改了 schema 导致迁移记录不同步。",
      "\n[setup][ERROR] 请运行以下命令手动标记迁移为已完成后重试：",
      "\n[setup][ERROR]   node scripts/fix-migrations.mjs"
    );
  } else {
    console.error("[setup][ERROR] 数据库迁移失败:", err.message);
  }

  if (lastBackup) {
    console.error("[setup][ERROR] 如需回滚至升级前状态，请执行：");
    console.error(`[setup][ERROR]   cp '${lastBackup}' '${dbPath}'`);
    for (const suffix of ["-wal", "-shm"]) {
      const bakExt = `${lastBackup}${suffix}`;
      if (fs.existsSync(bakExt)) {
        console.error(`[setup][ERROR]   cp '${bakExt}' '${dbPath}${suffix}'`);
      }
    }
  }
  process.exit(1);
}

// 4. 创建默认管理员（幂等）
console.log("[setup] 检查/创建默认管理员账号...");
try {
  execSync("npx tsx scripts/seed.ts", { stdio: "inherit", cwd: ROOT });
} catch (e) {
  console.error("[setup] 种子数据脚本执行失败:", (e as Error).message);
  process.exit(1);
}

console.log("\n[setup] 完成！");
console.log("[setup] 默认管理员: handle=admin / password=admin（首次登录后请立即修改）\n");
