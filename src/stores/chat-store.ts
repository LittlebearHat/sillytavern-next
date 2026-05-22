import { create } from "zustand";
import type { Chat, ChatMessage, Character, MessageExtra, SwipeInfo } from "@/types";

/**
 * 生成优雅的默认 chat title：与 {角色名} · MM-DD HH:mm
 * 让聊天列表有时间脉络可追，后续用户可随时重命名。
 */
function buildDefaultChatTitle(charName: string): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const stamp = `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `与 ${charName} · ${stamp}`;
}

interface ChatState {
  // 当前聊天
  currentChat: Chat | null;
  // 聊天列表 (当前角色)
  chats: Chat[];
  // 当前角色
  currentCharacter: Character | null;
  // 是否正在生成
  isGenerating: boolean;

  // Actions — 本地状态
  setCurrentChat: (chat: Chat | null) => void;
  setChats: (chats: Chat[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string) => void;
  /** 本地重写任意一条消息字段（流式中间状态、swipe 切换均可用） */
  patchMessage: (id: string, patch: Partial<ChatMessage>) => void;
  /** 本地删除一条消息 */
  removeMessageLocal: (id: string) => void;
  setIsGenerating: (value: boolean) => void;
  setCurrentCharacter: (character: Character | null) => void;
  createNewChat: (characterId?: string) => void;

  // 异步 actions (与 DB 联动)
  startNewChat: (character: Character) => Promise<void>;
  loadChat: (chatId: string) => Promise<void>;
  loadChatsForCharacter: (characterId: string) => Promise<void>;
  /** 加载指定群组的最近 chat；不存在则创建一个新 chat（并追加首个启用成员的 firstMessage） */
  loadOrCreateGroupChat: (
    groupId: string,
    opts?: {
      groupName?: string;
      firstMessage?: { name: string; content: string; originalAvatar?: string; forceAvatar?: string };
    },
  ) => Promise<void>;
  /** 加载某群组的所有聊天列表 */
  loadChatsForGroup: (groupId: string) => Promise<void>;
  persistMessage: (
    chatId: string,
    message: Omit<ChatMessage, "id" | "createdAt">,
    /** 传入本地临时 ID，持久化成功后自动把服务端真实 ID 回写本地 store */
    localId?: string,
  ) => Promise<ChatMessage | null>;
  /** 递增式 PATCH 一条消息到 DB，成功后同步本地 */
  updateMessage: (
    chatId: string,
    messageId: string,
    patch: {
      content?: string;
      swipes?: string[];
      swipeId?: number;
      swipeInfo?: SwipeInfo[];
      extra?: MessageExtra;
      isSystem?: boolean;
      genStarted?: string | null;
      genFinished?: string | null;
      bookmarkLink?: string | null;
      originalAvatar?: string;
      forceAvatar?: string;
    },
  ) => Promise<ChatMessage | null>;
  /** 删除一条消息（同步 DB + 本地） */
  deleteMessage: (chatId: string, messageId: string) => Promise<boolean>;
  /** 切换某消息的 active swipe，本地同步 + 并写 DB */
  setActiveSwipe: (chatId: string, messageId: string, swipeId: number) => Promise<void>;
  /** 追加一个新 swipe（用于重生成），返回新 swipeId */
  appendSwipe: (
    chatId: string,
    messageId: string,
    content: string,
    info?: SwipeInfo,
  ) => Promise<number | null>;
  /** 删除某个 swipe（保留消息本身） */
  deleteSwipe: (chatId: string, messageId: string, swipeIndex: number) => Promise<void>;
  /** 隐藏 / 取消隐藏消息 */
  setMessageHidden: (chatId: string, messageId: string, hidden: boolean) => Promise<void>;
  /** 上下移动消息（互换相邻两条的 createdAt。起点为 0 或尾部时不动） */
  moveMessage: (chatId: string, messageId: string, direction: "up" | "down") => Promise<void>;
  /** 为某条 assistant 消息初始化一个空推理块（让 UI 出现 details 可编辑） */
  addEmptyReasoning: (chatId: string, messageId: string) => Promise<void>;
  /** 从某条消息创建分支，返回新 chatId */
  createBranch: (chatId: string, messageId: string) => Promise<string | null>;
  /** 为消息创建书签（= 创建分支 + 记录 bookmarkLink 到原消息） */
  createBookmark: (chatId: string, messageId: string) => Promise<string | null>;
  /** 删除聊天（同步 DB + 本地） */
  deleteChat: (chatId: string) => Promise<void>;
  /** 重命名聊天 title（PATCH /api/chats/[id]） */
  renameChat: (chatId: string, title: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentChat: null,
  chats: [],
  currentCharacter: null,
  isGenerating: false,

  setCurrentChat: (chat) => set({ currentChat: chat }),
  setChats: (chats) => set({ chats }),

  addMessage: (message) =>
    set((state) => ({
      currentChat: state.currentChat
        ? { ...state.currentChat, messages: [...state.currentChat.messages, message] }
        : null,
    })),

  updateLastMessage: (content) =>
    set((state) => {
      if (!state.currentChat) return state;
      const messages = [...state.currentChat.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === "assistant") {
        messages[messages.length - 1] = { ...last, content };
      }
      return { currentChat: { ...state.currentChat, messages } };
    }),

  patchMessage: (id, patch) =>
    set((state) => {
      if (!state.currentChat) return state;
      const messages = state.currentChat.messages.map((m) =>
        m.id === id ? { ...m, ...patch } : m,
      );
      return { currentChat: { ...state.currentChat, messages } };
    }),

  removeMessageLocal: (id) =>
    set((state) => {
      if (!state.currentChat) return state;
      return {
        currentChat: {
          ...state.currentChat,
          messages: state.currentChat.messages.filter((m) => m.id !== id),
        },
      };
    }),

  setIsGenerating: (value) => set({ isGenerating: value }),
  setCurrentCharacter: (character) => set({ currentCharacter: character }),

  createNewChat: (characterId) =>
    set({
      currentChat: {
        id: crypto.randomUUID(),
        characterId,
        title: "New Chat",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }),

  // 创建新聊天并关联角色
  startNewChat: async (character) => {
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          title: buildDefaultChatTitle(character.name),
        }),
      });
      if (!res.ok) throw new Error("Failed to create chat");
      const chat: Chat = await res.json();

      // 如果角色有 firstMessage，添加为第一条消息
      if (character.firstMessage?.trim()) {
        const msgRes = await fetch(`/api/chats/${chat.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: character.name,
            isUser: false,
            content: character.firstMessage,
            role: "assistant",
          }),
        });
        if (msgRes.ok) {
          const msg: ChatMessage = await msgRes.json();
          chat.messages = [msg];
        }
      }

      set({
        currentChat: chat,
        currentCharacter: character,
      });

      // 刷新聊天列表
      get().loadChatsForCharacter(character.id);
    } catch (error) {
      console.error("[chat-store] startNewChat failed:", error);
    }
  },

  // 加载指定聊天
  loadChat: async (chatId) => {
    try {
      const res = await fetch(`/api/chats/${chatId}`);
      if (!res.ok) throw new Error("Failed to load chat");
      const chat: Chat = await res.json();
      set({ currentChat: chat });
    } catch (error) {
      console.error("[chat-store] loadChat failed:", error);
    }
  },

  // 加载角色的所有聊天列表
  loadChatsForCharacter: async (characterId) => {
    try {
      const res = await fetch(`/api/chats?characterId=${characterId}`);
      if (!res.ok) throw new Error("Failed to load chats");
      const chats: Chat[] = await res.json();
      set({ chats });
    } catch (error) {
      console.error("[chat-store] loadChatsForCharacter failed:", error);
    }
  },

  // 持久化消息到 DB，并自动同步服务端 ID 到本地 store
  persistMessage: async (chatId, message, localId?) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: message.name,
          isUser: message.isUser,
          content: message.content,
          role: message.role,
          extra: message.extra,
          isSystem: message.isSystem,
          forceAvatar: message.forceAvatar,
          originalAvatar: message.originalAvatar,
          genStarted: message.genStarted,
          genFinished: message.genFinished,
        }),
      });
      if (!res.ok) return null;
      const persisted: ChatMessage = await res.json();
      // 自动把服务端真实 ID 回写本地 store（解决分支/检查点找不到消息的问题）
      if (localId && persisted.id && localId !== persisted.id) {
        set((state) => ({
          currentChat: state.currentChat ? {
            ...state.currentChat,
            messages: state.currentChat.messages.map((m) =>
              m.id === localId ? { ...m, id: persisted.id } : m
            ),
          } : null,
        }));
      }
      return persisted;
    } catch (error) {
      console.error("[chat-store] persistMessage failed:", error);
      return null;
    }
  },

  // 加载/创建群聊：以 groupId 查最近 chat，没有则新建
  loadOrCreateGroupChat: async (groupId, opts) => {
    try {
      // 1. 拉该群组的所有 chat
      const listRes = await fetch(`/api/chats?groupId=${groupId}`);
      const chats: Chat[] = listRes.ok ? await listRes.json() : [];
      set({ chats });
      // 2. 有则加载最新（updatedAt desc 服务端已排序）
      if (chats.length > 0) {
        await get().loadChat(chats[0].id);
        return;
      }
      // 3. 没有：新建
      const title = opts?.groupName ? `与 ${opts.groupName} 的群聊` : "Group Chat";
      const createRes = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, title }),
      });
      if (!createRes.ok) throw new Error("Failed to create group chat");
      const chat: Chat = await createRes.json();
      // 4. 可选注入第一条 firstMessage
      if (opts?.firstMessage?.content) {
        const fm = opts.firstMessage;
        const msgRes = await fetch(`/api/chats/${chat.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fm.name,
            isUser: false,
            content: fm.content,
            role: "assistant",
            originalAvatar: fm.originalAvatar,
            forceAvatar: fm.forceAvatar,
          }),
        });
        if (msgRes.ok) {
          const msg: ChatMessage = await msgRes.json();
          chat.messages = [msg];
        }
      }
      set({ currentChat: chat });
      // 5. 刷新聊天列表
      await get().loadChatsForGroup(groupId);
    } catch (error) {
      console.error("[chat-store] loadOrCreateGroupChat failed:", error);
    }
  },

  // 加载某群组的所有聊天
  loadChatsForGroup: async (groupId) => {
    try {
      const res = await fetch(`/api/chats?groupId=${groupId}`);
      if (!res.ok) throw new Error("Failed to load group chats");
      const chats: Chat[] = await res.json();
      set({ chats });
    } catch (error) {
      console.error("[chat-store] loadChatsForGroup failed:", error);
    }
  },

  // PATCH 一条消息到 DB，同步本地 currentChat
  updateMessage: async (chatId, messageId, patch) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) return null;
      const updated: ChatMessage = await res.json();
      get().patchMessage(messageId, updated);
      return updated;
    } catch (error) {
      console.error("[chat-store] updateMessage failed:", error);
      return null;
    }
  },

  // 删除一条消息
  deleteMessage: async (chatId, messageId) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/messages/${messageId}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) return false;
      get().removeMessageLocal(messageId);
      return true;
    } catch (error) {
      console.error("[chat-store] deleteMessage failed:", error);
      return false;
    }
  },

  // 切换某消息的 active swipe：同步本地 + 并写 DB
  setActiveSwipe: async (chatId, messageId, swipeId) => {
    const cur = get().currentChat?.messages.find((m) => m.id === messageId);
    if (!cur || !Array.isArray(cur.swipes)) return;
    const clamped = Math.max(0, Math.min(cur.swipes.length - 1, swipeId));
    const nextContent = cur.swipes[clamped] ?? cur.content;
    const info = cur.swipeInfo?.[clamped];
    get().patchMessage(messageId, {
      swipeId: clamped,
      content: nextContent,
      genStarted: info?.gen_started,
      genFinished: info?.gen_finished,
      extra: info?.extra ?? cur.extra,
    });
    // 并写 DB（不需要中断，失败也不滚回本地）
    fetch(`/api/chats/${chatId}/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ swipeId: clamped, content: nextContent }),
    }).catch((e) => console.warn("[chat-store] setActiveSwipe persist", e));
  },

  // 追加一个新 swipe，返回新 swipeId
  appendSwipe: async (chatId, messageId, content, info) => {
    const cur = get().currentChat?.messages.find((m) => m.id === messageId);
    if (!cur) return null;
    const swipes = Array.isArray(cur.swipes) && cur.swipes.length > 0
      ? [...cur.swipes]
      : [cur.content];
    const swipeInfo = Array.isArray(cur.swipeInfo) && cur.swipeInfo.length > 0
      ? [...cur.swipeInfo]
      : [{ send_date: cur.sendDate, extra: cur.extra }];
    swipes.push(content);
    swipeInfo.push(info ?? { send_date: new Date().toISOString() });
    const newId = swipes.length - 1;
    get().patchMessage(messageId, {
      swipes,
      swipeInfo,
      swipeId: newId,
      content,
      genStarted: info?.gen_started,
      genFinished: info?.gen_finished,
      extra: info?.extra ?? cur.extra,
    });
    await get().updateMessage(chatId, messageId, {
      content,
      swipes,
      swipeId: newId,
      swipeInfo,
      extra: info?.extra ?? cur.extra,
      genStarted: info?.gen_started ?? null,
      genFinished: info?.gen_finished ?? null,
    });
    return newId;
  },

  // 删除某个 swipe（至少保留 1 个）
  deleteSwipe: async (chatId, messageId, swipeIndex) => {
    const cur = get().currentChat?.messages.find((m) => m.id === messageId);
    if (!cur || !Array.isArray(cur.swipes) || cur.swipes.length <= 1) return;
    if (swipeIndex < 0 || swipeIndex >= cur.swipes.length) return;
    const swipes = [...cur.swipes];
    const swipeInfo = Array.isArray(cur.swipeInfo) ? [...cur.swipeInfo] : [];
    swipes.splice(swipeIndex, 1);
    if (swipeInfo.length > swipeIndex) swipeInfo.splice(swipeIndex, 1);
    const oldId = cur.swipeId ?? 0;
    let newId = oldId;
    if (swipeIndex < oldId) newId = oldId - 1;
    else if (swipeIndex === oldId) newId = Math.min(swipeIndex, swipes.length - 1);
    const nextContent = swipes[newId] ?? cur.content;
    const nextInfo = swipeInfo[newId];
    get().patchMessage(messageId, {
      swipes,
      swipeInfo,
      swipeId: newId,
      content: nextContent,
      extra: nextInfo?.extra ?? cur.extra,
    });
    await get().updateMessage(chatId, messageId, {
      content: nextContent,
      swipes,
      swipeId: newId,
      swipeInfo,
    });
  },

  // 隐藏 / 取消隐藏消息
  setMessageHidden: async (chatId, messageId, hidden) => {
    get().patchMessage(messageId, { isSystem: hidden });
    await get().updateMessage(chatId, messageId, { isSystem: hidden });
  },

  // 上下移动消息：与相邻那条互换 createdAt + PATCH两条
  moveMessage: async (chatId, messageId, direction) => {
    const cur = get().currentChat;
    if (!cur) return;
    const idx = cur.messages.findIndex((m) => m.id === messageId);
    if (idx < 0) return;
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= cur.messages.length) return;

    const a = cur.messages[idx];
    const b = cur.messages[target];
    const aTs = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
    const bTs = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);

    // 本地先互换位置 + createdAt
    const messages = [...cur.messages];
    messages[idx] = { ...a, createdAt: bTs };
    messages[target] = { ...b, createdAt: aTs };
    [messages[idx], messages[target]] = [messages[target], messages[idx]];
    set({ currentChat: { ...cur, messages } });

    // 两次并发 PATCH，同步 DB
    await Promise.all([
      fetch(`/api/chats/${chatId}/messages/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createdAt: bTs.toISOString() }),
      }).catch(console.warn),
      fetch(`/api/chats/${chatId}/messages/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createdAt: aTs.toISOString() }),
      }).catch(console.warn),
    ]);
  },

  // 为某条消息初始化一个空推理块
  addEmptyReasoning: async (chatId, messageId) => {
    const cur = get().currentChat?.messages.find((m) => m.id === messageId);
    if (!cur) return;
    const extra = { ...(cur.extra ?? {}), reasoning: cur.extra?.reasoning ?? " " };
    get().patchMessage(messageId, { extra });
    await get().updateMessage(chatId, messageId, { extra });
  },

  // 创建分支
  createBranch: async (chatId, messageId) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/branch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      if (!res.ok) return null;
      const newChat: Chat = await res.json();
      // 刷新同角色/群组聊天列表（await 确保列表更新后再返回）
      const cc = get().currentCharacter;
      const gc = get().currentChat;
      if (gc?.groupId) {
        await get().loadChatsForGroup(gc.groupId);
      } else if (cc) {
        await get().loadChatsForCharacter(cc.id);
      }
      return newChat.id;
    } catch (e) {
      console.error("[chat-store] createBranch failed", e);
      return null;
    }
  },

  // 创建书签：分支 + 原消息 bookmarkLink 指向新 chat
  createBookmark: async (chatId, messageId) => {
    const newId = await get().createBranch(chatId, messageId);
    if (!newId) return null;
    await get().updateMessage(chatId, messageId, { bookmarkLink: newId });
    return newId;
  },

  // 重命名聊天 title（PATCH /api/chats/[id]）
  renameChat: async (chatId, title) => {
    const next = title.trim();
    if (!next) return;
    // 本地乐观更新
    set((state) => ({
      currentChat:
        state.currentChat?.id === chatId
          ? { ...state.currentChat, title: next }
          : state.currentChat,
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, title: next } : c)),
    }));
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
    } catch (e) {
      console.error("[chat-store] renameChat failed", e);
    }
  },

  // 删除聊天
  deleteChat: async (chatId) => {
    try {
      const res = await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete chat");

      const { currentChat, currentCharacter } = get();
      // 如果删除的是当前聊天，清空
      if (currentChat?.id === chatId) {
        set({ currentChat: null });
      }
      // 刷新列表
      if (currentCharacter) {
        get().loadChatsForCharacter(currentCharacter.id);
      } else {
        set((state) => ({ chats: state.chats.filter((c) => c.id !== chatId) }));
      }
    } catch (error) {
      console.error("[chat-store] deleteChat failed:", error);
    }
  },
}));
