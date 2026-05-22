import { db } from "@/lib/db";
import { groups, chats } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "node:crypto";
import { z } from "zod";

// ========================
// Zod Schemas
// ========================

export const groupInputSchema = z.object({
  name: z.string().min(1).max(200),
  members: z.array(z.string()).min(1, "至少需要 1 个成员"),
  avatar: z.string().nullable().optional(),
  activationStrategy: z.number().int().min(0).max(3).optional(),
  generationMode: z.number().int().min(0).max(2).optional(),
  allowSelfResponses: z.boolean().optional(),
  generationModeJoinPrefix: z.string().nullable().optional(),
  generationModeJoinSuffix: z.string().nullable().optional(),
  autoModeDelay: z.number().int().min(1).max(999).optional(),
  hideMutedSprites: z.boolean().optional(),
});

export const groupUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  members: z.array(z.string()).optional(),
  disabledMembers: z.array(z.string()).optional(),
  avatar: z.string().nullable().optional(),
  fav: z.boolean().optional(),
  activationStrategy: z.number().int().min(0).max(3).optional(),
  generationMode: z.number().int().min(0).max(2).optional(),
  allowSelfResponses: z.boolean().optional(),
  generationModeJoinPrefix: z.string().nullable().optional(),
  generationModeJoinSuffix: z.string().nullable().optional(),
  autoModeDelay: z.number().int().min(1).max(999).optional(),
  hideMutedSprites: z.boolean().optional(),
  dateLastChat: z.number().int().optional(),
});

export type GroupInput = z.infer<typeof groupInputSchema>;
export type GroupUpdate = z.infer<typeof groupUpdateSchema>;

// ========================
// 序列化数据
// ========================

export interface GroupData {
  id: string;
  name: string;
  members: string[];
  disabledMembers: string[];
  avatar: string | null;
  fav: boolean;
  activationStrategy: number;
  generationMode: number;
  allowSelfResponses: boolean;
  generationModeJoinPrefix: string | null;
  generationModeJoinSuffix: string | null;
  autoModeDelay: number;
  hideMutedSprites: boolean;
  dateLastChat: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function serializeRow(row: typeof groups.$inferSelect): GroupData {
  return {
    id: row.id,
    name: row.name,
    members: row.members ? JSON.parse(row.members) : [],
    disabledMembers: row.disabledMembers ? JSON.parse(row.disabledMembers) : [],
    avatar: row.avatar,
    fav: row.fav ?? false,
    activationStrategy: row.activationStrategy ?? 0,
    generationMode: row.generationMode ?? 0,
    allowSelfResponses: row.allowSelfResponses ?? false,
    generationModeJoinPrefix: row.generationModeJoinPrefix ?? null,
    generationModeJoinSuffix: row.generationModeJoinSuffix ?? null,
    autoModeDelay: row.autoModeDelay ?? 5,
    hideMutedSprites: row.hideMutedSprites ?? false,
    dateLastChat: row.dateLastChat ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

// ========================
// Service
// ========================

export const groupService = {
  /** 获取用户所有群组 */
  async getAll(userId: string): Promise<GroupData[]> {
    const rows = db.select().from(groups)
      .where(eq(groups.userId, userId))
      .orderBy(desc(groups.updatedAt))
      .all();
    return rows.map(serializeRow);
  },

  /** 获取单个群组 */
  async getById(id: string, userId: string): Promise<GroupData | null> {
    const row = db.select().from(groups)
      .where(and(eq(groups.id, id), eq(groups.userId, userId)))
      .get();
    return row ? serializeRow(row) : null;
  },

  /** 创建群组 */
  async create(userId: string, input: GroupInput): Promise<GroupData> {
    const id = crypto.randomUUID();
    const now = new Date();
    db.insert(groups).values({
      id,
      userId,
      name: input.name,
      members: JSON.stringify(input.members),
      avatar: input.avatar ?? null,
      activationStrategy: input.activationStrategy ?? 0,
      generationMode: input.generationMode ?? 0,
      allowSelfResponses: input.allowSelfResponses ?? false,
      generationModeJoinPrefix: input.generationModeJoinPrefix ?? null,
      generationModeJoinSuffix: input.generationModeJoinSuffix ?? null,
      autoModeDelay: input.autoModeDelay ?? 5,
      hideMutedSprites: input.hideMutedSprites ?? false,
      createdAt: now,
      updatedAt: now,
    }).run();

    return (await this.getById(id, userId))!;
  },

  /** 更新群组 */
  async update(id: string, userId: string, input: GroupUpdate): Promise<GroupData | null> {
    const existing = await this.getById(id, userId);
    if (!existing) return null;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.members !== undefined) updateData.members = JSON.stringify(input.members);
    if (input.disabledMembers !== undefined) updateData.disabledMembers = JSON.stringify(input.disabledMembers);
    if (input.avatar !== undefined) updateData.avatar = input.avatar;
    if (input.fav !== undefined) updateData.fav = input.fav;
    if (input.activationStrategy !== undefined) updateData.activationStrategy = input.activationStrategy;
    if (input.generationMode !== undefined) updateData.generationMode = input.generationMode;
    if (input.allowSelfResponses !== undefined) updateData.allowSelfResponses = input.allowSelfResponses;
    if (input.generationModeJoinPrefix !== undefined) updateData.generationModeJoinPrefix = input.generationModeJoinPrefix;
    if (input.generationModeJoinSuffix !== undefined) updateData.generationModeJoinSuffix = input.generationModeJoinSuffix;
    if (input.autoModeDelay !== undefined) updateData.autoModeDelay = input.autoModeDelay;
    if (input.hideMutedSprites !== undefined) updateData.hideMutedSprites = input.hideMutedSprites;
    if (input.dateLastChat !== undefined) updateData.dateLastChat = input.dateLastChat;

    db.update(groups).set(updateData)
      .where(and(eq(groups.id, id), eq(groups.userId, userId)))
      .run();

    return this.getById(id, userId);
  },

  /** 删除群组 */
  async delete(id: string, userId: string): Promise<boolean> {
    // 先删关联聊天
    db.delete(chats)
      .where(and(eq(chats.groupId, id), eq(chats.userId, userId)))
      .run();

    const result = db.delete(groups)
      .where(and(eq(groups.id, id), eq(groups.userId, userId)))
      .run();
    return result.changes > 0;
  },
};
