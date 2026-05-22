/**
 * 角色卡解析器 - 支持 V1/V2/V3 格式和 PNG 内嵌元数据
 * 兼容 TavernAI / SillyTavern 角色卡标准
 *
 * 参考原版 SillyTavern src/character-card-parser.js
 * 使用 png-chunks-extract + png-chunk-text 实现 PNG tEXt chunk 读写
 */

import extract from "png-chunks-extract";
import encode from "png-chunks-encode";
import * as PNGtext from "png-chunk-text";

// V1 角色卡格式
export interface CharacterCardV1 {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
}

// V2 角色卡格式 (Character Card V2 Spec)
export interface CharacterCardV2 {
  spec: "chara_card_v2";
  spec_version: string;
  data: CharacterCardV2Data;
}

export interface CharacterCardV2Data {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  alternate_greetings?: string[];
  tags?: string[];
  creator?: string;
  character_version?: string;
  extensions?: Record<string, unknown>;
  // V2 extensions commonly used by SillyTavern
  talkativeness?: number;
  fav?: boolean;
  create_date?: string;
  // V2 spec character_book（嵌入式世界书），导出时由后端从绑定的 lorebook 实时生成
  character_book?: {
    name?: string;
    entries: unknown[];
  };
  // V2 spec 群聊专用字段，原项目始终输出空数组
  group_only_greetings?: string[];
}

// V3 角色卡格式
export interface CharacterCardV3
  extends Omit<CharacterCardV2, "spec" | "spec_version"> {
  spec: "chara_card_v3";
  spec_version: "3.0";
}

export type CharacterCard = CharacterCardV1 | CharacterCardV2 | CharacterCardV3;

/** 判断是否为 V2 格式 */
export function isV2Card(card: unknown): card is CharacterCardV2 {
  return (
    typeof card === "object" &&
    card !== null &&
    "spec" in card &&
    (card as CharacterCardV2).spec === "chara_card_v2"
  );
}

/** 判断是否为 V3 格式 */
export function isV3Card(card: unknown): card is CharacterCardV3 {
  return (
    typeof card === "object" &&
    card !== null &&
    "spec" in card &&
    (card as CharacterCardV3).spec === "chara_card_v3"
  );
}

/** 将 V1 转为 V2 格式 */
export function v1ToV2(card: CharacterCardV1): CharacterCardV2 {
  return {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: card.name,
      description: card.description,
      personality: card.personality,
      scenario: card.scenario,
      first_mes: card.first_mes,
      mes_example: card.mes_example,
    },
  };
}

/** 从 JSON 字符串解析角色卡，统一为 V2 格式 */
export function parseCharacterCard(json: string): CharacterCardV2 {
  const parsed = JSON.parse(json);

  // V3 格式 - 降级为 V2 (data 结构相同)
  if (isV3Card(parsed)) {
    return {
      spec: "chara_card_v2",
      spec_version: "2.0",
      data: parsed.data,
    };
  }

  if (isV2Card(parsed)) {
    return parsed;
  }

  // V1 格式或裸数据
  if (
    parsed.name &&
    (parsed.first_mes !== undefined || parsed.description !== undefined)
  ) {
    return v1ToV2(parsed as CharacterCardV1);
  }

  throw new Error("Invalid character card format");
}

/** 将角色卡转为内部 DB 格式 */
export function cardToInternal(card: CharacterCardV2) {
  const d = card.data;
  return {
    name: d.name,
    description: d.description || undefined,
    personality: d.personality || undefined,
    scenario: d.scenario || undefined,
    firstMessage: d.first_mes || undefined,
    exampleDialogue: d.mes_example || undefined,
    creatorNotes: d.creator_notes || undefined,
    systemPrompt: d.system_prompt || undefined,
    postHistoryInstructions: d.post_history_instructions || undefined,
    alternateGreetings: d.alternate_greetings || [],
    tags: d.tags || [],
    creator: d.creator || undefined,
    characterVersion: d.character_version || undefined,
    talkativeness: d.talkativeness,
    fav: d.fav,
    extensions: d.extensions || {},
    // V2/V3 嵌入式世界书原样保留，导出时会从这里读
    characterBook: d.character_book ?? undefined,
  };
}

/** 从内部格式转为 V2 角色卡 JSON */
export function internalToCard(data: {
  name: string;
  description?: string | null;
  personality?: string | null;
  scenario?: string | null;
  firstMessage?: string | null;
  exampleDialogue?: string | null;
  creatorNotes?: string | null;
  systemPrompt?: string | null;
  postHistoryInstructions?: string | null;
  alternateGreetings?: string[];
  tags?: string[];
  creator?: string | null;
  characterVersion?: string | null;
  talkativeness?: number;
  fav?: boolean;
  extensions?: Record<string, unknown>;
  createDate?: string;
}): CharacterCardV2 {
  return {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: data.name,
      description: data.description || "",
      personality: data.personality || "",
      scenario: data.scenario || "",
      first_mes: data.firstMessage || "",
      mes_example: data.exampleDialogue || "",
      creator_notes: data.creatorNotes || "",
      system_prompt: data.systemPrompt || "",
      post_history_instructions: data.postHistoryInstructions || "",
      alternate_greetings: data.alternateGreetings || [],
      tags: data.tags || [],
      creator: data.creator || "",
      character_version: data.characterVersion || "",
      // talkativeness / fav 仅放在 extensions 中（与 SillyTavern 原项目导出一致）
      create_date: data.createDate,
      extensions: data.extensions || {},
      // V2 群聊专用字段，原项目始终输出空数组
      group_only_greetings: [],
    },
  };
}

/**
 * 以原项目 1:1 格式导出角色卡 JSON：
 * - 外层保留 V1 兼容字段（name/description/personality/first_mes/scenario/mes_example/avatar/create_date/talkativeness/fav/creatorcomment/tags）
 * - spec 升级为 V3（chara_card_v3 / 3.0）
 * - data 中可选含 character_book（导出时从角色绑定的世界书嵌入）
 * 这样旧版 ST（读顶层）与新版 ST（读 data）都能正确解析。
 */
export function internalToExportJson(data: {
  name: string;
  description?: string | null;
  personality?: string | null;
  scenario?: string | null;
  firstMessage?: string | null;
  exampleDialogue?: string | null;
  creatorNotes?: string | null;
  systemPrompt?: string | null;
  postHistoryInstructions?: string | null;
  alternateGreetings?: string[];
  tags?: string[];
  creator?: string | null;
  characterVersion?: string | null;
  talkativeness?: number;
  fav?: boolean;
  extensions?: Record<string, unknown>;
  createDate?: string;
  avatar?: string | null;
  characterBook?: { name?: string; entries: unknown[] } | null;
}): Record<string, unknown> {
  const v2 = internalToCard(data);
  const dataObj: Record<string, unknown> = { ...v2.data };
  if (data.characterBook && Array.isArray(data.characterBook.entries)) {
    dataObj.character_book = data.characterBook;
  }
  return {
    name: data.name,
    description: data.description ?? "",
    personality: data.personality ?? "",
    first_mes: data.firstMessage ?? "",
    // 与原项目一致：JSON 导出不嵌入 base64 头像（避免体积肨胀），只有文件名引用才保留。
    // 需要连同头像一起导出请使用 PNG 格式。
    avatar:
      data.avatar && !data.avatar.startsWith("data:") ? data.avatar : "none",
    mes_example: data.exampleDialogue ?? "",
    scenario: data.scenario ?? "",
    create_date: data.createDate ?? new Date().toISOString(),
    talkativeness:
      typeof data.talkativeness === "number"
        ? String(data.talkativeness)
        : "0.5",
    fav: data.fav ?? false,
    creatorcomment: data.creatorNotes ?? "",
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: dataObj,
    tags: data.tags ?? [],
  };
}

// ==================== PNG 读写 ====================

/**
 * 从 PNG 图像 Buffer 读取角色卡元数据
 * 优先读取 ccv3 (V3)，其次 chara (V2/V1)
 */
export function readCardFromPng(image: Buffer): string {
  const chunks = extract(new Uint8Array(image));
  const textChunks = chunks
    .filter((chunk: { name: string }) => chunk.name === "tEXt")
    .map((chunk: { data: Uint8Array }) => PNGtext.decode(chunk.data));

  if (textChunks.length === 0) {
    throw new Error("PNG metadata does not contain any text chunks.");
  }

  // V3 优先
  const ccv3Chunk = textChunks.find(
    (chunk: { keyword: string }) => chunk.keyword.toLowerCase() === "ccv3",
  );
  if (ccv3Chunk) {
    return Buffer.from(ccv3Chunk.text, "base64").toString("utf-8");
  }

  // V2/V1 fallback
  const charaChunk = textChunks.find(
    (chunk: { keyword: string }) => chunk.keyword.toLowerCase() === "chara",
  );
  if (charaChunk) {
    return Buffer.from(charaChunk.text, "base64").toString("utf-8");
  }

  throw new Error("PNG metadata does not contain character data.");
}

/**
 * 将角色卡元数据写入 PNG 图像 Buffer
 * 同时写入 chara (V2) 和 ccv3 (V3) 以保持兼容性
 */
export function writeCardToPng(image: Buffer, data: string): Buffer {
  const chunks = extract(new Uint8Array(image));

  // 移除已有的 chara / ccv3 tEXt chunks
  const tEXtChunks = chunks.filter(
    (chunk: { name: string }) => chunk.name === "tEXt",
  );
  for (const tEXtChunk of tEXtChunks) {
    const decoded = PNGtext.decode(tEXtChunk.data);
    if (
      decoded.keyword.toLowerCase() === "chara" ||
      decoded.keyword.toLowerCase() === "ccv3"
    ) {
      chunks.splice(chunks.indexOf(tEXtChunk), 1);
    }
  }

  // 写入 V2 chara chunk (base64 编码)
  const base64Data = Buffer.from(data, "utf-8").toString("base64");
  chunks.splice(-1, 0, PNGtext.encode("chara", base64Data));

  // 尝试写入 V3 ccv3 chunk
  try {
    const v3Data = JSON.parse(data);
    v3Data.spec = "chara_card_v3";
    v3Data.spec_version = "3.0";
    const v3Base64 = Buffer.from(JSON.stringify(v3Data), "utf-8").toString(
      "base64",
    );
    chunks.splice(-1, 0, PNGtext.encode("ccv3", v3Base64));
  } catch {
    // 忽略 V3 写入失败
  }

  return Buffer.from(encode(chunks));
}

/** 从 PNG Buffer 解析角色卡为结构化数据 */
export function extractCardFromPng(buffer: Buffer): CharacterCardV2 | null {
  try {
    const json = readCardFromPng(buffer);
    return parseCharacterCard(json);
  } catch {
    return null;
  }
}

/** 将角色卡数据嵌入 PNG Buffer */
export function embedCardIntoPng(
  image: Buffer,
  card: CharacterCardV2,
): Buffer {
  const json = JSON.stringify(card);
  return writeCardToPng(image, json);
}
