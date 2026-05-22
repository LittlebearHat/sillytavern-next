// ========================
// AI 提供商类型
// ========================
export type AIProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "vertexai"
  | "openrouter"
  | "mistral"
  | "cohere"
  | "groq"
  | "deepseek"
  | "xai"
  | "perplexity"
  | "fireworks"
  | "moonshot"
  | "siliconflow"
  | "minimax"
  | "zai"
  | "azure_openai"
  | "nanogpt"
  | "workers_ai"
  | "electronhub"
  | "chutes"
  | "pollinations"
  | "aimlapi"
  | "cometapi"
  | "ai21"
  | "custom"
  // Text Completion
  | "koboldcpp"
  | "ollama"
  | "llamacpp"
  | "vllm"
  | "aphrodite"
  | "tabby"
  | "ooba"
  | "mancer"
  | "dreamgen"
  | "featherless"
  | "infermaticai"
  | "togetherai"
  | "huggingface"
  | "openrouter_text"
  | "generic"
  // Other
  | "novelai"
  | "ai_horde"
  | "kobold_classic";

// ========================
// 消息角色
// ========================
export type MessageRole = "user" | "assistant" | "system";

// ========================
// 聊天消息 (兼容原 JSONL 格式)
// ========================
export interface ChatMessage {
  id: string;
  name: string;
  isUser: boolean;
  role: MessageRole;
  content: string;
  // Swipe 系统
  swipes?: string[];
  swipeId?: number;
  /** 每个 swipe 的元数据（与原项目 swipe_info 一致） */
  swipeInfo?: SwipeInfo[];
  // 状态与头像
  isSystem?: boolean;
  forceAvatar?: string;
  originalAvatar?: string;
  // 生成时间
  genStarted?: string;
  genFinished?: string;
  // 书签（原项目 bookmark_link）
  bookmarkLink?: string | null;
  // 扩展数据
  extra?: MessageExtra;
  sendDate?: string;
  createdAt: Date;
}

export interface SwipeInfo {
  send_date?: string;
  gen_started?: string;
  gen_finished?: string;
  extra?: MessageExtra;
}

/**
 * 消息扩展字段，对齐原项目 BaseMessageExtra (public/global.d.ts)。
 * 使用 [key: string] 阐明未详列出的运行时字段也会被保留。
 */
export interface MessageExtra {
  // 模型/API
  /** 生成批次 ID（原项目为 number，为兼容老数据保留 string） */
  gen_id?: string | number;
  api?: string;
  model?: string;
  type?: string;
  // Token / 推理
  token_count?: number;
  reasoning?: string;
  reasoning_duration?: number;
  reasoning_signature?: string;
  time_to_first_token?: number;
  // 限制 / 偏置 / 标题
  bias?: string;
  title?: string;
  append_title?: boolean;
  // 媒体 / 附件
  image?: string;
  inline_image?: boolean;
  files?: FileAttachment[];
  media?: MediaAttachment[];
  media_display?: string;
  media_index?: number;
  // 其他运行时状态
  bookmark_link?: string;
  display_text?: string;
  reasoning_display_text?: string;
  tool_invocations?: unknown[];
  isSmallSys?: boolean;
  swipeable?: boolean;
  overswipe_behavior?: string;
  // 允许任意额外字段
  [key: string]: unknown;
}

export interface FileAttachment {
  url?: string;
  name?: string;
  size?: number;
  text?: string;
  mimeType?: string;
  created?: number;
}

export interface MediaAttachment {
  url?: string;
  type?: string;
  title?: string;
  append_title?: boolean;
  thumbnail?: string;
  inline?: boolean;
}

// ========================
// 角色卡 (TavernCard V2 Spec)
// ========================
export interface Character {
  id: string;
  userId: string;
  // V1
  name: string;
  description: string;
  personality: string;
  scenario: string;
  firstMessage: string;
  exampleDialogue: string;
  // V2
  creatorNotes: string;
  systemPrompt: string;
  postHistoryInstructions: string;
  alternateGreetings: string[];
  tags: string[];
  creator: string;
  characterVersion: string;
  // ST Extensions
  talkativeness: number;
  fav: boolean;
  avatar: string | null;
  extensions: Record<string, unknown>;
  // World Info 绑定
  worldInfoBookId?: string | null;
  characterBook?: Record<string, unknown> | null;
  // Metadata
  createDate?: string;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * 角色表单数据（前端新建/编辑页共享）
 * 与 Character 字段对齐，去掉 id / userId / extensions / 元数据等服务端字段
 */
export interface CharacterFormData {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  firstMessage: string;
  exampleDialogue: string;
  creatorNotes: string;
  systemPrompt: string;
  postHistoryInstructions: string;
  alternateGreetings: string[];
  tags: string[];
  creator: string;
  characterVersion: string;
  talkativeness: number;
  fav: boolean;
  avatar: string | null;
  worldInfoBookId?: string | null;
  characterBook?: Record<string, unknown> | null;
}

// ========================
// TavernCard V2 JSON 格式 (PNG 内嵌)
// ========================
export interface TavernCardV2 {
  spec: "chara_card_v2";
  spec_version: "2.0";
  data: {
    name: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
    creator_notes: string;
    system_prompt: string;
    post_history_instructions: string;
    alternate_greetings: string[];
    tags: string[];
    creator: string;
    character_version: string;
    extensions: Record<string, unknown>;
  };
}

// TavernCard V1
export interface TavernCardV1 {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
}

// ========================
// 聊天会话
// ========================
export interface Chat {
  id: string;
  userId?: string;
  characterId?: string | null;
  groupId?: string | null;
  title?: string | null;
  metadata?: ChatMetadata | null;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMetadata {
  note_prompt?: string;
  note_interval?: number;
  note_position?: number;
  chat_scenario?: string;
  /** 聊天级世界书 ID 列表（优先级最高） */
  world_info_book_ids?: string[];
}

// ========================
// 群组
// ========================
export interface Group {
  id: string;
  userId: string;
  name: string;
  members: string[]; // character ids
  disabledMembers: string[];
  avatar?: string | null;
  fav: boolean;
  activationStrategy: number;
  generationMode: number;
  allowSelfResponses: boolean;
  chatMetadata?: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// ========================
// AI 生成设置
// ========================
export interface GenerationSettings {
  provider: AIProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK?: number;
  minP?: number;
  frequencyPenalty: number;
  presencePenalty: number;
  repetitionPenalty?: number;
  stopSequences?: string[];
  stream: boolean;
}

// ========================
// 预设
// ========================
export interface Preset {
  id: string;
  userId: string;
  name: string;
  provider: string;
  settings: GenerationSettings;
  isDefault: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

// ========================
// 世界设定 (World Info / Lorebook)
// 字段对齐 SillyTavern 原项目 newWorldInfoEntryDefinition
// ========================

/** 词条插入位置 */
export const WORLD_INFO_POSITION = {
  before: 0,
  after: 1,
  ANTop: 2,
  ANBottom: 3,
  atDepth: 4,
  EMTop: 5,
  EMBottom: 6,
  outlet: 7,
} as const;
export type WorldInfoPosition = (typeof WORLD_INFO_POSITION)[keyof typeof WORLD_INFO_POSITION];

/** 关键词逻辑 */
export const WORLD_INFO_LOGIC = {
  AND_ANY: 0,
  NOT_ALL: 1,
  NOT_ANY: 2,
  AND_ALL: 3,
} as const;
export type WorldInfoLogic = (typeof WORLD_INFO_LOGIC)[keyof typeof WORLD_INFO_LOGIC];

/** 插入策略 */
export const WORLD_INFO_INSERTION_STRATEGY = {
  evenly: 0,
  character_first: 1,
  global_first: 2,
} as const;
export type WorldInfoInsertionStrategy =
  (typeof WORLD_INFO_INSERTION_STRATEGY)[keyof typeof WORLD_INFO_INSERTION_STRATEGY];

/** 角色 (用于 atDepth 位置) */
export const WORLD_INFO_ROLE = {
  system: 0,
  user: 1,
  assistant: 2,
} as const;
export type WorldInfoRole = (typeof WORLD_INFO_ROLE)[keyof typeof WORLD_INFO_ROLE];

export const WORLD_INFO_DEFAULT_DEPTH = 4;
export const WORLD_INFO_DEFAULT_WEIGHT = 100;
export const WORLD_INFO_MAX_SCAN_DEPTH = 1000;

/** 词条 (与原项目字段一致，可直接序列化为 lorebook 格式) */
export interface WorldInfoEntry {
  uid: number;
  key: string[];
  keysecondary: string[];
  comment: string;
  content: string;
  constant: boolean;
  vectorized: boolean;
  selective: boolean;
  selectiveLogic: WorldInfoLogic;
  addMemo: boolean;
  order: number;
  position: WorldInfoPosition;
  disable: boolean;
  ignoreBudget: boolean;
  excludeRecursion: boolean;
  preventRecursion: boolean;
  matchPersonaDescription: boolean;
  matchCharacterDescription: boolean;
  matchCharacterPersonality: boolean;
  matchCharacterDepthPrompt: boolean;
  matchScenario: boolean;
  matchCreatorNotes: boolean;
  delayUntilRecursion: number | boolean;
  probability: number;
  useProbability: boolean;
  depth: number;
  outletName: string;
  group: string;
  groupOverride: boolean;
  groupWeight: number;
  scanDepth: number | null;
  caseSensitive: boolean | null;
  matchWholeWords: boolean | null;
  useGroupScoring: boolean | null;
  automationId: string;
  role: WorldInfoRole | null;
  sticky: number | null;
  cooldown: number | null;
  delay: number | null;
  characterFilterNames?: string[];
  characterFilterTags?: string[];
  characterFilterExclude?: boolean;
  triggers?: string[];
  displayIndex?: number;
  /** 兼容扩展字段 */
  extensions?: Record<string, unknown>;
}

/** Lorebook (世界书) */
export interface WorldInfo {
  id: string;
  userId: string;
  name: string;
  entries: Record<string, WorldInfoEntry>;
  createdAt: string | null;
  updatedAt: string | null;
}

/** 全局世界书设置 */
export interface WorldInfoSettings {
  world_info_depth: number;
  world_info_min_activations: number;
  world_info_min_activations_depth_max: number;
  world_info_budget: number;
  world_info_budget_cap: number;
  world_info_max_recursion_steps: number;
  world_info_include_names: boolean;
  world_info_recursive: boolean;
  world_info_overflow_alert: boolean;
  world_info_case_sensitive: boolean;
  world_info_match_whole_words: boolean;
  world_info_use_group_scoring: boolean;
  world_info_character_strategy: WorldInfoInsertionStrategy;
  /** 全局选中的 lorebook id 列表 */
  globalSelect: string[];
}

export const DEFAULT_WORLD_INFO_SETTINGS: WorldInfoSettings = {
  world_info_depth: 2,
  world_info_min_activations: 0,
  world_info_min_activations_depth_max: 0,
  world_info_budget: 25,
  world_info_budget_cap: 0,
  world_info_max_recursion_steps: 0,
  world_info_include_names: true,
  world_info_recursive: false,
  world_info_overflow_alert: false,
  world_info_case_sensitive: false,
  world_info_match_whole_words: false,
  world_info_use_group_scoring: false,
  world_info_character_strategy: WORLD_INFO_INSERTION_STRATEGY.character_first,
  globalSelect: [],
};

/** 创建一个新词条的工厂函数 */
export function createDefaultWorldInfoEntry(uid: number): WorldInfoEntry {
  return {
    uid,
    key: [],
    keysecondary: [],
    comment: "",
    content: "",
    constant: false,
    vectorized: false,
    selective: true,
    selectiveLogic: WORLD_INFO_LOGIC.AND_ANY,
    addMemo: false,
    order: 100,
    position: WORLD_INFO_POSITION.before,
    disable: false,
    ignoreBudget: false,
    excludeRecursion: false,
    preventRecursion: false,
    matchPersonaDescription: false,
    matchCharacterDescription: false,
    matchCharacterPersonality: false,
    matchCharacterDepthPrompt: false,
    matchScenario: false,
    matchCreatorNotes: false,
    delayUntilRecursion: 0,
    probability: 100,
    useProbability: true,
    depth: WORLD_INFO_DEFAULT_DEPTH,
    outletName: "",
    group: "",
    groupOverride: false,
    groupWeight: WORLD_INFO_DEFAULT_WEIGHT,
    scanDepth: null,
    caseSensitive: null,
    matchWholeWords: null,
    useGroupScoring: null,
    automationId: "",
    role: WORLD_INFO_ROLE.system,
    sticky: null,
    cooldown: null,
    delay: null,
  };
}

// ========================
// 用户设置
// ========================
export interface UserSettings {
  theme: "dark" | "light" | "system";
  language: string;
  generation: GenerationSettings;
  // UI 偏好
  fontSize?: number;
  avatarStyle?: "round" | "rectangular" | "square";
  animationsEnabled?: boolean;
  // 上下文配置
  maxContext?: number;
  maxResponse?: number;
}

// ========================
// API 响应
// ========================
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  details?: unknown;
}
