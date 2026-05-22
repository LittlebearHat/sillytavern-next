"use client";

import { useState, useMemo } from "react";
import type { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/chat/markdown/MarkdownRenderer";
import { MessageAttachments } from "@/components/chat/MessageAttachments";
import { ChevronDown, ChevronUp } from "lucide-react";

/** 折叠阈值 */
const COLLAPSE_CHAR_THRESHOLD = 500;
const COLLAPSE_LINE_THRESHOLD = 15;
const COLLAPSED_PREVIEW_CHARS = 300;

export interface MessageBodyProps {
  message: ChatMessage;
  /** 是否处于流式生成中（用于显示打字光标） */
  streaming?: boolean;
  /** 搜索高亮文本 */
  highlightText?: string;
  className?: string;
}

/** 判断内容是否应该折叠 */
function shouldCollapse(content: string): boolean {
  if (content.length > COLLAPSE_CHAR_THRESHOLD) return true;
  const lines = content.split("\n").length;
  return lines > COLLAPSE_LINE_THRESHOLD;
}

/**
 * 消息正文渲染：Markdown + 流式光标 + 长消息折叠 + 搜索高亮
 */
export function MessageBody({ message, streaming, highlightText, className }: MessageBodyProps) {
  const content = message.content ?? "";
  const isEmpty = !content.trim();
  const bias = message.extra?.bias?.trim();

  // 折叠逻辑：streaming 时不折叠
  const needsCollapse = !streaming && shouldCollapse(content);
  const [collapsed, setCollapsed] = useState(needsCollapse);

  // 显示的内容
  const displayContent = useMemo(() => {
    if (!collapsed) return content;
    return content.slice(0, COLLAPSED_PREVIEW_CHARS);
  }, [collapsed, content]);

  return (
    <div className={cn("space-y-1.5", className)}>
      {isEmpty && streaming ? (
        <span className="inline-flex gap-1 items-end h-5">
          <span
            className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </span>
      ) : (
        <div className="break-words relative">
          <div className={cn(collapsed && "relative overflow-hidden")}>
            <MarkdownRenderer content={displayContent} />
            {/* 折叠渐变遮罩 */}
            {collapsed && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
            )}
          </div>
          {streaming && (
            <span className="inline-block w-1.5 h-3.5 ml-0.5 -mb-0.5 bg-foreground/70 align-baseline animate-cursor-blink" />
          )}
          {/* 折叠/展开按钮 */}
          {needsCollapse && (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {collapsed ? (
                <><ChevronDown size={12} /> 展开全文（共 {content.length} 字）</>
              ) : (
                <><ChevronUp size={12} /> 收起</>
              )}
            </button>
          )}
        </div>
      )}

      {/* 消息内附件展示 */}
      {message.extra?.files && message.extra.files.length > 0 && (
        <MessageAttachments files={message.extra.files} />
      )}

      {/* bias 区域（原项目 .mes_bias） */}
      {bias && (
        <div className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-400 italic">
          {bias}
        </div>
      )}
    </div>
  );
}
