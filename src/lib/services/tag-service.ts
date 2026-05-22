import { db } from "@/lib/db";
import { tags, characterTags, characters } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import crypto from "node:crypto";
import { z } from "zod";

// ========================
// Zod Schemas
// ========================

export const tagInputSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().max(20).nullable().optional(),
  color2: z.string().max(20).nullable().optional(),
});

export const tagUpdateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().max(20).nullable().optional(),
  color2: z.string().max(20).nullable().optional(),
});

export type TagInput = z.infer<typeof tagInputSchema>;
export type TagUpdate = z.infer<typeof tagUpdateSchema>;

// ========================
// 序列化数据
// ========================

export interface TagData {
  id: string;
  name: string;
  color: string | null;
  color2: string | null;
  characterCount: number;
  createdAt: string | null;
}

function serializeRow(
  row: typeof tags.$inferSelect,
  characterCount = 0
): TagData {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    color2: row.color2,
    characterCount,
    createdAt: row.createdAt?.toISOString() ?? null,
  };
}

// ========================
// Service
// ========================

export const tagService = {
  /** 获取用户所有标签（含每个标签关联的角色数量） */
  async getAll(userId: string): Promise<TagData[]> {
    const rows = db.select().from(tags).where(eq(tags.userId, userId)).all();

    // 查关联数量
    const allAssociations = db.select().from(characterTags).all();
    const tagCharMap = new Map<string, number>();
    for (const a of allAssociations) {
      tagCharMap.set(a.tagId, (tagCharMap.get(a.tagId) ?? 0) + 1);
    }

    return rows.map((r) => serializeRow(r, tagCharMap.get(r.id) ?? 0));
  },

  /** 创建标签 */
  async create(userId: string, input: TagInput): Promise<TagData> {
    const id = crypto.randomUUID();
    db.insert(tags)
      .values({
        id,
        userId,
        name: input.name,
        color: input.color ?? null,
        color2: input.color2 ?? null,
      })
      .run();

    const row = db
      .select()
      .from(tags)
      .where(eq(tags.id, id))
      .get();
    return serializeRow(row!, 0);
  },

  /** 更新标签 */
  async update(
    id: string,
    userId: string,
    input: TagUpdate
  ): Promise<TagData | null> {
    const existing = db
      .select()
      .from(tags)
      .where(and(eq(tags.id, id), eq(tags.userId, userId)))
      .get();
    if (!existing) return null;

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.color2 !== undefined) updateData.color2 = input.color2;

    if (Object.keys(updateData).length > 0) {
      db.update(tags)
        .set(updateData)
        .where(and(eq(tags.id, id), eq(tags.userId, userId)))
        .run();
    }

    const row = db.select().from(tags).where(eq(tags.id, id)).get();
    const count = db
      .select()
      .from(characterTags)
      .where(eq(characterTags.tagId, id))
      .all().length;
    return row ? serializeRow(row, count) : null;
  },

  /** 删除标签 */
  async delete(id: string, userId: string): Promise<boolean> {
    const result = db
      .delete(tags)
      .where(and(eq(tags.id, id), eq(tags.userId, userId)))
      .run();
    return result.changes > 0;
  },

  // ========================
  // 角色-标签关联
  // ========================

  /** 给角色设置标签（覆盖式：先删旧关联再建新的） */
  async setCharacterTags(
    characterId: string,
    tagIds: string[]
  ): Promise<void> {
    // 删除旧关联
    db.delete(characterTags)
      .where(eq(characterTags.characterId, characterId))
      .run();

    // 插入新关联
    for (const tagId of tagIds) {
      db.insert(characterTags)
        .values({ id: crypto.randomUUID(), characterId, tagId })
        .run();
    }
  },

  /** 获取角色关联的标签 ID 列表 */
  async getCharacterTagIds(characterId: string): Promise<string[]> {
    const rows = db
      .select()
      .from(characterTags)
      .where(eq(characterTags.characterId, characterId))
      .all();
    return rows.map((r) => r.tagId);
  },

  /** 按标签过滤角色：返回同时满足所有标签的角色 ID 列表 */
  async filterCharacterIdsByTags(
    userId: string,
    tagIds: string[]
  ): Promise<string[]> {
    if (tagIds.length === 0) return [];

    // 获取用户的所有角色ID
    const userChars = db
      .select({ id: characters.id })
      .from(characters)
      .where(eq(characters.userId, userId))
      .all()
      .map((r) => r.id);

    if (userChars.length === 0) return [];

    // 获取每个角色关联的标签
    const associations = db
      .select()
      .from(characterTags)
      .where(inArray(characterTags.characterId, userChars))
      .all();

    // 分组：characterId -> Set<tagId>
    const charTagMap = new Map<string, Set<string>>();
    for (const a of associations) {
      if (!charTagMap.has(a.characterId)) {
        charTagMap.set(a.characterId, new Set());
      }
      charTagMap.get(a.characterId)!.add(a.tagId);
    }

    // 找出满足所有 tagIds 的角色
    return userChars.filter((cid) => {
      const charTags = charTagMap.get(cid);
      if (!charTags) return false;
      return tagIds.every((tid) => charTags.has(tid));
    });
  },
};
