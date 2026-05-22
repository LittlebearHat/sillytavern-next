import { auth } from "@/lib/auth";
import { worldInfoService } from "@/lib/services/worldinfo-service";
import { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string; uid: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id, uid } = await params;
  const body = await req.json();
  const userId = (session.user as { id: string }).id;
  const entry = await worldInfoService.upsertEntry(id, userId, { ...body, uid: Number(uid) });
  if (!entry) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id, uid } = await params;
  const userId = (session.user as { id: string }).id;
  const ok = await worldInfoService.deleteEntry(id, userId, Number(uid));
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ success: true });
}
