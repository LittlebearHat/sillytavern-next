import { db } from "@/lib/db";
import { characters, chats } from "@/lib/db/schema";
import { eq, and, like, desc } from "drizzle-orm";
import crypto from "node:crypto";
import { z } from "zod";

/**
 * 角色卡 Zod Schema - 兼容 SillyTavern V2 Spec
 * 使用 .passthrough() 确保未知字段不会导致验证失败
 */
export const characterInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  personality: z.string().optional(),
  scenario: z.string().optional(),
  firstMessage: z.string().optional(),
  exampleDialogue: z.string().optional(),
  creatorNotes: z.string().optional(),
  systemPrompt: z.string().optional(),
  postHistoryInstructions: z.string().optional(),
  alternateGreetings: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  creator: z.string().optional(),
  characterVersion: z.string().optional(),
  talkativeness: z.number().min(0).max(1).optional(),
  fav: z.boolean().optional(),
  avatar: z.string().nullable().optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
  worldInfoBookId: z.string().nullable().optional(),
  characterBook: z.union([z.string(), z.record(z.string(), z.unknown())]).nullable().optional(),
}).passthrough();

export const characterUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  personality: z.string().optional(),
  scenario: z.string().optional(),
  firstMessage: z.string().optional(),
  exampleDialogue: z.string().optional(),
  creatorNotes: z.string().optional(),
  systemPrompt: z.string().optional(),
  postHistoryInstructions: z.string().optional(),
  alternateGreetings: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  creator: z.string().optional(),
  characterVersion: z.string().optional(),
  talkativeness: z.number().min(0).max(1).optional(),
  fav: z.boolean().optional(),
  avatar: z.string().nullable().optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
  worldInfoBookId: z.string().nullable().optional(),
  characterBook: z.union([z.string(), z.record(z.string(), z.unknown())]).nullable().optional(),
}).passthrough();

export type CharacterInput = z.infer<typeof characterInputSchema>;
export type CharacterUpdate = z.infer<typeof characterUpdateSchema>;

/** 序列化后的角色数据 */
export interface CharacterData {
  id: string;
  userId: string;
  name: string;
  description: string;
  personality: string;
  scenario: string;
  firstMessage: string;
  exampleDialogue: string;
  creatorNotes: string;
  systemPrompt: string;
  postHistoryInstructions: string;
  alternateGreetings: string[];
  tags: string[];
  creator: string;
  characterVersion: string;
  talkativeness: number;
  fav: boolean;
  avatar: string | null;
  extensions: Record<string, unknown>;
  worldInfoBookId: string | null;
  characterBook: Record<string, unknown> | null;
  createDate?: string;
  createdAt: string | null;
  updatedAt: string | null;
}

function serializeRow(row: typeof characters.$inferSelect): CharacterData {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description ?? "",
    personality: row.personality ?? "",
    scenario: row.scenario ?? "",
    firstMessage: row.firstMessage ?? "",
    exampleDialogue: row.exampleDialogue ?? "",
    creatorNotes: row.creatorNotes ?? "",
    systemPrompt: row.systemPrompt ?? "",
    postHistoryInstructions: row.postHistoryInstructions ?? "",
    alternateGreetings: row.alternateGreetings ? JSON.parse(row.alternateGreetings) : [],
    tags: row.tags ? JSON.parse(row.tags) : [],
    creator: row.creator ?? "",
    characterVersion: row.characterVersion ?? "",
    talkativeness: row.talkativeness ?? 0.5,
    fav: row.fav ?? false,
    avatar: row.avatar,
    extensions: row.extensions ? JSON.parse(row.extensions) : {},
    worldInfoBookId: row.worldInfoBookId ?? null,
    characterBook: row.characterBook ? JSON.parse(row.characterBook) : null,
    createDate: row.createDate ?? undefined,
    createdAt: row.createdAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

export const characterService = {
  async getAll(userId: string): Promise<CharacterData[]> {
    const rows = db.select().from(characters)
      .where(eq(characters.userId, userId))
      .orderBy(desc(characters.updatedAt))
      .all();
    return rows.map(serializeRow);
  },

  async search(userId: string, query: string): Promise<CharacterData[]> {
    const rows = db.select().from(characters)
      .where(and(eq(characters.userId, userId), like(characters.name, `%${query}%`)))
      .orderBy(desc(characters.updatedAt))
      .all();
    return rows.map(serializeRow);
  },

  async getById(id: string, userId: string): Promise<CharacterData | null> {
    const row = db.select().from(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, userId)))
      .get();
    return row ? serializeRow(row) : null;
  },

  async create(userId: string, input: CharacterInput): Promise<CharacterData> {
    const id = crypto.randomUUID();
    const now = new Date();

    db.insert(characters).values({
      id,
      userId,
      name: input.name,
      description: input.description ?? "",
      personality: input.personality ?? "",
      scenario: input.scenario ?? "",
      firstMessage: input.firstMessage ?? "",
      exampleDialogue: input.exampleDialogue ?? "",
      creatorNotes: input.creatorNotes ?? "",
      systemPrompt: input.systemPrompt ?? "",
      postHistoryInstructions: input.postHistoryInstructions ?? "",
      alternateGreetings: input.alternateGreetings ? JSON.stringify(input.alternateGreetings) : null,
      tags: input.tags ? JSON.stringify(input.tags) : null,
      creator: input.creator ?? "",
      characterVersion: input.characterVersion ?? "",
      talkativeness: input.talkativeness ?? 0.5,
      fav: input.fav ?? false,
      avatar: input.avatar ?? null,
      extensions: input.extensions ? JSON.stringify(input.extensions) : null,
      worldInfoBookId: input.worldInfoBookId ?? null,
      characterBook: input.characterBook
        ? typeof input.characterBook === "string"
          ? input.characterBook
          : JSON.stringify(input.characterBook)
        : null,
      createdAt: now,
      updatedAt: now,
    }).run();

    return (await this.getById(id, userId))!;
  },

  async update(id: string, userId: string, input: CharacterUpdate): Promise<CharacterData | null> {
    const existing = await this.getById(id, userId);
    if (!existing) return null;

    // 只更新提供了的字段
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    const stringFields = [
      "name", "description", "personality", "scenario",
      "firstMessage", "exampleDialogue", "creatorNotes",
      "systemPrompt", "postHistoryInstructions", "creator",
      "characterVersion", "avatar",
    ] as const;

    for (const field of stringFields) {
      if (input[field] !== undefined) updateData[field] = input[field];
    }
    if (input.talkativeness !== undefined) updateData.talkativeness = input.talkativeness;
    if (input.fav !== undefined) updateData.fav = input.fav;
    if (input.tags !== undefined) updateData.tags = JSON.stringify(input.tags);
    if (input.alternateGreetings !== undefined) updateData.alternateGreetings = JSON.stringify(input.alternateGreetings);
    if (input.extensions !== undefined) updateData.extensions = JSON.stringify(input.extensions);
    if (input.worldInfoBookId !== undefined) updateData.worldInfoBookId = input.worldInfoBookId;
    if (input.characterBook !== undefined) {
      updateData.characterBook = input.characterBook === null
        ? null
        : typeof input.characterBook === "string"
          ? input.characterBook
          : JSON.stringify(input.characterBook);
    }

    db.update(characters).set(updateData)
      .where(and(eq(characters.id, id), eq(characters.userId, userId)))
      .run();

    return this.getById(id, userId);
  },

  async delete(id: string, userId: string): Promise<boolean> {
    // 先删除该角色名下所有关联聊天（messages 会通过 chats 的 onDelete: cascade 连带清理），
    // 避免聊天变孤儿记录（chats.characterId 外键是 set null，默认不会联动删。这里手动补上）。
    db.delete(chats)
      .where(and(eq(chats.characterId, id), eq(chats.userId, userId)))
      .run();

    const result = db.delete(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, userId)))
      .run();
    return result.changes > 0;
  },

  async duplicate(id: string, userId: string): Promise<CharacterData | null> {
    const original = await this.getById(id, userId);
    if (!original) return null;

    return this.create(userId, {
      name: `${original.name} (Copy)`,
      description: original.description,
      personality: original.personality,
      scenario: original.scenario,
      firstMessage: original.firstMessage,
      exampleDialogue: original.exampleDialogue,
      creatorNotes: original.creatorNotes,
      systemPrompt: original.systemPrompt,
      postHistoryInstructions: original.postHistoryInstructions,
      alternateGreetings: original.alternateGreetings,
      tags: original.tags,
      creator: original.creator,
      characterVersion: original.characterVersion,
      talkativeness: original.talkativeness,
      fav: false,
      avatar: original.avatar ?? undefined,
      extensions: original.extensions,
    });
  },
};
