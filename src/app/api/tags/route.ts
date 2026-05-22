import { auth } from "@/lib/auth";
import { tagService, tagInputSchema } from "@/lib/services/tag-service";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  // 标签过滤：?filter=tagId1,tagId2 → 返回满足所有标签的角色 ID
  const filterParam = req.nextUrl.searchParams.get("filter");
  if (filterParam) {
    const tagIds = filterParam.split(",").filter(Boolean);
    const characterIds = tagIds.length > 0
      ? await tagService.filterCharacterIdsByTags(userId, tagIds)
      : [];
    return Response.json({ characterIds });
  }

  const tags = await tagService.getAll(userId);
  return Response.json(tags);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = tagInputSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const userId = (session.user as { id: string }).id;
    const tag = await tagService.create(userId, parsed.data);
    return Response.json(tag, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tags] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
