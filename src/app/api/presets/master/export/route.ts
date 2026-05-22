import { auth } from "@/lib/auth";
import { presetService } from "@/lib/services/preset-service";
import { db } from "@/lib/db";
import { settings as settingsTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { UserConnectionConfig } from "@/types/api-connections";
import { textGenSettingsSchema } from "@/types/textgen";
import {
  contextTemplateSchema,
  instructTemplateSchema,
  syspromptTemplateSchema,
  reasoningTemplateSchema,
} from "@/types/advanced-formatting";
import { NextRequest } from "next/server";

/**
 * 导出 Master 多段预设包：
 * 输出格式（与原项目 PresetManager.performMasterImport 兼容）：
 * {
 *   instruct?:  { name, ... },
 *   context?:   { name, ... },
 *   sysprompt?: { name, ... },
 *   preset?:    { name, ... },   // textgenerationwebui
 *   reasoning?: { name, ... },
 *   srw?:       { value, show }  // 来自 user settings.formatting
 * }
 *
 * 选取规则：预设段优先用当前激活预设；若无则取该 apiType 第一个；srw 从 user formatting 读取。
 *
 * 查询参数：
 *   - apiTypes:  逗号分隔，可选（默认全部 6 段）
 */
const PRESET_API_TYPES: Array<{ apiType: string; masterKey: string }> = [
  { apiType: "textgenerationwebui", masterKey: "preset" },
  { apiType: "instruct", masterKey: "instruct" },
  { apiType: "context", masterKey: "context" },
  { apiType: "sysprompt", masterKey: "sysprompt" },
  { apiType: "reasoning", masterKey: "reasoning" },
];

/** 对段 settings 走 schema parse 补全默认字段，与原项目运行时快照对齐 */
function normalizeBySchema(
  apiType: string,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  try {
    switch (apiType) {
      case "textgenerationwebui":
        return textGenSettingsSchema.parse(raw) as Record<string, unknown>;
      case "instruct":
        return instructTemplateSchema.parse(raw) as Record<string, unknown>;
      case "context":
        return contextTemplateSchema.parse(raw) as Record<string, unknown>;
      case "sysprompt":
        return syspromptTemplateSchema.parse(raw) as Record<string, unknown>;
      case "reasoning":
        return reasoningTemplateSchema.parse(raw) as Record<string, unknown>;
      default:
        return raw;
    }
  } catch {
    return raw;
  }
}

async function readUserFormatting(userId: string): Promise<Record<string, unknown> | null> {
  try {
    const rows = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.userId, userId))
      .limit(1);
    if (rows.length === 0) return null;
    const data = JSON.parse(rows[0].data) as UserConnectionConfig;
    return (data.formatting as unknown as Record<string, unknown>) ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const filter = req.nextUrl.searchParams.get("apiTypes");
  const allowed = filter
    ? new Set(filter.split(",").map((s) => s.trim()).filter(Boolean))
    : null;

  const result: Record<string, Record<string, unknown>> = {};
  const meta: Array<{ apiType: string; masterKey: string; name: string | null }> = [];

  for (const { apiType, masterKey } of PRESET_API_TYPES) {
    if (allowed && !allowed.has(apiType)) continue;
    let chosen = await presetService.getActive(userId, apiType);
    if (!chosen) {
      const list = await presetService.getByApiType(userId, apiType);
      chosen = list[0] ?? null;
    }
    if (!chosen) {
      meta.push({ apiType, masterKey, name: null });
      continue;
    }
    const settings = chosen.settings ?? {};
    // 走 schema parse 补全 default 字段，使导出与原项目运行时快照对齐
    const normalized = normalizeBySchema(
      apiType,
      settings as Record<string, unknown>,
    );
    // 注入 name 字段，方便导入时识别命名
    const segment: Record<string, unknown> = {
      ...normalized,
      name: normalized.name ?? chosen.name,
    };
    result[masterKey] = segment;
    meta.push({ apiType, masterKey, name: chosen.name });
  }

  // srw 段：从 user settings.formatting 读取 start_reply_with / show_reply_prefix
  if (!allowed || allowed.has("srw")) {
    const formatting = await readUserFormatting(userId);
    const value = (formatting?.start_reply_with as string | undefined) ?? "";
    const show = (formatting?.show_reply_prefix as boolean | undefined) ?? false;
    result.srw = { value, show };
    meta.push({
      apiType: "srw",
      masterKey: "srw",
      name: value ? "Start Reply With" : null,
    });
  }

  const download = req.nextUrl.searchParams.get("download") === "1";
  if (download) {
    const filename = `master-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    return new Response(JSON.stringify(result, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return Response.json({ data: result, meta });
}
