"use client";

import { Ghost } from "lucide-react";
import type { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";
import { MessageButtons, type MessageButtonsProps } from "./MessageButtons";

export interface MessageHeaderProps {
  message: ChatMessage;
  /** 是否最新一条 */
  isLast?: boolean;
  /** 生成中 */
  generating?: boolean;
  /** 当前是否处于编辑模式（编辑模式下 buttons 隐藏） */
  editing?: boolean;
  /** 操作按钮回调（透传给 MessageButtons） */
  buttons?: Omit<MessageButtonsProps, "isLast" | "generating" | "hidden">;
  className?: string;
}

/** 把 ISO / 字符串时间戳格式化为本地友好显示 */
function formatTimestamp(input?: string): string {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return d.toLocaleString();
}

/**
 * 消息卡顶部横条：名字 + ghost 图标 + timestamp + 操作按钮组。
 * 对齐原项目 .ch_name 区域。
 */
export function MessageHeader({
  message,
  isLast,
  generating,
  editing,
  buttons,
  className,
}: MessageHeaderProps) {
  const ts = formatTimestamp(message.sendDate ?? message.createdAt?.toISOString?.());
  const tokenCount = message.extra?.token_count;
  const model = message.extra?.model;
  const api = message.extra?.api;
  const ttftMs = message.extra?.time_to_first_token;
  const reasoningDuration = message.extra?.reasoning_duration;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 mb-1 text-xs",
        className,
      )}
    >
      <div className="flex items-baseline gap-1.5 flex-1 min-w-0">
        <span className="font-medium text-foreground truncate">{message.name}</span>
        {message.isSystem && (
          <span
            title="此消息对 AI 不可见"
            className="shrink-0 inline-flex items-center text-muted-foreground"
            aria-label="此消息对 AI 不可见"
          >
            <Ghost size={11} />
          </span>
        )}
        {ts && (
          <span className="text-[10px] text-muted-foreground shrink-0" title={ts}>
            {ts}
          </span>
        )}
        {/* 元信息：token / 模型 / TTFT / reasoning duration */}
        <span className="flex items-center gap-1.5 ml-auto text-[10px] text-muted-foreground/80 truncate">
          {typeof tokenCount === "number" && tokenCount > 0 && (
            <span title="Token 数">{tokenCount}t</span>
          )}
          {typeof ttftMs === "number" && ttftMs > 0 && (
            <span title="首 token 延迟">⏱ {(ttftMs / 1000).toFixed(2)}s</span>
          )}
          {typeof reasoningDuration === "number" && reasoningDuration > 0 && (
            <span title="推理耗时">🧠 {(reasoningDuration / 1000).toFixed(1)}s</span>
          )}
          {model && (
            <span className="font-mono truncate" title={`${api ? api + " · " : ""}${model}`}>
              {model}
            </span>
          )}
        </span>
      </div>
      {!editing && buttons && (
        <MessageButtons
          {...buttons}
          isLast={isLast}
          generating={generating}
          hidden={message.isSystem}
        />
      )}
    </div>
  );
}
