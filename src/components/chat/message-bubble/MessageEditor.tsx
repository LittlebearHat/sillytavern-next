"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy, Lightbulb, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MessageEditorProps {
  initialValue: string;
  onSave: (next: string) => void | Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAddReasoning?: () => void;
  className?: string;
}

/**
 * 编辑模式组件，对齐原项目 .mes_edit_buttons + textarea。
 * 操作：保存 / 取消 / 复制 / 删除。
 * 上下移动 / 添加推理块 在 Task 5/10 接入。
 */
export function MessageEditor({
  initialValue,
  onSave,
  onCancel,
  onDelete,
  onCopy,
  onMoveUp,
  onMoveDown,
  onAddReasoning,
  className,
}: MessageEditorProps) {
  const [value, setValue] = useState(initialValue);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.focus();
    // 把光标定位到末尾
    const len = el.value.length;
    el.setSelectionRange(len, len);
    // 自动高度
    el.style.height = "auto";
    el.style.height = `${Math.min(600, el.scrollHeight)}px`;
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.key === "Enter" && (e.ctrlKey || e.metaKey)) || e.key === "F2") {
      e.preventDefault();
      void onSave(value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          const el = e.currentTarget;
          el.style.height = "auto";
          el.style.height = `${Math.min(600, el.scrollHeight)}px`;
        }}
        onKeyDown={handleKeyDown}
        rows={3}
        className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        placeholder="编辑消息..."
      />
      <div className="flex items-center gap-1 flex-wrap">
        <EditBtn title="保存 (Ctrl/⌘+Enter)" onClick={() => void onSave(value)}>
          <Check size={13} />
        </EditBtn>
        <EditBtn title="取消 (Esc)" onClick={onCancel}>
          <X size={13} />
        </EditBtn>
        {onCopy && (
          <EditBtn title="复制" onClick={onCopy}>
            <Copy size={13} />
          </EditBtn>
        )}
        {onAddReasoning && (
          <EditBtn title="添加推理块" onClick={onAddReasoning}>
            <Lightbulb size={13} />
          </EditBtn>
        )}
        {onMoveUp && (
          <EditBtn title="上移" onClick={onMoveUp}>
            <ChevronUp size={13} />
          </EditBtn>
        )}
        {onMoveDown && (
          <EditBtn title="下移" onClick={onMoveDown}>
            <ChevronDown size={13} />
          </EditBtn>
        )}
        {onDelete && (
          <EditBtn title="删除此消息" onClick={onDelete} variant="danger">
            <Trash2 size={13} />
          </EditBtn>
        )}
      </div>
    </div>
  );
}

function EditBtn({
  children,
  title,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  variant?: "danger";
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "h-7 px-2 inline-flex items-center justify-center rounded text-xs border border-border bg-background hover:bg-accent transition-colors",
        variant === "danger" &&
          "text-destructive hover:bg-destructive/10 border-destructive/30",
      )}
    >
      {children}
    </button>
  );
}
