"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { BarChart3, X } from "lucide-react";
import type { ChatMessage } from "@/types";

interface ChatStatsProps {
  messages: ChatMessage[];
}

/** 粗估 token 数：英文约 4 chars/token，中文约 1.5 chars/token */
function estimateTokens(text: string): number {
  let cjk = 0;
  let other = 0;
  for (const ch of text) {
    if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(ch)) {
      cjk++;
    } else {
      other++;
    }
  }
  return Math.ceil(cjk / 1.5 + other / 4);
}

/**
 * 聊天统计面板 — 浮动在聊天区域右下角
 */
export function ChatStats({ messages }: ChatStatsProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState({ left: 0, bottom: 0 });

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = useCallback(() => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPanelPos({ left: rect.left, bottom: window.innerHeight - rect.top + 8 });
    }
    setOpen(v => !v);
  }, [open]);

  const stats = useMemo(() => {
    const total = messages.length;
    const userMsgs = messages.filter(m => m.role === "user" || m.isUser);
    const aiMsgs = messages.filter(m => m.role === "assistant" && !m.isUser);
    const sysMsgs = messages.filter(m => m.role === "system" || m.isSystem);

    const allText = messages.map(m => m.content).join("");
    const totalChars = allText.length;
    // 统计字数（中文按字，英文按词）
    const wordCount = allText
      .replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, " _ ")
      .split(/\s+/)
      .filter(Boolean).length;
    const tokens = estimateTokens(allText);

    // 对话时长
    const times = messages
      .map(m => m.createdAt ? new Date(m.createdAt).getTime() : 0)
      .filter(t => t > 0);
    let duration = "";
    if (times.length >= 2) {
      const diff = Math.max(...times) - Math.min(...times);
      const mins = Math.floor(diff / 60000);
      if (mins < 60) {
        duration = `${mins} 分钟`;
      } else {
        const hrs = Math.floor(mins / 60);
        const rem = mins % 60;
        duration = `${hrs} 小时 ${rem} 分钟`;
      }
    }

    // Swipe 版本数
    const totalSwipes = messages.reduce((acc, m) => acc + (m.swipes?.length ?? 0), 0);

    return { total, user: userMsgs.length, ai: aiMsgs.length, sys: sysMsgs.length, totalChars, wordCount, tokens, duration, totalSwipes };
  }, [messages]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-accent"
        title="对话统计"
      >
        <BarChart3 size={14} />
        <span className="hidden sm:inline">统计</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          className="fixed z-50 w-64 bg-popover border border-border rounded-lg shadow-xl p-3 space-y-2"
          style={{ left: panelPos.left, bottom: panelPos.bottom }}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">对话统计</h4>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <StatRow label="总消息" value={`${stats.total} 条`} />
            <StatRow label="用户消息" value={`${stats.user} 条`} />
            <StatRow label="AI 消息" value={`${stats.ai} 条`} />
            <StatRow label="系统消息" value={`${stats.sys} 条`} />
            <StatRow label="总字符" value={`${stats.totalChars.toLocaleString()}`} />
            <StatRow label="总词数" value={`${stats.wordCount.toLocaleString()}`} />
            <StatRow label="估算 Token" value={`~${stats.tokens.toLocaleString()}`} />
            {stats.totalSwipes > 0 && (
              <StatRow label="Swipe 版本" value={`${stats.totalSwipes}`} />
            )}
          </div>

          {stats.duration && (
            <div className="text-[11px] text-muted-foreground pt-1 border-t border-border">
              对话时长：{stats.duration}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right">{value}</span>
    </>
  );
}
