"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, RotateCcw, Square, BookOpen, ArrowDown, ArrowRight, Wand2, Paperclip, X, Search as SearchIcon, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chat-store";
import { MessageBubble } from "@/components/chat/message-bubble";
import { useGroupGeneration } from "@/hooks/useGroupGeneration";
import { useGroupAutoMode } from "@/hooks/useGroupAutoMode";
import { ChatSearchBar } from "@/components/chat/ChatSearchBar";
import { ChatStats } from "@/components/chat/ChatStats";
import { ChatMultiSelectBar, exportMessagesAsMarkdown, selectedMessagesToText } from "@/components/chat/ChatMultiSelect";
import { SlashCommandHints, getFilteredCommands, type SlashCommand } from "@/components/chat/SlashCommandHints";
import { MentionPicker, extractMentionQuery } from "@/components/chat/MentionPicker";
import { DragOverlay } from "@/components/chat/MessageAttachments";
import type { ChatMessage } from "@/types";
import { useConnectionStore } from "@/lib/stores/connection-store";
import { useWorldInfoStore } from "@/stores/worldinfo-store";
import { useTextGenPresetStore } from "@/stores/textgen-preset-store";
import { useFormattingStore } from "@/stores/formatting-store";
import { usePersonaStore } from "@/stores/persona-store";
import { consumePlainTextStream, consumeTextgenStream } from "@/lib/textgen/parse-stream";
import {
  buildInstructPrompt,
  buildSimplePrompt,
  collectStopStrings,
  replaceMacros,
  type MacroContext,
} from "@/lib/formatting/build-prompt";
import { DEFAULT_FORMATTING_GLOBAL } from "@/types/advanced-formatting";

export function ChatArea() {
  const router = useRouter();
  const {
    currentChat,
    currentCharacter,
    isGenerating,
    addMessage,
    updateLastMessage,
    setIsGenerating,
    persistMessage,
    updateMessage,
    deleteMessage,
    setMessageHidden,
    setActiveSwipe,
    appendSwipe,
    deleteSwipe,
    moveMessage,
    addEmptyReasoning,
    createBranch,
    createBookmark,
  } = useChatStore();

  const { config, connectionStatus } = useConnectionStore();
  const wiSettings = useWorldInfoStore(s => s.settings);
  const loadWiSettings = useWorldInfoStore(s => s.loadSettings);
  const wiBooks = useWorldInfoStore(s => s.books);
  const loadWiBooks = useWorldInfoStore(s => s.loadBooks);

  // text_completion 分类时联动 textgen-preset-store
  const textgenSettings = useTextGenPresetStore((s) => s.currentSettings);
  const setTextgenApiType = useTextGenPresetStore((s) => s.setApiType);
  const loadTextgenPresets = useTextGenPresetStore((s) => s.loadAll);

  // 高级格式化：4 类模板当前值 + 全局设置
  const contextTpl = useFormattingStore((s) => s.context.current);
  const instructTpl = useFormattingStore((s) => s.instruct.current);
  const syspromptTpl = useFormattingStore((s) => s.sysprompt.current);
  const loadAllFormatting = useFormattingStore((s) => s.loadAllKinds);

  // 激活的 Persona
  const activePersona = usePersonaStore((s) => s.activePersona);
  const loadActivePersona = usePersonaStore((s) => s.loadActive);

  // 群聊生成 hook（内部根据 currentChat.groupId 自动识别）
  const groupGen = useGroupGeneration();
  const isGroupChat = groupGen.isGroupChat;
  const groupMembers = groupGen.members;

  useEffect(() => { loadWiSettings(); }, [loadWiSettings]);
  useEffect(() => { void loadWiBooks(); }, [loadWiBooks]);
  useEffect(() => { void loadAllFormatting(); }, [loadAllFormatting]);
  useEffect(() => { void loadActivePersona(); }, [loadActivePersona]);

  // 在进入 text_completion 分类时预加载 textgen 预设 + 同步 apiType
  useEffect(() => {
    if (config.activeCategory === "text_completion") {
      const provider = config.activeProviders.text_completion;
      if (provider) {
        // 尝试将 connection 的 provider id 同步到 textgen-preset-store。
        // 如果 provider id 与 textgen 枚举不一致 store 会忙使用默认 apiType。
        try { void setTextgenApiType(provider as never); } catch { /* noop */ }
      }
      void loadTextgenPresets();
    }
  }, [config.activeCategory, config.activeProviders, setTextgenApiType, loadTextgenPresets]);

  /** 构造 worldInfo 请求字段：全局 + 角色 + 聊天三级联动 */
  const buildWorldInfoPayload = useCallback(() => {
    const globalBookIds = wiSettings.globalSelect ?? [];
    const characterBookId = currentCharacter?.worldInfoBookId ?? undefined;
    const chatBookIds = currentChat?.metadata?.world_info_book_ids ?? [];
    if (!globalBookIds.length && !characterBookId && !chatBookIds.length) return undefined;
    return {
      globalBookIds,
      characterBookId: characterBookId ?? undefined,
      chatBookIds,
      settings: wiSettings as unknown as Record<string, unknown>,
    };
  }, [wiSettings, currentCharacter, currentChat]);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  // 消息搜索状态
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchIds, setSearchMatchIds] = useState<string[]>([]);
  const [searchActiveIndex, setSearchActiveIndex] = useState(0);
  // 多选模式状态
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // 附件预贴（Task 12 骨架）：选中后转 base64 入 attachments，发送时写进 message.extra.files
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Array<{ name: string; size: number; mimeType: string; text?: string; url: string }>>([]);
  const [dragOver, setDragOver] = useState(false);
  // @ 提及状态
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionAtIndex, setMentionAtIndex] = useState(-1);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messages = currentChat?.messages ?? [];

  // Ctrl+F 快捷键唤出搜索栏
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // 搜索匹配逻辑
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchMatchIds([]);
      setSearchActiveIndex(0);
      return;
    }
    const q = query.toLowerCase();
    const matched = (currentChat?.messages ?? []).filter(m => m.content.toLowerCase().includes(q)).map(m => m.id);
    setSearchMatchIds(matched);
    setSearchActiveIndex(0);
    // 跳转到第一个匹配
    if (matched.length > 0) {
      document.getElementById(`msg-${matched[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentChat?.messages]);

  const handleSearchNavigate = useCallback((index: number) => {
    setSearchActiveIndex(index);
    const id = searchMatchIds[index];
    if (id) {
      document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [searchMatchIds]);

  // 从 connection-store 获取当前活跃的 provider/model/baseUrl
  const activeProvider = config.activeProviders[config.activeCategory] ?? "openai";
  const activeModel = config.selectedModels[activeProvider] ?? "";
  const activeBaseUrl = config.baseUrls[activeProvider] ?? "";
  const isConnected = connectionStatus[activeProvider] === "connected";

  /** text_completion 分类下把 chat 消息列表拼接为单一 prompt（instruct mode 优先） */
  const buildTextgenPrompt = useCallback(
    (history: { role: string; content: string }[], systemPrompt: string | undefined) => {
      const formatting = config.formatting ?? DEFAULT_FORMATTING_GLOBAL;
      const charName = currentCharacter?.name ?? "Assistant";
      const userName = activePersona?.name || "User";
      // 根据描述注入位置计算 persona 描述
      // 0=IN_PROMPT (默认填入 {{persona}} 宏), 9=NONE (不注入), 其他位置需后续处理
      const personaDesc = activePersona?.description ?? "";
      const personaInPrompt = activePersona && activePersona.descriptionPosition === 0 ? personaDesc : "";
      const macros: MacroContext = {
        user: userName,
        char: charName,
        persona: personaInPrompt,
        description: currentCharacter?.description ?? "",
        personality: currentCharacter?.personality ?? "",
        scenario: currentCharacter?.scenario ?? "",
        system: systemPrompt,
        model: activeModel,
        mesExamples: currentCharacter?.exampleDialogue ?? "",
        lastMessage: messages.length > 0 ? messages[messages.length - 1].content : "",
        lastUserMessage: [...messages].reverse().find(m => m.role === "user")?.content ?? "",
        lastCharMessage: [...messages].reverse().find(m => m.role === "assistant")?.content ?? "",
        input: input,
        chatVariables: (currentChat?.metadata as Record<string, unknown>)?.variables as Record<string, string> | undefined ?? {},
      };

      // sysprompt content 作为 system 默认（未启用时也使用）
      const effectiveSystem =
        formatting.sysprompt_enabled && syspromptTpl?.content
          ? syspromptTpl.content
          : systemPrompt;

      if (formatting.instruct_enabled) {
        const typedHistory = history.map((m) => ({
          role: (m.role === "user" || m.role === "assistant" || m.role === "system" ? m.role : "user") as
            | "user"
            | "assistant"
            | "system",
          content: m.content,
        }));
        return buildInstructPrompt({
          context: contextTpl,
          instruct: instructTpl,
          sysprompt: syspromptTpl,
          formatting,
          systemPrompt: effectiveSystem,
          history: typedHistory,
          macros,
          isImpersonating: false,
        });
      }

      return buildSimplePrompt({
        context: contextTpl,
        sysprompt: syspromptTpl,
        formatting,
        systemPrompt: effectiveSystem,
        history,
        charName,
        userName,
        macros,
      });
    },
    [config.formatting, currentCharacter, contextTpl, instructTpl, syspromptTpl],
  );

  /** 调用 textgen 后端：返回 stream Response */
  const callTextgen = useCallback(
    async (
      history: { role: string; content: string }[],
      systemPrompt: string | undefined,
      signal: AbortSignal,
    ) => {
      const apiType = activeProvider; // text_completion 下同名
      const apiServer = activeBaseUrl || "";
      const prompt = buildTextgenPrompt(history, systemPrompt);

      // 合成 stop strings 并并入 textgen settings
      const formatting = config.formatting ?? DEFAULT_FORMATTING_GLOBAL;
      const charName = currentCharacter?.name ?? "Assistant";
      const stops = collectStopStrings({
        context: contextTpl,
        instruct: instructTpl,
        formatting,
        charName,
        userName: activePersona?.name || "User",
        instructEnabled: formatting.instruct_enabled,
      });
      const mergedSettings = stops.length
        ? {
            ...textgenSettings,
            stop: Array.from(
              new Set([
                ...(((textgenSettings as Record<string, unknown>).stop as string[] | undefined) ?? []),
                ...stops,
              ]),
            ),
          }
        : textgenSettings;

      return fetch("/api/text-completions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiType,
          apiServer,
          model: activeModel || undefined,
          prompt,
          settings: mergedSettings,
        }),
        signal,
      });
    },
    [activeProvider, activeBaseUrl, activeModel, textgenSettings, buildTextgenPrompt, config.formatting, contextTpl, instructTpl, currentCharacter],
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // 监听容器滚动：距底 < 80px 认为在底部
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsAtBottom(distance < 80);
  };

  useEffect(() => {
    if (isAtBottom) scrollToBottom("smooth");
  }, [messages, isAtBottom, scrollToBottom]);

  // 初次进入会话时直接跳到底
  useEffect(() => {
    scrollToBottom("auto");
  }, [currentChat?.id, scrollToBottom]);

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  };

  /**
   * 斜杠命令分发。返回 true 表示已处理（外层 handleSubmit 不再走生成）。
   */
  const handleSlashCommand = async (raw: string): Promise<boolean> => {
    if (!raw.startsWith("/")) return false;
    const space = raw.indexOf(" ");
    const cmd = (space === -1 ? raw : raw.slice(0, space)).slice(1).toLowerCase();
    const arg = space === -1 ? "" : raw.slice(space + 1).trim();

    switch (cmd) {
      case "":
      case "?":
      case "help": {
        alert(
          [
            "可用斜杠命令：",
            "/help, /?  - 查看帮助",
            "/clear, /flush  - 清空当前会话所有消息",
            "/sys <text>  - 添加一条 system 隐藏消息",
            "/name <text>  - 修改最后一条消息的名字",
            "/branch  - 从最后一条消息创建分支",
            "/tts  - 朗读最后一条 assistant 消息",
            "/roll NdM  - 掷骰（如 /roll 2d6）",
            "/hide [N]  - 隐藏最后 N 条消息（默认1）",
            "/unhide [N]  - 取消隐藏最后 N 条隐藏消息",
            "/continue  - 续写最后一条 AI 回复",
            "/impersonate  - 让 AI 帮你写下一条",
            "/go N  - 跳转到第 N 条消息",
            "/setvar key=value  - 设置聊天变量",
            "/getvar key  - 获取变量值",
            "/note <text>  - 设置作者注释",
            "/model  - 显示当前模型信息",
            "/token [text]  - 估算文本 token 数",
            "/export  - 导出当前对话为 Markdown",
          ].join("\n"),
        );
        return true;
      }
      case "clear":
      case "flush": {
        if (!currentChat?.id) return true;
        if (!confirm("确定要清空该会话的所有消息吗？")) return true;
        const ids = messages.map((m) => m.id);
        for (const id of ids) {
          await deleteMessage(currentChat.id, id);
        }
        return true;
      }
      case "sys":
      case "system": {
        if (!arg) { alert("用法：/sys <text>"); return true; }
        if (!currentChat?.id) return true;
        const m = await persistMessage(currentChat.id, {
          name: "System", isUser: false, content: arg, role: "system", isSystem: true,
        });
        if (m) addMessage(m);
        return true;
      }
      case "name": {
        if (!arg) { alert("用法：/name <new name>"); return true; }
        const last = messages[messages.length - 1];
        if (!last || !currentChat?.id) return true;
        useChatStore.getState().patchMessage(last.id, { name: arg });
        return true;
      }
      case "branch": {
        const last = messages[messages.length - 1];
        if (!last || !currentChat?.id) return true;
        const newId = await createBranch(currentChat.id, last.id);
        if (newId) {
          if (confirm("分支已创建，跳转过去吗？")) await useChatStore.getState().loadChat(newId);
        } else { alert("创建分支失败"); }
        return true;
      }
      case "tts":
      case "narrate": {
        const last = [...messages].reverse().find((m) => m.role === "assistant");
        if (!last) return true;
        speakText(last.content);
        return true;
      }
      // === 新增命令 ===
      case "roll": {
        const match = arg.match(/^(\d+)d(\d+)$/i);
        if (!match) { alert("用法：/roll NdM，如 /roll 2d6"); return true; }
        const count = parseInt(match[1], 10);
        const sides = parseInt(match[2], 10);
        const rolls: number[] = [];
        const _rollBuf = new Uint32Array(count);
        crypto.getRandomValues(_rollBuf);
        for (let i = 0; i < count; i++) rolls.push((_rollBuf[i] % sides) + 1);
        const total = rolls.reduce((a, b) => a + b, 0);
        if (!currentChat?.id) { alert(`🎲 ${count}d${sides}: [${rolls.join(", ")}] = ${total}`); return true; }
        const rollMsg = await persistMessage(currentChat.id, {
          name: "System", isUser: false, role: "system", isSystem: true,
          content: `🎲 掷骰 ${count}d${sides}: [${rolls.join(", ")}] = **${total}**`,
        });
        if (rollMsg) addMessage(rollMsg);
        return true;
      }
      case "hide": {
        if (!currentChat?.id) return true;
        const n = parseInt(arg, 10) || 1;
        const visible = messages.filter(m => !m.isSystem);
        const toHide = visible.slice(-n);
        for (const m of toHide) await setMessageHidden(currentChat.id, m.id, true);
        return true;
      }
      case "unhide": {
        if (!currentChat?.id) return true;
        const n = parseInt(arg, 10) || 1;
        const hidden = messages.filter(m => m.isSystem);
        const toShow = hidden.slice(-n);
        for (const m of toShow) await setMessageHidden(currentChat.id, m.id, false);
        return true;
      }
      case "continue": {
        void handleContinue();
        return true;
      }
      case "impersonate": {
        void handleImpersonate();
        return true;
      }
      case "go": {
        const idx = parseInt(arg, 10);
        if (isNaN(idx) || idx < 1 || idx > messages.length) {
          alert(`用法：/go N（N = 1~${messages.length}）`);
          return true;
        }
        const targetMsg = messages[idx - 1];
        document.getElementById(`msg-${targetMsg.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return true;
      }
      case "setvar": {
        const eqIdx = arg.indexOf("=");
        if (eqIdx < 1) { alert("用法：/setvar key=value"); return true; }
        const key = arg.slice(0, eqIdx).trim();
        const val = arg.slice(eqIdx + 1).trim();
        if (!currentChat?.id) return true;
        const meta = { ...(currentChat.metadata ?? {}), variables: { ...((currentChat.metadata as Record<string,unknown>)?.variables as Record<string,string> ?? {}), [key]: val } };
        useChatStore.setState((state) => state.currentChat ? { currentChat: { ...state.currentChat, metadata: meta } } : state);
        fetch(`/api/chats/${currentChat.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ metadata: meta }) }).catch(() => { /* metadata patch 失败不影响功能 */ });
        alert(`变量已设置：${key} = ${val}`);
        return true;
      }
      case "getvar": {
        if (!arg) { alert("用法：/getvar key"); return true; }
        const vars = (currentChat?.metadata as Record<string,unknown>)?.variables as Record<string,string> | undefined;
        const val = vars?.[arg];
        alert(val !== undefined ? `${arg} = ${val}` : `变量 "${arg}" 未设置`);
        return true;
      }
      case "note": {
        if (!currentChat?.id) return true;
        const meta = { ...(currentChat.metadata ?? {}), note_prompt: arg };
        useChatStore.setState((state) => state.currentChat ? { currentChat: { ...state.currentChat, metadata: meta } } : state);
        fetch(`/api/chats/${currentChat.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ metadata: meta }) }).catch(() => { /* metadata patch 失败不影响功能 */ });
        alert(arg ? `作者注释已设置：${arg}` : "作者注释已清空");
        return true;
      }
      case "model": {
        alert(`当前模型：${activeModel || "未选择"}\n提供商：${activeProvider}\n类别：${config.activeCategory}`);
        return true;
      }
      case "token": {
        const text = arg || messages.map(m => m.content).join("\n");
        let cjk = 0, other = 0;
        for (const ch of text) {
          if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(ch)) cjk++; else other++;
        }
        const est = Math.ceil(cjk / 1.5 + other / 4);
        alert(`文本长度：${text.length} 字符\n估算 Token：~${est.toLocaleString()}`);
        return true;
      }
      case "export": {
        const md = messages.map(m => {
          const time = m.createdAt ? new Date(m.createdAt).toLocaleString("zh-CN") : "";
          return `### ${m.name ?? (m.isUser ? "User" : "Assistant")}${time ? ` (${time})` : ""}\n\n${m.content}`;
        }).join("\n\n---\n\n");
        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url;
        a.download = `chat-${currentChat?.id?.slice(0, 8) ?? "export"}-${new Date().toISOString().slice(0, 10)}.md`;
        a.click(); URL.revokeObjectURL(url);
        return true;
      }
      default: {
        alert(`未知命令: /${cmd}。输入 /help 查看帮助。`);
        return true;
      }
    }
  };

  /** 调用浏览器 SpeechSynthesis 朗读文本 */
  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("当前浏览器不支持语音合成");
      return;
    }
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(trimmed);
    window.speechSynthesis.speak(u);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    // 斜杠命令优先处理（不需要连接任何 model）
    if (input.trim().startsWith("/")) {
      const handled = await handleSlashCommand(input.trim());
      if (handled) {
        setInput("");
        return;
      }
    }

    // 检查连接状态
    if (!activeModel) {
      alert("Please select a model in Settings > API Connections first.");
      return;
    }

    const userContent = input.trim();
    setInput("");

    // 【群聊分支】检测到 groupId 则走多角色生成流程
    if (isGroupChat) {
      setIsGenerating(true);
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      try {
        await groupGen.runGroupGeneration({
          userContent,
          type: "normal",
          signal: abortController.signal,
          onError: (m) => console.warn("[group] error:", m),
        });
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
      return;
    }

    const chatId = currentChat?.id;

    // 添加用户消息 (UI 即时显示)
    const userName = "User";
    const userMsg: Parameters<typeof addMessage>[0] = {
      id: crypto.randomUUID(),
      name: userName,
      isUser: true,
      role: "user",
      content: userContent,
      createdAt: new Date(),
      extra: attachments.length > 0 ? { files: attachments } : undefined,
    };
    addMessage(userMsg);

    // 持久化用户消息
    if (chatId) {
      persistMessage(chatId, {
        name: userName,
        isUser: true,
        content: userContent,
        role: "user",
        extra: attachments.length > 0 ? { files: attachments } : undefined,
      }, userMsg.id);
    }

    // 发送后清空附件
    setAttachments([]);

    // 添加空的助手消息 (流式填充)
    const charName = currentCharacter?.name ?? "Assistant";
    const assistantMsgId = crypto.randomUUID();
    addMessage({
      id: assistantMsgId,
      name: charName,
      isUser: false,
      role: "assistant",
      content: "",
      createdAt: new Date(),
    });

    setIsGenerating(true);

    try {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // 构造消息历史
      const chatMessages = [...messages, { role: "user" as const, content: userContent }].map(
        (m) => ({ role: m.role, content: m.content })
      );

      // 系统提示（宏替换）+ 作者注释注入
      const _rawSys1 = currentCharacter?.systemPrompt || currentCharacter?.description || undefined;
      const notePrompt1 = currentChat?.metadata?.note_prompt;
      let systemPrompt = _rawSys1 ? replaceMacros(_rawSys1, { user: activePersona?.name || "User", char: currentCharacter?.name ?? "Assistant", persona: activePersona?.descriptionPosition !== 9 ? activePersona?.description ?? "" : "" }) : undefined;
      if (notePrompt1) { systemPrompt = systemPrompt ? `${systemPrompt}\n${notePrompt1}` : notePrompt1; }

      const useTextgen = config.activeCategory === "text_completion";
      const response = useTextgen
        ? await callTextgen(chatMessages, systemPrompt, abortController.signal)
        : await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: chatMessages,
              provider: activeProvider,
              model: activeModel,
              systemPrompt,
              customBaseURL: activeBaseUrl || undefined,
              worldInfo: buildWorldInfoPayload(),
            }),
            signal: abortController.signal,
          });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || "Generation failed");
      }

      // 流式读取
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const fullContent = useTextgen
        ? await consumeTextgenStream(reader, { onChunk: (s) => updateLastMessage(s) })
        : await consumePlainTextStream(reader, { onChunk: (s) => updateLastMessage(s) });

      // 流式完成后持久化 assistant 消息
      if (chatId && fullContent) {
        persistMessage(chatId, {
          name: charName,
          isUser: false,
          content: fullContent,
          role: "assistant",
          extra: { api: activeProvider, model: activeModel },
        }, assistantMsgId);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        // 用户主动停止
      } else {
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        updateLastMessage(`[Error: ${errMsg}]`);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  /**
   * 核心生成 helper：发起 1 个请求并把流式结果实时写到
   * currentChat.messages[lastMsg.id].swipes[newSwipeId]。
   * - 如果 newSwipeId 是当前激活的 swipe，content 同步更新；
   * - 返回该 swipe 的最终 content + abort 状态。
   * 多个 swipe 并发时，每个 Promise 各守其位，互不干扰。
   */
  const streamRegenInto = useCallback(
    async (
      lastMsg: ChatMessage,
      newSwipeId: number,
      signal: AbortSignal,
    ): Promise<{ content: string; aborted: boolean; error?: string }> => {
      const useTextgen = config.activeCategory === "text_completion";
      const chatMessages = messages
        .slice(0, -1)
        .map((m) => ({ role: m.role, content: m.content }));
      const _rawSys2 =
        currentCharacter?.systemPrompt ||
        currentCharacter?.description ||
        undefined;
      const notePrompt2 = currentChat?.metadata?.note_prompt;
      let systemPrompt = _rawSys2 ? replaceMacros(_rawSys2, { user: activePersona?.name || "User", char: currentCharacter?.name ?? "Assistant", persona: activePersona?.descriptionPosition !== 9 ? activePersona?.description ?? "" : "" }) : undefined;
      if (notePrompt2) { systemPrompt = systemPrompt ? `${systemPrompt}\n${notePrompt2}` : notePrompt2; }

      let fullContent = "";

      const onChunk = (s: string) => {
        fullContent = s;
        const cur = useChatStore
          .getState()
          .currentChat?.messages.find((m) => m.id === lastMsg.id);
        if (!cur) return;
        const swipes = Array.isArray(cur.swipes) ? [...cur.swipes] : [];
        if (newSwipeId < swipes.length) swipes[newSwipeId] = s;
        const isActive = (cur.swipeId ?? 0) === newSwipeId;
        useChatStore
          .getState()
          .patchMessage(
            lastMsg.id,
            isActive ? { swipes, content: s } : { swipes },
          );
      };

      try {
        const response = useTextgen
          ? await callTextgen(chatMessages, systemPrompt, signal)
          : await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messages: chatMessages,
                provider: activeProvider,
                model: activeModel,
                systemPrompt,
                customBaseURL: activeBaseUrl || undefined,
                worldInfo: buildWorldInfoPayload(),
              }),
              signal,
            });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err?.error || "Regeneration failed");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const result = useTextgen
          ? await consumeTextgenStream(reader, { onChunk })
          : await consumePlainTextStream(reader, { onChunk });
        return { content: result, aborted: false };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return { content: fullContent, aborted: true };
        }
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        return { content: `[Error: ${errMsg}]`, aborted: false, error: errMsg };
      }
    },
    [
      messages,
      config.activeCategory,
      currentCharacter,
      activeProvider,
      activeModel,
      activeBaseUrl,
      callTextgen,
      buildWorldInfoPayload,
    ],
  );

  /**
   * 并发生成 N 个新 swipe 版本：
   * 1. 为最后一条 assistant 消息创建 N 个空 swipe 占位；
   * 2. 并发走 streamRegenInto 填充每个 swipe；
   * 3. 全部完成后一次性 updateMessage 持久化、默认激活第 1 个新 swipe。
   */
  const handleRegenerateMany = async (n: number = 1) => {
    if (isGenerating || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role !== "assistant") return;
    if (!currentChat?.id) return;

    // 【群聊分支】普通点击 = swipe（创建新版本），Shift+点击 = 整批 gen_id 重生
    if (isGroupChat) {
      if (n > 1) {
        // Shift+Click: 整批重生（原有行为）
        setIsGenerating(true);
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        try {
          await groupGen.runGroupRegenerate(abortController.signal, (m) => console.warn("[group regen]", m));
        } finally {
          setIsGenerating(false);
          abortControllerRef.current = null;
        }
        return;
      }
      // 普通点击: 对最后一条做 swipe
      const newId = await appendSwipe(currentChat.id, lastMsg.id, "", {
        send_date: new Date().toISOString(),
        gen_started: new Date().toISOString(),
        extra: { api: activeProvider, model: activeModel },
      });
      if (newId == null) return;
      setIsGenerating(true);
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      try {
        await groupGen.runGroupGeneration({
          type: "swipe",
          signal: abortController.signal,
          onError: (m) => console.warn("[group swipe]", m),
        });
        // 持久化 swipe 内容（同步到 swipes 数组 + 保留头像字段）
        const latestMsg = useChatStore.getState().currentChat?.messages.slice(-1)[0];
        if (latestMsg?.content) {
          const swipes = [...(latestMsg.swipes ?? [])];
          const swipeId = latestMsg.swipeId ?? 0;
          if (swipeId >= 0 && swipeId < swipes.length) {
            swipes[swipeId] = latestMsg.content;
          }
          await updateMessage(currentChat.id, lastMsg.id, {
            content: latestMsg.content,
            swipes,
            swipeId,
            originalAvatar: latestMsg.originalAvatar,
            forceAvatar: latestMsg.forceAvatar,
          });
        }
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
      return;
    }

    const startedAt = new Date().toISOString();
    const count = Math.max(1, Math.min(8, Math.floor(n)));

    // 串行创建 N 个空占位（appendSwipe 内部会 PATCH DB，串行可保证 newId 递增）
    const swipeIds: number[] = [];
    for (let i = 0; i < count; i++) {
      const id = await appendSwipe(currentChat.id, lastMsg.id, "", {
        send_date: startedAt,
        gen_started: startedAt,
        extra: { api: activeProvider, model: activeModel },
      });
      if (id == null) break;
      swipeIds.push(id);
    }
    if (swipeIds.length === 0) return;

    setIsGenerating(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const results = await Promise.all(
        swipeIds.map((id) =>
          streamRegenInto(lastMsg, id, abortController.signal),
        ),
      );

      const finishedAt = new Date().toISOString();
      const cur = useChatStore
        .getState()
        .currentChat?.messages.find((m) => m.id === lastMsg.id);
      if (cur && Array.isArray(cur.swipes)) {
        const swipes = [...cur.swipes];
        const swipeInfo = Array.isArray(cur.swipeInfo) ? [...cur.swipeInfo] : [];
        results.forEach((r, idx) => {
          const id = swipeIds[idx];
          const finalContent = r.aborted
            ? (r.content.trim() || "[Aborted]")
            : r.content;
          swipes[id] = finalContent;
          if (swipeInfo[id]) {
            swipeInfo[id] = {
              ...swipeInfo[id],
              gen_finished: finishedAt,
              extra: {
                ...(swipeInfo[id].extra ?? {}),
                api: activeProvider,
                model: activeModel,
              },
            };
          }
        });
        const activeId = swipeIds[0];
        await updateMessage(currentChat.id, lastMsg.id, {
          content: swipes[activeId],
          swipes,
          swipeId: activeId,
          swipeInfo,
          genStarted: startedAt,
          genFinished: finishedAt,
          extra: {
            ...(cur.extra ?? {}),
            api: activeProvider,
            model: activeModel,
          },
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  /** 单个 swipe 重生成。Shift+Click 会在外层路由到 handleRegenerateMany(N)。 */
  const handleRegenerate = () => handleRegenerateMany(1);

  /**
   * Continue 续写：不创建新 swipe，在最后一条 assistant 消息的 content 后面追加生成。
   */
  const handleContinue = async () => {
    if (isGenerating || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role !== "assistant" || !lastMsg.content.trim()) return;
    if (!currentChat?.id) return;

    // 【群聊分支】续写最后一个角色的发言
    if (isGroupChat) {
      setIsGenerating(true);
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      try {
        await groupGen.runGroupGeneration({
          type: "continue",
          signal: abortController.signal,
          onError: (m) => alert(`群聊续写失败: ${m}`),
        });
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
      return;
    }

    const baseContent = lastMsg.content;
    setIsGenerating(true);

    try {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const useTextgen = config.activeCategory === "text_completion";
      const chatMessages = messages.map((m) => ({ role: m.role, content: m.content }));
      const _rawSys3 =
        currentCharacter?.systemPrompt || currentCharacter?.description || undefined;
      const notePrompt3 = currentChat?.metadata?.note_prompt;
      let systemPrompt = _rawSys3 ? replaceMacros(_rawSys3, { user: activePersona?.name || "User", char: currentCharacter?.name ?? "Assistant", persona: activePersona?.descriptionPosition !== 9 ? activePersona?.description ?? "" : "" }) : undefined;
      if (notePrompt3) { systemPrompt = systemPrompt ? `${systemPrompt}\n${notePrompt3}` : notePrompt3; }
      // 追加一条 system 提示让模型从中间接着写
      chatMessages.push({
        role: "system",
        content: "[Continue the previous response without repeating it. Pick up exactly where it left off.]",
      });

      const onChunk = (s: string) => {
        const cur = useChatStore
          .getState()
          .currentChat?.messages.find((m) => m.id === lastMsg.id);
        if (!cur) return;
        const newContent = baseContent + s;
        const swipes = Array.isArray(cur.swipes) ? [...cur.swipes] : [newContent];
        const swipeId = cur.swipeId ?? 0;
        if (swipes.length > swipeId) swipes[swipeId] = newContent;
        useChatStore
          .getState()
          .patchMessage(lastMsg.id, { content: newContent, swipes });
      };

      const response = useTextgen
        ? await callTextgen(chatMessages, systemPrompt, abortController.signal)
        : await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: chatMessages,
              provider: activeProvider,
              model: activeModel,
              systemPrompt,
              customBaseURL: activeBaseUrl || undefined,
              worldInfo: buildWorldInfoPayload(),
            }),
            signal: abortController.signal,
          });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || "Continue failed");
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const continued = useTextgen
        ? await consumeTextgenStream(reader, { onChunk })
        : await consumePlainTextStream(reader, { onChunk });

      const finalContent = baseContent + continued;
      const cur = useChatStore
        .getState()
        .currentChat?.messages.find((m) => m.id === lastMsg.id);
      if (cur) {
        const swipes = Array.isArray(cur.swipes) ? [...cur.swipes] : [finalContent];
        const swipeId = cur.swipeId ?? 0;
        if (swipes.length > swipeId) swipes[swipeId] = finalContent;
        await updateMessage(currentChat.id, lastMsg.id, {
          content: finalContent,
          swipes,
          genFinished: new Date().toISOString(),
        });
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) {
        const errMsg = e instanceof Error ? e.message : "Unknown error";
        alert(`续写失败: ${errMsg}`);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  /**
   * Impersonate 代笔：让 AI 用用户的口吻写下一条消息，结果实时写入 input textarea，不会创建任何消息。
   */
  const handleImpersonate = async () => {
    if (isGenerating || !activeModel) return;

    // 【群聊分支】从随机一个启用成员视角代笔
    if (isGroupChat) {
      setIsGenerating(true);
      setInput("");
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      try {
        await groupGen.runGroupGeneration({
          type: "impersonate",
          signal: abortController.signal,
          onImpersonateChunk: (s) => setInput(s),
          onError: (m) => alert(`群聊代笔失败: ${m}`),
        });
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
      return;
    }

    setIsGenerating(true);
    setInput("");

    try {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const useTextgen = config.activeCategory === "text_completion";
      const chatMessages = messages.map((m) => ({ role: m.role, content: m.content }));
      const _rawSys4 =
        currentCharacter?.systemPrompt || currentCharacter?.description || "";
      const notePrompt4 = currentChat?.metadata?.note_prompt;
      const baseSys = replaceMacros(_rawSys4, { user: activePersona?.name || "User", char: currentCharacter?.name ?? "Assistant", persona: activePersona?.descriptionPosition !== 9 ? activePersona?.description ?? "" : "" });
      const userName = activePersona?.name || "User";
      const systemPrompt =
        `${[baseSys, notePrompt4].filter(Boolean).join("\n")}\n\n[INSTRUCTION: Write the next reply on behalf of ${userName} (the user). Stay in character context but speak in first person as the user. Keep it concise and natural.]`.trim();
      chatMessages.push({
        role: "system",
        content: `Write the next reply for ${userName} only. Do not narrate the assistant.`,
      });

      const onChunk = (s: string) => setInput(s);

      const response = useTextgen
        ? await callTextgen(chatMessages, systemPrompt, abortController.signal)
        : await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: chatMessages,
              provider: activeProvider,
              model: activeModel,
              systemPrompt,
              customBaseURL: activeBaseUrl || undefined,
            }),
            signal: abortController.signal,
          });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || "Impersonate failed");
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      await (useTextgen
        ? consumeTextgenStream(reader, { onChunk })
        : consumePlainTextStream(reader, { onChunk }));
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) {
        const errMsg = e instanceof Error ? e.message : "Unknown error";
        alert(`代笔失败: ${errMsg}`);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // 拖拽上传处理
  const handleDragFiles = async (fileList: FileList) => {
    const files = Array.from(fileList);
    if (!files.length) return;
    const next: Array<{ name: string; size: number; mimeType: string; text?: string; url: string }> = [];
    for (const f of files) {
      const buf = await f.arrayBuffer();
      const blob = new Blob([buf], { type: f.type });
      const url = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve(typeof r.result === "string" ? r.result : "");
        r.readAsDataURL(blob);
      });
      let text: string | undefined = undefined;
      if (f.type.startsWith("text/") || /\.(md|json|csv|txt)$/i.test(f.name)) {
        text = new TextDecoder().decode(buf);
      }
      next.push({ name: f.name, size: f.size, mimeType: f.type || "application/octet-stream", text, url });
    }
    setAttachments((prev) => [...prev, ...next]);
  };

  return (
    <div
      className="relative flex flex-col h-full"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleDragFiles(e.dataTransfer.files); }}
    >
      <DragOverlay visible={dragOver} />
      {/* 消息搜索栏 */}
      <ChatSearchBar
        open={searchOpen}
        onClose={() => { setSearchOpen(false); setSearchQuery(""); setSearchMatchIds([]); }}
        onSearch={handleSearch}
        matchIds={searchMatchIds}
        activeIndex={searchActiveIndex}
        onNavigate={handleSearchNavigate}
      />

      {/* Connection Warning */}
      {!isConnected && activeProvider && (
        <div className="bg-yellow-900/30 border-b border-yellow-700 px-4 py-2 text-xs text-yellow-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          Not connected to API. Go to <a href="/settings" className="underline">Settings</a> to configure.
        </div>
      )}
      {currentChat?.groupId && null}

      {/* Author's Note 快捷编辑 */}
      {currentChat?.id && (
        <div className="border-b border-border/60 px-4 py-1 text-[11px] text-muted-foreground flex items-center gap-2">
          <span className="shrink-0">作者注释:</span>
          <input
            value={currentChat.metadata?.note_prompt ?? ""}
            onChange={(e) => {
              const note = e.target.value;
              const meta = { ...(currentChat.metadata ?? {}), note_prompt: note };
              // 本地 patch
              useChatStore.setState((state) =>
                state.currentChat
                  ? {
                      currentChat: {
                        ...state.currentChat,
                        metadata: meta,
                      },
                    }
                  : state,
              );
            }}
            onBlur={(e) => {
              const note = e.target.value;
              const meta = { ...(currentChat.metadata ?? {}), note_prompt: note };
              fetch(`/api/chats/${currentChat.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ metadata: meta }),
              }).catch(() => { /* metadata patch 失败不影响功能 */ });
            }}
            placeholder="这里填入会被插入到 Prompt 里的提示词（可选）"
            className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
      )}

      {/* World Info indicator */}
      {(() => {
        const globalIds = wiSettings.globalSelect ?? [];
        const characterBookId = currentCharacter?.worldInfoBookId ?? null;
        const chatBookIds = currentChat?.metadata?.world_info_book_ids ?? [];
        const total = globalIds.length + (characterBookId ? 1 : 0) + chatBookIds.length;
        if (!total) return null;

        const nameOf = (id: string) => wiBooks.find((b) => b.id === id)?.name ?? id.slice(0, 8);
        const globalNames = globalIds.map(nameOf).filter(Boolean);
        const characterName = characterBookId ? nameOf(characterBookId) : null;
        const chatNames = chatBookIds.map(nameOf).filter(Boolean);

        return (
          <div className="border-b border-border px-4 py-1.5 text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
            <BookOpen size={12} />
            <span>世界书已激活：</span>
            {globalNames.length > 0 && (
              <span title={globalNames.join(", ")}>全局 [{globalNames.join(" · ")}]</span>
            )}
            {characterName && (
              <span
                className="text-amber-600 dark:text-amber-400"
                title={`角色卡自带绑定。若不想让它生效，请到角色详情页把“世界书”下拉选成“无”后保存。`}
              >
                · 角色绑定 [{characterName}]
              </span>
            )}
            {chatNames.length > 0 && (
              <span title={chatNames.join(", ")}>· 聊天 [{chatNames.join(" · ")}]</span>
            )}
            {currentCharacter?.id && characterName && (
              <a
                href={`/characters/${currentCharacter.id}`}
                className="text-primary hover:underline"
                title="去角色详情页解绑世界书"
              >
                解绑角色书
              </a>
            )}
            <a href="/world-info" className="ml-auto text-primary hover:underline">管理</a>
          </div>
        );
      })()}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 min-h-0 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {currentCharacter
              ? `开始与 ${currentCharacter.name} 对话吧`
              : "选择一个角色开始对话，或直接输入消息"}
          </div>
        )}
        {messages.map((message, idx) => {
          const isLast = idx === messages.length - 1;
          const streaming =
            isGenerating && isLast && message.role === "assistant";
          // 【群聊】按 originalAvatar 反查该消息对应的角色，使头像/名字 fallback 可以拿到 character.systemPrompt 等完整信息
          const msgChar =
            isGroupChat && message.originalAvatar
              ? groupMembers.find((c) => c.id === message.originalAvatar) ?? currentCharacter
              : currentCharacter;
          return (
            <div key={message.id} id={`msg-${message.id}`}>
            <MessageBubble
              message={message}
              character={msgChar}
              isLast={isLast}
              streaming={streaming}
              generating={isGenerating}
              highlightText={searchQuery}
              selectable={multiSelectMode}
              selected={selectedIds.has(message.id)}
              onToggleSelect={() => {
                setSelectedIds(prev => {
                  const next = new Set(prev);
                  if (next.has(message.id)) next.delete(message.id);
                  else next.add(message.id);
                  return next;
                });
              }}
              onCopy={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  void navigator.clipboard.writeText(message.content);
                }
              }}
              onNarrate={
                message.role === "assistant"
                  ? () => speakText(message.content)
                  : undefined
              }
              onEdit={
                currentChat?.id
                  ? async (next) => {
                      await updateMessage(currentChat.id, message.id, {
                        content: next,
                      });
                    }
                  : undefined
              }
              onDelete={
                currentChat?.id
                  ? () => {
                      if (confirm("确定要删除这条消息吗？")) {
                        void deleteMessage(currentChat.id, message.id);
                      }
                    }
                  : undefined
              }
              onToggleHide={
                currentChat?.id
                  ? () =>
                      void setMessageHidden(
                        currentChat.id,
                        message.id,
                        !message.isSystem,
                      )
                  : undefined
              }
              onRegenerate={
                isLast && message.role === "assistant"
                  ? (e?: React.MouseEvent) => {
                      if (e?.shiftKey) {
                        void handleRegenerateMany(4);
                      } else {
                        void handleRegenerate();
                      }
                    }
                  : undefined
              }
              onSwipePrev={
                isLast &&
                message.role === "assistant" &&
                currentChat?.id &&
                (message.swipes?.length ?? 0) > 1 &&
                (message.swipeId ?? 0) > 0
                  ? () =>
                      void setActiveSwipe(
                        currentChat.id,
                        message.id,
                        (message.swipeId ?? 0) - 1,
                      )
                  : undefined
              }
              onSwipeNext={
                isLast &&
                message.role === "assistant" &&
                currentChat?.id &&
                (message.swipeId ?? 0) <
                  (message.swipes?.length ?? 1) - 1
                  ? () =>
                      void setActiveSwipe(
                        currentChat.id,
                        message.id,
                        (message.swipeId ?? 0) + 1,
                      )
                  : undefined
              }
              onSwipeOverflow={
                isLast && message.role === "assistant"
                  ? handleRegenerate
                  : undefined
              }
              onSwipeSelect={
                currentChat?.id
                  ? (i) =>
                      void setActiveSwipe(currentChat.id, message.id, i)
                  : undefined
              }
              onSwipeDelete={
                currentChat?.id
                  ? (i) =>
                      void deleteSwipe(currentChat.id, message.id, i)
                  : undefined
              }
              onMoveUp={
                currentChat?.id && idx > 0
                  ? () => void moveMessage(currentChat.id, message.id, "up")
                  : undefined
              }
              onMoveDown={
                currentChat?.id && idx < messages.length - 1
                  ? () => void moveMessage(currentChat.id, message.id, "down")
                  : undefined
              }
              onAddReasoning={
                currentChat?.id && message.role === "assistant" && !message.extra?.reasoning
                  ? () => void addEmptyReasoning(currentChat.id, message.id)
                  : undefined
              }
              onCreateBranch={
                currentChat?.id
                  ? async () => {
                      const newId = await createBranch(currentChat.id, message.id);
                      if (newId) {
                        if (
                          confirm("分支创建成功，是否切换到新分支？")
                        ) {
                          await useChatStore.getState().loadChat(newId);
                        }
                      } else {
                        alert("分支创建失败");
                      }
                    }
                  : undefined
              }
              onCreateBookmark={
                currentChat?.id
                  ? async () => {
                      const newId = await createBookmark(currentChat.id, message.id);
                      if (newId) {
                        alert("检查点已创建");
                      } else {
                        alert("创建检查点失败");
                      }
                    }
                  : undefined
              }
              onRemoveBookmark={
                currentChat?.id && message.bookmarkLink
                  ? async () => {
                      if (!confirm("移除检查点标记？\n（对应的分支聊天不会被删除，仅清除标记）")) return;
                      await updateMessage(currentChat.id, message.id, { bookmarkLink: null });
                    }
                  : undefined
              }
            />
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 多选操作栏 */}
      {multiSelectMode && selectedIds.size > 0 && (
        <ChatMultiSelectBar
          selectedIds={selectedIds}
          messages={messages}
          onDelete={async () => {
            if (!currentChat?.id || selectedIds.size === 0) return;
            if (!confirm(`确定删除选中的 ${selectedIds.size} 条消息吗？`)) return;
            for (const id of selectedIds) { await deleteMessage(currentChat.id, id); }
            setSelectedIds(new Set()); setMultiSelectMode(false);
          }}
          onExport={() => {
            const md = exportMessagesAsMarkdown(messages, selectedIds);
            const blob = new Blob([md], { type: "text/markdown" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url;
            a.download = `chat-export-${new Date().toISOString().slice(0,10)}.md`;
            a.click(); URL.revokeObjectURL(url);
          }}
          onCopy={() => { void navigator.clipboard.writeText(selectedMessagesToText(messages, selectedIds)); }}
          onCancel={() => { setMultiSelectMode(false); setSelectedIds(new Set()); }}
        />
      )}

      {/* 跳转到底部浮动按钮 */}
      {!isAtBottom && messages.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setIsAtBottom(true);
            scrollToBottom("smooth");
          }}
          title="跳到底部"
          className="absolute right-6 bottom-28 z-10 w-9 h-9 rounded-full bg-primary text-primary-foreground shadow-lg grid place-items-center hover:scale-105 transition-transform"
        >
          <ArrowDown size={16} />
        </button>
      )}

      {/* Input Area */}
      <div className="border-t border-border bg-background/95 backdrop-blur-sm px-3 sm:px-4 py-3">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          {/* 隐藏的文件选择器 */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              if (!files.length) return;
              const next: typeof attachments = [];
              for (const f of files) {
                const buf = await f.arrayBuffer();
                const blob = new Blob([buf], { type: f.type });
                const url = await new Promise<string>((resolve) => {
                  const r = new FileReader();
                  r.onloadend = () =>
                    resolve(typeof r.result === "string" ? r.result : "");
                  r.readAsDataURL(blob);
                });
                let text: string | undefined = undefined;
                if (
                  f.type.startsWith("text/") ||
                  /\.(md|json|csv|txt)$/i.test(f.name)
                ) {
                  text = new TextDecoder().decode(buf);
                }
                next.push({
                  name: f.name,
                  size: f.size,
                  mimeType: f.type || "application/octet-stream",
                  text,
                  url,
                });
              }
              setAttachments((prev) => [...prev, ...next]);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />

          {/* Composer 卡片 */}
          <div
            className={cn(
              "relative rounded-2xl border border-border bg-card shadow-sm transition-all",
              "focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/60",
              !isConnected && "opacity-80",
            )}
          >
            {/* @ 提及选择器（仅群聊模式） */}
            {isGroupChat && (
              <MentionPicker
                members={groupMembers}
                query={mentionQuery ?? ""}
                visible={mentionQuery !== null}
                selectedIndex={mentionSelectedIndex}
                onSelect={(member) => {
                  // 替换 @搜索文本 为 @角色名 + 空格
                  const before = input.slice(0, mentionAtIndex);
                  const after = input.slice(mentionAtIndex + 1 + (mentionQuery?.length ?? 0));
                  const newInput = `${before}@${member.name} ${after}`;
                  const cursorPos = mentionAtIndex + 1 + member.name.length + 1; // @名字+空格
                  setInput(newInput);
                  setMentionQuery(null);
                  setMentionSelectedIndex(0);
                  // 下一帧设置光标位置到插入文本末尾
                  setTimeout(() => {
                    const el = textareaRef.current;
                    if (el) { el.focus(); el.selectionStart = el.selectionEnd = cursorPos; }
                  }, 0);
                }}
              />
            )}
            {/* 斜杠命令提示 */}
            <SlashCommandHints
              input={input}
              visible={input.startsWith("/") && !input.includes("\n")}
              selectedIndex={0}
              onSelect={(cmd: SlashCommand) => setInput(`/${cmd.cmd} `)}
            />
            {/* 附件预贴（嵌入在卡片顶部） */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-3 pt-2.5 pb-0">
                {attachments.map((a, i) => (
                  <div
                    key={`${a.name}-${i}`}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2 py-1 text-xs"
                    title={`${a.name} · ${(a.size / 1024).toFixed(1)} KB`}
                  >
                    <Paperclip size={12} className="text-muted-foreground shrink-0" />
                    <span className="max-w-[160px] truncate">{a.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="移除附件"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* textarea：带自适应高度，无 border，面积更大 */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                const val = e.target.value;
                setInput(val);
                // 自适应高度（最大20行左右）
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(300, el.scrollHeight)}px`;
                // @ 提及检测（仅群聊模式）
                if (isGroupChat) {
                  const cursor = el.selectionStart ?? val.length;
                  const mention = extractMentionQuery(val, cursor);
                  if (mention) {
                    setMentionQuery(mention.query);
                    setMentionAtIndex(mention.atIndex);
                    setMentionSelectedIndex(0);
                  } else {
                    setMentionQuery(null);
                  }
                }
              }}
              onKeyDown={(e) => {
                // @ 提及浮层键盘导航
                if (mentionQuery !== null && isGroupChat && groupMembers.length > 0) {
                  const q = (mentionQuery ?? "").toLowerCase();
                  const filtered = q ? groupMembers.filter((m) => m.name.toLowerCase().includes(q)) : groupMembers;
                  if (filtered.length > 0) {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setMentionSelectedIndex((prev) => (prev + 1) % filtered.length);
                      return;
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setMentionSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
                      return;
                    }
                    if (e.key === "Enter" || e.key === "Tab") {
                      e.preventDefault();
                      const picked = filtered[mentionSelectedIndex];
                      if (picked) {
                        const before = input.slice(0, mentionAtIndex);
                        const after = input.slice(mentionAtIndex + 1 + (mentionQuery?.length ?? 0));
                        const newVal = `${before}@${picked.name} ${after}`;
                        const cursorPos = mentionAtIndex + 1 + picked.name.length + 1;
                        setInput(newVal);
                        setTimeout(() => {
                          const el = textareaRef.current;
                          if (el) { el.selectionStart = el.selectionEnd = cursorPos; }
                        }, 0);
                      }
                      setMentionQuery(null);
                      setMentionSelectedIndex(0);
                      return;
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setMentionQuery(null);
                      return;
                    }
                  }
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                } else if (
                  e.key === "ArrowUp" &&
                  !e.shiftKey &&
                  !e.ctrlKey &&
                  !e.metaKey &&
                  input === ""
                ) {
                  const lastUser = [...messages].reverse().find((m) => m.isUser);
                  if (lastUser) {
                    e.preventDefault();
                    setInput(lastUser.content);
                  }
                }
              }}
              placeholder={
                isConnected
                  ? isGroupChat
                    ? "输入消息 / 输入 @ 提及角色 / 输入 / 查看命令…"
                    : "输入消息 / 输入 / 可查看斜杠命令…"
                  : "未连接 API。请到 Settings 里配置后再试。"
              }
              rows={1}
              className="block w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm leading-relaxed focus:outline-none placeholder:text-muted-foreground/50 min-h-[64px] max-h-[300px]"
            />

            {/* 底部 toolbar */}
            <div className="flex items-center justify-between gap-2 px-1.5 py-1.5 border-t border-border/50">
              {/* 左侧次要操作 */}
              <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-thin">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-1 px-2"
                  onClick={() => setSearchOpen(!searchOpen)}
                  title="搜索消息 (Ctrl+F)"
                >
                  <SearchIcon size={14} />
                  <span className="hidden sm:inline">搜索</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-1 px-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                  title="附加文件"
                >
                  <Paperclip size={14} />
                  <span className="hidden sm:inline">附件</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-1 px-2"
                  onClick={() => void handleImpersonate()}
                  disabled={isGenerating}
                  title="代笔（让 AI 帮你写下一条）"
                >
                  <Wand2 size={14} />
                  <span className="hidden sm:inline">代笔</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-1 px-2"
                  onClick={() => void handleContinue()}
                  disabled={
                    isGenerating ||
                    messages.length === 0 ||
                    messages[messages.length - 1]?.role !== "assistant"
                  }
                  title="续写最后一条"
                >
                  <ArrowRight size={14} />
                  <span className="hidden sm:inline">续写</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-1 px-2"
                  onClick={handleRegenerate}
                  disabled={isGenerating || messages.length === 0}
                  title="重新生成最后一条（Shift+点击 生成 4 个版本）"
                >
                  <RotateCcw size={14} />
                  <span className="hidden sm:inline">重生</span>
                </Button>
                <Button
                  type="button"
                  variant={multiSelectMode ? "secondary" : "ghost"}
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-1 px-2"
                  onClick={() => { setMultiSelectMode(!multiSelectMode); setSelectedIds(new Set()); }}
                  title="多选消息"
                >
                  <CheckSquare size={14} />
                  <span className="hidden sm:inline">多选</span>
                </Button>
              </div>

              {/* 统计按钮（脱离 overflow 容器以允许弹出浮层） */}
              <ChatStats messages={messages} />

              {/* 右侧主操作 */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden md:inline text-[10px] text-muted-foreground/70 select-none">
                  Enter 发送 · Shift+Enter 换行
                </span>
                {isGenerating ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleStop}
                    className="gap-1"
                    title="中止生成"
                  >
                    <Square size={14} />
                    <span>停止</span>
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!input.trim() && attachments.length === 0}
                    className="gap-1"
                    title="发送 (Enter)"
                  >
                    <Send size={14} />
                    <span>发送</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
