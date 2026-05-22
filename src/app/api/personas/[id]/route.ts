import { auth } from "@/lib/auth";
import { personaService, personaUpdateSchema } from "@/lib/services/persona-service";
import { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const body = await req.json();
    const parsed = personaUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const userId = (session.user as { id: string }).id;
    const persona = await personaService.update(id, userId, parsed.data);
    if (!persona) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(persona);
  } catch (error) {
    console.error("[PATCH /api/personas/:id] Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const userId = (session.user as { id: string }).id;
    const ok = await personaService.delete(id, userId);
    if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/personas/:id] Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST: 激活 persona */
export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const userId = (session.user as { id: string }).id;

    if (id === "none") {
      await personaService.deactivateAll(userId);
      return Response.json({ success: true });
    }

    const persona = await personaService.activate(id, userId);
    if (!persona) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(persona);
  } catch (error) {
    console.error("[POST /api/personas/:id] Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
