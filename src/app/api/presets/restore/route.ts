import { auth } from "@/lib/auth";
import { presetService } from "@/lib/services/preset-service";
import { NextRequest } from "next/server";

/**
 * 恢复内置默认预设到当前用户
 * body: { name: string; apiType?: string }
 *   - apiType 默认 "textgenerationwebui"
 *   - 可选值：instruct / context / sysprompt / reasoning
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const body = await req.json().catch(() => ({}));
  const name: string | undefined = body?.name;
  const apiType: string = body?.apiType ?? "textgenerationwebui";
  if (!name) return Response.json({ error: "Missing name" }, { status: 400 });

  const preset = await presetService.restoreDefault(userId, apiType, name);
  if (!preset) return Response.json({ error: "Default preset not found" }, { status: 404 });
  return Response.json(preset);
}

/** GET ?apiType=xxx 返回对应内置默认预设名列表 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const apiType = req.nextUrl.searchParams.get("apiType") ?? "textgenerationwebui";
  return Response.json({ names: presetService.listDefaultNames(apiType) });
}
