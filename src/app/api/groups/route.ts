import { auth } from "@/lib/auth";
import { groupService, groupInputSchema } from "@/lib/services/group-service";
import { NextRequest } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const groups = await groupService.getAll(userId);
  return Response.json(groups);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = groupInputSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const userId = (session.user as { id: string }).id;
    const group = await groupService.create(userId, parsed.data);
    return Response.json(group, { status: 201 });
  } catch (error) {
    console.error("[POST /api/groups] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
