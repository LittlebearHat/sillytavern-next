import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { secretsService } from "@/lib/services/secrets-service";
import { getProviderById } from "@/lib/constants/providers-registry";

/**
 * GET /api/connections/models?provider=xxx
 * 获取指定提供商的可用模型列表
 * 对于 dynamic 类型提供商，会实时从远程 API 拉取
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    const providerId = req.nextUrl.searchParams.get("provider");
    if (!providerId) {
      return Response.json({ error: "provider parameter is required" }, { status: 400 });
    }

    const providerDef = getProviderById(providerId);
    if (!providerDef) {
      return Response.json({ error: "Unknown provider" }, { status: 400 });
    }

    // 静态模型列表直接返回
    if (providerDef.models !== "dynamic") {
      return Response.json({ models: providerDef.models, source: "static" });
    }

    // 动态模型 - 需要从远程 API 获取
    let apiKey: string | null = null;
    if (providerDef.requiresApiKey) {
      apiKey = await secretsService.getSecret(userId, providerDef.secretKey);
      if (!apiKey) {
        return Response.json({
          models: [],
          source: "dynamic",
          error: "API key not configured - cannot fetch models",
        });
      }
    }

    const baseUrl = providerDef.defaultBaseUrl;
    if (!baseUrl) {
      return Response.json({
        models: [],
        source: "dynamic",
        error: "No base URL configured",
      });
    }

    const models = await fetchRemoteModels(providerId, apiKey, baseUrl);
    return Response.json({ models, source: "dynamic" });
  } catch (error) {
    console.error("[Models Fetch Error]", error);
    const message = error instanceof Error ? error.message : "Failed to fetch models";
    return Response.json({ error: message }, { status: 500 });
  }
}

async function fetchRemoteModels(
  providerId: string,
  apiKey: string | null,
  baseUrl: string
): Promise<{ id: string; name?: string }[]> {
  // Google 使用不同的 API 结构
  if (providerId === "google" || providerId === "vertexai") {
    const url = providerId === "google"
      ? `${baseUrl}/models?key=${apiKey}`
      : `${baseUrl}/models`;
    const headers: Record<string, string> = {};
    if (providerId === "vertexai" && apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    const data = await res.json();
    // Google 返回 { models: [{ name: "models/gemini-pro", ... }] }
    return (data.models || [])
      .filter((m: { name: string }) => m.name?.startsWith("models/"))
      .map((m: { name: string; displayName?: string }) => ({
        id: m.name.replace("models/", ""),
        name: m.displayName || m.name.replace("models/", ""),
      }));
  }

  // Ollama 使用 /api/tags
  if (providerId === "ollama") {
    const url = `${baseUrl.replace(/\/v1\/?$/, "")}/api/tags`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || []).map((m: { name: string }) => ({
      id: m.name,
      name: m.name,
    }));
  }

  // OpenRouter 特殊处理 - 可能有很多模型
  if (providerId === "openrouter" || providerId === "openrouterText") {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((m: { id: string; name?: string }) => ({
      id: m.id,
      name: m.name || m.id,
    }));
  }

  // 标准 OpenAI-compatible /models 端点
  const modelsUrl = `${baseUrl}/models`;
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const res = await fetch(modelsUrl, { headers, signal: AbortSignal.timeout(10000) });
  if (!res.ok) return [];

  const data = await res.json();
  return (data.data || []).map((m: { id: string; name?: string }) => ({
    id: m.id,
    name: m.name || m.id,
  }));
}
