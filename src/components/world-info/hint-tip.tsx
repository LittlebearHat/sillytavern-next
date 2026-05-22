"use client";

import { useEffect, useRef, useState } from "react";

/** 通用提示气泡：点击或悬停 ? 图标显示中文说明。空 text 不渲染。 */
export function HintTip({ text, icon = "?" }: { text: string; icon?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // 空 hint 不渲染，避免字段后面出现点击后什么也没有的空气泡
  if (!text || !text.trim()) return null;

  return (
    <span ref={ref} className="relative inline-flex">
      {/* 不能用 <button>，避免在外层 button（如 <details>/<button> 点击区、
          如 SamplerOrderEditor 的折叠按钮）中产生 button 嵌套 button 的 hydration 错误。
          用 span + role=button 保持可交互与无障碍语义。 */}
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            setOpen((v) => !v);
          }
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-muted text-muted-foreground text-[10px] cursor-help hover:bg-primary/20 hover:text-primary select-none"
        aria-label="提示"
      >
        {icon}
      </span>
      {open && (
        <span
          className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 w-64 max-w-[80vw] rounded-md border border-border bg-popover text-popover-foreground shadow-lg px-3 py-2 text-xs leading-relaxed whitespace-normal break-words pointer-events-none"
          style={{ pointerEvents: "none" }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
