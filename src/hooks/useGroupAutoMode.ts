/**
 * 群聊 Auto Mode 自动触发 hook
 * 对齐原项目 setAutoModeWorker / groupChatAutoModeWorker (group-chats.js L139-148, L1396-1414)
 *
 * 行为：
 * - 仅在 enabled && isGroupChat 时启动 setInterval(worker, autoModeDelay * 1000)
 * - 每次触发先检查 isGenerating，避免与正在进行的生成冲突
 * - 使用独立的 AbortController，关闭开关时立即 abort
 */
"use client";

import { useEffect } from "react";
import { useChatStore } from "@/stores/chat-store";
import { useGroupAutoModeStore } from "@/stores/group-auto-mode-store";
import { useGroupGeneration } from "@/hooks/useGroupGeneration";

export function useGroupAutoMode() {
  const enabled = useGroupAutoModeStore((s) => s.enabled);
  const setIsGenerating = useChatStore((s) => s.setIsGenerating);
  const groupGen = useGroupGeneration();
  const delaySec = groupGen.group?.autoModeDelay ?? 5;
  const isGroupChat = groupGen.isGroupChat;

  useEffect(() => {
    if (!enabled || !isGroupChat) return;

    let cancelled = false;
    let ac: AbortController | null = null;

    const worker = async () => {
      if (cancelled) return;
      // 已经在生成中：跳过本轮
      if (useChatStore.getState().isGenerating) return;
      ac = new AbortController();
      setIsGenerating(true);
      try {
        await groupGen.runGroupGeneration({
          type: "auto",
          signal: ac.signal,
          onError: (m) => console.warn("[group auto]", m),
        });
      } catch (e) {
        console.warn("[group auto] worker error:", e);
      } finally {
        setIsGenerating(false);
        ac = null;
      }
    };

    const ms = Math.max(1, delaySec) * 1000;
    const timer = setInterval(() => {
      void worker();
    }, ms);

    return () => {
      cancelled = true;
      clearInterval(timer);
      if (ac) ac.abort();
    };
  }, [enabled, isGroupChat, delaySec, groupGen, setIsGenerating]);
}
