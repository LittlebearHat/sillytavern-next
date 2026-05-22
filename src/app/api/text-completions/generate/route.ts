import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { buildTextCompletionPayload, pickEndpointUrl } from "@/lib/textgen/build-payload";
import { TEXTGEN_TYPES, type TextGenType, type TextGenSettings } from "@/types/textgen";

/**
 * 文本补全转发：
 * body: {
 *   apiType: TextGenType,
 *   apiServer: string,         // baseUrl（可含或不含 /v1）
 *   apiKey?: string,
 *   prompt: string,
 *   maxTokens?: number,
 *   model?: string,
 *   stop?: string[],
 *   settings: TextGenSettings  // 完整 sampler 参数
 * }
 *
 * 流式：当 settings.streaming === true 时，转发 SSE/NDJSON 给前端
 */

interface RequestBody {
  apiType: TextGenType;
  apiServer: string;
  apiKey?: string;
  prompt: string;
  maxTokens?: number;
  model?: string;
  stop?: string[];
  settings: Partial<TextGenSettings>;
}

const DEFAULT_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

function authHeader(apiType: TextGenType, key?: string): Record<string, string> {
  if (!key) return {};
  switch (apiType) {
    case TEXTGEN_TYPES.MANCER:
      return { "X-API-Key": key };
    case TEXTGEN_TYPES.TOGETHERAI:
    case TEXTGEN_TYPES.INFERMATICAI:
    case TEXTGEN_TYPES.DREAMGEN:
    case TEXTGEN_TYPES.OPENROUTER:
    case TEXTGEN_TYPES.FEATHERLESS:
    case TEXTGEN_TYPES.HUGGINGFACE:
    case TEXTGEN_TYPES.TABBY:
    case TEXTGEN_TYPES.VLLM:
    case TEXTGEN_TYPES.OOBA:
    default:
      return { Authorization: `Bearer ${key}` };
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as RequestBody | null;
  if (!body || !body.apiType || !body.apiServer || typeof body.prompt !== "string") {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const apiServer = body.apiServer.replace(/^https?:\/\/localhost/, "http://127.0.0.1");
  const url = pickEndpointUrl(body.apiType, apiServer);

  const payload = buildTextCompletionPayload({
    apiType: body.apiType,
    prompt: body.prompt,
    maxTokens: body.maxTokens ?? 512,
    settings: body.settings,
    model: body.model,
    stop: body.stop,
  });

  const headers: Record<string, string> = {
    ...DEFAULT_HEADERS,
    ...authHeader(body.apiType, body.apiKey),
  };

  const stream = body.settings.streaming === true;

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return Response.json(
        { error: "Upstream error", status: upstream.status, body: text.slice(0, 2000) },
        { status: upstream.status },
      );
    }

    if (stream && upstream.body) {
      // 直接 pipe 上游 SSE/NDJSON
      return new Response(upstream.body, {
        status: 200,
        headers: {
          "Content-Type": upstream.headers.get("Content-Type") ?? "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const data = await upstream.json().catch(() => null);
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: "Fetch failed", message: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
