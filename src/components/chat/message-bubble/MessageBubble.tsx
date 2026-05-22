"use client";

import { useState } from "react";
import type { ChatMessage, Character } from "@/types";
import { cn } from "@/lib/utils";
import { MessageHeader } from "./MessageHeader";
import { MessageBody } from "./MessageBody";
import { MessageReasoning } from "./MessageReasoning";
import { MessageEditor } from "./MessageEditor";
import { SwipeArrows } from "./SwipeArrows";
import { SwipePicker } from "./SwipePicker";
import type { MessageButtonsProps } from "./MessageButtons";

export interface MessageBubbleProps {
  message: ChatMessage;
  /** 当前会话角色（用于头像 fallback） */
  character?: Character | null;
  /** 是否流式生成中 */
  streaming?: boolean;
  /** 是否最后一条（用于决定是否显示重生成 / Swipe 箭头） */
  isLast?: boolean;
  /** 是否整个会话正在生成 */
  generating?: boolean;
  /** Swipe 处理回调（Task 3 接入） */
  onSwipePrev?: () => void;
  onSwipeNext?: () => void;
  onSwipeOverflow?: () => void;
  /** 删除某个 swipe 版本 */
  onSwipeDelete?: (index: number) => void;
  /** 选中某个 swipe 版本 */
  onSwipeSelect?: (index: number) => void;
  /** 各类操作回调（Task 5+ 接入） */
  onCopy?: () => void;
  onEdit?: (next: string) => void | Promise<void>;
  onDelete?: () => void;
  onToggleHide?: () => void;
  onRegenerate?: (e?: React.MouseEvent) => void;
  onCreateBranch?: () => void;
  onCreateBookmark?: () => void;
  onRemoveBookmark?: () => void;
  onTranslate?: () => void;
  onNarrate?: () => void;
  onGenerateImage?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAddReasoning?: () => void;
  /** 搜索高亮文本 */
  highlightText?: string;
  /** 多选模式 */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  className?: string;
}

/**
 * 单条消息卡：avatar + (swipe_left) + mes_block(header + reasoning + body) + (swipeRightBlock)
 * 对齐原项目 #message_template 结构（参见 public/index.html L7377-7456）。
 */
export function MessageBubble({
  message,
  character,
  streaming,
  isLast,
  generating,
  onSwipePrev,
  onSwipeNext,
  onSwipeOverflow,
  onSwipeDelete,
  onSwipeSelect,
  onCopy,
  onEdit,
  onDelete,
  onToggleHide,
  onRegenerate,
  onCreateBranch,
  onCreateBookmark,
  onRemoveBookmark,
  onTranslate,
  onNarrate,
  onGenerateImage,
  onMoveUp,
  onMoveDown,
  onAddReasoning,
  highlightText,
  selectable,
  selected,
  onToggleSelect,
  className,
}: MessageBubbleProps) {
  const [editing, setEditing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const isUser = message.isUser || message.role === "user";
  const isSys = message.isSystem;
  const swipes = message.swipes ?? [];
  const swipeId = message.swipeId ?? 0;
  const total = Math.max(swipes.length, 1);

  // 头像：forceAvatar > character.avatar > 首字母
  // 注意：originalAvatar 存的是角色 ID，不是图片 URL，不能用作 src
  const avatarSrc =
    message.forceAvatar ||
    (!isUser ? character?.avatar ?? null : null);
  const initial =
    (message.name?.[0] ?? (isUser ? "U" : character?.name?.[0] ?? "A")).toUpperCase();

  const isBookmarked = !!message.bookmarkLink;

  const buttons: MessageButtonsProps = {
    onCopy,
    onEdit: onEdit ? () => setEditing(true) : undefined,
    onDelete,
    onToggleHide,
    onRegenerate,
    onCreateBranch,
    onCreateBookmark,
    onRemoveBookmark,
    onTranslate,
    onNarrate,
    onGenerateImage,
    bookmarked: isBookmarked,
  };

  return (
    <div
      data-mesid={message.id}
      data-is-user={isUser ? "true" : "false"}
      data-is-system={isSys ? "true" : "false"}
      className={cn(
        "group/mes flex gap-2 mx-auto max-w-3xl px-2 py-2 rounded-md transition-colors",
        isSys && "opacity-60",
        isBookmarked && "border-l-2 border-l-primary/60",
        "hover:bg-accent/30",
        className,
      )}
    >
      {/* Avatar / 多选 Checkbox */}
      <div className="shrink-0 flex flex-col items-center gap-0.5 pt-0.5">
        {selectable ? (
          <button
            type="button"
            onClick={onToggleSelect}
            className={cn(
              "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors",
              selected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40 hover:border-primary"
            )}
          >
            {selected && <span className="text-xs font-bold">✓</span>}
          </button>
        ) : (
          <Avatar src={avatarSrc} initial={initial} isUser={isUser} />
        )}
      </div>

      {/* 左 swipe（仅非用户、最后一条、且 swipes>1） */}
      {!isUser && isLast && total > 1 && (
        <SwipeArrows
          activeIndex={swipeId}
          total={total}
          side="left"
          disabled={generating}
          onPrev={onSwipePrev}
        />
      )}

      {/* 主体 */}
      <div className="flex-1 min-w-0">
        <MessageHeader
          message={message}
          isLast={isLast}
          generating={generating}
          editing={editing}
          buttons={buttons}
        />
        {message.extra?.reasoning && (
          <MessageReasoning
            reasoning={message.extra.reasoning}
            durationMs={message.extra.reasoning_duration}
            streaming={streaming && !message.content}
          />
        )}
        {editing && onEdit ? (
          <MessageEditor
            initialValue={message.content}
            onSave={async (next) => {
              await onEdit(next);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
            onCopy={onCopy}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onAddReasoning={onAddReasoning}
            onDelete={
              onDelete
                ? () => {
                    setEditing(false);
                    onDelete();
                  }
                : undefined
            }
          />
        ) : (
          <MessageBody message={message} streaming={streaming} highlightText={highlightText} />
        )}
      </div>

      {/* 右 swipe（仅非用户、最后一条） */}
      {!isUser && isLast && (
        <div className="relative shrink-0">
          <SwipeArrows
            activeIndex={swipeId}
            total={total}
            side="right"
            disabled={generating}
            onNext={onSwipeNext}
            onOverflow={onSwipeOverflow}
            onCounterClick={total > 1 ? () => setPickerOpen((v) => !v) : undefined}
          />
          <SwipePicker
            open={pickerOpen}
            swipes={swipes}
            activeIndex={swipeId}
            onSelect={(i) => onSwipeSelect?.(i)}
            onDelete={onSwipeDelete}
            onClose={() => setPickerOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

function Avatar({
  src,
  initial,
  isUser,
}: {
  src?: string | null;
  initial: string;
  isUser: boolean;
}) {
  const url = normalizeAvatarUrl(src);
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={initial}
        className="w-9 h-9 rounded-md object-cover ring-1 ring-border"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  return (
    <div
      className={cn(
        "w-9 h-9 rounded-md flex items-center justify-center text-xs font-semibold ring-1 ring-border",
        isUser
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground",
      )}
    >
      {initial}
    </div>
  );
}

/** 角色卡 avatar 在原项目里通常是 chars/xxx.png 或绝对路径，这里做最小兼容。 */
function normalizeAvatarUrl(src?: string | null): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("data:") || src.startsWith("http") || src.startsWith("/")) {
    return src;
  }
  return `/api/characters/avatar/${src}`;
}
