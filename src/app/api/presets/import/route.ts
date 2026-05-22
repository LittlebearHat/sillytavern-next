import { auth } from "@/lib/auth";
import { presetService } from "@/lib/services/preset-service";
import { db } from "@/lib/db";
import { settings as settingsTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { UserConnectionConfig } from "@/types/api-connections";
import { NextRequest } from "next/server";

/**
 * 导入预设：识别 JSON 是 textgen / instruct / context / sysprompt / reasoning / srw 任意一种或 master JSON
 * body: { data: object, fileName?: string }
 *
 * 简化判别（参考原项目 PresetManager.performMasterImport）：
 *  - 含 temp/top_k/top_p/rep_pen → text completion preset
 *  - 含 input_sequence/output_sequence → instruct
 *  - 含 story_string → context
 *  - 含 content & name 但无上述 → sysprompt
 *  - 含 prefix/suffix/separator → reasoning
 *  - 含 value/show → srw（写入 user settings.formatting）
 *  - 嵌套 { instruct, context, sysprompt, preset, reasoning, srw } → master 多段
 */

interface SectionResult {
  apiType: string;
  name: string;
  ok: boolean;
}

function isTextCompletion(d: Record<string, unknown>): boolean {
  return ["temp", "top_p", "top_k", "rep_pen"].every((k) => k in d);
}
function isInstruct(d: Record<string, unknown>): boolean {
  return ["name", "input_sequence", "output_sequence"].every((k) => k in d);
}
function isContext(d: Record<string, unknown>): boolean {
  return ["name", "story_string"].every((k) => k in d);
}
function isSysprompt(d: Record<string, unknown>): boolean {
  return "name" in d && "content" in d && !isInstruct(d) && !isContext(d);
}
function isReasoning(d: Record<string, unknown>): boolean {
  return ["name", "prefix", "suffix", "separator"].every((k) => k in d);
}
function isSrw(d: Record<string, unknown>): boolean {
  return "value" in d && "show" in d;
}

function detectApiType(d: Record<string, unknown>): string | null {
  if (isInstruct(d)) return "instruct";
  if (isContext(d)) return "context";
  if (isReasoning(d)) return "reasoning";
  if (isSysprompt(d)) return "sysprompt";
  if (isTextCompletion(d)) return "textgenerationwebui";
  if (isSrw(d)) return "srw";
  return null;
}

/** 将 srw 写入 user settings.formatting.start_reply_with / show_reply_prefix */
async function writeSrwToFormatting(
  userId: string,
  data: { value?: unknown; show?: unknown },
): Promise<void> {
  const value = typeof data.value === "string" ? data.value : "";
  const show = typeof data.show === "boolean" ? data.show : false;

  const existing = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.userId, userId))
    .limit(1);

  let current: UserConnectionConfig;
  if (existing.length > 0) {
    try {
      current = JSON.parse(existing[0].data) as UserConnectionConfig;
    } catch {
      current = {} as UserConnectionConfig;
    }
  } else {
    current = {} as UserConnectionConfig;
  }

  const formatting = {
    ...((current.formatting as Record<string, unknown> | undefined) ?? {}),
    start_reply_with: value,
    show_reply_prefix: show,
  };
  const merged = { ...current, formatting } as UserConnectionConfig;
  const jsonData = JSON.stringify(merged);

  if (existing.length > 0) {
    await db
      .update(settingsTable)
      .set({ data: jsonData, updatedAt: new Date() })
      .where(eq(settingsTable.userId, userId));
  } else {
    await db.insert(settingsTable).values({
      id: randomUUID(),
      userId,
      data: jsonData,
      updatedAt: new Date(),
    });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = (body.data ?? body) as Record<string, unknown>;
  const fileName: string = body.fileName ?? "Imported";
  const sections: SectionResult[] = [];

  // 1) Master 多段 JSON
  const masterKeys = ["instruct", "context", "sysprompt", "preset", "reasoning", "srw"];
  const containsMaster = masterKeys.some((k) => k in data);
  if (containsMaster) {
    for (const key of masterKeys) {
      const sub = data[key];
      if (!sub || typeof sub !== "object") continue;

      // srw 段写入 user settings.formatting不创建 preset
      if (key === "srw") {
        try {
          await writeSrwToFormatting(userId, sub as { value?: unknown; show?: unknown });
          sections.push({ apiType: "srw", name: "Start Reply With", ok: true });
        } catch (e) {
          console.error("[presets/import] write srw", e);
          sections.push({ apiType: "srw", name: "Start Reply With", ok: false });
        }
        continue;
      }

      const apiType = key === "preset" ? "textgenerationwebui" : key;
      const name = (sub as Record<string, unknown>).name as string | undefined;
      const presetName =
        name && typeof name === "string" ? name : `${fileName}-${key}`;
      try {
        await presetService.create(userId, {
          name: presetName,
          provider: apiType === "textgenerationwebui" ? "textgen" : apiType,
          apiType,
          settings: sub as Record<string, unknown>,
        });
        sections.push({ apiType, name: presetName, ok: true });
      } catch {
        sections.push({ apiType, name: presetName, ok: false });
      }
    }
    return Response.json({ imported: sections });
  }

  // 2) 单段 JSON
  const single = detectApiType(data);
  if (!single) {
    return Response.json({ error: "Unrecognized preset format" }, { status: 400 });
  }

  // 单段 srw 也写入 formatting
  if (single === "srw") {
    try {
      await writeSrwToFormatting(userId, data as { value?: unknown; show?: unknown });
      return Response.json({
        imported: [{ apiType: "srw", name: "Start Reply With", ok: true }],
      });
    } catch (e) {
      console.error("[presets/import] write srw", e);
      return Response.json({ error: "Failed to write srw" }, { status: 500 });
    }
  }

  const presetName =
    typeof data.name === "string" && data.name ? data.name : fileName;
  await presetService.create(userId, {
    name: presetName,
    provider: single === "textgenerationwebui" ? "textgen" : single,
    apiType: single,
    settings: data,
  });
  return Response.json({
    imported: [{ apiType: single, name: presetName, ok: true }],
  });
}
