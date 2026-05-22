import { db } from "@/lib/db";
import { chats, messages } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "node:crypto";
import type { Chat, ChatMessage, ChatMetadata, MessageExtra, SwipeInfo } from "@/types";

// ========================
// 序列化工具
// ========================

function serializeChat(row: typeof chats.$inferSelect, msgs: ChatMessage[] = []): Chat {
  return {
    id: row.id,
    userId: row.userId,
    characterId: row.characterId,
    groupId: row.groupId,
    title: row.title,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    messages: msgs,
    createdAt: row.createdAt ?? new Date(),
    updatedAt: row.updatedAt ?? new Date(),
  };
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function serializeMessage(row: typeof messages.$inferSelect): ChatMessage {
  return {
    id: row.id,
    name: row.name,
    isUser: row.isUser,
    role: row.role as ChatMessage["role"],
    content: row.content,
    swipes: row.swipes ? safeJsonParse<string[]>(row.swipes, []) : undefined,
    swipeId: row.swipeId ?? undefined,
    swipeInfo: row.swipeInfo ? safeJsonParse<SwipeInfo[]>(row.swipeInfo, []) : undefined,
    isSystem: row.isSystem ?? undefined,
    forceAvatar: row.forceAvatar ?? undefined,
    originalAvatar: row.originalAvatar ?? undefined,
    genStarted: row.genStarted ?? undefined,
    genFinished: row.genFinished ?? undefined,
    bookmarkLink: row.bookmarkLink ?? null,
    extra: row.extra ? safeJsonParse<MessageExtra>(row.extra, {}) : undefined,
    sendDate: row.sendDate ?? undefined,
    createdAt: row.createdAt ?? new Date(),
  };
}

// ========================
// 聊天服务
// ========================

export const chatService = {
  /** 获取用户所有聊天 (不含消息) */
  async getAll(userId: string, options?: { characterId?: string; groupId?: string }): Promise<Chat[]> {
    let query = db.select().from(chats).where(eq(chats.userId, userId));

    if (options?.characterId) {
      query = db.select().from(chats).where(
        and(eq(chats.userId, userId), eq(chats.characterId, options.characterId))
      );
    } else if (options?.groupId) {
      query = db.select().from(chats).where(
        and(eq(chats.userId, userId), eq(chats.groupId, options.groupId))
      );
    }

    const rows = query.orderBy(desc(chats.updatedAt)).all();
    return rows.map((r) => serializeChat(r));
  },

  /** 获取单个聊天 (含所有消息) */
  async getById(id: string, userId: string): Promise<Chat | null> {
    const row = db.select().from(chats)
      .where(and(eq(chats.id, id), eq(chats.userId, userId)))
      .get();
    if (!row) return null;

    const msgs = db.select().from(messages)
      .where(eq(messages.chatId, id))
      .orderBy(messages.createdAt)
      .all();

    return serializeChat(row, msgs.map(serializeMessage));
  },

  /** 创建新聊天 */
  async create(userId: string, input: {
    characterId?: string;
    groupId?: string;
    title?: string;
    metadata?: ChatMetadata;
  }): Promise<Chat> {
    const id = crypto.randomUUID();
    const now = new Date();

    db.insert(chats).values({
      id,
      userId,
      characterId: input.characterId ?? null,
      groupId: input.groupId ?? null,
      title: input.title ?? "New Chat",
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      createdAt: now,
      updatedAt: now,
    }).run();

    return (await this.getById(id, userId))!;
  },

  /** 更新聊天元数据 */
  async update(id: string, userId: string, input: {
    title?: string;
    metadata?: ChatMetadata;
  }): Promise<Chat | null> {
    const existing = db.select().from(chats)
      .where(and(eq(chats.id, id), eq(chats.userId, userId)))
      .get();
    if (!existing) return null;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.title !== undefined) updateData.title = input.title;
    if (input.metadata !== undefined) updateData.metadata = JSON.stringify(input.metadata);

    db.update(chats).set(updateData)
      .where(and(eq(chats.id, id), eq(chats.userId, userId)))
      .run();

    return this.getById(id, userId);
  },

  /** 删除聊天 (消息通过 cascade 自动删除) */
  async delete(id: string, userId: string): Promise<boolean> {
    const result = db.delete(chats)
      .where(and(eq(chats.id, id), eq(chats.userId, userId)))
      .run();
    return result.changes > 0;
  },

  /** 添加消息 */
  async addMessage(chatId: string, userId: string, input: {
    name: string;
    isUser: boolean;
    content: string;
    role: "user" | "assistant" | "system";
    extra?: MessageExtra;
    isSystem?: boolean;
    forceAvatar?: string;
    originalAvatar?: string;
    genStarted?: string;
    genFinished?: string;
  }): Promise<ChatMessage | null> {
    // 验证聊天属于该用户
    const chat = db.select().from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
      .get();
    if (!chat) return null;

    const id = crypto.randomUUID();
    const now = new Date();
    const sendDate = now.toISOString();
    const initialSwipeInfo: SwipeInfo[] = [{
      send_date: sendDate,
      gen_started: input.genStarted,
      gen_finished: input.genFinished,
      extra: input.extra,
    }];

    db.insert(messages).values({
      id,
      chatId,
      name: input.name,
      isUser: input.isUser,
      content: input.content,
      role: input.role,
      swipes: JSON.stringify([input.content]),
      swipeId: 0,
      swipeInfo: JSON.stringify(initialSwipeInfo),
      isSystem: input.isSystem ?? false,
      forceAvatar: input.forceAvatar ?? null,
      originalAvatar: input.originalAvatar ?? null,
      genStarted: input.genStarted ?? null,
      genFinished: input.genFinished ?? null,
      extra: input.extra ? JSON.stringify(input.extra) : null,
      sendDate,
      createdAt: now,
    }).run();

    // 更新聊天 updatedAt
    db.update(chats).set({ updatedAt: now })
      .where(eq(chats.id, chatId))
      .run();

    const msg = db.select().from(messages).where(eq(messages.id, id)).get();
    return msg ? serializeMessage(msg) : null;
  },

  /** 更新消息 (编辑/swipe/隐藏/书签等) */
  async updateMessage(messageId: string, chatId: string, userId: string, input: {
    content?: string;
    swipes?: string[];
    swipeId?: number;
    swipeInfo?: SwipeInfo[];
    extra?: MessageExtra;
    isSystem?: boolean;
    forceAvatar?: string | null;
    originalAvatar?: string | null;
    genStarted?: string | null;
    genFinished?: string | null;
    bookmarkLink?: string | null;
    createdAt?: Date;
  }): Promise<ChatMessage | null> {
    // 验证聊天属于该用户
    const chat = db.select().from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
      .get();
    if (!chat) return null;

    const updateData: Record<string, unknown> = {};
    if (input.content !== undefined) updateData.content = input.content;
    if (input.swipes !== undefined) updateData.swipes = JSON.stringify(input.swipes);
    if (input.swipeId !== undefined) updateData.swipeId = input.swipeId;
    if (input.swipeInfo !== undefined) updateData.swipeInfo = JSON.stringify(input.swipeInfo);
    if (input.extra !== undefined) updateData.extra = JSON.stringify(input.extra);
    if (input.isSystem !== undefined) updateData.isSystem = input.isSystem;
    if (input.forceAvatar !== undefined) updateData.forceAvatar = input.forceAvatar;
    if (input.originalAvatar !== undefined) updateData.originalAvatar = input.originalAvatar;
    if (input.genStarted !== undefined) updateData.genStarted = input.genStarted;
    if (input.genFinished !== undefined) updateData.genFinished = input.genFinished;
    if (input.bookmarkLink !== undefined) updateData.bookmarkLink = input.bookmarkLink;
    if (input.createdAt !== undefined) updateData.createdAt = input.createdAt;

    db.update(messages).set(updateData)
      .where(and(eq(messages.id, messageId), eq(messages.chatId, chatId)))
      .run();

    // 更新聊天 updatedAt
    db.update(chats).set({ updatedAt: new Date() })
      .where(eq(chats.id, chatId))
      .run();

    const msg = db.select().from(messages).where(eq(messages.id, messageId)).get();
    return msg ? serializeMessage(msg) : null;
  },

  /** 删除消息 */
  async deleteMessage(messageId: string, chatId: string, userId: string): Promise<boolean> {
    // 验证聊天属于该用户
    const chat = db.select().from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
      .get();
    if (!chat) return false;

    const result = db.delete(messages)
      .where(and(eq(messages.id, messageId), eq(messages.chatId, chatId)))
      .run();
    return result.changes > 0;
  },

  /** 分支: 从某条消息开始创建新聊天 */
  async branch(chatId: string, messageId: string, userId: string): Promise<Chat | null> {
    const chat = await this.getById(chatId, userId);
    if (!chat) return null;

    // 找到分支点
    const msgIndex = chat.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return null;

    // 创建新聊天
    const newChat = await this.create(userId, {
      characterId: chat.characterId ?? undefined,
      groupId: chat.groupId ?? undefined,
      title: `${chat.title ?? "Chat"} (Branch)`,
      metadata: chat.metadata ?? undefined,
    });

    // 复制分支点之前的所有消息 (含分支点)
    const messagesToCopy = chat.messages.slice(0, msgIndex + 1);
    for (const msg of messagesToCopy) {
      await this.addMessage(newChat.id, userId, {
        name: msg.name,
        isUser: msg.isUser,
        content: msg.content,
        role: msg.role,
        extra: msg.extra,
        originalAvatar: msg.originalAvatar,
        forceAvatar: msg.forceAvatar,
      });
    }

    return this.getById(newChat.id, userId);
  },
};
