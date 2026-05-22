/**
 * Text Completion Preset 类型与 Zod schema
 * 完整对齐原项目 public/scripts/textgen-settings.js 的 setting_names（74 字段）
 * 字段名保持 snake_case，确保 preset JSON 与原项目互通
 */
import { z } from "zod";

/** 文本补全 API 类型枚举（对应原项目 textgen_types） */
export const TEXTGEN_TYPES = {
  OOBA: "ooba",
  MANCER: "mancer",
  VLLM: "vllm",
  APHRODITE: "aphrodite",
  TABBY: "tabby",
  KOBOLDCPP: "koboldcpp",
  TOGETHERAI: "togetherai",
  LLAMACPP: "llamacpp",
  OLLAMA: "ollama",
  INFERMATICAI: "infermaticai",
  DREAMGEN: "dreamgen",
  OPENROUTER: "openrouter",
  FEATHERLESS: "featherless",
  HUGGINGFACE: "huggingface",
  GENERIC: "generic",
} as const;

export type TextGenType = (typeof TEXTGEN_TYPES)[keyof typeof TEXTGEN_TYPES];

export const TEXTGEN_TYPE_LABELS: Record<TextGenType, string> = {
  ooba: "Text Generation WebUI (oobabooga)",
  mancer: "Mancer",
  vllm: "vLLM",
  aphrodite: "Aphrodite",
  tabby: "TabbyAPI",
  koboldcpp: "KoboldCpp",
  togetherai: "Together AI",
  llamacpp: "llama.cpp",
  ollama: "Ollama",
  infermaticai: "Infermatic",
  dreamgen: "DreamGen",
  openrouter: "OpenRouter",
  featherless: "Featherless",
  huggingface: "HuggingFace",
  generic: "Generic OpenAI",
};

// ====== Sampler Priority 默认顺序 ======
export const OOBA_DEFAULT_ORDER = [
  "repetition_penalty",
  "presence_penalty",
  "frequency_penalty",
  "dry",
  "temperature",
  "dynamic_temperature",
  "quadratic_sampling",
  "top_n_sigma",
  "top_k",
  "top_p",
  "typical_p",
  "epsilon_cutoff",
  "eta_cutoff",
  "tfs",
  "top_a",
  "min_p",
  "adaptive_p",
  "mirostat",
  "xtc",
  "encoder_repetition_penalty",
  "no_repeat_ngram",
] as const;

export const LLAMACPP_DEFAULT_ORDER = [
  "penalties",
  "dry",
  "top_n_sigma",
  "top_k",
  "typ_p",
  "top_p",
  "min_p",
  "xtc",
  "temperature",
  "adaptive_p",
] as const;

export const APHRODITE_DEFAULT_ORDER = [
  "dry",
  "penalties",
  "no_repeat_ngram",
  "temperature",
  "top_nsigma",
  "top_p_top_k",
  "top_a",
  "min_p",
  "tfs",
  "eta_cutoff",
  "epsilon_cutoff",
  "typical_p",
  "quadratic",
  "xtc",
] as const;

/** KoboldCpp 数字索引顺序（对应 6=temp, 0=top_k, 1=top_a, 2=top_p, 3=tfs, 4=typical, 5=rep_pen） */
export const KOBOLDCPP_ORDER = [6, 0, 1, 3, 4, 2, 5] as const;

// ====== Logit Bias 单项 ======
export const logitBiasEntrySchema = z.object({
  id: z.string().optional(),
  text: z.string().default(""),
  value: z.number().default(0),
});
export type LogitBiasEntry = z.infer<typeof logitBiasEntrySchema>;

// ====== TextGen 完整 Schema（74 字段全量） ======
/**
 * 注意：使用 .passthrough() 保留未识别字段，确保官方 JSON 任意字段都能保存且回传
 */
export const textGenSettingsSchema = z
  .object({
    // 1. 基础采样
    temp: z.number().default(0.7),
    temperature_last: z.boolean().default(true),
    top_p: z.number().default(0.5),
    top_k: z.number().default(40),
    top_a: z.number().default(0),
    min_p: z.number().default(0),
    typical_p: z.number().default(1),
    tfs: z.number().default(1),

    // 2. 重复惩罚
    rep_pen: z.number().default(1.2),
    rep_pen_range: z.number().default(0),
    rep_pen_decay: z.number().default(0),
    rep_pen_slope: z.number().default(1),
    no_repeat_ngram_size: z.number().default(0),
    encoder_rep_pen: z.number().default(1),
    freq_pen: z.number().default(0),
    presence_pen: z.number().default(0),

    // 3. 动态温度
    dynatemp: z.boolean().default(false),
    min_temp: z.number().default(0),
    max_temp: z.number().default(2),
    dynatemp_exponent: z.number().default(1),

    // 4. Smoothing
    smoothing_factor: z.number().default(0),
    smoothing_curve: z.number().default(1),

    // 5. DRY
    dry_allowed_length: z.number().default(2),
    dry_multiplier: z.number().default(0),
    dry_base: z.number().default(1.75),
    dry_sequence_breakers: z.string().default('["\\n", ":", "\\"", "*"]'),
    dry_penalty_last_n: z.number().default(0),

    // 6. Mirostat
    mirostat_mode: z.number().default(0),
    mirostat_tau: z.number().default(5),
    mirostat_eta: z.number().default(0.1),

    // 7. CFG
    guidance_scale: z.number().default(1),
    negative_prompt: z.string().default(""),

    // 8. XTC + n-sigma + Adaptive
    xtc_threshold: z.number().default(0.1),
    xtc_probability: z.number().default(0),
    nsigma: z.number().default(0),
    min_keep: z.number().default(0),
    adaptive_target: z.number().default(-0.01),
    adaptive_decay: z.number().default(0.9),

    // 9. Beam Search
    penalty_alpha: z.number().default(0),
    num_beams: z.number().default(1),
    length_penalty: z.number().default(1),
    min_length: z.number().default(0),
    early_stopping: z.boolean().default(false),

    // 10. Epsilon/Eta cutoff
    epsilon_cutoff: z.number().default(0),
    eta_cutoff: z.number().default(0),

    // 11. JSON Schema + Grammar
    grammar_string: z.string().default(""),
    json_schema: z.unknown().nullable().default(null),
    json_schema_allow_empty: z.boolean().default(false),

    // 12. Banned Tokens
    banned_tokens: z.string().default(""),
    global_banned_tokens: z.string().default(""),
    send_banned_tokens: z.boolean().default(true),
    ban_eos_token: z.boolean().default(false),
    ignore_eos_token: z.boolean().default(false),
    skip_special_tokens: z.boolean().default(true),

    // 13. 控制
    do_sample: z.boolean().default(true),
    seed: z.number().default(-1),
    skew: z.number().default(0),
    add_bos_token: z.boolean().default(true),
    spaces_between_special_tokens: z.boolean().default(true),
    include_reasoning: z.boolean().default(true),
    speculative_ngram: z.boolean().default(false),
    streaming: z.boolean().default(false),
    max_tokens_second: z.number().default(0),

    // Sampler Orders
    sampler_priority: z.array(z.string()).default([...OOBA_DEFAULT_ORDER]),
    samplers: z.array(z.string()).default([...LLAMACPP_DEFAULT_ORDER]),
    samplers_priorities: z.array(z.string()).default([...APHRODITE_DEFAULT_ORDER]),
    sampler_order: z.array(z.number()).default([...KOBOLDCPP_ORDER]),

    // Logit Bias
    logit_bias: z.array(logitBiasEntrySchema).default([]),

    // Misc passthrough fields（这些字段在 preset JSON 里也可能出现，但属于运行时字段）
    n: z.number().optional(),
    custom_model: z.string().optional(),
    bypass_status_check: z.boolean().optional(),
    openrouter_allow_fallbacks: z.boolean().optional(),
    generic_model: z.string().optional(),
    rep_pen_size: z.number().optional(),

    // 运行时从 power_user / chat 同步进来的字段（原项目 master export 会携带）
    // genamt = amount_gen（回复 token 上限）；max_length = max_context（上下文长度）
    genamt: z.number().default(350),
    max_length: z.number().default(8192),

    // 扩展字段（任意 JSON）
    extensions: z.record(z.string(), z.unknown()).default({}),
  })
  .passthrough();

export type TextGenSettings = z.infer<typeof textGenSettingsSchema>;

/** 默认值常量（与原项目 textgenerationwebui_settings 字面量保持一致） */
export const DEFAULT_TEXTGEN_SETTINGS: TextGenSettings = textGenSettingsSchema.parse({});

// ====== UI 字段元数据（用于元编程驱动表单） ======
export interface FieldMeta {
  /** 字段名（snake_case，与原项目一致） */
  key: keyof TextGenSettings | string;
  /** 中文标签 */
  label: string;
  /** 英文原名 */
  enLabel: string;
  /** 数值控件参数 */
  min?: number;
  max?: number;
  step?: number;
  /** 鼠标悬停说明（中文） */
  hint: string;
  /** 控件类型 */
  type: "number" | "bool" | "string" | "textarea" | "select" | "json";
  /** select 选项 */
  options?: { value: string | number; label: string }[];
  /** 哪些 api_type 不支持本字段（黑名单） */
  unsupportedIn?: TextGenType[];
}

/** 字段不支持时灰显使用 */
export function isFieldSupported(apiType: TextGenType, key: string): boolean {
  const meta = TEXTGEN_FIELD_META.find((f) => f.key === key);
  if (!meta?.unsupportedIn) return true;
  return !meta.unsupportedIn.includes(apiType);
}

/**
 * 字段元数据（不含 sampler_priority/logit_bias 等复杂字段，那些用专门组件）
 * 用于元编程驱动 13 分区表单
 */
export const TEXTGEN_FIELD_META: FieldMeta[] = [
  // 1. 基础采样
  { key: "temp", label: "温度", enLabel: "Temperature", type: "number", min: 0, max: 5, step: 0.01, hint: "推荐 0.7-1.0。值越大输出越随机有创意，越小越稳定保守。0=贪心解码（每次最优）。" },
  { key: "temperature_last", label: "温度后置", enLabel: "Temperature Last", type: "bool", hint: "勾选后温度采样在所有其他采样器之后才执行（更推荐）。" },
  { key: "top_p", label: "Top P", enLabel: "Top P", type: "number", min: 0, max: 1, step: 0.01, hint: "核采样：只从累积概率超过此值的 token 中选择。1=禁用，常用 0.9-0.95。" },
  { key: "top_k", label: "Top K", enLabel: "Top K", type: "number", min: 0, max: 200, step: 1, hint: "只从概率最高的 K 个 token 中选择。0=禁用，常用 40-100。" },
  { key: "top_a", label: "Top A", enLabel: "Top A", type: "number", min: 0, max: 1, step: 0.01, hint: "Top A 采样阈值。0=禁用，越大越严格。" },
  { key: "min_p", label: "Min P", enLabel: "Min P", type: "number", min: 0, max: 1, step: 0.01, hint: "动态最小概率截断。常用 0.05-0.1，可替代 top_p/top_k。" },
  { key: "typical_p", label: "典型 P", enLabel: "Typical P", type: "number", min: 0, max: 1, step: 0.01, hint: "局部典型采样。1=禁用，越小越保守。" },
  { key: "tfs", label: "尾部自由采样", enLabel: "Tail Free Sampling", type: "number", min: 0, max: 1, step: 0.01, hint: "TFS：根据二阶导切尾。1=禁用，常用 0.95。" },

  // 2. 重复惩罚
  { key: "rep_pen", label: "重复惩罚", enLabel: "Repetition Penalty", type: "number", min: 1, max: 3, step: 0.01, hint: "对历史 token 重复出现的惩罚。1=不惩罚，常用 1.05-1.3。过高会破坏流畅度。" },
  { key: "rep_pen_range", label: "惩罚范围", enLabel: "Repetition Penalty Range", type: "number", min: 0, max: 4096, step: 16, hint: "重复惩罚生效的最近 N 个 token。0=全部历史。" },
  { key: "rep_pen_decay", label: "惩罚衰减", enLabel: "Repetition Penalty Decay", type: "number", min: 0, max: 4096, step: 16, hint: "惩罚随距离衰减的范围。0=不衰减。" },
  { key: "rep_pen_slope", label: "惩罚斜率", enLabel: "Repetition Penalty Slope", type: "number", min: 0, max: 10, step: 0.1, hint: "重复惩罚的斜率（曲线形状）。" },
  { key: "no_repeat_ngram_size", label: "禁止重复 N-gram", enLabel: "No Repeat N-gram Size", type: "number", min: 0, max: 20, step: 1, hint: "完全禁止 N 个连续 token 的重复。0=禁用。" },
  { key: "encoder_rep_pen", label: "编码器重复惩罚", enLabel: "Encoder Repetition Penalty", type: "number", min: 0.8, max: 1.5, step: 0.01, hint: "编码器重复惩罚（部分模型才支持）。" },
  { key: "freq_pen", label: "频率惩罚", enLabel: "Frequency Penalty", type: "number", min: -2, max: 2, step: 0.01, hint: "出现频率越高，惩罚越大。0=禁用，正值减少重复，负值鼓励重复。" },
  { key: "presence_pen", label: "存在惩罚", enLabel: "Presence Penalty", type: "number", min: -2, max: 2, step: 0.01, hint: "只要出现过就惩罚（不区分次数）。0=禁用。" },

  // 3. 动态温度
  { key: "dynatemp", label: "启用动态温度", enLabel: "Dynamic Temperature", type: "bool", hint: "根据熵动态调整温度。开启后下面三项才生效。" },
  { key: "min_temp", label: "最低温度", enLabel: "Min Temperature", type: "number", min: 0, max: 5, step: 0.01, hint: "动态温度的下限。" },
  { key: "max_temp", label: "最高温度", enLabel: "Max Temperature", type: "number", min: 0, max: 5, step: 0.01, hint: "动态温度的上限。" },
  { key: "dynatemp_exponent", label: "动态温度指数", enLabel: "Dynamic Temperature Exponent", type: "number", min: 0, max: 5, step: 0.01, hint: "动态温度的曲线指数。1=线性。" },

  // 4. Smoothing
  { key: "smoothing_factor", label: "平滑因子", enLabel: "Smoothing Factor", type: "number", min: 0, max: 10, step: 0.01, hint: "二次曲线采样平滑因子。0=禁用，常用 0.2-0.3。" },
  { key: "smoothing_curve", label: "平滑曲线", enLabel: "Smoothing Curve", type: "number", min: 1, max: 10, step: 0.1, hint: "平滑曲线的指数。1=禁用。" },

  // 5. DRY
  { key: "dry_multiplier", label: "DRY 倍率", enLabel: "DRY Multiplier", type: "number", min: 0, max: 5, step: 0.01, hint: "DRY 重复惩罚强度。0=禁用，推荐 0.8。" },
  { key: "dry_base", label: "DRY 底数", enLabel: "DRY Base", type: "number", min: 1, max: 4, step: 0.01, hint: "DRY 指数底数，控制惩罚增长速度。推荐 1.75。" },
  { key: "dry_allowed_length", label: "DRY 允许长度", enLabel: "DRY Allowed Length", type: "number", min: 0, max: 20, step: 1, hint: "允许的最长重复序列。超过此长度才触发惩罚，推荐 2。" },
  { key: "dry_penalty_last_n", label: "DRY 检查范围", enLabel: "DRY Penalty Last N", type: "number", min: 0, max: 8192, step: 64, hint: "DRY 检查最近 N 个 token。0=全部。" },
  { key: "dry_sequence_breakers", label: "DRY 序列分隔符", enLabel: "DRY Sequence Breakers", type: "textarea", hint: "重置 DRY 计数的字符，JSON 数组格式。例：[\"\\n\", \":\", \"\\\"\", \"*\"]" },

  // 6. Mirostat
  { key: "mirostat_mode", label: "Mirostat 模式", enLabel: "Mirostat Mode", type: "select", options: [{ value: 0, label: "禁用 (Disabled)" }, { value: 1, label: "Mirostat 1" }, { value: 2, label: "Mirostat 2" }], hint: "Mirostat 是种维持目标困惑度的采样。0=禁用。" },
  { key: "mirostat_tau", label: "Mirostat τ", enLabel: "Mirostat Tau", type: "number", min: 0, max: 20, step: 0.1, hint: "Mirostat 目标熵。常用 5。" },
  { key: "mirostat_eta", label: "Mirostat η", enLabel: "Mirostat Eta", type: "number", min: 0, max: 1, step: 0.01, hint: "Mirostat 学习率。常用 0.1。" },

  // 7. CFG
  { key: "guidance_scale", label: "CFG 引导强度", enLabel: "Guidance Scale", type: "number", min: 0, max: 5, step: 0.05, hint: "Classifier-Free Guidance：对负面提示词的反向引导强度。1=禁用。" },
  { key: "negative_prompt", label: "负面提示词", enLabel: "Negative Prompt", type: "textarea", hint: "CFG 反向引导的提示词（你不希望出现的内容）。" },

  // 8. XTC + n-sigma + Adaptive
  { key: "xtc_threshold", label: "XTC 阈值", enLabel: "XTC Threshold", type: "number", min: 0, max: 0.5, step: 0.01, hint: "Exclude Top Choices：高于此概率的 top token 才有概率被排除。" },
  { key: "xtc_probability", label: "XTC 触发概率", enLabel: "XTC Probability", type: "number", min: 0, max: 1, step: 0.01, hint: "XTC 启用概率。0=禁用，0.5=50% 概率触发。" },
  { key: "nsigma", label: "Top N-Sigma", enLabel: "Top N-Sigma", type: "number", min: 0, max: 10, step: 0.1, hint: "基于 logits 标准差的截断。0=禁用。" },
  { key: "min_keep", label: "最少保留", enLabel: "Min Keep", type: "number", min: 0, max: 100, step: 1, hint: "采样后至少保留 N 个 token，防止候选池过小。" },
  { key: "adaptive_target", label: "Adaptive 目标", enLabel: "Adaptive Target", type: "number", min: -1, max: 0, step: 0.01, hint: "Adaptive 采样的目标值（实验性）。" },
  { key: "adaptive_decay", label: "Adaptive 衰减", enLabel: "Adaptive Decay", type: "number", min: 0, max: 1, step: 0.01, hint: "Adaptive 衰减率（实验性）。" },

  // 9. Beam Search
  { key: "penalty_alpha", label: "对比搜索 α", enLabel: "Penalty Alpha", type: "number", min: 0, max: 5, step: 0.05, hint: "对比搜索的 α。0=禁用束搜索。" },
  { key: "num_beams", label: "束宽度", enLabel: "Num Beams", type: "number", min: 1, max: 20, step: 1, hint: "束搜索宽度。1=贪心，越大越慢。" },
  { key: "length_penalty", label: "长度惩罚", enLabel: "Length Penalty", type: "number", min: -5, max: 5, step: 0.1, hint: "束搜索长度偏好。负值偏好短，正值偏好长。" },
  { key: "min_length", label: "最小长度", enLabel: "Min Length", type: "number", min: 0, max: 4096, step: 16, hint: "强制至少生成 N 个 token。" },
  { key: "early_stopping", label: "提前停止", enLabel: "Early Stopping", type: "bool", hint: "束搜索找到首个完整序列就停止。" },

  // 10. Epsilon/Eta cutoff
  { key: "epsilon_cutoff", label: "Epsilon 截断", enLabel: "Epsilon Cutoff", type: "number", min: 0, max: 9, step: 0.01, hint: "概率小于该值的 token 直接排除。0=禁用。" },
  { key: "eta_cutoff", label: "Eta 截断", enLabel: "Eta Cutoff", type: "number", min: 0, max: 20, step: 0.01, hint: "动态截断阈值。0=禁用。" },

  // 11. Grammar
  { key: "grammar_string", label: "语法约束", enLabel: "Grammar (GBNF)", type: "textarea", hint: "GBNF 语法定义，强制输出符合语法的 token。空=禁用。" },
  { key: "json_schema", label: "JSON Schema", enLabel: "JSON Schema", type: "json", hint: "结构化输出的 JSON Schema。仅部分后端（TabbyAPI / llama.cpp / Aphrodite）支持。" },
  { key: "json_schema_allow_empty", label: "JSON Schema 允许为空", enLabel: "JSON Schema Allow Empty", type: "bool", hint: "未填写 JSON Schema 时仍设为结构化输出。" },

  // 12. Banned Tokens
  { key: "banned_tokens", label: "禁用 Token 列表", enLabel: "Banned Tokens", type: "textarea", hint: "每行一个，列表里的 token id 或字符串永远不会出现。" },
  { key: "global_banned_tokens", label: "全局禁用 Token", enLabel: "Global Banned Tokens", type: "textarea", hint: "跨预设生效的禁用 token 列表，与 Banned Tokens 叠加。" },
  { key: "send_banned_tokens", label: "发送禁用列表", enLabel: "Send Banned Tokens", type: "bool", hint: "勾选后才会把 banned_tokens 发到后端。" },
  { key: "ban_eos_token", label: "禁用 EOS", enLabel: "Ban EOS Token", type: "bool", hint: "禁止生成结束符（让回复尽量长）。" },
  { key: "ignore_eos_token", label: "忽略 EOS", enLabel: "Ignore EOS Token", type: "bool", hint: "遇到 EOS 不停止（更激进的版本）。" },
  { key: "skip_special_tokens", label: "跳过特殊 Token", enLabel: "Skip Special Tokens", type: "bool", hint: "解码时跳过 <|...|> 等特殊 token。" },

  // 13. 控制
  { key: "do_sample", label: "启用采样", enLabel: "Do Sample", type: "bool", hint: "关闭后退化为贪心解码（始终选最高概率 token）。" },
  { key: "seed", label: "随机种子", enLabel: "Seed", type: "number", min: -1, max: 2147483647, step: 1, hint: "-1=每次随机；正整数可复现固定输出。" },
  { key: "skew", label: "偏斜", enLabel: "Skew", type: "number", min: -5, max: 5, step: 0.1, hint: "概率分布偏斜（实验性）。0=禁用。" },
  { key: "add_bos_token", label: "添加 BOS", enLabel: "Add BOS Token", type: "bool", hint: "在 prompt 开头自动加 BOS 起始符。" },
  { key: "spaces_between_special_tokens", label: "特殊 Token 加空格", enLabel: "Spaces Between Special Tokens", type: "bool", hint: "解码时在特殊 token 间插入空格。" },
  { key: "include_reasoning", label: "包含思考过程", enLabel: "Include Reasoning", type: "bool", hint: "保留模型的 reasoning/思考输出（如 R1 等）。" },
  { key: "speculative_ngram", label: "推测解码", enLabel: "Speculative N-gram", type: "bool", hint: "启用 N-gram 推测解码加速。" },
  { key: "streaming", label: "流式输出", enLabel: "Streaming", type: "bool", hint: "实时流式返回 token；关闭则一次性返回完整结果。" },
  { key: "max_tokens_second", label: "速率限制", enLabel: "Max Tokens / Second", type: "number", min: 0, max: 1000, step: 1, hint: "每秒最多多少 token。0=不限制。" },
];

/** 13 分区分组（对应原项目 UI 折叠区块顺序） */
export interface FieldSection {
  id: string;
  title: string;
  enTitle: string;
  fields: string[];
  hint?: string;
}

export const TEXTGEN_FIELD_SECTIONS: FieldSection[] = [
  { id: "basic", title: "基础采样", enTitle: "Basic Sampling", fields: ["temp", "temperature_last", "top_p", "top_k", "top_a", "min_p", "typical_p", "tfs"], hint: "最常用的几项采样器。新手只调温度即可。" },
  { id: "rep", title: "重复惩罚", enTitle: "Repetition Penalty", fields: ["rep_pen", "rep_pen_range", "rep_pen_decay", "rep_pen_slope", "no_repeat_ngram_size", "encoder_rep_pen", "freq_pen", "presence_pen"], hint: "防止模型陷入循环重复。" },
  { id: "dynatemp", title: "动态温度", enTitle: "Dynamic Temperature", fields: ["dynatemp", "min_temp", "max_temp", "dynatemp_exponent"] },
  { id: "smooth", title: "Smoothing", enTitle: "Smoothing", fields: ["smoothing_factor", "smoothing_curve"], hint: "二次曲线平滑（实验性）。" },
  { id: "dry", title: "DRY 采样", enTitle: "DRY", fields: ["dry_multiplier", "dry_base", "dry_allowed_length", "dry_penalty_last_n", "dry_sequence_breakers"], hint: "新一代防重复采样器，效果更好。" },
  { id: "mirostat", title: "Mirostat", enTitle: "Mirostat", fields: ["mirostat_mode", "mirostat_tau", "mirostat_eta"], hint: "维持目标困惑度的自适应采样。" },
  { id: "cfg", title: "CFG（无分类引导）", enTitle: "CFG", fields: ["guidance_scale", "negative_prompt"], hint: "对负面提示词反向引导。" },
  { id: "xtc", title: "XTC / N-Sigma / Adaptive", enTitle: "XTC / N-Sigma / Adaptive", fields: ["xtc_threshold", "xtc_probability", "nsigma", "min_keep", "adaptive_target", "adaptive_decay"] },
  { id: "beam", title: "束搜索", enTitle: "Beam Search", fields: ["penalty_alpha", "num_beams", "length_penalty", "min_length", "early_stopping"] },
  { id: "cutoff", title: "Epsilon / Eta 截断", enTitle: "Epsilon / Eta Cutoff", fields: ["epsilon_cutoff", "eta_cutoff"] },
  { id: "grammar", title: "语法约束", enTitle: "Grammar / JSON Schema", fields: ["grammar_string", "json_schema", "json_schema_allow_empty"], hint: "强制输出符合 GBNF 语法的 token。" },
  { id: "banned", title: "Token 禁用", enTitle: "Token Banning", fields: ["banned_tokens", "global_banned_tokens", "send_banned_tokens", "ban_eos_token", "ignore_eos_token", "skip_special_tokens"] },
  { id: "control", title: "生成控制", enTitle: "Generation Control", fields: ["do_sample", "seed", "skew", "add_bos_token", "spaces_between_special_tokens", "include_reasoning", "speculative_ngram", "streaming", "max_tokens_second"] },
];
