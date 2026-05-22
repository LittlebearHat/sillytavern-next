import { auth } from "@/lib/auth";
import { worldInfoService } from "@/lib/services/worldinfo-service";
import { NextRequest } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const renameSchema = z.object({ name: z.string().min(1).max(200) });

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const parsed = renameSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });
  const userId = (session.user as { id: string }).id;
  const item = await worldInfoService.rename(id, userId, parsed.data.name);
  if (!item) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(item);
}
