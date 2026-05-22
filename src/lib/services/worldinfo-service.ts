import { db } from "@/lib/db";
import { worldInfo, characters, settings } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "node:crypto";
import { z } from "zod";

// ============================================================
// 世界设定 (World Info / Lorebook) Service
// 字段对齐 SillyTavern 原项目 newWorldInfoEntryDefinition
// ============================================================

export const worldInfoEntrySchema = z.object({
  uid: z.number(),
  key: z.array(z.string()).default([]),
  keysecondary: z.array(z.string()).default([]),
  comment: z.string().default(""),
  content: z.string().default(""),
  constant: z.boolean().default(false),
  vectorized: z.boolean().default(false),
  selective: z.boolean().default(true),
  selectiveLogic: z.number().int().min(0).max(3).default(0),
  addMemo: z.boolean().default(false),
  order: z.number().default(100),
  position: z.number().int().min(0).max(7).default(0),
  disable: z.boolean().default(false),
  ignoreBudget: z.boolean().default(false),
  excludeRecursion: z.boolean().default(false),
  preventRecursion: z.boolean().default(false),
  matchPersonaDescription: z.boolean().default(false),
  matchCharacterDescription: z.boolean().default(false),
  matchCharacterPersonality: z.boolean().default(false),
  matchCharacterDepthPrompt: z.boolean().default(false),
  matchScenario: z.boolean().default(false),
  matchCreatorNotes: z.boolean().default(false),
  delayUntilRecursion: z.union([z.number(), z.boolean()]).default(0),
  probability: z.number().min(0).max(100).default(100),
  useProbability: z.boolean().default(true),
  depth: z.number().default(4),
  outletName: z.string().default(""),
  group: z.string().default(""),
  groupOverride: z.boolean().default(false),
  groupWeight: z.number().default(100),
  scanDepth: z.number().nullable().default(null),
  caseSensitive: z.boolean().nullable().default(null),
  matchWholeWords: z.boolean().nullable().default(null),
  useGroupScoring: z.boolean().nullable().default(null),
  automationId: z.string().default(""),
  role: z.number().int().nullable().default(0),
  sticky: z.number().nullable().default(null),
  cooldown: z.number().nullable().default(null),
  delay: z.number().nullable().default(null),
  characterFilterNames: z.array(z.string()).optional(),
  characterFilterTags: z.array(z.string()).optional(),
  characterFilterExclude: z.boolean().optional(),
  triggers: z.array(z.string()).optional(),
  displayIndex: z.number().optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
});

export type WorldInfoEntry = z.infer<typeof worldInfoEntrySchema>;

export const createWorldInfoSchema = z.object({
  name: z.string().min(1).max(200),
  entries: z.record(z.string(), worldInfoEntrySchema).optional(),
});

export const updateWorldInfoSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  entries: z.record(z.string(), worldInfoEntrySchema).optional(),
});

export type CreateWorldInfoInput = z.infer<typeof createWorldInfoSchema>;
export type UpdateWorldInfoInput = z.infer<typeof updateWorldInfoSchema>;

export interface WorldInfoWithEntries {
  id: string;
  userId: string;
  name: string;
  entries: Record<string, WorldInfoEntry>;
  createdAt: Date | null;
  updatedAt: Date | null;
}

function toWorldInfo(row: typeof worldInfo.$inferSelect): WorldInfoWithEntries {
  return {
    ...row,
    entries: row.entries ? (JSON.parse(row.entries) as Record<string, WorldInfoEntry>) : {},
  };
}

function nextUid(entries: Record<string, WorldInfoEntry>): number {
  const uids = Object.values(entries).map((e) => e.uid).filter((n) => Number.isFinite(n));
  if (uids.length === 0) return 0;
  return Math.max(...uids) + 1;
}

export const worldInfoService = {
  async getAll(userId: string): Promise<WorldInfoWithEntries[]> {
    const rows = db
      .select()
      .from(worldInfo)
      .where(eq(worldInfo.userId, userId))
      .orderBy(desc(worldInfo.updatedAt))
      .all();
    return rows.map(toWorldInfo);
  },

  async getById(id: string, userId: string): Promise<WorldInfoWithEntries | null> {
    const row = db
      .select()
      .from(worldInfo)
      .where(and(eq(worldInfo.id, id), eq(worldInfo.userId, userId)))
      .get();
    return row ? toWorldInfo(row) : null;
  },

  async getByName(name: string, userId: string): Promise<WorldInfoWithEntries | null> {
    const row = db
      .select()
      .from(worldInfo)
      .where(and(eq(worldInfo.name, name), eq(worldInfo.userId, userId)))
      .get();
    return row ? toWorldInfo(row) : null;
  },

  async create(userId: string, input: CreateWorldInfoInput): Promise<WorldInfoWithEntries> {
    const id = crypto.randomUUID();
    const now = new Date();
    db.insert(worldInfo)
      .values({
        id,
        userId,
        name: input.name,
        entries: JSON.stringify(input.entries ?? {}),
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return (await this.getById(id, userId))!;
  },

  async update(
    id: string,
    userId: string,
    input: UpdateWorldInfoInput,
  ): Promise<WorldInfoWithEntries | null> {
    const existing = await this.getById(id, userId);
    if (!existing) return null;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.entries !== undefined) updateData.entries = JSON.stringify(input.entries);

    db.update(worldInfo)
      .set(updateData)
      .where(and(eq(worldInfo.id, id), eq(worldInfo.userId, userId)))
      .run();
    return this.getById(id, userId);
  },

  async delete(id: string, userId: string): Promise<boolean> {
    // 级联清理 1：清空引用该世界书的角色卡 worldInfoBookId
    db.update(characters)
      .set({ worldInfoBookId: null })
      .where(and(eq(characters.worldInfoBookId, id), eq(characters.userId, userId)))
      .run();

    // 级联清理 2：从 settings.data.worldInfo.globalSelect 数组中移除该 ID
    try {
      const row = db.select().from(settings).where(eq(settings.userId, userId)).get();
      if (row?.data) {
        const data = JSON.parse(row.data) as Record<string, unknown>;
        const wi = data.worldInfo as { globalSelect?: string[] } | undefined;
        if (wi?.globalSelect && Array.isArray(wi.globalSelect)) {
          const before = wi.globalSelect.length;
          wi.globalSelect = wi.globalSelect.filter((x: string) => x !== id);
          if (wi.globalSelect.length !== before) {
            db.update(settings)
              .set({ data: JSON.stringify(data) })
              .where(eq(settings.userId, userId))
              .run();
          }
        }
      }
    } catch { /* settings 不存在或解析异常不影响删除主流程 */ }

    const result = db
      .delete(worldInfo)
      .where(and(eq(worldInfo.id, id), eq(worldInfo.userId, userId)))
      .run();
    return result.changes > 0;
  },

  async rename(id: string, userId: string, newName: string): Promise<WorldInfoWithEntries | null> {
    return this.update(id, userId, { name: newName });
  },

  async duplicate(id: string, userId: string, newName?: string): Promise<WorldInfoWithEntries | null> {
    const src = await this.getById(id, userId);
    if (!src) return null;
    const name = newName?.trim() || `${src.name} - Copy`;
    return this.create(userId, { name, entries: src.entries });
  },

  /** 单条词条新增/更新 */
  async upsertEntry(
    bookId: string,
    userId: string,
    entry: Partial<WorldInfoEntry>,
  ): Promise<WorldInfoEntry | null> {
    const book = await this.getById(bookId, userId);
    if (!book) return null;
    const uid = typeof entry.uid === "number" ? entry.uid : nextUid(book.entries);
    const merged = worldInfoEntrySchema.parse({ ...book.entries[String(uid)], ...entry, uid });
    book.entries[String(uid)] = merged;
    await this.update(bookId, userId, { entries: book.entries });
    return merged;
  },

  /** 单条词条删除 */
  async deleteEntry(bookId: string, userId: string, uid: number): Promise<boolean> {
    const book = await this.getById(bookId, userId);
    if (!book) return false;
    if (!(String(uid) in book.entries)) return false;
    delete book.entries[String(uid)];
    await this.update(bookId, userId, { entries: book.entries });
    return true;
  },

  /** 导入 JSON (lorebook 格式或 V2 character_book 格式) */
  async importFromJson(
    userId: string,
    json: unknown,
    fileName?: string,
  ): Promise<WorldInfoWithEntries> {
    const data = parseImportJson(json);
    const baseName = (data.name || fileName || "Imported").replace(/\.[^/.]+$/, "");
    // 处理重名
    const all = await this.getAll(userId);
    const existing = new Set(all.map((w) => w.name));
    let name = baseName;
    let i = 1;
    while (existing.has(name)) {
      name = `${baseName} (${i++})`;
    }
    return this.create(userId, { name, entries: data.entries });
  },

  /** 导出为 lorebook JSON（与原项目 Eldoria.json 对齐） */
  async exportToJson(
    id: string,
    userId: string,
  ): Promise<{ name: string; data: object } | null> {
    const book = await this.getById(id, userId);
    if (!book) return null;
    // 逐条补上 characterFilter 字段（原项目每条 entry 默认都有这个对象）。
    const entries: Record<string, unknown> = {};
    for (const [k, e] of Object.entries(book.entries ?? {})) {
      entries[k] = {
        ...e,
        characterFilter: {
          isExclude: e.characterFilterExclude ?? false,
          names: e.characterFilterNames ?? [],
          tags: e.characterFilterTags ?? [],
        },
      };
    }
    // originalData 顶层快照：与原项目一致，保留原始 V2 character_book 格式供后续回源。
    const characterBookEntries = Object.values(book.entries ?? {}).map(
      (e, idx) => entryToCharacterBookEntry(e, idx),
    );
    return {
      name: book.name,
      data: {
        entries,
        originalData: {
          entries: characterBookEntries,
          name: book.name,
        },
      },
    };
  },

  /**
   * 导出为 V2/V3 character_book 格式（嵌入到角色卡用）。
   * entries 转为数组结构（V2 character_book.entries 必须是数组）。
   * 返回 null 表示未找到指定世界书。
   */
  async toCharacterBook(
    id: string,
    userId: string,
  ): Promise<{ name: string; entries: unknown[] } | null> {
    const book = await this.getById(id, userId);
    if (!book) return null;
    const entries = Object.values(book.entries ?? {}).map(
      (e, idx) => entryToCharacterBookEntry(e, idx),
    );
    return { name: book.name, entries };
  },
};

/** 本项目词条 → V2 character_book 词条（导出供角色卡嵌入使用） */
function entryToCharacterBookEntry(entry: WorldInfoEntry, idx: number) {
  const ext = (entry.extensions ?? {}) as Record<string, unknown>;
  return {
    id: entry.uid ?? idx,
    keys: entry.key ?? [],
    secondary_keys: entry.keysecondary ?? [],
    comment: entry.comment ?? "",
    content: entry.content ?? "",
    constant: entry.constant ?? false,
    selective: entry.selective ?? true,
    insertion_order: entry.order ?? 100,
    enabled: !entry.disable,
    position: entry.position === 1 ? "after_char" : "before_char",
    use_regex: true,
    extensions: {
      position: entry.position ?? 0,
      exclude_recursion: entry.excludeRecursion ?? false,
      display_index: typeof entry.displayIndex === "number" ? entry.displayIndex : idx,
      probability: entry.probability ?? 100,
      useProbability: entry.useProbability ?? true,
      depth: entry.depth ?? 4,
      selectiveLogic: entry.selectiveLogic ?? 0,
      outlet_name: entry.outletName ?? "",
      group: entry.group ?? "",
      group_override: entry.groupOverride ?? false,
      group_weight: entry.groupWeight ?? 100,
      prevent_recursion: entry.preventRecursion ?? false,
      delay_until_recursion: entry.delayUntilRecursion ?? false,
      scan_depth: entry.scanDepth ?? null,
      match_whole_words: entry.matchWholeWords ?? null,
      use_group_scoring: entry.useGroupScoring ?? false,
      case_sensitive: entry.caseSensitive ?? null,
      automation_id: entry.automationId ?? "",
      role: entry.role ?? 0,
      vectorized: entry.vectorized ?? false,
      sticky: entry.sticky ?? 0,
      cooldown: entry.cooldown ?? 0,
      delay: entry.delay ?? 0,
      match_persona_description: entry.matchPersonaDescription ?? false,
      match_character_description: entry.matchCharacterDescription ?? false,
      match_character_personality: entry.matchCharacterPersonality ?? false,
      match_character_depth_prompt: entry.matchCharacterDepthPrompt ?? false,
      match_scenario: entry.matchScenario ?? false,
      match_creator_notes: entry.matchCreatorNotes ?? false,
      triggers: Array.isArray(entry.triggers) ? entry.triggers : [],
      ignore_budget: entry.ignoreBudget ?? false,
      ...ext,
    },
  };
}

// ============================================================
// 导入兼容层：lorebook (entries: Record) 与 V2 character_book (entries: Array)
// ============================================================
function parseImportJson(json: unknown): { name?: string; entries: Record<string, WorldInfoEntry> } {
  if (!json || typeof json !== "object") {
    throw new Error("Invalid lorebook JSON");
  }
  const obj = json as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name : undefined;
  const rawEntries = obj.entries;
  const out: Record<string, WorldInfoEntry> = {};

  if (Array.isArray(rawEntries)) {
    // V2 character_book.entries 是数组
    rawEntries.forEach((raw, idx) => {
      const e = convertCharacterBookEntry(raw, idx);
      out[String(e.uid)] = e;
    });
  } else if (rawEntries && typeof rawEntries === "object") {
    // lorebook 格式 entries: Record<uid, Entry>
    Object.entries(rawEntries as Record<string, unknown>).forEach(([k, raw], idx) => {
      const parsed = worldInfoEntrySchema.safeParse({
        ...((raw as object) ?? {}),
        uid: (raw as { uid?: number })?.uid ?? Number(k) ?? idx,
      });
      if (parsed.success) {
        out[String(parsed.data.uid)] = parsed.data;
      }
    });
  } else {
    throw new Error("lorebook missing entries");
  }
  return { name, entries: out };
}

/** V2 character_book 词条 → 本项目词条 */
function convertCharacterBookEntry(raw: unknown, fallbackUid: number): WorldInfoEntry {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const ext = (r.extensions ?? {}) as Record<string, unknown>;
  const candidate = {
    uid: typeof r.id === "number" ? r.id : fallbackUid,
    key: Array.isArray(r.keys) ? (r.keys as string[]) : [],
    keysecondary: Array.isArray(r.secondary_keys) ? (r.secondary_keys as string[]) : [],
    comment: typeof r.name === "string" ? (r.name as string) : (r.comment as string) ?? "",
    content: typeof r.content === "string" ? (r.content as string) : "",
    constant: Boolean(r.constant),
    selective: r.selective !== undefined ? Boolean(r.selective) : true,
    order: typeof r.insertion_order === "number" ? (r.insertion_order as number) : 100,
    position: typeof ext.position === "number" ? (ext.position as number) : 0,
    disable: r.enabled === false,
    probability: typeof ext.probability === "number" ? (ext.probability as number) : 100,
    useProbability: Boolean(ext.useProbability ?? true),
    depth: typeof ext.depth === "number" ? (ext.depth as number) : 4,
    selectiveLogic: typeof ext.selectiveLogic === "number" ? (ext.selectiveLogic as number) : 0,
    addMemo: Boolean(ext.addMemo),
    excludeRecursion: Boolean(ext.exclude_recursion ?? ext.excludeRecursion),
    preventRecursion: Boolean(ext.prevent_recursion ?? ext.preventRecursion),
    delayUntilRecursion: (ext.delay_until_recursion ?? ext.delayUntilRecursion ?? 0) as number,
    group: (ext.group ?? "") as string,
    groupOverride: Boolean(ext.group_override ?? ext.groupOverride),
    groupWeight: typeof ext.group_weight === "number" ? (ext.group_weight as number) : 100,
    scanDepth: (ext.scan_depth ?? ext.scanDepth ?? null) as number | null,
    caseSensitive: (ext.case_sensitive ?? ext.caseSensitive ?? null) as boolean | null,
    matchWholeWords: (ext.match_whole_words ?? ext.matchWholeWords ?? null) as boolean | null,
    useGroupScoring: (ext.use_group_scoring ?? ext.useGroupScoring ?? null) as boolean | null,
    automationId: (ext.automation_id ?? ext.automationId ?? "") as string,
    role: (ext.role ?? 0) as number,
    sticky: (ext.sticky ?? null) as number | null,
    cooldown: (ext.cooldown ?? null) as number | null,
    delay: (ext.delay ?? null) as number | null,
    extensions: ext,
  };
  return worldInfoEntrySchema.parse(candidate);
}
