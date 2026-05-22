import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ========================
// 用户表
// ========================
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  handle: text("handle").notNull().unique(),
  password: text("password").notNull(),
  salt: text("salt").notNull(),
  avatar: text("avatar"),
  admin: integer("admin", { mode: "boolean" }).default(false),
  enabled: integer("enabled", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ========================
// 角色卡表 - 完全兼容 TavernCard V2 Spec
// ========================
export const characters = sqliteTable("characters", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  // V1 基础字段
  name: text("name").notNull(),
  description: text("description").default(""),
  personality: text("personality").default(""),
  scenario: text("scenario").default(""),
  firstMessage: text("first_message").default(""),
  exampleDialogue: text("example_dialogue").default(""),
  // V2 扩展字段
  creatorNotes: text("creator_notes").default(""),
  systemPrompt: text("system_prompt").default(""),
  postHistoryInstructions: text("post_history_instructions").default(""),
  alternateGreetings: text("alternate_greetings"), // JSON string[]
  tags: text("tags"), // JSON string[]
  creator: text("creator").default(""),
  characterVersion: text("character_version").default(""),
  // ST 扩展字段
  talkativeness: real("talkativeness").default(0.5),
  fav: integer("fav", { mode: "boolean" }).default(false),
  avatar: text("avatar"),
  // 完整 extensions JSON (depth_prompt, world, regex 等)
  extensions: text("extensions"), // JSON Record<string, unknown>
  // V2 character_book (角色专属世界书快照、原生权威以关联的 lorebook 为准)
  characterBook: text("character_book"), // JSON: V2 character_book
  // 关联的 lorebook id (可选，存在则与全局世界书联动)
  worldInfoBookId: text("world_info_book_id"),
  // 元数据
  createDate: text("create_date"), // ISO string, 兼容原格式
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ========================
// 标签表
// ========================
export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  color: text("color"),
  color2: text("color2"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ========================
// 角色-标签关联表
// ========================
export const characterTags = sqliteTable("character_tags", {
  id: text("id").primaryKey(),
  characterId: text("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
});

// ========================
// Persona 表
// ========================
export const personas = sqliteTable("personas", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description").default(""),
  avatar: text("avatar"),
  isActive: integer("is_active", { mode: "boolean" }).default(false),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  /** 描述注入位置: 0=IN_PROMPT, 1=AFTER_CHAR, 2=TOP_AN, 3=BOTTOM_AN, 4=AT_DEPTH, 9=NONE */
  descriptionPosition: integer("description_position").default(0),
  /** AT_DEPTH 时的深度值 */
  depth: integer("depth").default(2),
  /** AT_DEPTH 时的角色: 0=system, 1=user, 2=assistant */
  depthRole: integer("depth_role").default(0),
  /** 关联的世界书 ID */
  lorebookId: text("lorebook_id"),
  /** 角色绑定 JSON: [{type:'character'|'group', id:string}] */
  connections: text("connections"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ========================
// 群组表
// ========================
export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  members: text("members").notNull().default("[]"), // JSON: character ids
  disabledMembers: text("disabled_members").default("[]"), // JSON: character ids
  avatar: text("avatar"),
  fav: integer("fav", { mode: "boolean" }).default(false),
  activationStrategy: integer("activation_strategy").default(0),
  generationMode: integer("generation_mode").default(0),
  allowSelfResponses: integer("allow_self_responses", { mode: "boolean" }).default(false),
  /** APPEND 模式合并时的 join 模板 */
  generationModeJoinPrefix: text("generation_mode_join_prefix"),
  generationModeJoinSuffix: text("generation_mode_join_suffix"),
  /** 自动模式延迟（秒） */
  autoModeDelay: integer("auto_mode_delay").default(5),
  /** 隐藏静音成员的 sprites */
  hideMutedSprites: integer("hide_muted_sprites", { mode: "boolean" }).default(false),
  /** 最后聊天时间戳（ms） */
  dateLastChat: integer("date_last_chat"),
  chatMetadata: text("chat_metadata"), // JSON
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ========================
// 聊天会话表
// ========================
export const chats = sqliteTable("chats", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  characterId: text("character_id").references(() => characters.id, { onDelete: "set null" }),
  groupId: text("group_id").references(() => groups.id, { onDelete: "set null" }),
  title: text("title"),
  metadata: text("metadata"), // JSON: { note_prompt, note_interval, note_position, chat_scenario }
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ========================
// 聊天消息表 - 兼容原 JSONL 格式
// ========================
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isUser: integer("is_user", { mode: "boolean" }).notNull(),
  content: text("content").notNull(),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  swipes: text("swipes"), // JSON string[]
  swipeId: integer("swipe_id").default(0),
  swipeInfo: text("swipe_info"), // JSON SwipeInfo[]（与 swipes 一一对应）
  // 隐藏状态（原项目 is_system）不参与 prompt 渲染
  isSystem: integer("is_system", { mode: "boolean" }).default(false),
  // 头像（原项目 force_avatar / original_avatar）
  forceAvatar: text("force_avatar"),
  originalAvatar: text("original_avatar"),
  // 生成起止时间，用于计时与推理耗时
  genStarted: text("gen_started"),
  genFinished: text("gen_finished"),
  // 书签链接（原项目 bookmark_link）
  bookmarkLink: text("bookmark_link"),
  extra: text("extra"), // JSON: 完整 MessageExtra
  sendDate: text("send_date"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ========================
// 世界设定表
// ========================
export const worldInfo = sqliteTable("world_info", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  entries: text("entries"), // JSON: Record<string, WIEntry>
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ========================
// 预设表 (AI 生成参数)
// ========================
export const presets = sqliteTable("presets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  apiType: text("api_type"), // 'textgenerationwebui' | 'openai' | 'kobold' | 'novel' | 'instruct' | 'context' | 'sysprompt' | 'reasoning'
  settings: text("settings").notNull(), // JSON: TextGenSettings or other preset shape
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  isActive: integer("is_active", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ========================
// API 密钥表
// ========================
export const secrets = sqliteTable("secrets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  key: text("key").notNull(),
  value: text("value").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ========================
// 用户设置表
// ========================
export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id).unique(),
  data: text("data").notNull(), // JSON
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ========================
// Instruct 模板表
// ========================
export const instructTemplates = sqliteTable("instruct_templates", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  content: text("content").notNull(), // JSON: InstructTemplate
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ========================
// 上下文模板表
// ========================
export const contextTemplates = sqliteTable("context_templates", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  content: text("content").notNull(), // story_string template
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});
