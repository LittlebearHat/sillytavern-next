import { db } from "@/lib/db";
import { secrets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "node:crypto";

/**
 * API 密钥管理服务
 * 存储和检索用户的 AI 提供商 API 密钥
 */
export const secretsService = {
  /** 获取用户所有密钥 (只返回 key 名称, 不返回值) */
  async listKeys(userId: string): Promise<string[]> {
    const rows = db.select({ key: secrets.key }).from(secrets)
      .where(eq(secrets.userId, userId))
      .all();
    return rows.map((r) => r.key);
  },

  /** 获取密钥值 */
  async getSecret(userId: string, key: string): Promise<string | null> {
    const row = db.select().from(secrets)
      .where(and(eq(secrets.userId, userId), eq(secrets.key, key)))
      .get();
    return row?.value ?? null;
  },

  /** 保存密钥 (upsert) */
  async setSecret(userId: string, key: string, value: string): Promise<void> {
    const existing = db.select().from(secrets)
      .where(and(eq(secrets.userId, userId), eq(secrets.key, key)))
      .get();

    if (existing) {
      db.update(secrets).set({ value })
        .where(and(eq(secrets.userId, userId), eq(secrets.key, key)))
        .run();
    } else {
      db.insert(secrets).values({
        id: crypto.randomUUID(),
        userId,
        key,
        value,
        createdAt: new Date(),
      }).run();
    }
  },

  /** 删除密钥 */
  async deleteSecret(userId: string, key: string): Promise<boolean> {
    const result = db.delete(secrets)
      .where(and(eq(secrets.userId, userId), eq(secrets.key, key)))
      .run();
    return result.changes > 0;
  },

  /** 批量获取密钥 */
  async getSecrets(userId: string, keys: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    for (const key of keys) {
      const value = await this.getSecret(userId, key);
      if (value) result[key] = value;
    }
    return result;
  },
};

/** 标准密钥名称常量 */
export const SECRET_KEYS = {
  // Chat Completion
  OPENAI: "openai_api_key",
  ANTHROPIC: "anthropic_api_key",
  GOOGLE: "google_api_key",
  VERTEXAI: "vertexai_api_key",
  OPENROUTER: "openrouter_api_key",
  MISTRAL: "mistral_api_key",
  COHERE: "cohere_api_key",
  GROQ: "groq_api_key",
  DEEPSEEK: "deepseek_api_key",
  XAI: "xai_api_key",
  PERPLEXITY: "perplexity_api_key",
  FIREWORKS: "fireworks_api_key",
  MOONSHOT: "moonshot_api_key",
  SILICONFLOW: "siliconflow_api_key",
  MINIMAX: "minimax_api_key",
  ZAI: "zai_api_key",
  AZURE_OPENAI: "azure_openai_api_key",
  NANOGPT: "nanogpt_api_key",
  WORKERS_AI: "workers_ai_api_key",
  ELECTRONHUB: "electronhub_api_key",
  CHUTES: "chutes_api_key",
  POLLINATIONS: "pollinations_api_key",
  AIMLAPI: "aimlapi_api_key",
  COMETAPI: "cometapi_api_key",
  AI21: "ai21_api_key",
  CUSTOM: "custom_api_key",
  // Text Completion
  KOBOLDCPP: "koboldcpp_api_key",
  OLLAMA: "ollama_api_key",
  LLAMACPP: "llamacpp_api_key",
  VLLM: "vllm_api_key",
  APHRODITE: "aphrodite_api_key",
  TABBY: "tabby_api_key",
  OOBA: "ooba_api_key",
  MANCER: "mancer_api_key",
  DREAMGEN: "dreamgen_api_key",
  FEATHERLESS: "featherless_api_key",
  INFERMATICAI: "infermaticai_api_key",
  TOGETHERAI: "togetherai_api_key",
  HUGGINGFACE: "huggingface_api_key",
  GENERIC: "generic_api_key",
  // Other
  NOVELAI: "novelai_api_key",
  HORDE: "horde_api_key",
  KOBOLD: "kobold_api_key",
} as const;
