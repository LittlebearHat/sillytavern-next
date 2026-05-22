"use client";

import {
  Copy,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Flag,
  GitBranch,
  Languages,
  Volume2,
  Image as ImageIcon,
  MoreHorizontal,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export interface MessageButtonsProps {
  /** 是否系统/隐藏消息 */
  hidden?: boolean;
  /** 是否最新一条（仅最新一条显示重生成） */
  isLast?: boolean;
  /** 是否生成中 */
  generating?: boolean;
  /** 是否已书签 */
  bookmarked?: boolean;
  onCopy?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleHide?: () => void;
  onRegenerate?: (e?: React.MouseEvent) => void;
  onCreateBranch?: () => void;
  onCreateBookmark?: () => void;
  onRemoveBookmark?: () => void;
  onTranslate?: () => void;
  onNarrate?: () => void;
  onGenerateImage?: () => void;
  className?: string;
}

/**
 * 消息操作按钮组，对齐原项目 .mes_buttons + .extraMesButtons。
 * Task 5+ 才接入真实回调，没有 onXxx 时直接隐藏对应按钮。
 */
export function MessageButtons({
  hidden,
  isLast,
  generating,
  bookmarked,
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
  className,
}: MessageButtonsProps) {
  const [extraOpen, setExtraOpen] = useState(false);

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 text-muted-foreground",
        className,
      )}
    >
      {/* 主按钮：编辑 / 复制 / 重生成（最后一条） */}
      {isLast && onRegenerate && (
        <MesBtn
          title="重新生成（Shift+点击 生成 4 个版本）"
          onClick={(e) => onRegenerate(e)}
          disabled={generating}
        >
          <RotateCcw size={12} />
        </MesBtn>
      )}
      {onCopy && (
        <MesBtn title="复制" onClick={onCopy}>
          <Copy size={12} />
        </MesBtn>
      )}
      {onEdit && (
        <MesBtn title="编辑" onClick={onEdit} disabled={generating}>
          <Pencil size={12} />
        </MesBtn>
      )}

      {/* 折叠的扩展按钮组 */}
      {(onToggleHide ||
        onCreateBranch ||
        onCreateBookmark ||
        onRemoveBookmark ||
        onTranslate ||
        onNarrate ||
        onGenerateImage ||
        onDelete) && (
        <div className="relative">
          <MesBtn
            title="更多操作"
            onClick={() => setExtraOpen((v) => !v)}
            active={extraOpen}
          >
            <MoreHorizontal size={12} />
          </MesBtn>
          {extraOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-10 rounded-md border border-border bg-popover shadow-lg p-1 flex flex-col gap-0.5 min-w-[120px]"
              onMouseLeave={() => setExtraOpen(false)}
            >
              {onToggleHide && (
                <MenuBtn
                  title={hidden ? "在 Prompt 中包含" : "在 Prompt 中排除"}
                  onClick={() => {
                    setExtraOpen(false);
                    onToggleHide();
                  }}
                  icon={hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                  label={hidden ? "包含到 Prompt" : "从 Prompt 排除"}
                />
              )}
              {onCreateBranch && (
                <MenuBtn
                  title={bookmarked ? "已有分支/检查点，再次点击可创建新分支" : "从此处分支"}
                  onClick={() => {
                    setExtraOpen(false);
                    onCreateBranch();
                  }}
                  icon={<GitBranch size={12} className={bookmarked ? "text-primary" : ""} />}
                  label={bookmarked ? "创建分支 (已有检查点)" : "创建分支"}
                />
              )}
              {onCreateBookmark && !bookmarked && (
                <MenuBtn
                  title="创建检查点"
                  onClick={() => {
                    setExtraOpen(false);
                    onCreateBookmark();
                  }}
                  icon={<Flag size={12} />}
                  label="创建检查点"
                />
              )}
              {bookmarked && onRemoveBookmark && (
                <MenuBtn
                  title="移除检查点标记"
                  onClick={() => {
                    setExtraOpen(false);
                    onRemoveBookmark();
                  }}
                  icon={<Flag size={12} className="fill-primary text-primary" />}
                  label="移除检查点"
                  danger
                />
              )}
              {onTranslate && (
                <MenuBtn
                  title="翻译"
                  onClick={() => {
                    setExtraOpen(false);
                    onTranslate();
                  }}
                  icon={<Languages size={12} />}
                  label="翻译"
                />
              )}
              {onNarrate && (
                <MenuBtn
                  title="朗读"
                  onClick={() => {
                    setExtraOpen(false);
                    onNarrate();
                  }}
                  icon={<Volume2 size={12} />}
                  label="朗读"
                />
              )}
              {onGenerateImage && (
                <MenuBtn
                  title="生成图片"
                  onClick={() => {
                    setExtraOpen(false);
                    onGenerateImage();
                  }}
                  icon={<ImageIcon size={12} />}
                  label="生成图片"
                />
              )}
              {onDelete && (
                <MenuBtn
                  title="删除"
                  onClick={() => {
                    setExtraOpen(false);
                    onDelete();
                  }}
                  icon={<Trash2 size={12} />}
                  label="删除"
                  danger
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MesBtn({
  children,
  title,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-6 h-6 grid place-items-center rounded transition-colors",
        "hover:bg-accent hover:text-foreground",
        active && "bg-accent text-foreground",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent",
      )}
    >
      {children}
    </button>
  );
}

function MenuBtn({
  icon,
  label,
  title,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-2 py-1 rounded text-xs hover:bg-accent text-left",
        danger && "text-destructive hover:bg-destructive/10",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
