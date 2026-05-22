import { auth } from "@/lib/auth";
import { tagService, tagUpdateSchema } from "@/lib/services/tag-service";
import { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const body = await req.json();
    const parsed = tagUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const userId = (session.user as { id: string }).id;
    const tag = await tagService.update(id, userId, parsed.data);
    if (!tag) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(tag);
  } catch (error) {
    console.error("[PATCH /api/tags/:id] Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const userId = (session.user as { id: string }).id;
    const ok = await tagService.delete(id, userId);
    if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/tags/:id] Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
