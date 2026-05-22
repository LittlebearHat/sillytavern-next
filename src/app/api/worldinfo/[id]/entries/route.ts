import { auth } from "@/lib/auth";
import { worldInfoService, worldInfoEntrySchema } from "@/lib/services/worldinfo-service";
import { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/** 单条新增/更新词条 */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  // 允许部分字段，由 service 合并默认值
  const userId = (session.user as { id: string }).id;
  const entry = await worldInfoService.upsertEntry(id, userId, body);
  if (!entry) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(entry);
}

/** 批量替换全部词条 */
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const userId = (session.user as { id: string }).id;
  // 接受 { entries: Record<uid, Entry> }
  const raw = (body && typeof body === "object" ? (body as { entries?: unknown }).entries : null) ?? body;
  if (!raw || typeof raw !== "object") {
    return Response.json({ error: "entries required" }, { status: 400 });
  }
  const entries: Record<string, ReturnType<typeof worldInfoEntrySchema.parse>> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const parsed = worldInfoEntrySchema.safeParse(v);
    if (parsed.success) entries[k] = parsed.data;
  }
  const item = await worldInfoService.update(id, userId, { entries });
  if (!item) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(item);
}
