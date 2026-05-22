import { auth } from "@/lib/auth";
import { presetService } from "@/lib/services/preset-service";
import { textGenSettingsSchema } from "@/types/textgen";
import { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/** 导出单个预设为 JSON 文件 */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const userId = (session.user as { id: string }).id;
  const preset = await presetService.getById(id, userId);
  if (!preset) return Response.json({ error: "Not found" }, { status: 404 });

  // 导出与原项目互通：走一遍 schema parse 补齐缺失的默认字段
  // （extensions / adaptive_target / adaptive_decay / genamt / max_length 等），
  // 让老预设文件导出后与原项目 SillyTavern 体积 1:1 对齐。
  const raw = preset.settings as Record<string, unknown>;
  const parsed = textGenSettingsSchema.safeParse(raw);
  const normalized: Record<string, unknown> = parsed.success
    ? (parsed.data as Record<string, unknown>)
    : raw;
  const exported = {
    ...normalized,
    name: preset.name,
  };
  const fileName = `${preset.name.replace(/[^\w\-]+/g, "_")}.json`;
  return new Response(JSON.stringify(exported, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
