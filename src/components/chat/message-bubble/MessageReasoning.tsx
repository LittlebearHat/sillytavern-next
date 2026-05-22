"use client";

import { useState } from "react";
import { Brain, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/chat/markdown/MarkdownRenderer";

export interface MessageReasoningProps {
  reasoning?: string;
  durationMs?: number;
  /** 是否流式中 */
  streaming?: boolean;
  /** 默认折叠状态 */
  defaultOpen?: boolean;
  className?: string;
}

/** 把毫秒格式化成 "Thought for 1.2s" / "12.3s" */
function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return "Thought for some time";
  const sec = ms / 1000;
  if (sec < 60) return `Thought for ${sec.toFixed(1)}s`;
  const min = Math.floor(sec / 60);
  const rem = (sec - min * 60).toFixed(0);
  return `Thought for ${min}m ${rem}s`;
}

/**
 * 推理（Reasoning）折叠块，对齐原项目 .mes_reasoning_details。
 * 流式中默认展开，结束后默认折叠。
 */
export function MessageReasoning({
  reasoning,
  durationMs,
  streaming,
  defaultOpen,
  className,
}: MessageReasoningProps) {
  const [open, setOpen] = useState<boolean>(defaultOpen ?? !!streaming);
  if (!reasoning?.trim()) return null;

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className={cn(
        "group rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs my-1.5",
        className,
      )}
    >
      <summary className="flex items-center gap-1.5 cursor-pointer select-none list-none text-muted-foreground hover:text-foreground transition-colors">
        <Brain size={12} className={cn(streaming && "animate-pulse")} />
        <span className="flex-1">{streaming ? "Thinking..." : formatDuration(durationMs)}</span>
        <ChevronDown
          size={12}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </summary>
      <div className="mt-1.5 pt-1.5 border-t border-border/40 text-muted-foreground">
        <MarkdownRenderer content={reasoning} compact />
      </div>
    </details>
  );
}
