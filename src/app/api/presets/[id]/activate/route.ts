import { auth } from "@/lib/auth";
import { presetService } from "@/lib/services/preset-service";
import { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/** 把指定 preset 设为同 apiType 下唯一 active */
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const userId = (session.user as { id: string }).id;
  const preset = await presetService.setActive(id, userId);
  if (!preset) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(preset);
}
