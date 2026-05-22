import { auth } from "@/lib/auth";
import { characterService, characterInputSchema } from "@/lib/services/character-service";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const search = req.nextUrl.searchParams.get("q");

  const chars = search
    ? await characterService.search(userId, search)
    : await characterService.getAll(userId);

  return Response.json(chars);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = characterInputSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const userId = (session.user as { id: string }).id;
    if (!userId) {
      return Response.json({ error: "User ID not found in session" }, { status: 401 });
    }
    const character = await characterService.create(userId, parsed.data);
    return Response.json(character, { status: 201 });
  } catch (error) {
    console.error("[POST /api/characters] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
