import { auth } from "@/lib/auth";
import { groupService, groupUpdateSchema } from "@/lib/services/group-service";
import { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const userId = (session.user as { id: string }).id;
  const group = await groupService.getById(id, userId);
  if (!group) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(group);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const body = await req.json();
    const parsed = groupUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const userId = (session.user as { id: string }).id;
    const group = await groupService.update(id, userId, parsed.data);
    if (!group) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(group);
  } catch (error) {
    console.error("[PATCH /api/groups/:id] Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const userId = (session.user as { id: string }).id;
    const ok = await groupService.delete(id, userId);
    if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/groups/:id] Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
