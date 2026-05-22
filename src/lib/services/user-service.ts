import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { z } from "zod";

// Zod schemas
export const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  handle: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(4).max(200),
  admin: z.boolean().default(false),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  password: z.string().min(4).max(200).optional(),
  admin: z.boolean().optional(),
  enabled: z.boolean().optional(),
  avatar: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// 用户返回类型 (不含密码)
export interface SafeUser {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
  admin: boolean | null;
  enabled: boolean | null;
  createdAt: Date | null;
}

/**
 * 密码哈希 (scrypt, 与原 SillyTavern 兼容)
 */
function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

/**
 * 验证密码
 */
function verifyPassword(password: string, salt: string, hash: string): boolean {
  const computed = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(hash, "hex"));
}

/**
 * 移除敏感字段
 */
function toSafeUser(user: typeof users.$inferSelect): SafeUser {
  const { password, salt, ...safe } = user;
  return safe;
}

export const userService = {
  /**
   * 通过 handle 和密码验证用户
   */
  async authenticate(handle: string, password: string): Promise<SafeUser | null> {
    const user = db.select().from(users).where(eq(users.handle, handle)).get();
    if (!user || !user.enabled) return null;
    if (!verifyPassword(password, user.salt, user.password)) return null;
    return toSafeUser(user);
  },

  /**
   * 获取所有用户
   */
  async getAll(): Promise<SafeUser[]> {
    const allUsers = db.select().from(users).all();
    return allUsers.map(toSafeUser);
  },

  /**
   * 通过 ID 获取用户
   */
  async getById(id: string): Promise<SafeUser | null> {
    const user = db.select().from(users).where(eq(users.id, id)).get();
    return user ? toSafeUser(user) : null;
  },

  /**
   * 通过 handle 获取用户
   */
  async getByHandle(handle: string): Promise<SafeUser | null> {
    const user = db.select().from(users).where(eq(users.handle, handle)).get();
    return user ? toSafeUser(user) : null;
  },

  /**
   * 创建用户
   */
  async create(input: CreateUserInput): Promise<SafeUser> {
    const existing = db.select().from(users).where(eq(users.handle, input.handle)).get();
    if (existing) {
      throw new Error(`User with handle "${input.handle}" already exists`);
    }

    const salt = crypto.randomBytes(32).toString("hex");
    const hashedPassword = hashPassword(input.password, salt);
    const id = crypto.randomUUID();

    db.insert(users).values({
      id,
      name: input.name,
      handle: input.handle,
      password: hashedPassword,
      salt,
      admin: input.admin,
      enabled: true,
    }).run();

    return (await this.getById(id))!;
  },

  /**
   * 更新用户
   */
  async update(id: string, input: UpdateUserInput): Promise<SafeUser | null> {
    const user = db.select().from(users).where(eq(users.id, id)).get();
    if (!user) return null;

    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.admin !== undefined) updateData.admin = input.admin;
    if (input.enabled !== undefined) updateData.enabled = input.enabled;
    if (input.avatar !== undefined) updateData.avatar = input.avatar;

    if (input.password) {
      const salt = crypto.randomBytes(32).toString("hex");
      updateData.password = hashPassword(input.password, salt);
      updateData.salt = salt;
    }

    if (Object.keys(updateData).length > 0) {
      db.update(users).set(updateData).where(eq(users.id, id)).run();
    }

    return this.getById(id);
  },

  /**
   * 删除用户
   */
  async delete(id: string): Promise<boolean> {
    const result = db.delete(users).where(eq(users.id, id)).run();
    return result.changes > 0;
  },

  /**
   * 修改密码
   */
  async changePassword(id: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const user = db.select().from(users).where(eq(users.id, id)).get();
    if (!user) return false;
    if (!verifyPassword(oldPassword, user.salt, user.password)) return false;

    const salt = crypto.randomBytes(32).toString("hex");
    const hashedPassword = hashPassword(newPassword, salt);
    db.update(users).set({ password: hashedPassword, salt }).where(eq(users.id, id)).run();
    return true;
  },
};
