import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { secretsService } from "@/lib/services/secrets-service";
import { getProviderById } from "@/lib/constants/providers-registry";

/**
 * POST /api/connections/test-message
 * 发送一条真实的测试消息 (Hi) 到 API 验证连接可用性
 * 注意：这会消耗 API 额度！
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    const body = await req.json();
    const { provider: providerId, baseUrl, apiKey: bodyApiKey, model: bodyModel } = body;

    if (!providerId) {
      return Response.json({ error: "provider is required" }, { status: 400 });
    }

    const providerDef = getProviderById(providerId);
    if (!providerDef) {
      return Response.json({ error: "Unknown provider" }, { status: 400 });
    }

    // 获取 API key: 优先用请求体传入的，其次从DDB
    let apiKey: string | null = bodyApiKey || null;
    if (!apiKey && providerDef.requiresApiKey) {
      apiKey = await secretsService.getSecret(userId, providerDef.secretKey);
    }

    if (providerDef.requiresApiKey && !providerDef.optionalApiKey && !apiKey) {
      return Response.json({
        success: false,
        error: "API key not configured. Please enter your API key and click Connect first.",
      });
    }

    // 确定 base URL
    const url = baseUrl || providerDef.defaultBaseUrl;

    const result = await sendTestMessage(providerId, apiKey, url, bodyModel);
    return Response.json(result);
  } catch (error) {
    console.error("[Test Message Error]", error);
    const message = error instanceof Error ? error.message : "Test message failed";
    return Response.json({ success: false, error: message });
  }
}

// 各提供商的 API URL 映射
const PROVIDER_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta",
  openrouter: "https://openrouter.ai/api/v1",
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
  ollama: "http://127.0.0.1:11434/v1",
  koboldcpp: "http://127.0.0.1:5001/v1",
  llamacpp: "http://127.0.0.1:8080/v1",
  vllm: "http://127.0.0.1:8000/v1",
  aphrodite: "http://127.0.0.1:2242/v1",
  ooba: "http://127.0.0.1:5000/v1",
};

async function sendTestMessage(
  providerId: string,
  apiKey: string | null,
  baseUrl?: string | null,
  modelOverride?: string,
): Promise<{ success: boolean; reply?: string; error?: string }> {
  const base = baseUrl || PROVIDER_URLS[providerId];
  if (!base) {
    return { success: false, error: "No API URL configured" };
  }

  // Google Gemini 使用不同的 API 格式
  if (providerId === "google") {
    const model = "gemini-2.0-flash";
    const url = `${base}/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hi" }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return { success: true, reply };
  }

  // Anthropic Claude 使用不同的请求格式
  if (providerId === "anthropic" || providerId === "claude") {
    const url = `${base}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": apiKey || "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        return { success: false, error: "Invalid API key" };
      }
      return { success: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = await res.json();
    const reply = data?.content?.[0]?.text || "";
    return { success: true, reply };
  }

  // 标准 OpenAI-compatible chat/completions 端点
  const chatUrl = `${base}/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  // 确定要使用的模型：优先用户指定 > 提供商默认 > 动态获取第一个
  let model = modelOverride || getDefaultModel(providerId);
  if (!modelOverride && providerId === "custom") {
    // custom 提供商没有默认模型，尝试从 /models 获取第一个
    try {
      const modelsRes = await fetch(`${base}/models`, { headers, signal: AbortSignal.timeout(10000) });
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        const firstModel = modelsData?.data?.[0]?.id;
        if (firstModel) model = firstModel;
      }
    } catch { /* ignore, use fallback */ }
  }

  const res = await fetch(chatUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Hi" }],
      max_completion_tokens: 10,
    }),
    signal: AbortSignal.timeout(30000),
  });

  // 如果服务器不支持 max_completion_tokens，回退到 max_tokens
  if (!res.ok) {
    const text = await res.text();
    if (text.includes("max_completion_tokens") || text.includes("unsupported_parameter")) {
      // 重试用 max_tokens
      const retryRes = await fetch(chatUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 10,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!retryRes.ok) {
        const retryText = await retryRes.text();
        const detail = retryText ? `: ${retryText.slice(0, 300)}` : "";
        return { success: false, error: `HTTP ${retryRes.status}${detail}` };
      }
      const retryData = await retryRes.json();
      const retryReply = retryData?.choices?.[0]?.message?.content || "";
      return { success: true, reply: retryReply };
    }
    const detail = text ? `: ${text.slice(0, 300)}` : "";
    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        error: apiKey
          ? `Authentication failed (HTTP ${res.status})${detail}`
          : "Server requires authentication. Please enter your API key and click Connect first.",
      };
    }
    return { success: false, error: `HTTP ${res.status}${detail}` };
  }

  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content || "";
  return { success: true, reply };
}

function getDefaultModel(providerId: string): string {
  const defaults: Record<string, string> = {
    openai: "gpt-4o-mini",
    openrouter: "openai/gpt-4o-mini",
    groq: "llama-3.1-8b-instant",
    deepseek: "deepseek-chat",
    xai: "grok-2",
    mistral: "mistral-small-latest",
    perplexity: "llama-3.1-sonar-small-128k-online",
    moonshot: "moonshot-v1-8k",
    siliconflow: "deepseek-ai/DeepSeek-V3",
    minimax: "MiniMax-Text-01",
    zai: "glm-4-flash",
    fireworks: "accounts/fireworks/models/llama-v3p1-8b-instruct",
    cohere: "command-r",
  };
  return defaults[providerId] || "gpt-3.5-turbo";
}
