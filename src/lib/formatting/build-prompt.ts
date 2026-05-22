/**
 * Advanced Formatting prompt 构造工具
 * 对齐 SillyTavern public/scripts/instruct-mode.js + power-user.js 行为
 */
import type {
  ContextTemplate,
  InstructTemplate,
  SyspromptTemplate,
  FormattingGlobal,
} from "@/types/advanced-formatting";

export interface MacroContext {
  user?: string;
  char?: string;
  persona?: string;
  description?: string;
  personality?: string;
  scenario?: string;
  wiBefore?: string;
  wiAfter?: string;
  system?: string;
  exampleSeparator?: string;
  chatStart?: string;
  // 运行时宏（Task 1 增强）
  mesExamples?: string;
  model?: string;
  lastMessage?: string;
  lastUserMessage?: string;
  lastCharMessage?: string;
  input?: string;
  // 聊天变量存储（用于 getvar/setvar）
  chatVariables?: Record<string, string>;
}

const MACRO_KEYS: (keyof MacroContext)[] = [
  "user",
  "char",
  "persona",
  "description",
  "personality",
  "scenario",
  "wiBefore",
  "wiAfter",
  "system",
  "exampleSeparator",
  "chatStart",
  "mesExamples",
  "model",
  "lastMessage",
  "lastUserMessage",
  "lastCharMessage",
  "input",
];

/** 替换 {{key}} 宏（不区分大小写、容忍空白）+ 运行时动态宏 */
export function replaceMacros(text: string, ctx: MacroContext): string {
  if (!text) return text;
  let out = text;

  // 静态宏替换
  for (const key of MACRO_KEYS) {
    const v = ctx[key];
    if (v === undefined || v === null) continue;
    const re = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
    out = out.replace(re, String(v));
  }

  // 时间类宏（每次调用实时计算）
  const now = new Date();
  out = out.replace(/{{\s*time\s*}}/gi, now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
  out = out.replace(/{{\s*date\s*}}/gi, now.toLocaleDateString("zh-CN"));
  out = out.replace(/{{\s*weekday\s*}}/gi, now.toLocaleDateString("zh-CN", { weekday: "long" }));
  out = out.replace(/{{\s*isotime\s*}}/gi, now.toTimeString().slice(0, 8));
  out = out.replace(/{{\s*isodate\s*}}/gi, now.toISOString().slice(0, 10));
  out = out.replace(/{{\s*datetime\s*}}/gi, now.toLocaleString("zh-CN"));

  // {{random}} — 0-100 随机整数
  out = out.replace(/{{\s*random\s*}}/gi, () => String(Math.floor(Math.random() * 101)));

  // {{random::min::max}} — 指定范围随机整数
  out = out.replace(/{{\s*random\s*::\s*(\d+)\s*::\s*(\d+)\s*}}/gi, (_, a, b) => {
    const min = parseInt(a, 10);
    const max = parseInt(b, 10);
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
  });

  // {{roll:NdM}} — 掷骰
  out = out.replace(/{{\s*roll\s*:\s*(\d+)d(\d+)\s*}}/gi, (_, n, m) => {
    const count = parseInt(n, 10);
    const sides = parseInt(m, 10);
    let total = 0;
    for (let i = 0; i < count; i++) total += Math.floor(Math.random() * sides) + 1;
    return String(total);
  });

  // {{getvar::key}} — 读取聊天变量
  if (ctx.chatVariables) {
    out = out.replace(/{{\s*getvar\s*::\s*(\w+)\s*}}/gi, (_, key) => {
      return ctx.chatVariables?.[key] ?? "";
    });
  }

  // {{setvar::key::val}} — 设置聊天变量（在文本中替换为空，副作用写入 ctx）
  if (ctx.chatVariables) {
    out = out.replace(/{{\s*setvar\s*::\s*(\w+)\s*::\s*([^}]*)\s*}}/gi, (_, key, val) => {
      if (ctx.chatVariables) ctx.chatVariables[key] = val.trim();
      return "";
    });
  }

  // {{idle_duration}} — 需要外部计算，这里用静态宏已处理（在 chat-area 侧填入）
  // {{newline}} — 换行符
  out = out.replace(/{{\s*newline\s*}}/gi, "\n");
  out = out.replace(/{{\s*trim\s*}}/gi, "");

  return out;
}

/** 应用全局 trim_spaces / collapse_newlines */
export function applyGlobalFormatting(text: string, fmt: FormattingGlobal): string {
  let out = text;
  if (fmt.collapse_newlines) {
    out = out.replace(/\n{2,}/g, "\n");
  }
  if (fmt.trim_spaces) {
    out = out
      .split("\n")
      .map((line) => line.replace(/[ \t]+$/g, ""))
      .join("\n");
  }
  return out;
}

/** 解析 custom_stopping_strings（JSON 字符串数组） */
export function parseCustomStopStrings(raw: string): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.filter((s) => typeof s === "string" && s.length > 0);
  } catch {
    // ignore
  }
  return [];
}

export interface BuildOptions {
  context: ContextTemplate;
  instruct: InstructTemplate;
  sysprompt: SyspromptTemplate;
  formatting: FormattingGlobal;
  /** 已渲染的 system prompt（来自 character 的 systemPrompt 与 sysprompt template content 二选一/合并） */
  systemPrompt?: string;
  /** chat 历史（user/assistant/system 轮次） */
  history: { role: "user" | "assistant" | "system"; content: string; name?: string }[];
  /** 是否扮演用户（生成用户消息）。默认 false（生成 AI 回复） */
  isImpersonating?: boolean;
  /** 宏上下文 */
  macros: MacroContext;
}

/** 给一行序列加 wrap（前后换行） */
function wrap(seq: string, useWrap: boolean): string {
  if (!seq) return "";
  if (!useWrap) return seq;
  return `${seq.endsWith("\n") ? seq : seq + "\n"}`;
}

/**
 * 渲染单条消息：sequence + name + content + suffix
 */
function renderMessage(
  msg: { role: "user" | "assistant" | "system"; content: string; name?: string },
  i: number,
  total: number,
  instruct: InstructTemplate,
  charName: string,
  userName: string,
  macros: MacroContext,
): string {
  const isUser = msg.role === "user";
  const isAssistant = msg.role === "assistant";
  const isSystem = msg.role === "system";

  // 选取 sequence
  let seq = "";
  let suffix = "";
  if (isUser) {
    seq = (i === 0 && instruct.first_input_sequence) || (i === total - 1 && instruct.last_input_sequence) || instruct.input_sequence;
    suffix = instruct.input_suffix;
  } else if (isAssistant) {
    seq = (i === 0 && instruct.first_output_sequence) || (i === total - 1 && instruct.last_output_sequence) || instruct.output_sequence;
    suffix = instruct.output_suffix;
  } else if (isSystem) {
    if (instruct.system_same_as_user) {
      seq = instruct.input_sequence;
      suffix = instruct.input_suffix;
    } else {
      seq = (i === total - 1 && instruct.last_system_sequence) || instruct.system_sequence;
      suffix = instruct.system_suffix;
    }
  }

  if (instruct.macro) seq = replaceMacros(seq, macros);
  if (instruct.macro) suffix = replaceMacros(suffix, macros);

  // names_behavior
  const includeName =
    instruct.names_behavior === "always" ||
    (instruct.names_behavior === "force" && !!msg.name);
  const speaker = includeName ? `${msg.name ?? (isUser ? userName : isAssistant ? charName : "System")}: ` : "";

  const wrapNl = instruct.wrap;
  const head = wrap(seq, wrapNl);
  const tail = wrap(suffix, wrapNl);

  return `${head}${speaker}${msg.content}${tail}`;
}

/**
 * 构造 Instruct 模式完整 prompt
 */
export function buildInstructPrompt(opts: BuildOptions): string {
  const { context, instruct, sysprompt, formatting, history, macros, isImpersonating } = opts;
  const charName = macros.char ?? "Assistant";
  const userName = macros.user ?? "User";

  const systemContentRaw = (opts.systemPrompt ?? sysprompt.content ?? "").trim();
  // 先对 systemPrompt 本身做宏替换，确保 {{user}}/{{char}}/{{persona}} 等被填入真实值
  const systemContent = replaceMacros(systemContentRaw, macros);

  // story_string with macros
  const storyMacros: MacroContext = {
    ...macros,
    system: systemContent,
    exampleSeparator: context.example_separator,
    chatStart: context.chat_start,
  };
  const story = replaceMacros(context.story_string ?? "", storyMacros);

  // story prefix/suffix
  const storyPrefix = instruct.macro ? replaceMacros(instruct.story_string_prefix, macros) : instruct.story_string_prefix;
  const storySuffix = instruct.macro ? replaceMacros(instruct.story_string_suffix, macros) : instruct.story_string_suffix;

  const parts: string[] = [];
  if (story) parts.push(`${storyPrefix}${story}${storySuffix}`);

  // chat_start
  if (context.chat_start) parts.push(replaceMacros(context.chat_start, macros));

  // user_alignment_message: 若历史不以 user 开头，插入对齐消息
  let effectiveHistory = history.slice();
  if (effectiveHistory.length > 0 && effectiveHistory[0].role !== "user" && instruct.user_alignment_message) {
    effectiveHistory = [{ role: "user", content: replaceMacros(instruct.user_alignment_message, macros) }, ...effectiveHistory];
  }

  // 渲染消息
  const total = effectiveHistory.length;
  for (let i = 0; i < total; i++) {
    parts.push(renderMessage(effectiveHistory[i], i, total, instruct, charName, userName, macros));
  }

  // 末尾 prefix（生成 AI 回复 / 扮演用户）
  let trailing = "";
  if (isImpersonating) {
    trailing = instruct.last_input_sequence || instruct.input_sequence;
  } else {
    trailing = instruct.last_output_sequence || instruct.output_sequence;
  }
  if (instruct.macro) trailing = replaceMacros(trailing, macros);
  const wrapNl = instruct.wrap;
  let tail = wrap(trailing, wrapNl);

  // always_force_name2 / names_behavior：在末尾追加 "char:"
  const includeName =
    instruct.names_behavior === "always" ||
    (instruct.names_behavior === "force" && !isImpersonating);
  if (includeName || context.always_force_name2) {
    tail += `${isImpersonating ? userName : charName}:`;
  }
  parts.push(tail);

  // start_reply_with
  if (formatting.start_reply_with) {
    parts.push(replaceMacros(formatting.start_reply_with, macros));
  }

  let prompt = parts.join("");
  prompt = applyGlobalFormatting(prompt, formatting);
  return prompt;
}

/**
 * 简单拼接（非 instruct 模式）：与原 chat-area 行为一致，但叠加全局 formatting + sysprompt
 */
export function buildSimplePrompt(opts: {
  context: ContextTemplate;
  sysprompt: SyspromptTemplate;
  formatting: FormattingGlobal;
  systemPrompt?: string;
  history: { role: string; content: string }[];
  charName: string;
  userName: string;
  macros: MacroContext;
}): string {
  const { context, sysprompt, formatting, history, charName, userName, macros } = opts;
  const lines: string[] = [];
  const systemContentRaw = (opts.systemPrompt ?? sysprompt.content ?? "").trim();
  const systemContent = replaceMacros(systemContentRaw, macros);

  if (context.story_string) {
    const story = replaceMacros(context.story_string, { ...macros, system: systemContent });
    lines.push(story);
  } else if (systemContent) {
    lines.push(systemContent);
  }
  if (context.chat_start) lines.push(replaceMacros(context.chat_start, macros));

  for (const m of history) {
    const speaker = m.role === "user" ? userName : charName;
    lines.push(`${speaker}: ${m.content}`);
  }

  if (context.always_force_name2) lines.push(`${charName}:`);
  if (formatting.start_reply_with) lines.push(replaceMacros(formatting.start_reply_with, macros));

  let prompt = lines.join("\n");
  prompt = applyGlobalFormatting(prompt, formatting);
  return prompt;
}

/**
 * 收集 stop strings：合并 custom + sequences + names + chat_start/example_separator
 */
export function collectStopStrings(opts: {
  context: ContextTemplate;
  instruct: InstructTemplate;
  formatting: FormattingGlobal;
  charName: string;
  userName: string;
  instructEnabled: boolean;
}): string[] {
  const { context, instruct, formatting, charName, userName, instructEnabled } = opts;
  const stops: string[] = [];

  // 自定义
  stops.push(...parseCustomStopStrings(formatting.custom_stopping_strings));

  // names_as_stop_strings (context)
  if (context.names_as_stop_strings) {
    if (charName) stops.push(`\n${charName}:`);
    if (userName) stops.push(`\n${userName}:`);
  }

  // use_stop_strings (context): 把 chat_start / example_separator 当 stop
  if (context.use_stop_strings) {
    if (context.chat_start) stops.push(context.chat_start);
    if (context.example_separator) stops.push(context.example_separator);
  }

  // instruct sequences_as_stop_strings
  if (instructEnabled && instruct.sequences_as_stop_strings) {
    const seqs = [
      instruct.input_sequence,
      instruct.output_sequence,
      instruct.system_sequence,
      instruct.first_input_sequence,
      instruct.last_input_sequence,
      instruct.first_output_sequence,
      instruct.last_output_sequence,
      instruct.last_system_sequence,
      instruct.stop_sequence,
    ].filter((s) => typeof s === "string" && s.length > 0);
    stops.push(...seqs);
  }

  // 去重
  return Array.from(new Set(stops.filter((s) => s)));
}
