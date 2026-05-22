"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";

interface ChatSearchBarProps {
  open: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  matchIds: string[];
  activeIndex: number;
  onNavigate: (index: number) => void;
}

/**
 * 聊天消息搜索栏 — Ctrl+F 唤出，ESC 关闭
 */
export function ChatSearchBar({
  open,
  onClose,
  onSearch,
  matchIds,
  activeIndex,
  onNavigate,
}: ChatSearchBarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 打开时聚焦输入框
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setQuery("");
    onSearch("");
    onClose();
  }, [onClose, onSearch]);

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      onSearch(value);
    },
    [onSearch],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        if (matchIds.length > 0) {
          onNavigate(activeIndex > 0 ? activeIndex - 1 : matchIds.length - 1);
        }
      } else {
        if (matchIds.length > 0) {
          onNavigate(activeIndex < matchIds.length - 1 ? activeIndex + 1 : 0);
        }
      }
    }
  };

  if (!open) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
      <Search size={14} className="text-muted-foreground shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="搜索消息内容…"
        className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
      />
      {query && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {matchIds.length > 0
            ? `${activeIndex + 1} / ${matchIds.length}`
            : "无匹配"}
        </span>
      )}
      {matchIds.length > 1 && (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() =>
              onNavigate(activeIndex > 0 ? activeIndex - 1 : matchIds.length - 1)
            }
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="上一条 (Shift+Enter)"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={() =>
              onNavigate(activeIndex < matchIds.length - 1 ? activeIndex + 1 : 0)
            }
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="下一条 (Enter)"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={handleClose}
        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        title="关闭 (ESC)"
      >
        <X size={14} />
      </button>
    </div>
  );
}
