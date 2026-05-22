import { db } from "@/lib/db";
import { presets } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { type TextGenSettings } from "@/types/textgen";

/**
 * 旧版 chat-completion 用的轻量 schema（兼容保留，仅类型导出，不再用于入参联合校验）
 *
 * 注意：之前 createPresetSchema/updatePresetSchema 把它与 textgenSettingsSchema 一起放进
 * z.union，但因为它的所有字段都带 .default()，Zod 会用它匹配任意对象成功并剥离未声明字段，
 * 导致 instruct/context/sysprompt/reasoning/master 等导入后丢字段。现已改为通用 record，
 * 真正的字段语义由各 store 的 passthrough schema 负责解析。
 */
export const presetSettingsSchema = z.object({
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).default(4096),
  topP: z.number().min(0).max(1).default(1),
  topK: z.number().min(0).default(0),
  frequencyPenalty: z.number().default(0),
  presencePenalty: z.number().default(0),
  repetitionPenalty: z.number().default(1),
  stopSequences: z.array(z.string()).optional(),
  systemPrompt: z.string().optional(),
});

/**
 * create / update 入参：settings 用通用 record，不在此处剥离任何字段，
 * 以保留 instruct / context / sysprompt / reasoning / textgen 等任意自定义字段。
 */
export const createPresetSchema = z.object({
  name: z.string().min(1).max(200),
  provider: z.string().min(1),
  apiType: z.string().optional(),
  settings: z.record(z.string(), z.unknown()),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updatePresetSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  provider: z.string().optional(),
  apiType: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type PresetSettings = z.infer<typeof presetSettingsSchema>;
export type CreatePresetInput = z.infer<typeof createPresetSchema>;
export type UpdatePresetInput = z.infer<typeof updatePresetSchema>;

export interface PresetWithSettings {
  id: string;
  userId: string;
  name: string;
  provider: string;
  apiType: string | null;
  settings: Record<string, unknown> | TextGenSettings;
  isDefault: boolean | null;
  isActive: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

function toPreset(row: typeof presets.$inferSelect): PresetWithSettings {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(row.settings);
  } catch {
    parsed = {};
  }
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    provider: row.provider,
    apiType: row.apiType ?? null,
    settings: parsed,
    isDefault: row.isDefault ?? null,
    isActive: row.isActive ?? null,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
  };
}

/**
 * apiType → 内置预设目录映射
 * - textgen / textgenerationwebui → default/presets/textgen
 * - instruct / context / sysprompt / reasoning → 同名目录
 */
function resolvePresetDir(apiType: string): string {
  const folder =
    apiType === "textgenerationwebui" || apiType === "textgen"
      ? "textgen"
      : apiType;
  return path.join(process.cwd(), "default", "presets", folder);
}

/** 推导写入 DB 时的 provider/apiType 元数据 */
function resolveProviderApiType(apiType: string): { provider: string; apiType: string } {
  if (apiType === "textgenerationwebui" || apiType === "textgen") {
    return { provider: "textgen", apiType: "textgenerationwebui" };
  }
  return { provider: apiType, apiType };
}

/** 读取一个内置默认预设 JSON（按 apiType 通用） */
function readDefaultPreset(apiType: string, name: string): Record<string, unknown> | null {
  const file = path.join(resolvePresetDir(apiType), `${name}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
}

/** 列出某 apiType 内置预设名称 */
function listDefaultNames(apiType: string): string[] {
  const dir = resolvePresetDir(apiType);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

/** 兼容旧名 — textgen 专用封装 */
function readDefaultTextgenPreset(name: string): Record<string, unknown> | null {
  return readDefaultPreset("textgenerationwebui", name);
}
function listDefaultTextgenNames(): string[] {
  return listDefaultNames("textgenerationwebui");
}

export const presetService = {
  async getAll(userId: string): Promise<PresetWithSettings[]> {
    const rows = db
      .select()
      .from(presets)
      .where(eq(presets.userId, userId))
      .orderBy(desc(presets.createdAt))
      .all();
    return rows.map(toPreset);
  },

  async getByProvider(userId: string, provider: string): Promise<PresetWithSettings[]> {
    const rows = db
      .select()
      .from(presets)
      .where(and(eq(presets.userId, userId), eq(presets.provider, provider)))
      .all();
    return rows.map(toPreset);
  },

  async getByApiType(userId: string, apiType: string): Promise<PresetWithSettings[]> {
    const rows = db
      .select()
      .from(presets)
      .where(and(eq(presets.userId, userId), eq(presets.apiType, apiType)))
      .orderBy(desc(presets.createdAt))
      .all();
    return rows.map(toPreset);
  },

  async getActive(userId: string, apiType: string): Promise<PresetWithSettings | null> {
    const row = db
      .select()
      .from(presets)
      .where(and(eq(presets.userId, userId), eq(presets.apiType, apiType), eq(presets.isActive, true)))
      .get();
    return row ? toPreset(row) : null;
  },

  async getById(id: string, userId: string): Promise<PresetWithSettings | null> {
    const row = db
      .select()
      .from(presets)
      .where(and(eq(presets.id, id), eq(presets.userId, userId)))
      .get();
    return row ? toPreset(row) : null;
  },

  async create(userId: string, input: CreatePresetInput): Promise<PresetWithSettings> {
    const id = crypto.randomUUID();
    db.insert(presets)
      .values({
        id,
        userId,
        name: input.name,
        provider: input.provider,
        apiType: input.apiType ?? null,
        settings: JSON.stringify(input.settings),
        isDefault: input.isDefault ?? false,
        isActive: input.isActive ?? false,
      })
      .run();
    return (await this.getById(id, userId))!;
  },

  async update(id: string, userId: string, input: UpdatePresetInput): Promise<PresetWithSettings | null> {
    const existing = await this.getById(id, userId);
    if (!existing) return null;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.provider !== undefined) updateData.provider = input.provider;
    if (input.apiType !== undefined) updateData.apiType = input.apiType;
    if (input.settings !== undefined) updateData.settings = JSON.stringify(input.settings);
    if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    db.update(presets)
      .set(updateData)
      .where(and(eq(presets.id, id), eq(presets.userId, userId)))
      .run();

    return this.getById(id, userId);
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const result = db
      .delete(presets)
      .where(and(eq(presets.id, id), eq(presets.userId, userId)))
      .run();
    return result.changes > 0;
  },

  /** 把指定 preset 标为唯一 active（同 apiType 下其它的取消 active） */
  async setActive(id: string, userId: string): Promise<PresetWithSettings | null> {
    const target = await this.getById(id, userId);
    if (!target) return null;
    const apiType = target.apiType;
    if (apiType) {
      // 取消同 apiType 的其它 active
      db.update(presets)
        .set({ isActive: false })
        .where(and(eq(presets.userId, userId), eq(presets.apiType, apiType)))
        .run();
    }
    db.update(presets)
      .set({ isActive: true, updatedAt: new Date() })
      .where(and(eq(presets.id, id), eq(presets.userId, userId)))
      .run();
    return this.getById(id, userId);
  },

  /**
   * 从内置默认 JSON 恢复一个预设
   * 旧签名：restoreDefault(userId, name) — 默认按 textgen
   * 新签名：restoreDefault(userId, apiType, name)
   */
  async restoreDefault(
    userId: string,
    apiTypeOrName: string,
    maybeName?: string,
  ): Promise<PresetWithSettings | null> {
    const apiType = maybeName === undefined ? "textgenerationwebui" : apiTypeOrName;
    const name = maybeName === undefined ? apiTypeOrName : maybeName;
    const data = readDefaultPreset(apiType, name);
    if (!data) return null;

    const meta = resolveProviderApiType(apiType);

    // 找有没有同名预设，覆盖 settings；否则新建
    const existing = db
      .select()
      .from(presets)
      .where(and(eq(presets.userId, userId), eq(presets.name, name), eq(presets.apiType, meta.apiType)))
      .get();

    if (existing) {
      return this.update(existing.id, userId, { settings: data });
    }

    return this.create(userId, {
      name,
      provider: meta.provider,
      apiType: meta.apiType,
      settings: data,
      isDefault: true,
    });
  },

  /** 通用 seed：按 apiType 把内置默认预设全部写入用户库（已存在则跳过） */
  async seedDefaultPresets(userId: string, apiType: string): Promise<number> {
    const meta = resolveProviderApiType(apiType);
    const existing = await this.getByApiType(userId, meta.apiType);
    if (existing.length > 0) return 0;

    const names = listDefaultNames(apiType);
    let seeded = 0;
    for (const name of names) {
      const data = readDefaultPreset(apiType, name);
      if (!data) continue;
      await this.create(userId, {
        name,
        provider: meta.provider,
        apiType: meta.apiType,
        settings: data,
        isDefault: true,
        isActive: name === "Default" && seeded === 0,
      });
      seeded++;
    }
    return seeded;
  },

  /** 兼容旧调用 */
  async seedDefaultTextgenPresets(userId: string): Promise<number> {
    return this.seedDefaultPresets(userId, "textgenerationwebui");
  },

  listDefaultTextgenNames,
  readDefaultTextgenPreset,
  listDefaultNames,
  readDefaultPreset,
};
