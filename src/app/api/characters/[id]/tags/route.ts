import { auth } from "@/lib/auth";
import { tagService } from "@/lib/services/tag-service";
import { NextRequest } from "next/server";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const setTagsSchema = z.object({
  tagIds: z.array(z.string()),
});

/** GET: 获取角色关联的标签 ID */
export async function GET(_req: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const tagIds = await tagService.getCharacterTagIds(id);
  return Response.json({ tagIds });
}

/** PUT: 设置角色的标签（覆盖式） */
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const body = await req.json();
    const parsed = setTagsSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    await tagService.setCharacterTags(id, parsed.data.tagIds);
    return Response.json({ success: true });
  } catch (error) {
    console.error("[PUT /api/characters/:id/tags] Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
