"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SwipeArrowsProps {
  /** 当前激活下标（默认 0） */
  activeIndex: number;
  /** swipe 总数（>= 1） */
  total: number;
  /** 左右展示位置，默认 right */
  side: "left" | "right";
  disabled?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  /** 在最后一个版本上点 next 时触发的"重新生成"回调 */
  onOverflow?: () => void;
  /** 计数器被点击时（total>1）触发，用于弹出 SwipePicker */
  onCounterClick?: () => void;
  className?: string;
  /** 是否显示计数器（仅 side=right 时显示） */
  showCounter?: boolean;
}

/**
 * 消息卡左右两侧的 Swipe 切换箭头。
 * - 左侧只显示 chevron；右侧显示 chevron + counter（counter 在 total>1 时显示）
 * - total=1 时，左箭头隐藏；右箭头依然可点击触发 onOverflow（重新生成）
 */
export function SwipeArrows({
  activeIndex,
  total,
  side,
  disabled,
  onPrev,
  onNext,
  onOverflow,
  onCounterClick,
  className,
  showCounter = true,
}: SwipeArrowsProps) {
  const safeTotal = Math.max(1, total);
  const idx = Math.max(0, Math.min(safeTotal - 1, activeIndex));
  const isLast = idx >= safeTotal - 1;

  if (side === "left") {
    // 第一个版本时不显示左箭头
    if (idx <= 0) return <div className={cn("w-6 shrink-0", className)} aria-hidden />;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onPrev}
        className={cn(
          "shrink-0 self-center w-6 h-6 grid place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:hover:bg-transparent",
          className,
        )}
        title="上一个版本"
        aria-label="上一个版本"
      >
        <ChevronLeft size={14} />
      </button>
    );
  }

  // right side
  return (
    <div className={cn("flex flex-col items-center justify-center gap-0.5 shrink-0", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={isLast ? onOverflow : onNext}
        className={cn(
          "w-6 h-6 grid place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:hover:bg-transparent",
        )}
        title={isLast ? "重新生成" : "下一个版本"}
        aria-label={isLast ? "重新生成" : "下一个版本"}
      >
        <ChevronRight size={14} />
      </button>
      {showCounter && safeTotal > 1 && (
        <button
          type="button"
          onClick={onCounterClick}
          disabled={!onCounterClick}
          className="text-[10px] text-muted-foreground tabular-nums hover:text-foreground transition-colors disabled:cursor-default disabled:hover:text-muted-foreground"
          title={onCounterClick ? "查看所有版本" : undefined}
        >
          {idx + 1}/{safeTotal}
        </button>
      )}
    </div>
  );
}
