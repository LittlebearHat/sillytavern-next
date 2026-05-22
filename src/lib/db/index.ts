import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";

const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), "data", "sillytavern.db");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite);
export { sqlite };

/** 启动时自动运行数据库迁移（幂等，drizzle 会跳过已执行的） */
let migrated = false;
function ensureMigrated() {
  if (migrated) return;
  migrated = true;
  try {
    const migrationsFolder = path.join(process.cwd(), "drizzle");
    if (fs.existsSync(migrationsFolder)) {
      migrate(db, { migrationsFolder });
    }
  } catch (err) {
    console.error("[DB] auto migrate failed:", err);
  }
  // 所有迁移后统一走一次字段幂等补齐，避免 drizzle 迁移文件未跟上新增列时 500
  try {
    // characters
    const charCols = sqlite
      .prepare("PRAGMA table_info(characters)")
      .all() as Array<{ name: string }>;
    const charNames = new Set(charCols.map((c) => c.name));
    if (!charNames.has("character_book")) {
      sqlite.exec("ALTER TABLE characters ADD COLUMN character_book text");
    }
    if (!charNames.has("world_info_book_id")) {
      sqlite.exec("ALTER TABLE characters ADD COLUMN world_info_book_id text");
    }

    // presets
    const presetCols = sqlite
      .prepare("PRAGMA table_info(presets)")
      .all() as Array<{ name: string }>;
    const presetNames = new Set(presetCols.map((c) => c.name));
    if (!presetNames.has("api_type")) {
      sqlite.exec("ALTER TABLE presets ADD COLUMN api_type text");
    }
    if (!presetNames.has("is_active")) {
      sqlite.exec("ALTER TABLE presets ADD COLUMN is_active integer DEFAULT 0");
    }

    // messages【对话模块重构】补上 swipe_info / is_system / gen_started / gen_finished / force_avatar / original_avatar / bookmark_link
    const msgCols = sqlite
      .prepare("PRAGMA table_info(messages)")
      .all() as Array<{ name: string }>;
    const msgNames = new Set(msgCols.map((c) => c.name));
    if (!msgNames.has("swipe_info")) {
      sqlite.exec("ALTER TABLE messages ADD COLUMN swipe_info text");
    }
    if (!msgNames.has("is_system")) {
      sqlite.exec("ALTER TABLE messages ADD COLUMN is_system integer DEFAULT 0");
    }
    if (!msgNames.has("force_avatar")) {
      sqlite.exec("ALTER TABLE messages ADD COLUMN force_avatar text");
    }
    if (!msgNames.has("original_avatar")) {
      sqlite.exec("ALTER TABLE messages ADD COLUMN original_avatar text");
    }
    if (!msgNames.has("gen_started")) {
      sqlite.exec("ALTER TABLE messages ADD COLUMN gen_started text");
    }
    if (!msgNames.has("gen_finished")) {
      sqlite.exec("ALTER TABLE messages ADD COLUMN gen_finished text");
    }
    if (!msgNames.has("bookmark_link")) {
      sqlite.exec("ALTER TABLE messages ADD COLUMN bookmark_link text");
    }

    // personas 表幂等创建
    sqlite.exec(`CREATE TABLE IF NOT EXISTS personas (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL REFERENCES users(id),
      name text NOT NULL,
      description text DEFAULT '',
      avatar text,
      is_active integer DEFAULT 0,
      is_default integer DEFAULT 0,
      description_position integer DEFAULT 0,
      depth integer DEFAULT 2,
      depth_role integer DEFAULT 0,
      lorebook_id text,
      connections text,
      created_at integer
    )`);
    // personas 表补列
    const personaCols = sqlite.prepare("PRAGMA table_info(personas)").all() as Array<{ name: string }>;
    const personaColNames = new Set(personaCols.map((c) => c.name));
    if (!personaColNames.has("is_default")) sqlite.exec("ALTER TABLE personas ADD COLUMN is_default integer DEFAULT 0");
    if (!personaColNames.has("description_position")) sqlite.exec("ALTER TABLE personas ADD COLUMN description_position integer DEFAULT 0");
    if (!personaColNames.has("depth")) sqlite.exec("ALTER TABLE personas ADD COLUMN depth integer DEFAULT 2");
    if (!personaColNames.has("depth_role")) sqlite.exec("ALTER TABLE personas ADD COLUMN depth_role integer DEFAULT 0");
    if (!personaColNames.has("lorebook_id")) sqlite.exec("ALTER TABLE personas ADD COLUMN lorebook_id text");
    if (!personaColNames.has("connections")) sqlite.exec("ALTER TABLE personas ADD COLUMN connections text");

    // groups 表补列（统一架构：join 模板 / auto mode / 隐藏 sprite / 最后聊天时间）
    const groupCols = sqlite.prepare("PRAGMA table_info(groups)").all() as Array<{ name: string }>;
    const groupColNames = new Set(groupCols.map((c) => c.name));
    if (!groupColNames.has("generation_mode_join_prefix")) {
      sqlite.exec("ALTER TABLE groups ADD COLUMN generation_mode_join_prefix text");
    }
    if (!groupColNames.has("generation_mode_join_suffix")) {
      sqlite.exec("ALTER TABLE groups ADD COLUMN generation_mode_join_suffix text");
    }
    if (!groupColNames.has("auto_mode_delay")) {
      sqlite.exec("ALTER TABLE groups ADD COLUMN auto_mode_delay integer DEFAULT 5");
    }
    if (!groupColNames.has("hide_muted_sprites")) {
      sqlite.exec("ALTER TABLE groups ADD COLUMN hide_muted_sprites integer DEFAULT 0");
    }
    if (!groupColNames.has("date_last_chat")) {
      sqlite.exec("ALTER TABLE groups ADD COLUMN date_last_chat integer");
    }
    if (!groupColNames.has("chat_metadata")) {
      sqlite.exec("ALTER TABLE groups ADD COLUMN chat_metadata text");
    }
  } catch (fallbackErr) {
    console.error("[DB] fallback ALTER failed:", fallbackErr);
  }
}
ensureMigrated();
