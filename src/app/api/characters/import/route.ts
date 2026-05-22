import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { characterService } from "@/lib/services/character-service";
import {
  extractCardFromPng,
  cardToInternal,
} from "@/lib/parsers/character-card-parser";

/**
 * POST /api/characters/import - 导入角色卡 (PNG 或 JSON)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    if (!userId) {
      return Response.json({ error: "User ID not found" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let characterData: Record<string, unknown>;

    if (file.name.endsWith(".png")) {
      // PNG 角色卡 - 从 tEXt chunk 提取
      const card = extractCardFromPng(buffer);
      if (!card) {
        return Response.json(
          { error: "No character data found in PNG" },
          { status: 400 }
        );
      }
      characterData = cardToInternal(card) as Record<string, unknown>;

      // 将 PNG 本身作为 avatar (base64 data URL)
      const avatarBase64 = buffer.toString("base64");
      characterData.avatar = `data:image/png;base64,${avatarBase64}`;
    } else if (file.name.endsWith(".json")) {
      // JSON 角色卡
      const json = buffer.toString("utf-8");
      const parsed = JSON.parse(json);

      // 支持多种格式
      if (parsed.spec === "chara_card_v2" || parsed.spec === "chara_card_v3") {
        characterData = cardToInternal(parsed) as Record<string, unknown>;
      } else if (parsed.data) {
        characterData = cardToInternal({ spec: "chara_card_v2", spec_version: "2.0", data: parsed.data }) as Record<string, unknown>;
      } else if (parsed.name) {
        // 裸 V1 数据
        characterData = {
          name: parsed.name,
          description: parsed.description || undefined,
          personality: parsed.personality || undefined,
          scenario: parsed.scenario || undefined,
          firstMessage: parsed.first_mes || parsed.firstMessage || undefined,
          exampleDialogue: parsed.mes_example || parsed.exampleDialogue || undefined,
        };
      } else {
        return Response.json({ error: "Invalid character card format" }, { status: 400 });
      }
    } else {
      return Response.json(
        { error: "Unsupported file format. Use .png or .json" },
        { status: 400 }
      );
    }

    // 创建角色
    const character = await characterService.create(userId, {
      ...characterData,
      name: (characterData.name as string) || "Unknown",
    });

    return Response.json(character, { status: 201 });
  } catch (error) {
    console.error("[Import Error]", error);
    const message = error instanceof Error ? error.message : "Import failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
