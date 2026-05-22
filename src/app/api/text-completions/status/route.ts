import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { TEXTGEN_TYPES, type TextGenType } from "@/types/textgen";

/**
 * 探测后端可达性 + 模型/能力
 * GET /api/text-completions/status?apiType=xxx&apiServer=xxx&apiKey=xxx
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const apiType = req.nextUrl.searchParams.get("apiType") as TextGenType | null;
  const apiServer = req.nextUrl.searchParams.get("apiServer");
  const apiKey = req.nextUrl.searchParams.get("apiKey") ?? undefined;

  if (!apiType || !apiServer) {
    return Response.json({ error: "Missing apiType or apiServer" }, { status: 400 });
  }

  const base = apiServer
    .replace(/^https?:\/\/localhost/, "http://127.0.0.1")
    .replace(/\/v1\/?$/, "")
    .replace(/\/$/, "");

  const headers: Record<string, string> = apiKey
    ? { Authorization: `Bearer ${apiKey}` }
    : {};

  let url = `${base}/v1/models`;
  if (apiType === TEXTGEN_TYPES.LLAMACPP) url = `${base}/props`;
  else if (apiType === TEXTGEN_TYPES.OLLAMA) url = `${base}/api/tags`;

  try {
    const r = await fetch(url, { headers });
    if (!r.ok) return Response.json({ ok: false, status: r.status }, { status: 200 });
    const data = await r.json().catch(() => null);
    return Response.json({ ok: true, data });
  } catch (err) {
    return Response.json({
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
