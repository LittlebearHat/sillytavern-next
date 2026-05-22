/**
 * 群组聊天生成 Hook
 * 封装群聊版的 send/regenerate/continue/impersonate 流程，复用 chat-store 的消息容器
 * 对齐原项目 generateGroupWrapper L945-1092
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useChatStore } from "@/stores/chat-store";
import { useConnectionStore } from "@/lib/stores/connection-store";
import { useFormattingStore } from "@/stores/formatting-store";
import { useTextGenPresetStore } from "@/stores/textgen-preset-store";
import { usePersonaStore } from "@/stores/persona-store";
import { useWorldInfoStore } from "@/stores/worldinfo-store";
import { consumePlainTextStream, consumeTextgenStream } from "@/lib/textgen/parse-stream";
import {
  generateStream,
  type CharacterContext,
  type PersonaContext,
} from "@/lib/generation/engine";
import { DEFAULT_FORMATTING_GLOBAL } from "@/types/advanced-formatting";
import {
  GROUP_GENERATION_MODE,
  getActivatedMembers,
  type GroupMember,
  type GroupMessage as ActivationGroupMessage,
  type ActivationStrategy,
} from "@/lib/group-chat/activation";
import type { Character, ChatMessage } from "@/types";

interface GroupData {
  id: string;
  name: string;
  members: string[];
  disabledMembers: string[];
  avatar: string | null;
  fav: boolean;
  activationStrategy: number;
  generationMode: number;
  allowSelfResponses: boolean;
  generationModeJoinPrefix: string | null;
  generationModeJoinSuffix: string | null;
  autoModeDelay: number;
  hideMutedSprites: boolean;
}

interface GenOpts {
  /** 用户输入（仅 normal 类型用） */
  userContent?: string;
  type: "normal" | "swipe" | "continue" | "impersonate" | "auto";
  /** 强制指定单个角色发言 */
  forceCharId?: string;
  signal: AbortSignal;
  onError?: (msg: string) => void;
  /** impersonate 模式输出回调（写入输入框） */
  onImpersonateChunk?: (text: string) => void;
}

export function useGroupGeneration() {
  const currentChat = useChatStore((s) => s.currentChat);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateLastMessage = useChatStore((s) => s.updateLastMessage);
  const persistMessage = useChatStore((s) => s.persistMessage);
  const removeMessageLocal = useChatStore((s) => s.removeMessageLocal);
  const deleteMessage = useChatStore((s) => s.deleteMessage);

  const { config } = useConnectionStore();
  const textgenSettings = useTextGenPresetStore((s) => s.currentSettings);
  const contextTpl = useFormattingStore((s) => s.context.current);
  const instructTpl = useFormattingStore((s) => s.instruct.current);
  const syspromptTpl = useFormattingStore((s) => s.sysprompt.current);
  const activePersona = usePersonaStore((s) => s.activePersona);
  const wiSettings = useWorldInfoStore((s) => s.settings);

  const isGroupChat = !!currentChat?.groupId;

  // ===== 群组与成员数据 =====
  const [group, setGroup] = useState<GroupData | null>(null);
  const [members, setMembers] = useState<Character[]>([]);

  // ===== World Info payload 构建（必须在 members 声明之后） =====
  const buildWorldInfoForGroup = useCallback(() => {
    const globalBookIds = wiSettings?.globalSelect ?? [];
    const chatBookIds = (currentChat?.metadata as Record<string, unknown> | undefined)?.world_info_book_ids as string[] ?? [];
    // 收集所有群成员的角色级世界书 ID
    const memberBookIds = members
      .map((m) => m.worldInfoBookId)
      .filter((id): id is string => !!id);
    const allChatBookIds = [...chatBookIds, ...memberBookIds];
    if (!globalBookIds.length && !allChatBookIds.length) return undefined;
    return {
      globalBookIds,
      characterBookId: undefined as string | undefined,
      chatBookIds: allChatBookIds,
      settings: wiSettings as unknown as Record<string, unknown>,
    };
  }, [wiSettings, currentChat, members]);

  useEffect(() => {
    let cancelled = false;
    const groupId = currentChat?.groupId;
    void (async () => {
      if (!groupId) {
        if (!cancelled) {
          setGroup(null);
          setMembers([]);
        }
        return;
      }
      try {
        const [gRes, cRes] = await Promise.all([
          fetch(`/api/groups/${groupId}`),
          fetch("/api/characters"),
        ]);
        if (cancelled || !gRes.ok) return;
        const g: GroupData = await gRes.json();
        const allChars: Character[] = cRes.ok ? await cRes.json() : [];
        if (cancelled) return;
        const map = new Map(allChars.map((c) => [c.id, c]));
        const memberChars = g.members
          .map((id) => map.get(id))
          .filter((c): c is Character => Boolean(c));
        setGroup(g);
        setMembers(memberChars);
      } catch (e) {
        console.error("[useGroupGeneration] load group failed:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentChat?.groupId]);

  // ===== 派生 active 配置 =====
  const activeCategory = config.activeCategory;
  const activeProvider = config.activeProviders[activeCategory] ?? "openai";
  const activeModel = config.selectedModels[activeProvider] ?? "";
  const activeBaseUrl = config.baseUrls[activeProvider] ?? "";

  // ===== Helpers =====
  const getMembersForActivation = useCallback((): GroupMember[] => {
    if (!group) return [];
    return group.members.map((id) => {
      const c = members.find((m) => m.id === id);
      return {
        id,
        name: c?.name ?? "Unknown",
        avatar: c?.avatar ?? null,
        talkativeness: c?.talkativeness ?? 0.5,
        disabled: group.disabledMembers.includes(id),
      };
    });
  }, [group, members]);

  const getLastSpeakerId = useCallback((msgs: ChatMessage[]): string | null => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      if (!m.isUser && m.originalAvatar) return m.originalAvatar;
    }
    return null;
  }, []);

  /**
   * APPEND 模式角色卡完整合并
   * 对齐原项目 getGroupCharacterCardsLazy (group-chats.js L497-571)：
   * 4 字段独立合并 (description/personality/scenario/mesExamples)
   * 支持 <FIELDNAME> 占位、prefix/suffix 包裹、{{char}} 替换
   * SWAP 模式返回 null（保留单角色独立卡）
   */
  const buildGroupCharacterFields = useCallback(
    (currentCharId: string): {
      description: string;
      personality: string;
      scenario: string;
      mesExamples: string;
    } | null => {
      if (!group) return null;
      const mode = group.generationMode;
      if (
        mode !== GROUP_GENERATION_MODE.APPEND &&
        mode !== GROUP_GENERATION_MODE.APPEND_DISABLED
      ) {
        return null;
      }

      const customTransform = (
        value: string,
        fieldName: string,
        charName: string,
      ): string => {
        if (!value) return "";
        return value
          .replace(/<FIELDNAME>/gi, fieldName)
          .replace(/\{\{char\}\}/gi, charName);
      };

      const wrap = (
        value: string,
        fieldName: string,
        charName: string,
      ): string => {
        const v = (value ?? "").trim();
        if (!v) return "";
        const prefix = customTransform(
          group.generationModeJoinPrefix ?? "",
          fieldName,
          charName,
        );
        const suffix = customTransform(
          group.generationModeJoinSuffix ?? "",
          fieldName,
          charName,
        );
        return `${prefix}${v}${suffix}`;
      };

      const collect = (
        fieldName: string,
        getter: (c: Character) => string,
      ): string => {
        const values: string[] = [];
        for (const id of group.members) {
          const c = members.find((m) => m.id === id);
          if (!c) continue;
          // disabled 成员仅 APPEND_DISABLED 或自身（当前发言者）保留
          if (
            group.disabledMembers.includes(id) &&
            id !== currentCharId &&
            mode !== GROUP_GENERATION_MODE.APPEND_DISABLED
          ) {
            continue;
          }
          values.push(wrap(getter(c), fieldName, c.name));
        }
        return values.filter(Boolean).join("\n");
      };

      return {
        description: collect("Description", (c) => c.description ?? ""),
        personality: collect(
          "Personality",
          (c) => c.personality ?? "",
        ),
        scenario: collect(
          "Scenario",
          (c) => c.scenario ?? "",
        ),
        mesExamples: collect("Example Messages", (c) => {
          const v =
            c.exampleDialogue ?? "";
          if (!v) return "";
          return v.startsWith("<START>") ? v : `<START>\n${v}`;
        }),
      };
    },
    [group, members],
  );

  /** 为单个角色构造 history：其他角色发言标记为 system role + 名字前缀，避免 AI 误以为是用户输入或自己的发言 */
  const buildHistory = useCallback(
    (allMsgs: ChatMessage[], currentCharId: string, excludeLast: boolean): { role: string; content: string }[] => {
      const src = excludeLast ? allMsgs.slice(0, -1) : allMsgs;
      return src.map((m) => {
        if (m.isUser) return { role: "user", content: m.content };
        // 当前角色自己的历史回复 → assistant
        if (m.originalAvatar === currentCharId) {
          return { role: "assistant", content: m.content };
        }
        // 其他角色的发言 → system role + 名字标记（避免 AI 误以为是用户输入或自己的发言，防止角色混淆）
        return { role: "system", content: `[${m.name} speaks]: ${m.content}` };
      });
    },
    [],
  );

  /** 为单个角色生成一条新消息（流式更新最后一条占位消息） */
  const generateForCharacter = useCallback(
    async (charId: string, genId: number, signal: AbortSignal, isContinue = false, skipPersist = false): Promise<void> => {
      const char = members.find((c) => c.id === charId);
      if (!char || !currentChat) return;

      // APPEND 模式：合并所有成员的 4 字段角色卡；SWAP 模式：使用单角色卡
      const merged = buildGroupCharacterFields(charId);
      const baseSystemPrompt = char.systemPrompt ?? "";
      // 注入作者注释 (Author's Note)。不拼接任何“群聊”相关提示词，
      // 避免 AI 把这些调度性文本误认为世界设定（例如误答为“临时聊天室”/“群聊世界”）
      const notePrompt = currentChat.metadata?.note_prompt;
      const fullSystemPrompt = [baseSystemPrompt, notePrompt].filter(Boolean).join("\n");
      const character: CharacterContext = merged
        ? {
            name: char.name,
            description: merged.description,
            personality: merged.personality,
            scenario: merged.scenario,
            systemPrompt: fullSystemPrompt,
            exampleDialogue: merged.mesExamples,
          }
        : {
            name: char.name,
            description: char.description ?? "",
            personality:
              (char.personality) ?? "",
            scenario:
              (char.scenario) ?? "",
            systemPrompt: fullSystemPrompt,
            exampleDialogue:
              (char.exampleDialogue) ?? "",
          };

      const persona: PersonaContext | null = activePersona
        ? {
            name: activePersona.name,
            description: activePersona.description ?? "",
            descriptionPosition: activePersona.descriptionPosition,
          }
        : null;

      // 从 store 取最新 messages（而非闭包旧值），因为 addMessage 已更新 store
      const allMsgs = useChatStore.getState().currentChat?.messages ?? [];
      // continue 模式: 不排除最后一条（最后一条就是要续写的）
      // normal 模式: 排除最后一条（最后一条是空占位）
      const history = buildHistory(allMsgs, charId, !isContinue);

      // 多成员群聊场景：在 history 末尾追加 OOC 指令，约束 AI 只扮演当前角色。
      // 使用 OOC 标记且不出现“group chat”等词汇，避免 AI 把这条指令误认为世界设定。
      if (members.length > 1) {
        const otherNames = members
          .filter((m) => m.id !== charId)
          .map((m) => m.name)
          .filter(Boolean);
        const avoidClause = otherNames.length
          ? ` Never claim to be, impersonate, describe yourself as, or speak/act as: ${otherNames.join(", ")}.`
          : "";
        history.push({
          role: "system",
          content: `(OOC: Your character name is "${char.name}". You are ${char.name} and only ${char.name}.${avoidClause} Reply strictly as ${char.name} based on your own character card. Do not borrow another character's identity, background, appearance, or setting. This is a technical instruction and is not part of the story or world.)`,
        });
      }

      const response = await generateStream({
        config: {
          activeCategory,
          activeProvider,
          activeModel,
          activeBaseUrl,
          textgenSettings: textgenSettings as unknown as Record<string, unknown>,
          formatting: config.formatting ?? DEFAULT_FORMATTING_GLOBAL,
          contextTpl,
          instructTpl,
          syspromptTpl,
        },
        character,
        persona,
        history,
        signal,
        worldInfo: buildWorldInfoForGroup(),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || "Generation failed");
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const useTextgen = activeCategory === "text_completion";

      // ===== 串角截断逻辑：检测 AI 是否生成了其他角色的对话 =====
      const otherNames = members
        .filter((c) => c.id !== charId)
        .map((c) => c.name)
        .filter(Boolean);
      const truncateRegex = otherNames.length > 0
        ? new RegExp(`\\n(${otherNames.map(n => n.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")).join("|")})[:\uff1a]`)
        : null;
      let truncated = false;
      const onChunkWithTruncation = (fullContent: string) => {
        if (truncated) return;
        if (truncateRegex) {
          const match = truncateRegex.exec(fullContent);
          if (match) {
            const cleanContent = fullContent.slice(0, match.index).trimEnd();
            updateLastMessage(cleanContent);
            truncated = true;
            return;
          }
        }
        updateLastMessage(fullContent);
      };

      if (isContinue) {
        // 续写：保留原内容，新生成追加
        const base = allMsgs[allMsgs.length - 1]?.content ?? "";
        const appended = useTextgen
          ? await consumeTextgenStream(reader, { onChunk: (s) => updateLastMessage(base + s) })
          : await consumePlainTextStream(reader, { onChunk: (s) => updateLastMessage(base + s) });
        const finalContent = base + appended;
        // 持久化为同一条消息的内容更新（patch）
        const lastMsg = useChatStore.getState().currentChat?.messages.slice(-1)[0];
        if (currentChat.id && lastMsg) {
          await useChatStore.getState().updateMessage(currentChat.id, lastMsg.id, { content: finalContent });
        }
        return;
      }

      const fullContent = useTextgen
        ? await consumeTextgenStream(reader, { onChunk: onChunkWithTruncation })
        : await consumePlainTextStream(reader, { onChunk: onChunkWithTruncation });

      // 如果被截断，使用截断后的内容
      const finalContent = truncated
        ? (useChatStore.getState().currentChat?.messages.slice(-1)[0]?.content ?? "")
        : fullContent;

      if (!skipPersist && currentChat.id && finalContent) {
        // 获取本地占位消息的 ID 以便同步服务端真实 ID
        const localPlaceholderId = useChatStore.getState().currentChat?.messages.slice(-1)[0]?.id;
        await persistMessage(currentChat.id, {
          name: char.name,
          isUser: false,
          content: finalContent,
          role: "assistant",
          originalAvatar: char.id,
          forceAvatar: char.avatar ?? undefined,
          extra: { gen_id: genId, api: activeProvider, model: activeModel },
        }, localPlaceholderId);
      }
    },
    [
      members,
      currentChat,
      activePersona,
      buildHistory,
      buildGroupCharacterFields,
      activeCategory,
      activeProvider,
      activeModel,
      activeBaseUrl,
      textgenSettings,
      config.formatting,
      contextTpl,
      instructTpl,
      syspromptTpl,
      updateLastMessage,
      persistMessage,
    ],
  );

  // ===== 主入口：runGroupGeneration =====
  const runGroupGeneration = useCallback(
    async (opts: GenOpts): Promise<void> => {
      if (!group || !currentChat) return;
      if (!activeModel) {
        opts.onError?.("\u8bf7\u5148\u5728 \u8bbe\u7f6e > API \u8fde\u63a5 \u4e2d\u9009\u62e9\u6a21\u578b");
        return;
      }
    
      // \u6bcf\u6b21\u751f\u6210\u524d\u83b7\u53d6\u6700\u65b0 group \u914d\u7f6e\uff08\u9762\u677f\u4fee\u6539\u540e hook state \u53ef\u80fd\u672a\u540c\u6b65\uff09
      let activeGroup = group;
      try {
        const freshRes = await fetch(`/api/groups/${group.id}`);
        if (freshRes.ok) {
          const fresh: GroupData = await freshRes.json();
          activeGroup = fresh;
          setGroup(fresh);
        }
      } catch { /* \u964d\u7ea7\u4f7f\u7528\u95ed\u5305\u4e2d\u7684\u65e7\u503c */ }
    
      const allMsgs = useChatStore.getState().currentChat?.messages ?? [];

      // 1. impersonate: 不持久化、不创建消息，仅写到 onImpersonateChunk
      if (opts.type === "impersonate") {
        const memberList = getMembersForActivation();
        const enabled = memberList.filter((m) => !m.disabled);
        if (enabled.length === 0) return;
        // 随机选一个成员视角让 AI 代笔写用户回复
        const pick = enabled[Math.floor(Math.random() * enabled.length)];
        const char = members.find((c) => c.id === pick.id);
        if (!char) return;
        const userName = activePersona?.name || "User";

        // impersonate 也走 APPEND 合并（让代笔的 AI 看到全员上下文）
        const mergedImp = buildGroupCharacterFields(pick.id);
        const character: CharacterContext = mergedImp
          ? {
              name: char.name,
              description: mergedImp.description,
              personality: mergedImp.personality,
              scenario: mergedImp.scenario,
              systemPrompt:
                `${char.systemPrompt ?? mergedImp.description ?? ""}\n\n[INSTRUCTION: Write the next reply on behalf of ${userName} (the user). Speak in first person. Keep it concise and natural.]`,
              exampleDialogue: mergedImp.mesExamples,
            }
          : {
              name: char.name,
              description: char.description ?? "",
              personality: (char.personality) ?? "",
              scenario: (char.scenario) ?? "",
              systemPrompt:
                `${char.systemPrompt ?? char.description ?? ""}\n\n[INSTRUCTION: Write the next reply on behalf of ${userName} (the user). Speak in first person. Keep it concise and natural.]`,
              exampleDialogue: (char.exampleDialogue) ?? "",
            };
        const persona: PersonaContext | null = activePersona
          ? { name: activePersona.name, description: activePersona.description ?? "", descriptionPosition: activePersona.descriptionPosition }
          : null;
        const history = buildHistory(allMsgs, pick.id, false);

        const response = await generateStream({
          config: {
            activeCategory,
            activeProvider,
            activeModel,
            activeBaseUrl,
            textgenSettings: textgenSettings as unknown as Record<string, unknown>,
            formatting: config.formatting ?? DEFAULT_FORMATTING_GLOBAL,
            contextTpl,
            instructTpl,
            syspromptTpl,
          },
          character,
          persona,
          history,
          signal: opts.signal,
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err?.error || "Impersonate failed");
        }
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");
        const useTextgen = activeCategory === "text_completion";
        await (useTextgen
          ? consumeTextgenStream(reader, { onChunk: (s) => opts.onImpersonateChunk?.(s) })
          : consumePlainTextStream(reader, { onChunk: (s) => opts.onImpersonateChunk?.(s) }));
        return;
      }

      // 2. continue: 续写最后一条 assistant
      if (opts.type === "continue") {
        const last = allMsgs[allMsgs.length - 1];
        if (!last || last.isUser || !last.originalAvatar) {
          opts.onError?.("没有可续写的角色消息");
          return;
        }
        try {
          await generateForCharacter(last.originalAvatar, Date.now(), opts.signal, true);
        } catch (e) {
          if (e instanceof Error && e.name === "AbortError") return;
          opts.onError?.(e instanceof Error ? e.message : "Unknown error");
        }
        return;
      }

      // 3. swipe: 对最后一条 assistant 流式重新生成（不删除/不创建新消息，swipe 版本已在外部 appendSwipe 创建）
      if (opts.type === "swipe") {
        const last = allMsgs[allMsgs.length - 1];
        if (!last || last.isUser || !last.originalAvatar) {
          opts.onError?.("没有可重生的角色消息");
          return;
        }
        try {
          await generateForCharacter(last.originalAvatar, Date.now(), opts.signal, false, true);
        } catch (e) {
          if (e instanceof Error && e.name === "AbortError") {
            updateLastMessage("[已中止]");
            return;
          }
          opts.onError?.(e instanceof Error ? e.message : "Unknown error");
        }
        return;
      }

      // 4. normal / auto: 完整群聊生成流程
      const userInput = opts.userContent ?? "";

      // 4.1 持久化用户消息（仅 normal 类型 + 有输入）
      if (opts.type === "normal" && userInput.trim()) {
        const userName = activePersona?.name || "User";
        const userMsgId = crypto.randomUUID();
        addMessage({
          id: userMsgId,
          name: userName,
          isUser: true,
          role: "user",
          content: userInput,
          createdAt: new Date(),
        });
        if (currentChat.id) {
          void persistMessage(currentChat.id, {
            name: userName,
            isUser: true,
            content: userInput,
            role: "user",
          }, userMsgId);
        }
      }

      // 4.2 计算激活成员（使用 activeGroup 而非闭包中的 group，确保面板修改后立即生效）
      const memberList: GroupMember[] = activeGroup.members.map((id) => {
        const c = members.find((m) => m.id === id);
        return {
          id,
          name: c?.name ?? "Unknown",
          avatar: c?.avatar ?? null,
          talkativeness: c?.talkativeness ?? 0.5,
          disabled: activeGroup.disabledMembers.includes(id),
        };
      });
      const recentMsgs: ActivationGroupMessage[] = useChatStore.getState().currentChat!.messages.map((m) => ({
        id: m.id,
        name: m.name,
        isUser: m.isUser,
        content: m.content,
        characterId: m.originalAvatar,
      }));
      let activated: string[];
      if (opts.forceCharId) {
        activated = [opts.forceCharId];
      } else {
        activated = getActivatedMembers(
          activeGroup.activationStrategy as ActivationStrategy,
          memberList,
          userInput,
          getLastSpeakerId(useChatStore.getState().currentChat!.messages),
          activeGroup.allowSelfResponses,
          recentMsgs,
        );
      }
      if (activated.length === 0) return;

      // 4.3 gen_id 批次标识
      const genId = Date.now();

      // 4.4 逐角色生成
      for (const charId of activated) {
        if (opts.signal.aborted) break;
        const char = members.find((c) => c.id === charId);
        if (!char) continue;
        if (activeGroup.disabledMembers.includes(charId)) continue;

        // 占位空消息
        addMessage({
          id: crypto.randomUUID(),
          name: char.name,
          isUser: false,
          role: "assistant",
          content: "",
          originalAvatar: char.id,
          forceAvatar: char.avatar ?? undefined,
          extra: { gen_id: genId },
          createdAt: new Date(),
        });

        try {
          await generateForCharacter(charId, genId, opts.signal);
        } catch (e) {
          if (e instanceof Error && e.name === "AbortError") {
            updateLastMessage("[已中止]");
            break;
          }
          const errMsg = e instanceof Error ? e.message : "Unknown error";
          updateLastMessage(`[错误: ${errMsg}]`);
          opts.onError?.(errMsg);
        }
      }
    },
    [
      group,
      currentChat,
      activeModel,
      members,
      activePersona,
      getMembersForActivation,
      getLastSpeakerId,
      generateForCharacter,
      buildHistory,
      buildGroupCharacterFields,
      addMessage,
      updateLastMessage,
      persistMessage,
      deleteMessage,
      activeCategory,
      activeProvider,
      activeBaseUrl,
      textgenSettings,
      config.formatting,
      contextTpl,
      instructTpl,
      syspromptTpl,
    ],
  );

  /** 重生：删除最后一个 gen_id 批次所有消息，重跑 normal */
  const runGroupRegenerate = useCallback(
    async (signal: AbortSignal, onError?: (msg: string) => void): Promise<void> => {
      if (!group || !currentChat) return;
      const msgs = useChatStore.getState().currentChat?.messages ?? [];
      if (msgs.length === 0) return;
      // 找到最后一个 gen_id
      let topGenId: string | number | undefined;
      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i];
        if (!m.isUser && !m.isSystem) {
          topGenId = (m.extra as Record<string, unknown> | undefined)?.gen_id as string | number | undefined;
          break;
        }
      }
      // 删除属于该批次的尾部消息
      let removed = 0;
      while (msgs.length - removed > 0) {
        const last = msgs[msgs.length - 1 - removed];
        if (!last) break;
        if (last.isUser || last.isSystem) break;
        const myGenId = (last.extra as Record<string, unknown> | undefined)?.gen_id as string | number | undefined;
        if (topGenId !== undefined && myGenId !== topGenId) break;
        if (currentChat.id) {
          await deleteMessage(currentChat.id, last.id);
        } else {
          removeMessageLocal(last.id);
        }
        removed++;
        // 仅旧批次没有 gen_id 时只删一条
        if (topGenId === undefined) break;
      }
      await runGroupGeneration({ type: "normal", signal, onError });
    },
    [group, currentChat, deleteMessage, removeMessageLocal, runGroupGeneration],
  );

  return {
    isGroupChat,
    group,
    members,
    runGroupGeneration,
    runGroupRegenerate,
  };
}
