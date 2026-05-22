"use client";

import { useState, useEffect, useCallback } from "react";
import { Tag, Plus, X, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TagManagerDialog } from "./TagManagerDialog";

// ========================
// Types
// ========================

export interface TagItem {
  id: string;
  name: string;
  color: string | null;
  color2: string | null;
  characterCount: number;
}

interface TagFilterProps {
  selectedTagIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

// ========================
// TagFilter 主组件
// ========================

export function TagFilter({ selectedTagIds, onSelectionChange }: TagFilterProps) {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [showManager, setShowManager] = useState(false);

  const fetchTags = useCallback(() => {
    fetch("/api/tags")
      .then((r) => (r.ok ? r.json() : []))
      .then(setTags)
      .catch(() => setTags([]));
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const toggleTag = (tagId: string) => {
    onSelectionChange(
      selectedTagIds.includes(tagId)
        ? selectedTagIds.filter((id) => id !== tagId)
        : [...selectedTagIds, tagId]
    );
  };

  if (tags.length === 0 && !showManager) {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border bg-muted/30">
        <Tag size={13} className="text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground">暂无标签</span>
        <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setShowManager(true)}>
          <Plus size={12} className="mr-1" /> 创建标签
        </Button>
        {showManager && (
          <TagManagerDialog
            tags={tags}
            onClose={() => { setShowManager(false); fetchTags(); }}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-border bg-muted/30 overflow-x-auto scrollbar-thin">
        <Tag size={13} className="text-muted-foreground shrink-0" />

        {tags.map((tag) => {
          const active = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={cn(
                "shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all border",
                active
                  ? "border-primary bg-primary/15 text-primary font-medium"
                  : "border-transparent bg-secondary/80 text-secondary-foreground hover:bg-secondary"
              )}
            >
              {tag.color && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
              )}
              <span className="truncate max-w-[100px]">{tag.name}</span>
              <span className="text-[10px] opacity-60">{tag.characterCount}</span>
            </button>
          );
        })}

        {/* 清除筛选 */}
        {selectedTagIds.length > 0 && (
          <button
            onClick={() => onSelectionChange([])}
            className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-muted-foreground hover:text-foreground bg-secondary/50"
          >
            <X size={10} /> 清除
          </button>
        )}

        {/* 管理标签 */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs px-2 shrink-0 ml-auto"
          onClick={() => setShowManager(true)}
        >
          <MoreHorizontal size={12} className="mr-1" /> 管理
        </Button>
      </div>

      {showManager && (
        <TagManagerDialog
          tags={tags}
          onClose={() => { setShowManager(false); fetchTags(); }}
        />
      )}
    </>
  );
}
