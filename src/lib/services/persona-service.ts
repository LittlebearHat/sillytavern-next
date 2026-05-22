import { db } from "@/lib/db";
import { personas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "node:crypto";
import { z } from "zod";

// ========================
// 描述注入位置枚举（对齐原项目 persona_description_positions）
// ========================

export const PERSONA_POSITION = {
  IN_PROMPT: 0,
  AFTER_CHAR: 1,
  TOP_AN: 2,
  BOTTOM_AN: 3,
  AT_DEPTH: 4,
  NONE: 9,
} as const;

export type PersonaPosition = (typeof PERSONA_POSITION)[keyof typeof PERSONA_POSITION];

// ========================
// Zod Schemas
// ========================

const connectionSchema = z.object({
  type: z.enum(["character", "group"]),
  id: z.string(),
});

export const personaInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(10000).optional(),
  avatar: z.string().nullable().optional(),
  descriptionPosition: z.number().int().optional(),
  depth: z.number().int().min(0).max(999).optional(),
  depthRole: z.number().int().min(0).max(2).optional(),
  lorebookId: z.string().nullable().optional(),
  connections: z.array(connectionSchema).optional(),
});

export const personaUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(10000).optional(),
  avatar: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
  descriptionPosition: z.number().int().optional(),
  depth: z.number().int().min(0).max(999).optional(),
  depthRole: z.number().int().min(0).max(2).optional(),
  lorebookId: z.string().nullable().optional(),
  connections: z.array(connectionSchema).optional(),
});

export type PersonaInput = z.infer<typeof personaInputSchema>;
export type PersonaUpdate = z.infer<typeof personaUpdateSchema>;

// ========================
// 序列化数据接口
// ========================

export interface PersonaConnection {
  type: "character" | "group";
  id: string;
}

export interface PersonaData {
  id: string;
  name: string;
  description: string;
  avatar: string | null;
  isActive: boolean;
  isDefault: boolean;
  descriptionPosition: number;
  depth: number;
  depthRole: number;
  lorebookId: string | null;
  connections: PersonaConnection[];
  createdAt: string | null;
}

function serializeRow(row: typeof personas.$inferSelect): PersonaData {
  let connections: PersonaConnection[] = [];
  if (row.connections) {
    try { connections = JSON.parse(row.connections); } catch { /* ignore */ }
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    avatar: row.avatar,
    isActive: row.isActive ?? false,
    isDefault: row.isDefault ?? false,
    descriptionPosition: row.descriptionPosition ?? 0,
    depth: row.depth ?? 2,
    depthRole: row.depthRole ?? 0,
    lorebookId: row.lorebookId ?? null,
    connections,
    createdAt: row.createdAt?.toISOString() ?? null,
  };
}

// ========================
// Service
// ========================

export const personaService = {
  /** 获取用户所有 persona */
  async getAll(userId: string): Promise<PersonaData[]> {
    const rows = db.select().from(personas).where(eq(personas.userId, userId)).all();
    return rows.map(serializeRow);
  },

  /** 获取当前激活的 persona */
  async getActive(userId: string): Promise<PersonaData | null> {
    const row = db.select().from(personas)
      .where(and(eq(personas.userId, userId), eq(personas.isActive, true)))
      .get();
    return row ? serializeRow(row) : null;
  },

  /** 获取默认 persona */
  async getDefault(userId: string): Promise<PersonaData | null> {
    const row = db.select().from(personas)
      .where(and(eq(personas.userId, userId), eq(personas.isDefault, true)))
      .get();
    return row ? serializeRow(row) : null;
  },

  /** 根据角色/群组绑定查找 persona */
  async findByConnection(userId: string, type: "character" | "group", entityId: string): Promise<PersonaData | null> {
    const rows = db.select().from(personas).where(eq(personas.userId, userId)).all();
    for (const row of rows) {
      if (!row.connections) continue;
      try {
        const conns: PersonaConnection[] = JSON.parse(row.connections);
        if (conns.some((c) => c.type === type && c.id === entityId)) {
          return serializeRow(row);
        }
      } catch { /* ignore */ }
    }
    return null;
  },

  /** 创建 persona */
  async create(userId: string, input: PersonaInput): Promise<PersonaData> {
    const id = crypto.randomUUID();
    db.insert(personas).values({
      id,
      userId,
      name: input.name,
      description: input.description ?? "",
      avatar: input.avatar ?? null,
      isActive: false,
      isDefault: false,
      descriptionPosition: input.descriptionPosition ?? 0,
      depth: input.depth ?? 2,
      depthRole: input.depthRole ?? 0,
      lorebookId: input.lorebookId ?? null,
      connections: input.connections ? JSON.stringify(input.connections) : null,
    }).run();

    const row = db.select().from(personas).where(eq(personas.id, id)).get();
    return serializeRow(row!);
  },

  /** 更新 persona */
  async update(id: string, userId: string, input: PersonaUpdate): Promise<PersonaData | null> {
    const existing = db.select().from(personas)
      .where(and(eq(personas.id, id), eq(personas.userId, userId)))
      .get();
    if (!existing) return null;

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.avatar !== undefined) updateData.avatar = input.avatar;
    if (input.descriptionPosition !== undefined) updateData.descriptionPosition = input.descriptionPosition;
    if (input.depth !== undefined) updateData.depth = input.depth;
    if (input.depthRole !== undefined) updateData.depthRole = input.depthRole;
    if (input.lorebookId !== undefined) updateData.lorebookId = input.lorebookId;
    if (input.connections !== undefined) updateData.connections = JSON.stringify(input.connections);

    // isDefault 特殊处理：设为 default 时需要先取消其他
    if (input.isDefault === true) {
      db.update(personas).set({ isDefault: false }).where(eq(personas.userId, userId)).run();
      updateData.isDefault = true;
    } else if (input.isDefault === false) {
      updateData.isDefault = false;
    }

    if (Object.keys(updateData).length > 0) {
      db.update(personas).set(updateData)
        .where(and(eq(personas.id, id), eq(personas.userId, userId)))
        .run();
    }

    const row = db.select().from(personas).where(eq(personas.id, id)).get();
    return row ? serializeRow(row) : null;
  },

  /** 删除 persona */
  async delete(id: string, userId: string): Promise<boolean> {
    const result = db.delete(personas)
      .where(and(eq(personas.id, id), eq(personas.userId, userId)))
      .run();
    return result.changes > 0;
  },

  /** 激活某个 persona（先把同用户其他的 deactivate） */
  async activate(id: string, userId: string): Promise<PersonaData | null> {
    db.update(personas).set({ isActive: false }).where(eq(personas.userId, userId)).run();
    db.update(personas).set({ isActive: true })
      .where(and(eq(personas.id, id), eq(personas.userId, userId))).run();

    const row = db.select().from(personas).where(eq(personas.id, id)).get();
    return row ? serializeRow(row) : null;
  },

  /** 取消激活（不选择任何 persona） */
  async deactivateAll(userId: string): Promise<void> {
    db.update(personas).set({ isActive: false }).where(eq(personas.userId, userId)).run();
  },

  /** 复制 persona */
  async duplicate(id: string, userId: string): Promise<PersonaData | null> {
    const existing = await this.getAll(userId);
    const source = existing.find((p) => p.id === id);
    if (!source) return null;

    return this.create(userId, {
      name: `${source.name} (Copy)`,
      description: source.description,
      avatar: source.avatar,
      descriptionPosition: source.descriptionPosition,
      depth: source.depth,
      depthRole: source.depthRole,
      lorebookId: source.lorebookId,
      connections: [],
    });
  },

  /**
   * 自动解析聊天切换时应激活的 persona
   * 优先级：① 聊天锁定 > ② 角色绑定 > ③ 默认
   */
  async resolveForChat(
    userId: string,
    chatLockedPersonaId: string | null,
    characterId: string | null,
    groupId: string | null,
  ): Promise<PersonaData | null> {
    // ① 聊天锁定
    if (chatLockedPersonaId) {
      const row = db.select().from(personas).where(eq(personas.id, chatLockedPersonaId)).get();
      if (row) return serializeRow(row);
    }

    // ② 角色/群组绑定
    if (characterId) {
      const bound = await this.findByConnection(userId, "character", characterId);
      if (bound) return bound;
    }
    if (groupId) {
      const bound = await this.findByConnection(userId, "group", groupId);
      if (bound) return bound;
    }

    // ③ 默认
    return this.getDefault(userId);
  },
};
