import { auth } from "@/lib/auth";
import { worldInfoService } from "@/lib/services/worldinfo-service";
import { NextRequest } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const dupSchema = z.object({ name: z.string().min(1).max(200).optional() });

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = dupSchema.safeParse(body);
  const newName = parsed.success ? parsed.data.name : undefined;
  const userId = (session.user as { id: string }).id;
  const item = await worldInfoService.duplicate(id, userId, newName);
  if (!item) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(item, { status: 201 });
}
