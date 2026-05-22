"use client";

import { useEffect, useRef } from "react";
import { Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SwipePickerProps {
  open: boolean;
  swipes: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onDelete?: (index: number) => void;
  onClose: () => void;
  className?: string;
}

/**
 * Swipe 历史选择器 — 列表形式展示所有版本，对齐原项目 .mes_swipe_picker 弹窗。
 * 点击任意行切换激活版本；删除按钮在 swipes.length > 1 时可用。
 */
export function SwipePicker({
  open,
  swipes,
  activeIndex,
  onSelect,
  onDelete,
  onClose,
  className,
}: SwipePickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // defer to avoid immediately catching the open click
    const t = setTimeout(() => {
      document.addEventListener("mousedown", onClick);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Swipe 历史"
      className={cn(
        "absolute right-0 top-full mt-1 z-30 w-72 max-h-80 overflow-y-auto rounded-md border border-border bg-popover shadow-xl p-1",
        className,
      )}
    >
      <div className="flex items-center justify-between px-2 py-1 sticky top-0 bg-popover border-b border-border">
        <span className="text-[11px] font-medium text-muted-foreground">
          版本历史 · {swipes.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="w-5 h-5 grid place-items-center rounded hover:bg-accent text-muted-foreground"
          aria-label="关闭"
        >
          <X size={11} />
        </button>
      </div>
      <div className="flex flex-col gap-0.5 mt-1">
        {swipes.map((s, i) => {
          const preview = (s || "").trim().slice(0, 120) || "(空)";
          const isActive = i === activeIndex;
          return (
            <div
              key={i}
              className={cn(
                "group/picker flex items-start gap-1.5 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors",
                isActive
                  ? "bg-primary/15 text-foreground ring-1 ring-primary/40"
                  : "hover:bg-accent",
              )}
              onClick={() => {
                if (!isActive) onSelect(i);
                onClose();
              }}
            >
              <span
                className={cn(
                  "shrink-0 w-5 h-5 grid place-items-center rounded-full text-[10px] font-mono tabular-nums",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              <span className="flex-1 line-clamp-3 leading-snug whitespace-pre-wrap break-words">
                {preview}
              </span>
              {onDelete && swipes.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`确定删除版本 #${i + 1}？`)) onDelete(i);
                  }}
                  title={`删除版本 ${i + 1}`}
                  className="shrink-0 w-5 h-5 grid place-items-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover/picker:opacity-100 transition-opacity"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
