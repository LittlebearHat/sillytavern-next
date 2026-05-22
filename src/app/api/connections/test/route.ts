import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { secretsService } from "@/lib/services/secrets-service";
import { getProviderById } from "@/lib/constants/providers-registry";

/**
 * POST /api/connections/test - 测试 API 连接
 * 发送测试请求验证连接可用性
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    const body = await req.json();
    const { provider: providerId, apiKey, baseUrl } = body;

    if (!providerId) {
      return Response.json({ error: "provider is required" }, { status: 400 });
    }

    const providerDef = getProviderById(providerId);
    if (!providerDef) {
      return Response.json({ error: "Unknown provider" }, { status: 400 });
    }

    // 获取 API key: 优先使用传入的，其次从 DB 取
    let key = apiKey;
    if (!key && providerDef.requiresApiKey) {
      key = await secretsService.getSecret(userId, providerDef.secretKey);
    }

    if (providerDef.requiresApiKey && !key) {
      return Response.json({ success: false, error: "API key not configured" });
    }

    // 确定 base URL
    const url = baseUrl || providerDef.defaultBaseUrl;

    // 尝试连接 - 发送 models 请求或简单的 completions 请求
    const testResult = await testProviderConnection(providerId, key, url);

    return Response.json(testResult);
  } catch (error) {
    console.error("[Connection Test Error]", error);
    const message = error instanceof Error ? error.message : "Connection test failed";
    return Response.json({ success: false, error: message });
  }
}

async function testProviderConnection(
  providerId: string,
  apiKey: string | null,
  baseUrl?: string | null
): Promise<{ success: boolean; model?: string; models?: string[]; error?: string }> {
  // 构建 models endpoint URL
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
  };

  const base = baseUrl || PROVIDER_URLS[providerId];
  if (!base) {
    return { success: false, error: "No API URL configured" };
  }

  // Google uses a different endpoint structure
  if (providerId === "google") {
    const url = `${base}/models?key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    return { success: true };
  }

  // Anthropic uses different headers
  if (providerId === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey || "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
      signal: AbortSignal.timeout(15000),
    });
    // Even a 400 means the key works (just bad request params)
    if (res.status === 401 || res.status === 403) {
      return { success: false, error: "Invalid API key" };
    }
    return { success: true };
  }

  // Standard OpenAI-compatible: hit /models endpoint
  const modelsUrl = `${base}/models`;
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const res = await fetch(modelsUrl, {
    headers,
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return { success: false, error: "Invalid API key or unauthorized" };
    }
    const text = await res.text();
    return { success: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
  }

  try {
    const data = await res.json();
    const models = (data.data || []).map((m: { id: string }) => m.id).slice(0, 50);
    return { success: true, models };
  } catch {
    return { success: true };
  }
}
