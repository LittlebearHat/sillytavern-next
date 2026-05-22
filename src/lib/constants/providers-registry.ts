/**
 * 提供商注册表 - 所有 AI 提供商的完整配置
 * 严格参照原 SillyTavern index.html 中的 API 连接面板
 */
import type { ProviderRegistryEntry } from "@/types/api-connections";

// ============================================================
// Chat Completion 提供商
// ============================================================

const openai: ProviderRegistryEntry = {
  id: "openai",
  name: "OpenAI",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "openai_api_key",
  supportsReverseProxy: true,
  docsUrl: "https://docs.sillytavern.app/usage/api-connections/openai/",
  models: [
    { label: "GPT-5.5", models: [
      { id: "gpt-5.5", name: "gpt-5.5" },
      { id: "gpt-5.5-2026-04-23", name: "gpt-5.5-2026-04-23" },
    ]},
    { label: "GPT-5.4", models: [
      { id: "gpt-5.4", name: "gpt-5.4" },
      { id: "gpt-5.4-2026-03-05", name: "gpt-5.4-2026-03-05" },
      { id: "gpt-5.4-mini", name: "gpt-5.4-mini" },
      { id: "gpt-5.4-mini-2026-03-17", name: "gpt-5.4-mini-2026-03-17" },
      { id: "gpt-5.4-nano", name: "gpt-5.4-nano" },
      { id: "gpt-5.4-nano-2026-03-17", name: "gpt-5.4-nano-2026-03-17" },
    ]},
    { label: "GPT-5.3", models: [
      { id: "gpt-5.3-chat-latest", name: "gpt-5.3-chat-latest" },
    ]},
    { label: "GPT-5.2", models: [
      { id: "gpt-5.2", name: "gpt-5.2" },
      { id: "gpt-5.2-2025-12-11", name: "gpt-5.2-2025-12-11" },
      { id: "gpt-5.2-chat-latest", name: "gpt-5.2-chat-latest" },
    ]},
    { label: "GPT-5.1", models: [
      { id: "gpt-5.1", name: "gpt-5.1" },
      { id: "gpt-5.1-2025-11-13", name: "gpt-5.1-2025-11-13" },
      { id: "gpt-5.1-chat-latest", name: "gpt-5.1-chat-latest" },
    ]},
    { label: "GPT-5", models: [
      { id: "gpt-5", name: "gpt-5" },
      { id: "gpt-5-2025-08-07", name: "gpt-5-2025-08-07" },
      { id: "gpt-5-mini", name: "gpt-5-mini" },
      { id: "gpt-5-nano", name: "gpt-5-nano" },
    ]},
    { label: "GPT-4o", models: [
      { id: "gpt-4o", name: "gpt-4o" },
      { id: "gpt-4o-2024-11-20", name: "gpt-4o-2024-11-20" },
      { id: "gpt-4o-mini", name: "gpt-4o-mini" },
      { id: "chatgpt-4o-latest", name: "chatgpt-4o-latest" },
    ]},
    { label: "GPT-4.1", models: [
      { id: "gpt-4.1", name: "gpt-4.1" },
      { id: "gpt-4.1-mini", name: "gpt-4.1-mini" },
      { id: "gpt-4.1-nano", name: "gpt-4.1-nano" },
    ]},
    { label: "o-series", models: [
      { id: "o1", name: "o1" },
      { id: "o1-mini", name: "o1-mini" },
      { id: "o3", name: "o3" },
      { id: "o3-mini", name: "o3-mini" },
      { id: "o4-mini", name: "o4-mini" },
    ]},
    { label: "GPT-4.5", models: [
      { id: "gpt-4.5-preview", name: "gpt-4.5-preview" },
    ]},
    { label: "GPT-4 Turbo", models: [
      { id: "gpt-4-turbo", name: "gpt-4-turbo" },
      { id: "gpt-4", name: "gpt-4" },
    ]},
    { label: "GPT-3.5", models: [
      { id: "gpt-3.5-turbo", name: "gpt-3.5-turbo" },
    ]},
  ],
};

const claude: ProviderRegistryEntry = {
  id: "anthropic",
  name: "Claude (Anthropic)",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "anthropic_api_key",
  supportsReverseProxy: true,
  docsUrl: "https://console.anthropic.com/account/keys",
  models: [
    { label: "Claude 4", models: [
      { id: "claude-opus-4-7", name: "claude-opus-4-7" },
      { id: "claude-opus-4-6", name: "claude-opus-4-6" },
      { id: "claude-opus-4-5", name: "claude-opus-4-5" },
      { id: "claude-sonnet-4-6", name: "claude-sonnet-4-6" },
      { id: "claude-sonnet-4-5", name: "claude-sonnet-4-5" },
      { id: "claude-haiku-4-5", name: "claude-haiku-4-5" },
      { id: "claude-opus-4-1", name: "claude-opus-4-1" },
      { id: "claude-opus-4-0", name: "claude-opus-4-0" },
      { id: "claude-sonnet-4-0", name: "claude-sonnet-4-0" },
    ]},
    { label: "Claude 3.7", models: [
      { id: "claude-3-7-sonnet-latest", name: "claude-3-7-sonnet-latest" },
      { id: "claude-3-7-sonnet-20250219", name: "claude-3-7-sonnet-20250219" },
    ]},
    { label: "Claude 3.5", models: [
      { id: "claude-3-5-sonnet-latest", name: "claude-3-5-sonnet-latest" },
      { id: "claude-3-5-sonnet-20241022", name: "claude-3-5-sonnet-20241022" },
      { id: "claude-3-5-haiku-latest", name: "claude-3-5-haiku-latest" },
    ]},
    { label: "Claude 3", models: [
      { id: "claude-3-opus-20240229", name: "claude-3-opus-20240229" },
      { id: "claude-3-haiku-20240307", name: "claude-3-haiku-20240307" },
    ]},
  ],
};

const google: ProviderRegistryEntry = {
  id: "google",
  name: "Google AI Studio",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "google_api_key",
  supportsReverseProxy: true,
  models: [
    { label: "Gemini 3.1", models: [
      { id: "gemini-3.1-pro-preview", name: "gemini-3.1-pro-preview" },
      { id: "gemini-3.1-flash-lite-preview", name: "gemini-3.1-flash-lite-preview" },
    ]},
    { label: "Gemini 3.0", models: [
      { id: "gemini-3-pro-preview", name: "gemini-3-pro-preview" },
      { id: "gemini-3-flash-preview", name: "gemini-3-flash-preview" },
    ]},
    { label: "Gemini 2.5", models: [
      { id: "gemini-2.5-pro", name: "gemini-2.5-pro" },
      { id: "gemini-2.5-flash", name: "gemini-2.5-flash" },
      { id: "gemini-2.5-flash-lite", name: "gemini-2.5-flash-lite" },
    ]},
    { label: "Gemini 2.0", models: [
      { id: "gemini-2.0-flash", name: "gemini-2.0-flash" },
      { id: "gemini-2.0-flash-lite", name: "gemini-2.0-flash-lite" },
    ]},
    { label: "Gemma", models: [
      { id: "gemma-4-31b-it", name: "gemma-4-31b-it" },
      { id: "gemma-3-27b-it", name: "gemma-3-27b-it" },
    ]},
  ],
};

const vertexai: ProviderRegistryEntry = {
  id: "vertexai",
  name: "Google Vertex AI",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "vertexai_api_key",
  supportsReverseProxy: true,
  models: [
    { label: "Gemini 3.1", models: [
      { id: "gemini-3.1-pro-preview", name: "gemini-3.1-pro-preview" },
      { id: "gemini-3.1-flash-lite-preview", name: "gemini-3.1-flash-lite-preview" },
    ]},
    { label: "Gemini 2.5", models: [
      { id: "gemini-2.5-pro", name: "gemini-2.5-pro" },
      { id: "gemini-2.5-flash", name: "gemini-2.5-flash" },
      { id: "gemini-2.5-flash-lite", name: "gemini-2.5-flash-lite" },
    ]},
    { label: "Gemini 2.0", models: [
      { id: "gemini-2.0-flash", name: "gemini-2.0-flash" },
    ]},
  ],
  extraFields: [
    { id: "vertexai_region", label: "Region", type: "text", placeholder: "us-central1" },
    { id: "vertexai_project_id", label: "Project ID", type: "text", placeholder: "your-project-id" },
  ],
};

const openrouter: ProviderRegistryEntry = {
  id: "openrouter",
  name: "OpenRouter",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "openrouter_api_key",
  models: "dynamic",
  docsUrl: "https://openrouter.ai/keys/",
};

const deepseek: ProviderRegistryEntry = {
  id: "deepseek",
  name: "DeepSeek",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "deepseek_api_key",
  supportsReverseProxy: true,
  models: "dynamic",
};

const custom: ProviderRegistryEntry = {
  id: "custom",
  name: "Custom (OpenAI-compatible)",
  category: "chat_completion",
  requiresApiKey: true,
  optionalApiKey: true,
  requiresBaseUrl: true,
  defaultBaseUrl: "",
  baseUrlPlaceholder: "http://localhost:1234/v1",
  secretKey: "custom_api_key",
  models: "dynamic",
};

const mistral: ProviderRegistryEntry = {
  id: "mistral",
  name: "MistralAI",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "mistral_api_key",
  supportsReverseProxy: true,
  models: "dynamic",
};

const groq: ProviderRegistryEntry = {
  id: "groq",
  name: "Groq",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "groq_api_key",
  models: [
    { label: "Models", models: [
      { id: "qwen/qwen3-32b", name: "qwen/qwen3-32b" },
      { id: "deepseek-r1-distill-llama-70b", name: "deepseek-r1-distill-llama-70b" },
      { id: "gemma2-9b-it", name: "gemma2-9b-it" },
      { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "llama-4-scout-17b" },
      { id: "meta-llama/llama-4-maverick-17b-128e-instruct", name: "llama-4-maverick-17b" },
      { id: "llama-3.3-70b-versatile", name: "llama-3.3-70b-versatile" },
      { id: "llama3-70b-8192", name: "llama3-70b-8192" },
      { id: "mistral-saba-24b", name: "mistral-saba-24b" },
    ]},
  ],
};

const xai: ProviderRegistryEntry = {
  id: "xai",
  name: "xAI (Grok)",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "xai_api_key",
  supportsReverseProxy: true,
  docsUrl: "https://console.x.ai/",
  models: "dynamic",
};

const perplexity: ProviderRegistryEntry = {
  id: "perplexity",
  name: "Perplexity",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "perplexity_api_key",
  models: [
    { label: "Sonar", models: [
      { id: "sonar", name: "sonar" },
      { id: "sonar-pro", name: "sonar-pro" },
      { id: "sonar-reasoning", name: "sonar-reasoning" },
      { id: "sonar-reasoning-pro", name: "sonar-reasoning-pro" },
      { id: "sonar-deep-research", name: "sonar-deep-research" },
    ]},
    { label: "Offline", models: [
      { id: "r1-1776", name: "r1-1776" },
    ]},
  ],
};

const cohere: ProviderRegistryEntry = {
  id: "cohere",
  name: "Cohere",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "cohere_api_key",
  models: [
    { label: "Stable", models: [
      { id: "command-a-03-2025", name: "command-a-03-2025" },
      { id: "command-r-plus", name: "command-r-plus" },
      { id: "command-r", name: "command-r" },
      { id: "c4ai-aya-expanse-32b", name: "c4ai-aya-expanse-32b" },
    ]},
  ],
};

const ai21: ProviderRegistryEntry = {
  id: "ai21",
  name: "AI21",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "ai21_api_key",
  models: [
    { label: "Jamba", models: [
      { id: "jamba-large", name: "jamba-large" },
      { id: "jamba-mini", name: "jamba-mini" },
      { id: "jamba-1.7-large", name: "jamba-1.7-large" },
      { id: "jamba-1.7-mini", name: "jamba-1.7-mini" },
    ]},
  ],
};

const fireworks: ProviderRegistryEntry = {
  id: "fireworks",
  name: "Fireworks AI",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "fireworks_api_key",
  models: "dynamic",
};

const minimax: ProviderRegistryEntry = {
  id: "minimax",
  name: "MiniMax",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "minimax_api_key",
  models: [
    { label: "Models", models: [
      { id: "MiniMax-M2.7", name: "MiniMax-M2.7" },
      { id: "MiniMax-M2.7-highspeed", name: "MiniMax-M2.7-highspeed" },
      { id: "MiniMax-M2.5", name: "MiniMax-M2.5" },
      { id: "MiniMax-M2", name: "MiniMax-M2" },
      { id: "M2-her", name: "M2-her" },
    ]},
  ],
};

const moonshot: ProviderRegistryEntry = {
  id: "moonshot",
  name: "Moonshot AI",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "moonshot_api_key",
  supportsReverseProxy: true,
  models: [
    { label: "Models", models: [
      { id: "kimi-k2-0711-preview", name: "kimi-k2-0711-preview" },
      { id: "moonshot-v1-128k", name: "moonshot-v1-128k" },
      { id: "moonshot-v1-32k", name: "moonshot-v1-32k" },
      { id: "moonshot-v1-8k", name: "moonshot-v1-8k" },
      { id: "moonshot-v1-auto", name: "moonshot-v1-auto" },
      { id: "kimi-latest", name: "kimi-latest" },
      { id: "kimi-thinking-preview", name: "kimi-thinking-preview" },
    ]},
  ],
};

const zai: ProviderRegistryEntry = {
  id: "zai",
  name: "Z.AI (GLM)",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "zai_api_key",
  supportsReverseProxy: true,
  models: [
    { label: "GLM", models: [
      { id: "glm-5-turbo", name: "glm-5-turbo" },
      { id: "glm-5v-turbo", name: "glm-5v-turbo" },
      { id: "glm-5.1", name: "glm-5.1" },
      { id: "glm-5", name: "glm-5" },
      { id: "glm-4.7", name: "glm-4.7" },
      { id: "glm-4.7-flash", name: "glm-4.7-flash" },
      { id: "glm-4.6", name: "glm-4.6" },
      { id: "glm-4.5", name: "glm-4.5" },
      { id: "glm-4.5-flash", name: "glm-4.5-flash" },
    ]},
  ],
};

const siliconflow: ProviderRegistryEntry = {
  id: "siliconflow",
  name: "SiliconFlow",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "siliconflow_api_key",
  models: "dynamic",
};

const azureOpenai: ProviderRegistryEntry = {
  id: "azure_openai",
  name: "Azure OpenAI",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: true,
  baseUrlPlaceholder: "https://your-resource.openai.azure.com/",
  secretKey: "azure_openai_api_key",
  models: "dynamic",
  extraFields: [
    { id: "azure_deployment_name", label: "Deployment Name", type: "text", placeholder: "your-deployment-name" },
    { id: "azure_api_version", label: "API Version", type: "select", options: [
      { value: "2025-04-01-preview", label: "2025-04-01-preview" },
      { value: "2024-10-21", label: "2024-10-21" },
    ]},
  ],
};

const nanogpt: ProviderRegistryEntry = {
  id: "nanogpt",
  name: "NanoGPT",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "nanogpt_api_key",
  models: "dynamic",
};

const workersAi: ProviderRegistryEntry = {
  id: "workers_ai",
  name: "Cloudflare Workers AI",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "workers_ai_api_key",
  models: "dynamic",
  extraFields: [
    { id: "workers_ai_account_id", label: "Account ID", type: "text", placeholder: "023e105f4ecef8ad9ca31a8372d0c353" },
  ],
};

const electronhub: ProviderRegistryEntry = {
  id: "electronhub",
  name: "Electron Hub",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "electronhub_api_key",
  models: "dynamic",
};

const chutes: ProviderRegistryEntry = {
  id: "chutes",
  name: "Chutes",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "chutes_api_key",
  models: "dynamic",
};

const pollinations: ProviderRegistryEntry = {
  id: "pollinations",
  name: "Pollinations",
  category: "chat_completion",
  requiresApiKey: false,
  requiresBaseUrl: false,
  secretKey: "pollinations_api_key",
  models: "dynamic",
};

const aimlapi: ProviderRegistryEntry = {
  id: "aimlapi",
  name: "AI/ML API",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "aimlapi_api_key",
  models: "dynamic",
};

const cometapi: ProviderRegistryEntry = {
  id: "cometapi",
  name: "CometAPI",
  category: "chat_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "cometapi_api_key",
  models: "dynamic",
};

// ============================================================
// Text Completion 提供商
// ============================================================

const koboldcpp: ProviderRegistryEntry = {
  id: "koboldcpp",
  name: "KoboldCpp",
  category: "text_completion",
  requiresApiKey: true,
  optionalApiKey: true,
  requiresBaseUrl: true,
  baseUrlPlaceholder: "http://127.0.0.1:5001",
  secretKey: "koboldcpp_api_key",
  models: "dynamic",
};

const ollama: ProviderRegistryEntry = {
  id: "ollama",
  name: "Ollama",
  category: "text_completion",
  requiresApiKey: false,
  requiresBaseUrl: true,
  defaultBaseUrl: "http://127.0.0.1:11434",
  baseUrlPlaceholder: "http://127.0.0.1:11434",
  secretKey: "ollama_api_key",
  models: "dynamic",
};

const llamacpp: ProviderRegistryEntry = {
  id: "llamacpp",
  name: "llama.cpp",
  category: "text_completion",
  requiresApiKey: true,
  optionalApiKey: true,
  requiresBaseUrl: true,
  baseUrlPlaceholder: "http://127.0.0.1:8080",
  secretKey: "llamacpp_api_key",
  models: "dynamic",
};

const vllm: ProviderRegistryEntry = {
  id: "vllm",
  name: "vLLM",
  category: "text_completion",
  requiresApiKey: true,
  optionalApiKey: true,
  requiresBaseUrl: true,
  baseUrlPlaceholder: "http://127.0.0.1:8000",
  secretKey: "vllm_api_key",
  models: "dynamic",
};

const aphrodite: ProviderRegistryEntry = {
  id: "aphrodite",
  name: "Aphrodite",
  category: "text_completion",
  requiresApiKey: true,
  optionalApiKey: true,
  requiresBaseUrl: true,
  baseUrlPlaceholder: "http://127.0.0.1:5000",
  secretKey: "aphrodite_api_key",
  models: "dynamic",
  docsUrl: "https://github.com/PygmalionAI/aphrodite-engine",
};

const tabby: ProviderRegistryEntry = {
  id: "tabby",
  name: "TabbyAPI",
  category: "text_completion",
  requiresApiKey: true,
  requiresBaseUrl: true,
  baseUrlPlaceholder: "http://127.0.0.1:5000",
  secretKey: "tabby_api_key",
  models: "dynamic",
};

const ooba: ProviderRegistryEntry = {
  id: "ooba",
  name: "Text Generation WebUI (oobabooga)",
  category: "text_completion",
  requiresApiKey: true,
  optionalApiKey: true,
  requiresBaseUrl: true,
  baseUrlPlaceholder: "http://127.0.0.1:5000",
  secretKey: "ooba_api_key",
  models: "dynamic",
};

const mancer: ProviderRegistryEntry = {
  id: "mancer",
  name: "Mancer",
  category: "text_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "mancer_api_key",
  models: "dynamic",
  docsUrl: "https://mancer.tech/",
};

const dreamgen: ProviderRegistryEntry = {
  id: "dreamgen",
  name: "DreamGen",
  category: "text_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "dreamgen_api_key",
  models: "dynamic",
  docsUrl: "https://docs.sillytavern.app/usage/api-connections/dreamgen/",
};

const featherless: ProviderRegistryEntry = {
  id: "featherless",
  name: "Featherless",
  category: "text_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "featherless_api_key",
  models: "dynamic",
  docsUrl: "https://featherless.ai/models/",
};

const infermaticai: ProviderRegistryEntry = {
  id: "infermaticai",
  name: "InfermaticAI",
  category: "text_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "infermaticai_api_key",
  models: "dynamic",
};

const togetherai: ProviderRegistryEntry = {
  id: "togetherai",
  name: "TogetherAI",
  category: "text_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "togetherai_api_key",
  models: "dynamic",
};

const huggingface: ProviderRegistryEntry = {
  id: "huggingface",
  name: "HuggingFace (Inference Endpoint)",
  category: "text_completion",
  requiresApiKey: true,
  requiresBaseUrl: true,
  baseUrlPlaceholder: "https://****.endpoints.huggingface.cloud",
  secretKey: "huggingface_api_key",
  models: "dynamic",
};

const openrouterText: ProviderRegistryEntry = {
  id: "openrouter_text",
  name: "OpenRouter (Text)",
  category: "text_completion",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "openrouter_api_key",
  models: "dynamic",
};

const genericText: ProviderRegistryEntry = {
  id: "generic",
  name: "Generic (OpenAI-compatible)",
  category: "text_completion",
  requiresApiKey: true,
  optionalApiKey: true,
  requiresBaseUrl: true,
  baseUrlPlaceholder: "http://127.0.0.1:5000",
  secretKey: "generic_api_key",
  models: "dynamic",
};

// ============================================================
// NovelAI
// ============================================================

const novelai: ProviderRegistryEntry = {
  id: "novelai",
  name: "NovelAI",
  category: "novelai",
  requiresApiKey: true,
  requiresBaseUrl: false,
  secretKey: "novelai_api_key",
  docsUrl: "https://docs.sillytavern.app/usage/api-connections/novelai/",
  models: [
    { label: "Models", models: [
      { id: "clio-v1", name: "Clio" },
      { id: "kayra-v1", name: "Kayra" },
      { id: "llama-3-erato-v1", name: "Erato" },
    ]},
  ],
};

// ============================================================
// AI Horde
// ============================================================

const aiHorde: ProviderRegistryEntry = {
  id: "ai_horde",
  name: "AI Horde",
  category: "ai_horde",
  requiresApiKey: false,
  requiresBaseUrl: false,
  secretKey: "horde_api_key",
  docsUrl: "https://aihorde.net/",
  models: "dynamic",
  extraFields: [
    { id: "horde_auto_adjust_context", label: "Adjust context size to worker capabilities", type: "checkbox" },
    { id: "horde_auto_adjust_response", label: "Adjust response length to worker capabilities", type: "checkbox" },
    { id: "horde_trusted_workers_only", label: "Trusted workers only", type: "checkbox" },
  ],
};

// ============================================================
// KoboldAI Classic
// ============================================================

const koboldClassic: ProviderRegistryEntry = {
  id: "kobold_classic",
  name: "KoboldAI Classic",
  category: "kobold_classic",
  requiresApiKey: false,
  requiresBaseUrl: true,
  baseUrlPlaceholder: "http://127.0.0.1:5000/api",
  secretKey: "kobold_api_key",
  models: "dynamic",
};

// ============================================================
// 导出完整注册表
// ============================================================

export const PROVIDERS_REGISTRY: ProviderRegistryEntry[] = [
  // Chat Completion
  openai, claude, google, vertexai, openrouter, deepseek, custom,
  mistral, groq, xai, perplexity, cohere, ai21, fireworks,
  minimax, moonshot, zai, siliconflow, azureOpenai, nanogpt,
  workersAi, electronhub, chutes, pollinations, aimlapi, cometapi,
  // Text Completion
  koboldcpp, ollama, llamacpp, vllm, aphrodite, tabby, ooba,
  mancer, dreamgen, featherless, infermaticai, togetherai,
  huggingface, openrouterText, genericText,
  // NovelAI
  novelai,
  // AI Horde
  aiHorde,
  // KoboldAI Classic
  koboldClassic,
];

/** 按分类获取提供商列表 */
export function getProvidersByCategory(category: string): ProviderRegistryEntry[] {
  return PROVIDERS_REGISTRY.filter((p) => p.category === category);
}

/** 根据 ID 获取提供商 */
export function getProviderById(id: string): ProviderRegistryEntry | undefined {
  return PROVIDERS_REGISTRY.find((p) => p.id === id);
}
