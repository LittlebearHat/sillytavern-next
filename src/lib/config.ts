import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";

// 配置 Schema - 与原 SillyTavern config.yaml 兼容
const serverConfigSchema = z.object({
  // 网络
  port: z.number().default(3000),
  listen: z.boolean().default(false),
  whitelistMode: z.boolean().default(true),
  whitelist: z.array(z.string()).default(["127.0.0.1", "::1"]),
  basicAuthMode: z.boolean().default(false),

  // 安全
  enableCorsProxy: z.boolean().default(false),
  securityOverride: z.boolean().default(false),
  disableCsrf: z.boolean().default(false),

  // 用户
  enableUserAccounts: z.boolean().default(false),
  perUserBasicAuth: z.boolean().default(false),

  // CORS
  cors: z.object({
    enabled: z.boolean().default(true),
    origin: z.string().default("null"),
    methods: z.array(z.string()).default(["OPTIONS"]),
    allowedHeaders: z.array(z.string()).default([]),
    exposedHeaders: z.array(z.string()).default([]),
    credentials: z.boolean().default(false),
    maxAge: z.number().nullable().default(null),
  }).optional(),

  // SSO
  sso: z.object({
    autheliaAuth: z.boolean().default(false),
    authentikAuth: z.boolean().default(false),
    trustedProxies: z.array(z.string()).default(["127.0.0.1", "::1"]),
  }).optional(),

  // AI 默认设置
  ai: z.object({
    defaultProvider: z.enum(["openai", "anthropic", "google", "openrouter", "custom"]).default("openai"),
    defaultModel: z.string().default("gpt-4o"),
    maxContextTokens: z.number().default(128000),
    maxResponseTokens: z.number().default(4096),
  }).optional(),

  // 扩展
  extensions: z.object({
    enabled: z.boolean().default(true),
    autoUpdate: z.boolean().default(true),
  }).optional(),
});

export type ServerConfig = z.infer<typeof serverConfigSchema>;

// 缓存配置
let cachedConfig: ServerConfig | null = null;

/**
 * 将配置 key 转为环境变量名 (兼容原 SillyTavern 格式)
 * @example keyToEnv("cors.enabled") => "SILLYTAVERN_CORS_ENABLED"
 */
export function keyToEnv(key: string): string {
  return "SILLYTAVERN_" + key.toUpperCase().replace(/\./g, "_");
}

/**
 * 从环境变量覆盖配置值
 */
function applyEnvOverrides(config: Record<string, unknown>): Record<string, unknown> {
  const flatKeys = flattenObject(config);
  for (const [key, _value] of Object.entries(flatKeys)) {
    const envKey = keyToEnv(key);
    const envValue = process.env[envKey];
    if (envValue !== undefined) {
      setNestedValue(config, key, parseEnvValue(envValue));
    }
  }
  return config;
}

/**
 * 加载配置文件
 */
export function loadConfig(configPath?: string): ServerConfig {
  if (cachedConfig) return cachedConfig;

  const resolvedPath = configPath || process.env.CONFIG_PATH || path.join(process.cwd(), "config.yaml");
  let rawConfig: Record<string, unknown> = {};

  if (fs.existsSync(resolvedPath)) {
    try {
      const content = fs.readFileSync(resolvedPath, "utf-8");
      rawConfig = yaml.parse(content) || {};
    } catch (error) {
      console.error(`[Config] Failed to parse config file: ${resolvedPath}`, error);
    }
  }

  // 应用环境变量覆盖
  rawConfig = applyEnvOverrides(rawConfig);

  // Zod 验证并填充默认值
  const result = serverConfigSchema.safeParse(rawConfig);
  if (!result.success) {
    console.error("[Config] Validation errors:", result.error.flatten());
    // 使用默认值
    cachedConfig = serverConfigSchema.parse({});
  } else {
    cachedConfig = result.data;
  }

  return cachedConfig;
}

/**
 * 获取配置值 (支持点分路径)
 * @example getConfigValue("cors.enabled") => true
 */
export function getConfigValue<T = unknown>(key: string, defaultValue?: T): T {
  const config = loadConfig();
  const keys = key.split(".");
  let current: unknown = config;

  for (const k of keys) {
    if (current === null || current === undefined || typeof current !== "object") {
      return defaultValue as T;
    }
    current = (current as Record<string, unknown>)[k];
  }

  return (current ?? defaultValue) as T;
}

/**
 * 重置配置缓存 (用于测试或热更新)
 */
export function resetConfig(): void {
  cachedConfig = null;
}

// ---- 工具函数 ----

function flattenObject(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current) || typeof current[keys[i]] !== "object") {
      current[keys[i]] = {};
    }
    current = current[keys[i]] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}

function parseEnvValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  const num = Number(value);
  if (!isNaN(num) && value.trim() !== "") return num;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
