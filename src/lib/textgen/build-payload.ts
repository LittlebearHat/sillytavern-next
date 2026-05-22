/**
 * 把 TextGenSettings + prompt 组装成对应后端期望的请求体
 * 参考原项目 public/scripts/textgen-settings.js createTextGenGenerationData
 */
import { TEXTGEN_TYPES, type TextGenType, type TextGenSettings } from "@/types/textgen";

export interface BuildPayloadInput {
  apiType: TextGenType;
  prompt: string;
  maxTokens: number;
  settings: Partial<TextGenSettings>;
  model?: string;
  stop?: string[];
}

/** 解析 banned_tokens：每行一个，token id（数字）走数组，字符串走 banned_strings */
function parseBannedTokens(raw: string): { banned_tokens: number[]; banned_strings: string[] } {
  const banned_tokens: number[] = [];
  const banned_strings: string[] = [];
  if (!raw) return { banned_tokens, banned_strings };
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const n = Number(t);
    if (!Number.isNaN(n) && Number.isInteger(n)) banned_tokens.push(n);
    else banned_strings.push(t);
  }
  return { banned_tokens, banned_strings };
}

/** 选 sampler 排序（不同 api_type 用不同字段名） */
function pickSamplerOrder(apiType: TextGenType, s: Partial<TextGenSettings>) {
  switch (apiType) {
    case TEXTGEN_TYPES.LLAMACPP:
      return { samplers: s.samplers };
    case TEXTGEN_TYPES.APHRODITE:
      return { samplers_priorities: s.samplers_priorities };
    case TEXTGEN_TYPES.KOBOLDCPP:
      return { sampler_order: s.sampler_order };
    case TEXTGEN_TYPES.OOBA:
      return { sampler_priority: s.sampler_priority };
    default:
      return {};
  }
}

/** json_schema 兼容空对象处理 */
function pickJsonSchema(s: Partial<TextGenSettings>): unknown {
  const js = s.json_schema;
  if (js === undefined || js === null) return undefined;
  if (typeof js !== "object") return undefined;
  const keys = Object.keys(js as object);
  if (keys.length === 0 && !s.json_schema_allow_empty) return undefined;
  return js;
}

export function buildTextCompletionPayload(input: BuildPayloadInput): Record<string, unknown> {
  const { apiType, prompt, maxTokens, settings: s, model, stop } = input;

  const { banned_tokens, banned_strings } = s.send_banned_tokens
    ? parseBannedTokens(s.banned_tokens ?? "")
    : { banned_tokens: [], banned_strings: [] };

  const jsonSchema = pickJsonSchema(s);

  const base: Record<string, unknown> = {
    api_type: apiType,
    prompt,
    model: model ?? s.custom_model ?? s.generic_model,
    max_new_tokens: maxTokens,
    max_tokens: maxTokens,

    // 1. 基础采样
    temperature: s.temp,
    temperature_last: s.temperature_last,
    top_p: s.top_p,
    top_k: s.top_k,
    top_a: s.top_a,
    min_p: s.min_p,
    typical_p: s.typical_p,
    typical: s.typical_p,
    tfs: s.tfs,
    tfs_z: s.tfs,

    // 2. 重复惩罚
    repetition_penalty: s.rep_pen,
    repetition_penalty_range: s.rep_pen_range,
    rep_pen: s.rep_pen,
    rep_pen_range: s.rep_pen_range,
    rep_pen_decay: s.rep_pen_decay,
    rep_pen_slope: s.rep_pen_slope,
    no_repeat_ngram_size: s.no_repeat_ngram_size,
    encoder_repetition_penalty: s.encoder_rep_pen,
    frequency_penalty: s.freq_pen,
    presence_penalty: s.presence_pen,

    // 3. 动态温度
    dynamic_temperature: s.dynatemp,
    dynatemp_low: s.min_temp,
    dynatemp_high: s.max_temp,
    dynatemp_exponent: s.dynatemp_exponent,

    // 4. Smoothing
    smoothing_factor: s.smoothing_factor,
    smoothing_curve: s.smoothing_curve,

    // 5. DRY
    dry_multiplier: s.dry_multiplier,
    dry_base: s.dry_base,
    dry_allowed_length: s.dry_allowed_length,
    dry_penalty_last_n: s.dry_penalty_last_n,
    dry_sequence_breakers: (() => {
      try {
        return s.dry_sequence_breakers ? JSON.parse(s.dry_sequence_breakers) : undefined;
      } catch {
        return undefined;
      }
    })(),

    // 6. Mirostat
    mirostat_mode: s.mirostat_mode,
    mirostat_tau: s.mirostat_tau,
    mirostat_eta: s.mirostat_eta,

    // 7. CFG
    guidance_scale: s.guidance_scale,
    negative_prompt: s.negative_prompt,

    // 8. XTC + N-Sigma + Adaptive
    xtc_threshold: s.xtc_threshold,
    xtc_probability: s.xtc_probability,
    nsigma: s.nsigma,
    min_keep: s.min_keep,
    adaptive_target: s.adaptive_target,
    adaptive_decay: s.adaptive_decay,

    // 9. Beam Search
    penalty_alpha: s.penalty_alpha,
    num_beams: s.num_beams,
    length_penalty: s.length_penalty,
    min_length: s.min_length,
    early_stopping: s.early_stopping,

    // 10. Cutoff
    epsilon_cutoff: s.epsilon_cutoff,
    eta_cutoff: s.eta_cutoff,

    // 11. Grammar / JSON Schema
    grammar_string: s.grammar_string,
    grammar: s.grammar_string,
    json_schema: jsonSchema,

    // 12. Banned
    banned_tokens,
    banned_strings,
    ban_eos_token: s.ban_eos_token,
    ignore_eos_token: s.ignore_eos_token,
    skip_special_tokens: s.skip_special_tokens,

    // 13. 控制
    do_sample: s.do_sample,
    seed: s.seed,
    skew: s.skew,
    add_bos_token: s.add_bos_token,
    spaces_between_special_tokens: s.spaces_between_special_tokens,
    include_reasoning: s.include_reasoning,
    speculative_ngram: s.speculative_ngram,
    stream: s.streaming,
    streaming: s.streaming,
    max_tokens_second: s.max_tokens_second,

    // 停止串
    stop: stop ?? [],
    stopping_strings: stop ?? [],

    // Logit bias（OOBA / vLLM 形式：{ tokenIdOrText: bias }）
    logit_bias: (() => {
      const arr = s.logit_bias ?? [];
      if (!arr.length) return undefined;
      const obj: Record<string, number> = {};
      for (const e of arr) if (e.text) obj[e.text] = e.value;
      return obj;
    })(),

    ...pickSamplerOrder(apiType, s),
  };

  // 删除 undefined 键，保持请求体干净
  for (const k of Object.keys(base)) if (base[k] === undefined) delete base[k];
  return base;
}

/** 拼接后端 URL（参考 src/endpoints/backends/text-completions.js） */
export function pickEndpointUrl(apiType: TextGenType, baseUrl: string): string {
  const base = baseUrl.replace(/\/v1\/?$/, "").replace(/\/$/, "");
  switch (apiType) {
    case TEXTGEN_TYPES.LLAMACPP:
      return `${base}/completion`;
    case TEXTGEN_TYPES.OLLAMA:
      return `${base}/api/generate`;
    case TEXTGEN_TYPES.OPENROUTER:
      return `${base}/v1/chat/completions`;
    case TEXTGEN_TYPES.MANCER:
      return `${base}/oai/v1/completions`;
    case TEXTGEN_TYPES.DREAMGEN:
      return `${base}/api/openai/v1/completions`;
    case TEXTGEN_TYPES.OOBA:
    case TEXTGEN_TYPES.VLLM:
    case TEXTGEN_TYPES.APHRODITE:
    case TEXTGEN_TYPES.TABBY:
    case TEXTGEN_TYPES.KOBOLDCPP:
    case TEXTGEN_TYPES.TOGETHERAI:
    case TEXTGEN_TYPES.INFERMATICAI:
    case TEXTGEN_TYPES.HUGGINGFACE:
    case TEXTGEN_TYPES.FEATHERLESS:
    case TEXTGEN_TYPES.GENERIC:
    default:
      return `${base}/v1/completions`;
  }
}
