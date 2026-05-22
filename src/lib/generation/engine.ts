/**
 * 共享 AI 生成引擎
 * 单聊和群聊共用同一套 prompt 构建 + API 调用 + 流式消费逻辑
 */
import type {
  ContextTemplate,
  InstructTemplate,
  SyspromptTemplate,
  FormattingGlobal,
} from "@/types/advanced-formatting";
import type { ApiCategory } from "@/types/api-connections";
import {
  buildInstructPrompt,
  buildSimplePrompt,
  collectStopStrings,
  replaceMacros,
  type MacroContext,
} from "@/lib/formatting/build-prompt";
import { DEFAULT_FORMATTING_GLOBAL } from "@/types/advanced-formatting";

// ========================
// 接口定义
// ========================

export interface GenerationConfig {
  /** 与 connection-store 对齐：chat_completion / text_completion / novelai 等；非 text_completion 全部走 chat completion */
  activeCategory: ApiCategory;
  activeProvider: string;
  activeModel: string;
  activeBaseUrl: string;
  textgenSettings: Record<string, unknown>;
  formatting: FormattingGlobal;
  contextTpl: ContextTemplate;
  instructTpl: InstructTemplate;
  syspromptTpl: SyspromptTemplate;
}

export interface CharacterContext {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  systemPrompt: string;
  exampleDialogue: string;
}

export interface PersonaContext {
  name: string;
  description: string;
  descriptionPosition: number; // 0=IN_PROMPT, 9=NONE
}

export interface GenerateOptions {
  config: GenerationConfig;
  character: CharacterContext;
  persona: PersonaContext | null;
  history: { role: string; content: string }[];
  input?: string;
  worldInfo?: Record<string, unknown>;
  signal?: AbortSignal;
  /** 群组模式: APPEND 时的合并描述 */
  groupSystemPrefix?: string;
}

// ========================
// Macro 构建
// ========================

export function buildMacroContext(opts: GenerateOptions): MacroContext {
  const { character, persona, history, input } = opts;
  const userName = persona?.name || "User";
  const personaDesc = persona && persona.descriptionPosition !== 9
    ? persona.description ?? ""
    : "";

  return {
    user: userName,
    char: character.name,
    persona: personaDesc,
    description: character.description,
    personality: character.personality,
    scenario: character.scenario,
    system: character.systemPrompt,
    model: opts.config.activeModel,
    mesExamples: character.exampleDialogue,
    lastMessage: history.length > 0 ? history[history.length - 1].content : "",
    lastUserMessage: [...history].reverse().find((m) => m.role === "user")?.content ?? "",
    lastCharMessage: [...history].reverse().find((m) => m.role === "assistant")?.content ?? "",
    input: input ?? "",
  };
}

// ========================
// Text Completion prompt 构建
// ========================

export function buildTextgenPrompt(opts: GenerateOptions): string {
  const { config, character } = opts;
  const formatting = config.formatting ?? DEFAULT_FORMATTING_GLOBAL;
  const macros = buildMacroContext(opts);
  const charName = character.name;
  const userName = macros.user ?? "User";

  // systemPrompt: 优先角色卡的 systemPrompt, 回退 description; 群组模式可加前缀
  let rawSystem = character.systemPrompt || character.description || "";
  if (opts.groupSystemPrefix) {
    rawSystem = `${opts.groupSystemPrefix}\n\n${rawSystem}`;
  }
  const systemPrompt = replaceMacros(rawSystem, macros);

  const effectiveSystem =
    formatting.sysprompt_enabled && config.syspromptTpl?.content
      ? config.syspromptTpl.content
      : systemPrompt;

  if (formatting.instruct_enabled) {
    const typedHistory = opts.history.map((m) => ({
      role: (m.role === "user" || m.role === "assistant" || m.role === "system" ? m.role : "user") as
        | "user"
        | "assistant"
        | "system",
      content: m.content,
    }));
    return buildInstructPrompt({
      context: config.contextTpl,
      instruct: config.instructTpl,
      sysprompt: config.syspromptTpl,
      formatting,
      systemPrompt: effectiveSystem,
      history: typedHistory,
      macros,
      isImpersonating: false,
    });
  }

  return buildSimplePrompt({
    context: config.contextTpl,
    sysprompt: config.syspromptTpl,
    formatting,
    systemPrompt: effectiveSystem,
    history: opts.history,
    charName,
    userName,
    macros,
  });
}

// ========================
// API 调用
// ========================

/**
 * 调用 Text Completion API，返回 stream Response
 */
export async function callTextCompletionAPI(opts: GenerateOptions): Promise<Response> {
  const { config, signal } = opts;
  const formatting = config.formatting ?? DEFAULT_FORMATTING_GLOBAL;
  const prompt = buildTextgenPrompt(opts);

  // 合成 stop strings
  const macros = buildMacroContext(opts);
  const stops = collectStopStrings({
    context: config.contextTpl,
    instruct: config.instructTpl,
    formatting,
    charName: opts.character.name,
    userName: macros.user ?? "User",
    instructEnabled: formatting.instruct_enabled,
  });

  const mergedSettings = stops.length
    ? {
        ...config.textgenSettings,
        stop: Array.from(
          new Set([
            ...(((config.textgenSettings).stop as string[] | undefined) ?? []),
            ...stops,
          ]),
        ),
      }
    : config.textgenSettings;

  return fetch("/api/text-completions/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiType: config.activeProvider,
      apiServer: config.activeBaseUrl || "",
      model: config.activeModel || undefined,
      prompt,
      settings: mergedSettings,
    }),
    signal,
  });
}

/**
 * 调用 Chat Completion API，返回 stream Response
 */
export async function callChatCompletionAPI(opts: GenerateOptions): Promise<Response> {
  const { config, signal, character } = opts;
  const macros = buildMacroContext(opts);

  // 宏替换 systemPrompt
  let rawSystem = character.systemPrompt || character.description || "";
  if (opts.groupSystemPrefix) {
    rawSystem = `${opts.groupSystemPrefix}\n\n${rawSystem}`;
  }
  const systemPrompt = replaceMacros(rawSystem, macros);

  return fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: opts.history.map((m) => ({
        role: m.role === "user" || m.role === "assistant" || m.role === "system" ? m.role : "user",
        content: m.content,
      })),
      provider: config.activeProvider,
      model: config.activeModel,
      systemPrompt: systemPrompt || undefined,
      customBaseURL: config.activeBaseUrl || undefined,
      worldInfo: opts.worldInfo,
    }),
    signal,
  });
}

/**
 * 统一生成入口: 根据 activeCategory 选择调用 text completion 或 chat completion
 */
export async function generateStream(opts: GenerateOptions): Promise<Response> {
  if (opts.config.activeCategory === "text_completion") {
    return callTextCompletionAPI(opts);
  }
  return callChatCompletionAPI(opts);
}
