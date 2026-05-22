import { auth } from "@/lib/auth";
import { personaService, personaInputSchema } from "@/lib/services/persona-service";
import { NextRequest } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const personas = await personaService.getAll(userId);
  return Response.json(personas);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = personaInputSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const userId = (session.user as { id: string }).id;
    const persona = await personaService.create(userId, parsed.data);
    return Response.json(persona, { status: 201 });
  } catch (error) {
    console.error("[POST /api/personas] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
