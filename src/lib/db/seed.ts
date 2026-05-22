import { db } from "./index";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

/**
 * 使用 scrypt 哈希密码 (与原 SillyTavern 兼容)
 */
function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

/**
 * 初始化默认数据
 */
export async function seedDatabase() {
  // 检查是否已有管理员用户
  const existingAdmin = db.select().from(users).where(eq(users.handle, "admin")).get();
  if (existingAdmin) {
    console.log("[Seed] Admin user already exists, skipping.");
    return;
  }

  // 创建默认管理员
  const salt = crypto.randomBytes(32).toString("hex");
  const hashedPassword = hashPassword("admin", salt);

  db.insert(users).values({
    id: crypto.randomUUID(),
    name: "Admin",
    handle: "admin",
    password: hashedPassword,
    salt,
    admin: true,
    enabled: true,
  }).run();

  console.log("[Seed] Default admin user created (handle: admin, password: admin)");
}
