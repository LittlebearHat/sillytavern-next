import { auth } from "@/lib/auth";
import { worldInfoService } from "@/lib/services/worldinfo-service";
import { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/** 导出 lorebook 为 JSON 文件 */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const userId = (session.user as { id: string }).id;
  const result = await worldInfoService.exportToJson(id, userId);
  if (!result) return Response.json({ error: "Not found" }, { status: 404 });

  const safeName = result.name.replace(/[^a-z0-9_\-\s]/gi, "_");
  return new Response(JSON.stringify(result.data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${safeName}.json"`,
    },
  });
}
