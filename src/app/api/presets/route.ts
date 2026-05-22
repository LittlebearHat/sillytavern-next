import { auth } from "@/lib/auth";
import { presetService, createPresetSchema } from "@/lib/services/preset-service";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const apiType = req.nextUrl.searchParams.get("apiType");
  const provider = req.nextUrl.searchParams.get("provider");
  const seed = req.nextUrl.searchParams.get("seed");

  // 首次访问对应列表时自动 seed 内置默认预设
  const SEEDABLE = new Set(["textgenerationwebui", "instruct", "context", "sysprompt", "reasoning"]);
  if (apiType && SEEDABLE.has(apiType) && seed !== "0") {
    await presetService.seedDefaultPresets(userId, apiType);
  }

  const items = apiType
    ? await presetService.getByApiType(userId, apiType)
    : provider
      ? await presetService.getByProvider(userId, provider)
      : await presetService.getAll(userId);
  return Response.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = createPresetSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const userId = (session.user as { id: string }).id;
  const item = await presetService.create(userId, parsed.data);
  return Response.json(item, { status: 201 });
}
