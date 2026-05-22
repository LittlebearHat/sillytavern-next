/**
 * 生成参数管理 - 预设配置系统
 * 管理各 AI 提供商的生成参数和采样设置
 */

import { z } from "zod";
import type { AIProvider } from "@/types";

/** 生成参数 Schema */
export const generationParamsSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  maxOutputTokens: z.number().min(1).max(1000000).optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().min(0).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  repetitionPenalty: z.number().min(0).max(2).optional(),
  stopSequences: z.array(z.string()).optional(),
  seed: z.number().optional(),
}).passthrough();

export type GenerationParams = z.infer<typeof generationParamsSchema>;

/** 预设完整定义 */
export interface GenerationPreset {
  id: string;
  name: string;
  provider?: AIProvider;
  model?: string;
  params: GenerationParams;
  description?: string;
  isDefault?: boolean;
}

/** 默认内置预设 */
export const DEFAULT_PRESETS: Record<string, GenerationPreset> = {
  creative: {
    id: "preset_creative",
    name: "Creative",
    params: {
      temperature: 1.2,
      topP: 0.95,
      topK: 100,
      maxOutputTokens: 4096,
      frequencyPenalty: 0.3,
      presencePenalty: 0.3,
    },
    description: "适合创意写作和角色扮演",
    isDefault: true,
  },
  balanced: {
    id: "preset_balanced",
    name: "Balanced",
    params: {
      temperature: 0.9,
      topP: 0.9,
      maxOutputTokens: 2048,
      frequencyPenalty: 0.1,
      presencePenalty: 0.1,
    },
    description: "平衡创意和一致性",
    isDefault: true,
  },
  precise: {
    id: "preset_precise",
    name: "Precise",
    params: {
      temperature: 0.4,
      topP: 0.85,
      maxOutputTokens: 2048,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
    },
    description: "精确、确定性响应",
    isDefault: true,
  },
  deterministic: {
    id: "preset_deterministic",
    name: "Deterministic",
    params: {
      temperature: 0.0,
      topP: 1.0,
      maxOutputTokens: 2048,
    },
    description: "完全确定性输出",
    isDefault: true,
  },
};

/**
 * 获取提供商的默认生成参数
 */
export function getDefaultParamsForProvider(provider: AIProvider): GenerationParams {
  switch (provider) {
    case "anthropic":
      return {
        temperature: 1.0,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 4096,
      };
    case "google":
      return {
        temperature: 1.0,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
      };
    case "openai":
      return {
        temperature: 1.0,
        topP: 1.0,
        maxOutputTokens: 4096,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
      };
    case "deepseek":
      return {
        temperature: 1.0,
        topP: 0.95,
        maxOutputTokens: 4096,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
      };
    default:
      // OpenAI-compatible 默认
      return {
        temperature: 1.0,
        topP: 0.95,
        maxOutputTokens: 4096,
      };
  }
}

/**
 * 将生成参数转为 Vercel AI SDK streamText 参数
 */
export function toStreamTextParams(params: GenerationParams): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (params.temperature !== undefined) result.temperature = params.temperature;
  if (params.maxOutputTokens !== undefined) result.maxOutputTokens = params.maxOutputTokens;
  if (params.topP !== undefined) result.topP = params.topP;
  if (params.topK !== undefined) result.topK = params.topK;
  if (params.frequencyPenalty !== undefined) result.frequencyPenalty = params.frequencyPenalty;
  if (params.presencePenalty !== undefined) result.presencePenalty = params.presencePenalty;
  if (params.stopSequences !== undefined && params.stopSequences.length > 0) {
    result.stopSequences = params.stopSequences;
  }
  if (params.seed !== undefined) result.seed = params.seed;

  return result;
}

/**
 * 合并参数 - 预设 + 用户覆盖
 */
export function mergeParams(
  preset: GenerationParams,
  overrides?: Partial<GenerationParams>
): GenerationParams {
  if (!overrides) return preset;
  return { ...preset, ...overrides };
}
