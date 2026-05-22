import { auth } from "@/lib/auth";
import { worldInfoService, createWorldInfoSchema } from "@/lib/services/worldinfo-service";
import { NextRequest } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const items = await worldInfoService.getAll(userId);
  return Response.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = createWorldInfoSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const userId = (session.user as { id: string }).id;
  const item = await worldInfoService.create(userId, parsed.data);
  return Response.json(item, { status: 201 });
}
