/**
 * AI 提供商适配器系统
 * 统一接口支持 24+ 提供商
 */
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import type { AIProvider } from "@/types";

/** 提供商配置 */
export interface ProviderConfig {
  apiKey: string;
  baseURL?: string;
  headers?: Record<string, string>;
}

/** OpenAI-compatible 提供商的 Base URL 映射 */
const OPENAI_COMPATIBLE_URLS: Record<string, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  openrouter_text: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
  deepseek: "https://api.deepseek.com/v1",
  xai: "https://api.x.ai/v1",
  perplexity: "https://api.perplexity.ai",
  fireworks: "https://api.fireworks.ai/inference/v1",
  moonshot: "https://api.moonshot.cn/v1",
  siliconflow: "https://api.siliconflow.cn/v1",
  minimax: "https://api.minimax.chat/v1",
  mistral: "https://api.mistral.ai/v1",
  cohere: "https://api.cohere.ai/compatibility/v1",
  zai: "https://open.bigmodel.cn/api/paas/v4",
  nanogpt: "https://api.nano-gpt.com/v1",
  electronhub: "https://api.electronhub.top/v1",
  chutes: "https://llm.chutes.ai/v1",
  pollinations: "https://text.pollinations.ai/openai",
  aimlapi: "https://api.aimlapi.com/v1",
  cometapi: "https://api.cometapi.com/v1",
  ai21: "https://api.ai21.com/studio/v1",
  togetherai: "https://api.together.xyz/v1",
  infermaticai: "https://api.infermatic.ai/v1",
  mancer: "https://neuro.mancer.tech/oai/v1",
  dreamgen: "https://dreamgen.com/api/openai/v1",
  featherless: "https://api.featherless.ai/v1",
};

/** OpenAI-compatible 提供商额外 headers */
const PROVIDER_HEADERS: Record<string, Record<string, string>> = {
  openrouter: {
    "HTTP-Referer": "https://sillytavern.app",
    "X-Title": "SillyTavern-Next",
  },
};

/**
 * 获取 AI 语言模型实例
 */
export function getLanguageModel(
  provider: AIProvider,
  modelId: string,
  config: ProviderConfig
): LanguageModel {
  switch (provider) {
    case "anthropic":
      return createAnthropic({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      })(modelId);

    case "google":
      return createGoogleGenerativeAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      })(modelId);

    case "openai":
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      })(modelId);

    // 所有 OpenAI-compatible 提供商
    default: {
      const baseURL = config.baseURL || OPENAI_COMPATIBLE_URLS[provider];
      const headers = {
        ...PROVIDER_HEADERS[provider],
        ...config.headers,
      };

      return createOpenAI({
        apiKey: config.apiKey,
        baseURL,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      })(modelId);
    }
  }
}

/**
 * 获取提供商对应的密钥名称
 */
export function getSecretKeyForProvider(provider: AIProvider): string {
  const map: Partial<Record<AIProvider, string>> = {
    openai: "openai_api_key",
    anthropic: "anthropic_api_key",
    google: "google_api_key",
    vertexai: "vertexai_api_key",
    openrouter: "openrouter_api_key",
    mistral: "mistral_api_key",
    cohere: "cohere_api_key",
    groq: "groq_api_key",
    deepseek: "deepseek_api_key",
    xai: "xai_api_key",
    perplexity: "perplexity_api_key",
    fireworks: "fireworks_api_key",
    moonshot: "moonshot_api_key",
    siliconflow: "siliconflow_api_key",
    minimax: "minimax_api_key",
    zai: "zai_api_key",
    azure_openai: "azure_openai_api_key",
    nanogpt: "nanogpt_api_key",
    workers_ai: "workers_ai_api_key",
    electronhub: "electronhub_api_key",
    chutes: "chutes_api_key",
    pollinations: "pollinations_api_key",
    aimlapi: "aimlapi_api_key",
    cometapi: "cometapi_api_key",
    ai21: "ai21_api_key",
    custom: "custom_api_key",
    koboldcpp: "koboldcpp_api_key",
    ollama: "ollama_api_key",
    llamacpp: "llamacpp_api_key",
    vllm: "vllm_api_key",
    aphrodite: "aphrodite_api_key",
    tabby: "tabby_api_key",
    ooba: "ooba_api_key",
    mancer: "mancer_api_key",
    dreamgen: "dreamgen_api_key",
    featherless: "featherless_api_key",
    infermaticai: "infermaticai_api_key",
    togetherai: "togetherai_api_key",
    huggingface: "huggingface_api_key",
    openrouter_text: "openrouter_api_key",
    generic: "generic_api_key",
    novelai: "novelai_api_key",
    ai_horde: "horde_api_key",
    kobold_classic: "kobold_api_key",
  };
  return map[provider] ?? "custom_api_key";
}

/** 默认模型 ID */
export const DEFAULT_MODELS: Partial<Record<AIProvider, string>> = {
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-20250514",
  google: "gemini-2.5-flash",
  vertexai: "gemini-2.5-flash",
  openrouter: "openai/gpt-4o",
  mistral: "mistral-large-latest",
  cohere: "command-r-plus",
  groq: "llama-3.3-70b-versatile",
  deepseek: "deepseek-chat",
  xai: "grok-2",
  perplexity: "sonar-pro",
  fireworks: "accounts/fireworks/models/llama-v3p3-70b-instruct",
  moonshot: "moonshot-v1-auto",
  siliconflow: "Qwen/Qwen2.5-72B-Instruct",
  minimax: "MiniMax-M2.7",
  zai: "glm-4.7",
  custom: "gpt-4o",
  novelai: "llama-3-erato-v1",
  ollama: "llama3",
};
