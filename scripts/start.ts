/**
 * 一键初始化脚本
 * 执行：drizzle 数据库迁移 + 创建默认管理员账号（admin/admin）
 *
 * 用法：
 *   npm run setup        # 本地开发首次启动
 *   tsx scripts/start.ts # 容器 entrypoint 调用
 */
import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const ROOT = process.cwd();
const dbPath = process.env.DATABASE_URL || path.join(ROOT, "data", "sillytavern.db");
const dataDir = path.dirname(dbPath);

// 1. 确保 data 目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`[setup] 创建数据目录: ${dataDir}`);
}

// 2. 运行 drizzle 迁移
console.log("[setup] 执行数据库迁移...");
try {
  execSync("npx drizzle-kit migrate", { stdio: "inherit", cwd: ROOT });
  console.log("[setup] 数据库迁移完成");
} catch (e) {
  console.warn("[setup] 迁移命令异常（可能已是最新），继续执行...", (e as Error).message);
}

// 3. 创建默认管理员（幂等）
console.log("[setup] 检查/创建默认管理员账号...");
try {
  execSync("npx tsx scripts/seed.ts", { stdio: "inherit", cwd: ROOT });
} catch (e) {
  console.error("[setup] 种子数据脚本执行失败:", (e as Error).message);
  process.exit(1);
}

console.log("\n[setup] 完成！");
console.log("[setup] 默认管理员: handle=admin / password=admin（首次登录后请立即修改）\n");
