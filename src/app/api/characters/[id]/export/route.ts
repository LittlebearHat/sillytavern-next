import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { characterService } from "@/lib/services/character-service";
import { worldInfoService } from "@/lib/services/worldinfo-service";
import {
  internalToExportJson,
  writeCardToPng,
} from "@/lib/parsers/character-card-parser";

/**
 * GET /api/characters/[id]/export?format=png|json
 * 导出角色卡为 PNG 或 JSON。导出时会自动把绑定的世界书嵌入到 data.character_book，
 * 并同时输出顶层 V1 兼容字段（与原项目 default_Seraphina_1.json 1:1 对齐）。
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const format = req.nextUrl.searchParams.get("format") || "json";

    const character = await characterService.getById(id, session.user.id);
    if (!character) {
      return Response.json({ error: "Character not found" }, { status: 404 });
    }

    /**
     * 推断 character_book：优先级
     *   1. character.characterBook（角色卡自带快照，导入时存）
     *   2. worldInfoBookId 关联的全局 lorebook（实时转 V2 character_book 格式）
     *   3. null（角色没绑任何世界书）
     */
    let characterBook: { name?: string; entries: unknown[] } | null = null;
    if (
      character.characterBook &&
      typeof character.characterBook === "object" &&
      Array.isArray((character.characterBook as { entries?: unknown }).entries)
    ) {
      characterBook = character.characterBook as {
        name?: string;
        entries: unknown[];
      };
    } else if (character.worldInfoBookId) {
      const book = await worldInfoService.toCharacterBook(
        character.worldInfoBookId,
        session.user.id,
      );
      if (book) characterBook = book;
    }

    // 顶层 V1 + V3 spec + data + character_book 一体化的导出对象
    const exportObj = internalToExportJson({
      name: character.name,
      description: character.description,
      personality: character.personality,
      scenario: character.scenario,
      firstMessage: character.firstMessage,
      exampleDialogue: character.exampleDialogue,
      creatorNotes: character.creatorNotes,
      systemPrompt: character.systemPrompt,
      postHistoryInstructions: character.postHistoryInstructions,
      alternateGreetings: character.alternateGreetings,
      tags: character.tags,
      creator: character.creator,
      characterVersion: character.characterVersion,
      talkativeness: character.talkativeness,
      fav: character.fav,
      extensions: character.extensions,
      createDate: character.createDate,
      avatar: character.avatar,
      characterBook,
    });

    if (format === "json") {
      const json = JSON.stringify(exportObj, null, 4);
      return new Response(json, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${character.name}.json"`,
        },
      });
    }

    if (format === "png") {
      // PNG 嵌入与 JSON 导出使用同一份 payload（顶层 V1 兼容字段 + V3 spec + data.character_book），
      // 与 SillyTavern 原项目 default_Seraphina_1.png 内嵌的 chara/ccv3 chunk 一致。
      // writeCardToPng 内部会同时写 chara (V2 占位) + ccv3 (V3 主体) 两份 tEXt chunk。
      const exportObjPng = internalToExportJson({
        name: character.name,
        description: character.description,
        personality: character.personality,
        scenario: character.scenario,
        firstMessage: character.firstMessage,
        exampleDialogue: character.exampleDialogue,
        creatorNotes: character.creatorNotes,
        systemPrompt: character.systemPrompt,
        postHistoryInstructions: character.postHistoryInstructions,
        alternateGreetings: character.alternateGreetings,
        tags: character.tags,
        creator: character.creator,
        characterVersion: character.characterVersion,
        talkativeness: character.talkativeness,
        fav: character.fav,
        extensions: character.extensions,
        createDate: character.createDate,
        avatar: character.avatar,
        characterBook,
      });

      // 选定底图
      let imageBuffer: Buffer;
      if (character.avatar?.startsWith("data:image/png;base64,")) {
        const base64 = character.avatar.split(",")[1];
        imageBuffer = Buffer.from(base64, "base64");
      } else {
        imageBuffer = createMinimalPng();
      }

      const cardJson = JSON.stringify(exportObjPng);
      const pngBuffer = writeCardToPng(imageBuffer, cardJson);

      return new Response(new Uint8Array(pngBuffer), {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${character.name}.png"`,
        },
      });
    }

    return Response.json(
      { error: "Invalid format. Use png or json" },
      { status: 400 },
    );
  } catch (error) {
    console.error("[Export Error]", error);
    const message = error instanceof Error ? error.message : "Export failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

/** 创建最小有效 PNG (1x1 白色像素) */
function createMinimalPng(): Buffer {
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, // 8bit RGB
    0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
    0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, // compressed data
    0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, // checksum
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, // IEND chunk
    0xae, 0x42, 0x60, 0x82,
  ]);
  return png;
}
