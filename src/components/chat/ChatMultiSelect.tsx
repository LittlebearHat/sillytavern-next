"use client";

import { Copy, Trash2, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/types";

interface ChatMultiSelectBarProps {
  selectedIds: Set<string>;
  messages: ChatMessage[];
  onDelete: () => void;
  onExport: () => void;
  onCopy: () => void;
  onCancel: () => void;
}

/**
 * 多选模式底部浮动操作栏
 */
export function ChatMultiSelectBar({
  selectedIds,
  messages,
  onDelete,
  onExport,
  onCopy,
  onCancel,
}: ChatMultiSelectBarProps) {
  const count = selectedIds.size;
  if (count === 0) return null;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-popover border border-border shadow-xl">
      <span className="text-sm text-foreground font-medium whitespace-nowrap">
        已选 {count} 条
      </span>

      <div className="w-px h-5 bg-border" />

      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-xs"
        onClick={onCopy}
        title="复制选中文本"
      >
        <Copy size={14} /> 复制
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-xs"
        onClick={onExport}
        title="导出为 Markdown"
      >
        <Download size={14} /> 导出
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-xs text-destructive hover:text-destructive"
        onClick={onDelete}
        title="批量删除"
      >
        <Trash2 size={14} /> 删除
      </Button>

      <div className="w-px h-5 bg-border" />

      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-xs"
        onClick={onCancel}
        title="退出多选"
      >
        <X size={14} /> 取消
      </Button>
    </div>
  );
}

/** 将选中消息导出为 Markdown 文本 */
export function exportMessagesAsMarkdown(
  messages: ChatMessage[],
  selectedIds: Set<string>,
): string {
  const selected = messages.filter((m) => selectedIds.has(m.id));
  return selected
    .map((m) => {
      const time = m.createdAt
        ? new Date(m.createdAt).toLocaleString("zh-CN")
        : "";
      const header = `### ${m.name ?? (m.isUser ? "User" : "Assistant")}${time ? ` (${time})` : ""}`;
      return `${header}\n\n${m.content}`;
    })
    .join("\n\n---\n\n");
}

/** 将选中消息拼接为纯文本 */
export function selectedMessagesToText(
  messages: ChatMessage[],
  selectedIds: Set<string>,
): string {
  const selected = messages.filter((m) => selectedIds.has(m.id));
  return selected
    .map((m) => `${m.name ?? (m.isUser ? "User" : "Assistant")}: ${m.content}`)
    .join("\n\n");
}
