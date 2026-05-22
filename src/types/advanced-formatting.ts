/**
 * Advanced Formatting 类型与 Zod schema
 * 完整对齐原项目 public/index.html 4077-4656 与 default/content/presets/{instruct,context,sysprompt,reasoning}/*.json
 *
 * 字段命名保持 snake_case，确保模板 JSON 与 SillyTavern 原项目互通
 */
import { z } from "zod";

// ====== Tokenizer 枚举 ======
export const TOKENIZER_OPTIONS = [
  { value: 99, label: "最佳匹配（推荐）", enLabel: "Best match (recommended)" },
  { value: 0, label: "无 / 估算", enLabel: "None / Estimated" },
  { value: 1, label: "GPT-2", enLabel: "GPT-2" },
  { value: 3, label: "Llama 1/2", enLabel: "Llama 1/2" },
  { value: 12, label: "Llama 3", enLabel: "Llama 3" },
  { value: 13, label: "Gemma / Gemini", enLabel: "Gemma / Gemini" },
  { value: 14, label: "Jamba", enLabel: "Jamba" },
  { value: 15, label: "Qwen2", enLabel: "Qwen2" },
  { value: 16, label: "Command-R", enLabel: "Command-R" },
  { value: 19, label: "Command-A", enLabel: "Command-A" },
  { value: 4, label: "NerdStash (NovelAI Clio)", enLabel: "NerdStash (NovelAI Clio)" },
  { value: 5, label: "NerdStash v2 (NovelAI Kayra)", enLabel: "NerdStash v2 (NovelAI Kayra)" },
  { value: 7, label: "Mistral V1", enLabel: "Mistral V1" },
  { value: 17, label: "Mistral Nemo", enLabel: "Mistral Nemo" },
  { value: 8, label: "Yi", enLabel: "Yi" },
  { value: 11, label: "Claude 1/2", enLabel: "Claude 1/2" },
  { value: 18, label: "DeepSeek V3", enLabel: "DeepSeek V3" },
  { value: 6, label: "API (WebUI / KoboldCpp)", enLabel: "API (WebUI / koboldcpp)" },
] as const;

export type TokenizerValue = (typeof TOKENIZER_OPTIONS)[number]["value"];

// ====== Context Template ======
export const contextTemplateSchema = z
  .object({
    name: z.string().default("Default"),
    story_string: z.string().default(""),
    example_separator: z.string().default("***"),
    chat_start: z.string().default("***"),
    use_stop_strings: z.boolean().default(false),
    names_as_stop_strings: z.boolean().default(true),
    story_string_position: z.number().int().min(0).max(1).default(0),
    story_string_depth: z.number().int().min(0).default(1),
    story_string_role: z.number().int().min(0).max(2).default(0),
    always_force_name2: z.boolean().default(true),
    trim_sentences: z.boolean().default(false),
    single_line: z.boolean().default(false),
    activation_regex: z.string().default(""),
  })
  .passthrough();
export type ContextTemplate = z.infer<typeof contextTemplateSchema>;
export const DEFAULT_CONTEXT: ContextTemplate = contextTemplateSchema.parse({});

// ====== Instruct Template ======
export const InstructNamesBehavior = ["none", "force", "always"] as const;
export const instructTemplateSchema = z
  .object({
    name: z.string().default("Default"),
    // 控制
    enabled: z.boolean().default(false),
    bind_to_context: z.boolean().default(false),
    activation_regex: z.string().default(""),
    wrap: z.boolean().default(false),
    macro: z.boolean().default(true),
    sequences_as_stop_strings: z.boolean().default(true),
    skip_examples: z.boolean().default(false),
    names_behavior: z.enum(InstructNamesBehavior).default("force"),
    // Story String 序列
    story_string_prefix: z.string().default(""),
    story_string_suffix: z.string().default(""),
    // 用户消息
    input_sequence: z.string().default(""),
    input_suffix: z.string().default(""),
    // 助手消息
    output_sequence: z.string().default(""),
    output_suffix: z.string().default(""),
    // 系统消息
    system_sequence: z.string().default(""),
    system_suffix: z.string().default(""),
    system_same_as_user: z.boolean().default(false),
    // Misc 序列
    first_output_sequence: z.string().default(""),
    last_output_sequence: z.string().default(""),
    first_input_sequence: z.string().default(""),
    last_input_sequence: z.string().default(""),
    last_system_sequence: z.string().default(""),
    stop_sequence: z.string().default(""),
    user_alignment_message: z.string().default(""),
  })
  .passthrough();
export type InstructTemplate = z.infer<typeof instructTemplateSchema>;
export const DEFAULT_INSTRUCT: InstructTemplate = instructTemplateSchema.parse({});

// ====== Sysprompt Template ======
export const syspromptTemplateSchema = z
  .object({
    name: z.string().default("Blank"),
    content: z.string().default(""),
    post_history: z.string().default(""),
  })
  .passthrough();
export type SyspromptTemplate = z.infer<typeof syspromptTemplateSchema>;
export const DEFAULT_SYSPROMPT: SyspromptTemplate = syspromptTemplateSchema.parse({});

// ====== Reasoning Template ======
export const reasoningTemplateSchema = z
  .object({
    name: z.string().default("Blank"),
    prefix: z.string().default(""),
    suffix: z.string().default(""),
    separator: z.string().default(""),
  })
  .passthrough();
export type ReasoningTemplate = z.infer<typeof reasoningTemplateSchema>;
export const DEFAULT_REASONING: ReasoningTemplate = reasoningTemplateSchema.parse({});

// ====== 全局 Formatting 设置（存到 UserConnectionConfig.formatting） ======
export const formattingGlobalSchema = z
  .object({
    // 启用开关
    instruct_enabled: z.boolean().default(false),
    sysprompt_enabled: z.boolean().default(true),
    // 全局格式化
    collapse_newlines: z.boolean().default(false),
    trim_spaces: z.boolean().default(true),
    // Custom Stopping Strings
    custom_stopping_strings: z.string().default("[]"),
    custom_stopping_strings_macro: z.boolean().default(true),
    // Tokenizer
    tokenizer: z.number().default(99),
    token_padding: z.number().default(64),
    // Reasoning
    reasoning_auto_parse: z.boolean().default(true),
    reasoning_auto_expand: z.boolean().default(false),
    reasoning_show_hidden: z.boolean().default(false),
    reasoning_add_to_prompts: z.boolean().default(false),
    reasoning_max_additions: z.number().int().min(0).max(999).default(0),
    // Misc
    bind_model_templates: z.boolean().default(false),
    markdown_escape_strings: z.string().default(""),
    start_reply_with: z.string().default(""),
    show_reply_prefix: z.boolean().default(false),
  })
  .passthrough();
export type FormattingGlobal = z.infer<typeof formattingGlobalSchema>;
export const DEFAULT_FORMATTING_GLOBAL: FormattingGlobal = formattingGlobalSchema.parse({});

// ====== UI 字段元数据 ======
export interface FieldMeta {
  key: string;
  label: string;
  enLabel: string;
  type: "number" | "bool" | "string" | "textarea" | "select";
  min?: number;
  max?: number;
  step?: number;
  hint: string;
  options?: { value: string | number; label: string }[];
}
export interface FieldSection {
  id: string;
  title: string;
  enTitle: string;
  fields: string[];
  hint?: string;
}

// ====== Context 字段元数据 ======
export const CONTEXT_FIELD_META: FieldMeta[] = [
  { key: "story_string", label: "Story String 模板", enLabel: "Story String", type: "textarea", hint: "支持 {{system}} {{persona}} {{description}} {{personality}} {{scenario}} {{wiBefore}} {{wiAfter}} 等宏变量。" },
  { key: "story_string_position", label: "插入位置", enLabel: "Position", type: "select", options: [{ value: 0, label: "顶部（默认）" }, { value: 1, label: "聊天内 @ 深度" }], hint: "0=context 顶部；1=按 depth 注入聊天历史指定位置。" },
  { key: "story_string_depth", label: "插入深度", enLabel: "Depth", type: "number", min: 0, max: 99, step: 1, hint: "story_string_position=1 时，从消息列表末尾向前数第 N 条插入。" },
  { key: "story_string_role", label: "插入角色", enLabel: "Role", type: "select", options: [{ value: 0, label: "System" }, { value: 1, label: "User" }, { value: 2, label: "Assistant" }], hint: "@Depth 注入时使用的角色身份。" },
  { key: "example_separator", label: "示例对话分隔符", enLabel: "Example Separator", type: "textarea", hint: "示例对话之间插入的分隔字符串。" },
  { key: "chat_start", label: "聊天起始标记", enLabel: "Chat Start", type: "textarea", hint: "新对话开始时插入的字符串（位于上下文与历史消息之间）。" },
  { key: "activation_regex", label: "激活正则", enLabel: "Activation Regex", type: "string", hint: "连接模型时若模型名匹配此正则，则自动激活该上下文模板。例：/llama-?3/i" },
  { key: "always_force_name2", label: "始终添加角色名", enLabel: "Always add character's name to prompt", type: "bool", hint: "在 prompt 末尾强制追加角色名（如 \"{{char}}:\"）以引导模型。" },
  { key: "trim_sentences", label: "修剪不完整句子", enLabel: "Trim Incomplete Sentences", type: "bool", hint: "回复结尾的不完整句子（无标点）会被截掉。" },
  { key: "single_line", label: "每次只生成一行", enLabel: "Generate only one line per request", type: "bool", hint: "回复在第一个换行处截断，更适合单轮对话。" },
  { key: "use_stop_strings", label: "使用分隔符作为 Stop", enLabel: "Separators as Stop Strings", type: "bool", hint: "把 Chat Start 与 Example Separator 加入 stop 列表。" },
  { key: "names_as_stop_strings", label: "使用名字作为 Stop", enLabel: "Names as Stop Strings", type: "bool", hint: "把角色名与用户名加入 stop 列表，避免模型替对方说话。" },
];

export const CONTEXT_FIELD_SECTIONS: FieldSection[] = [
  { id: "story", title: "Story 模板", enTitle: "Story Template", fields: ["story_string", "story_string_position", "story_string_depth", "story_string_role"] },
  { id: "separator", title: "分隔符", enTitle: "Separators", fields: ["example_separator", "chat_start"] },
  { id: "match", title: "自动匹配", enTitle: "Auto-match", fields: ["activation_regex"] },
  { id: "format", title: "上下文格式化", enTitle: "Context Formatting", fields: ["always_force_name2", "trim_sentences", "single_line", "use_stop_strings", "names_as_stop_strings"] },
];

// ====== Instruct 字段元数据 ======
export const INSTRUCT_FIELD_META: FieldMeta[] = [
  { key: "activation_regex", label: "激活正则", enLabel: "Activation Regex", type: "string", hint: "模型名匹配此正则时自动激活该 Instruct 模板。例：/llama-?3/i" },
  { key: "wrap", label: "序列前后换行包裹", enLabel: "Wrap Sequences with Newline", type: "bool", hint: "在每个序列前后自动添加换行。" },
  { key: "macro", label: "序列内宏替换", enLabel: "Replace Macro in Sequences", type: "bool", hint: "对序列中的 {{user}}/{{char}} 等宏进行替换。" },
  { key: "sequences_as_stop_strings", label: "序列作为 Stop", enLabel: "Sequences as Stop Strings", type: "bool", hint: "把所有非空 sequence 加入 stop 列表。" },
  { key: "skip_examples", label: "跳过示例对话格式化", enLabel: "Skip Example Dialogues Formatting", type: "bool", hint: "示例对话不应用 instruct sequences 包装。" },
  { key: "names_behavior", label: "名字注入策略", enLabel: "Include Names", type: "select", options: [{ value: "none", label: "从不 (Never)" }, { value: "force", label: "群聊与历史人格" }, { value: "always", label: "始终" }], hint: "决定何时在 sequence 后追加 \"{{name}}:\"。" },
  // Story String
  { key: "story_string_prefix", label: "Story String 前缀", enLabel: "Story String Prefix", type: "textarea", hint: "插入到 Story String 之前。" },
  { key: "story_string_suffix", label: "Story String 后缀", enLabel: "Story String Suffix", type: "textarea", hint: "插入到 Story String 之后。" },
  // User
  { key: "input_sequence", label: "用户消息前缀", enLabel: "User Message Prefix", type: "textarea", hint: "用户消息开头插入；扮演用户时也作为最后一行。" },
  { key: "input_suffix", label: "用户消息后缀", enLabel: "User Message Suffix", type: "textarea", hint: "用户消息结尾插入。" },
  // Assistant
  { key: "output_sequence", label: "助手消息前缀", enLabel: "Assistant Message Prefix", type: "textarea", hint: "助手消息开头插入；生成 AI 回复时也作为最后一行。" },
  { key: "output_suffix", label: "助手消息后缀", enLabel: "Assistant Message Suffix", type: "textarea", hint: "助手消息结尾插入。" },
  // System
  { key: "system_sequence", label: "系统消息前缀", enLabel: "System Message Prefix", type: "textarea", hint: "系统消息（由斜杠命令或扩展添加）开头插入。" },
  { key: "system_suffix", label: "系统消息后缀", enLabel: "System Message Suffix", type: "textarea", hint: "系统消息结尾插入。" },
  { key: "system_same_as_user", label: "系统等同用户", enLabel: "System same as User", type: "bool", hint: "勾选后系统序列直接使用用户序列（避免单独配置）。" },
  // Misc
  { key: "first_output_sequence", label: "首条助手前缀", enLabel: "First Assistant Prefix", type: "textarea", hint: "插入到第一条助手消息之前。" },
  { key: "last_output_sequence", label: "末条助手前缀", enLabel: "Last Assistant Prefix", type: "textarea", hint: "插入到最后一条助手消息之前；也作为生成 AI 回复时最后一行（中性/系统角色除外）。" },
  { key: "first_input_sequence", label: "首条用户前缀", enLabel: "First User Prefix", type: "textarea", hint: "插入到第一条用户消息之前。" },
  { key: "last_input_sequence", label: "末条用户前缀", enLabel: "Last User Prefix", type: "textarea", hint: "插入到最后一条用户消息之前；也作为扮演用户生成时的最后一行。" },
  { key: "last_system_sequence", label: "系统指令前缀", enLabel: "System Instruction Prefix", type: "textarea", hint: "system/neutral 生成时作为最后一行插入。" },
  { key: "stop_sequence", label: "停止序列", enLabel: "Stop Sequence", type: "textarea", hint: "若模型生成出此序列，从该处开始的输出都会被截断（包含此序列本身）。" },
  { key: "user_alignment_message", label: "用户对齐占位消息", enLabel: "User Filler Message", type: "textarea", hint: "若聊天历史不以用户消息开头，则在最前插入此消息保证 user/assistant 交替。" },
];

export const INSTRUCT_FIELD_SECTIONS: FieldSection[] = [
  { id: "control", title: "控制选项", enTitle: "Control", fields: ["activation_regex", "wrap", "macro", "sequences_as_stop_strings", "skip_examples", "names_behavior"] },
  { id: "story", title: "Story 序列", enTitle: "Story String Sequences", fields: ["story_string_prefix", "story_string_suffix"] },
  { id: "user", title: "用户消息序列", enTitle: "User Message Sequences", fields: ["input_sequence", "input_suffix"] },
  { id: "assistant", title: "助手消息序列", enTitle: "Assistant Message Sequences", fields: ["output_sequence", "output_suffix"] },
  { id: "system", title: "系统消息序列", enTitle: "System Message Sequences", fields: ["system_sequence", "system_suffix", "system_same_as_user"] },
  { id: "misc", title: "其他序列", enTitle: "Misc. Sequences", fields: ["first_output_sequence", "last_output_sequence", "first_input_sequence", "last_input_sequence", "last_system_sequence", "stop_sequence", "user_alignment_message"] },
];

// ====== Sysprompt 字段元数据 ======
export const SYSPROMPT_FIELD_META: FieldMeta[] = [
  { key: "content", label: "提示词正文", enLabel: "Prompt Content", type: "textarea", hint: "主体系统提示词，支持 {{user}}/{{char}}/{{persona}} 等宏。" },
  { key: "post_history", label: "历史后指令", enLabel: "Post-History Instructions", type: "textarea", hint: "插入到聊天历史之后的最终指令（影响越靠后越强）。" },
];

// ====== Reasoning 字段元数据 ======
export const REASONING_FIELD_META: FieldMeta[] = [
  { key: "prefix", label: "推理前缀", enLabel: "Prefix", type: "textarea", hint: "插入到推理内容之前（如 <think>）。" },
  { key: "suffix", label: "推理后缀", enLabel: "Suffix", type: "textarea", hint: "插入到推理内容之后（如 </think>）。" },
  { key: "separator", label: "推理分隔符", enLabel: "Separator", type: "textarea", hint: "插入到推理与正文之间。" },
];

// ====== 全局 Formatting 字段元数据 ======
export const FORMATTING_GLOBAL_FIELD_META: FieldMeta[] = [
  { key: "collapse_newlines", label: "合并连续换行", enLabel: "Collapse Consecutive Newlines", type: "bool", hint: "把多个连续换行压缩为一个。" },
  { key: "trim_spaces", label: "修剪空格", enLabel: "Trim spaces", type: "bool", hint: "解码后裁剪多余空白（不推荐关闭）。" },
  { key: "custom_stopping_strings", label: "自定义 Stop Strings", enLabel: "Custom Stopping Strings", type: "textarea", hint: "JSON 数组字符串。例：[\"\\n\\n\", \"###\"]" },
  { key: "custom_stopping_strings_macro", label: "Stop 内宏替换", enLabel: "Replace Macro in Stop Strings", type: "bool", hint: "对 stop strings 中的 {{user}}/{{char}} 等宏进行替换。" },
  { key: "tokenizer", label: "Tokenizer", enLabel: "Tokenizer", type: "select", options: [...TOKENIZER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))], hint: "决定 token 计数与上下文截断使用的分词器。" },
  { key: "token_padding", label: "Token Padding", enLabel: "Token Padding", type: "number", min: -2048, max: 2048, step: 1, hint: "上下文长度补偿：负值预留缓冲，正值放宽。" },
  { key: "reasoning_auto_parse", label: "自动解析推理块", enLabel: "Reasoning Auto-Parse", type: "bool", hint: "用 reasoning prefix/suffix 自动从正文中提取推理块。" },
  { key: "reasoning_auto_expand", label: "自动展开推理块", enLabel: "Reasoning Auto-Expand", type: "bool", hint: "默认展开消息中的推理块。" },
  { key: "reasoning_show_hidden", label: "显示隐藏推理时间", enLabel: "Reasoning Show Hidden", type: "bool", hint: "对隐藏推理的模型（如 o1）显示推理耗时。" },
  { key: "reasoning_add_to_prompts", label: "推理块加入 prompt", enLabel: "Reasoning Add to Prompts", type: "bool", hint: "把已有推理块加入后续生成的 prompt。" },
  { key: "reasoning_max_additions", label: "推理最多加入条数", enLabel: "Reasoning Max Additions", type: "number", min: 0, max: 999, step: 1, hint: "每次生成最多向 prompt 加入多少个历史推理块（从最后一条往前数）。" },
  { key: "bind_model_templates", label: "模型绑定模板", enLabel: "Bind Model to Templates", type: "bool", hint: "切换模型时根据名称或 chat template 自动激活对应 Instruct/Context。" },
  { key: "markdown_escape_strings", label: "非 Markdown 字符串", enLabel: "Non-markdown strings", type: "string", hint: "逗号分隔，无空格。这些字符串在渲染时不会被解析为 Markdown。" },
  { key: "start_reply_with", label: "回复起始", enLabel: "Start Reply With", type: "textarea", hint: "在生成请求末尾追加此前缀，引导模型按特定语气开头。" },
  { key: "show_reply_prefix", label: "聊天显示回复前缀", enLabel: "Show reply prefix in chat", type: "bool", hint: "勾选后 Start Reply With 也会显示在聊天界面中。" },
];

export const FORMATTING_GLOBAL_FIELD_SECTIONS: FieldSection[] = [
  { id: "format", title: "全局格式化", enTitle: "Global Formatting", fields: ["collapse_newlines", "trim_spaces"] },
  { id: "stop", title: "Stop Strings", enTitle: "Custom Stopping Strings", fields: ["custom_stopping_strings", "custom_stopping_strings_macro"] },
  { id: "tokenizer", title: "Tokenizer", enTitle: "Tokenizer", fields: ["tokenizer", "token_padding"] },
  { id: "reasoning", title: "推理选项", enTitle: "Reasoning", fields: ["reasoning_auto_parse", "reasoning_auto_expand", "reasoning_show_hidden", "reasoning_add_to_prompts", "reasoning_max_additions"] },
  { id: "misc", title: "其他", enTitle: "Miscellaneous", fields: ["bind_model_templates", "markdown_escape_strings", "start_reply_with", "show_reply_prefix"] },
];

// ====== apiType 常量 ======
export const FORMATTING_API_TYPES = {
  CONTEXT: "context",
  INSTRUCT: "instruct",
  SYSPROMPT: "sysprompt",
  REASONING: "reasoning",
} as const;
export type FormattingApiType = (typeof FORMATTING_API_TYPES)[keyof typeof FORMATTING_API_TYPES];
