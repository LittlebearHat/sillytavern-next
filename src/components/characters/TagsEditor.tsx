"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DROPDOWN_HIDE_DELAY } from "@/lib/constants/ui";

interface TagsEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

/** 标签编辑组件（支持搜索已有标签 + 创建新标签） — 角色新建/编辑页共享 */
export function TagsEditor({ tags, onChange }: TagsEditorProps) {
  const [input, setInput] = useState("");
  const [allTags, setAllTags] = useState<{ id: string; name: string }[]>([]);
  const [showSugg, setShowSugg] = useState(false);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { id: string; name: string }[]) => setAllTags(data))
      .catch(console.warn);
  }, []);

  const suggestions = input.trim()
    ? allTags.filter((t) => t.name.toLowerCase().includes(input.toLowerCase()) && !tags.includes(t.name))
    : allTags.filter((t) => !tags.includes(t.name)).slice(0, 6);
  const inputIsNew = input.trim() && !allTags.find((t) => t.name.toLowerCase() === input.trim().toLowerCase());

  const addTag = (name: string) => {
    const tag = name.trim();
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setInput("");
    setShowSugg(false);
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-muted-foreground">标签 (Tags)</label>
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-secondary">
            {tag}
            <button onClick={() => onChange(tags.filter((t) => t !== tag))} className="hover:text-destructive"><X size={12} /></button>
          </span>
        ))}
      </div>
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Input
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowSugg(true); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addTag(input); }
              if (e.key === "Escape") setShowSugg(false);
            }}
            onFocus={() => setShowSugg(true)}
            onBlur={() => setTimeout(() => setShowSugg(false), DROPDOWN_HIDE_DELAY)}
            placeholder="搜索 / 创建标签"
          />
          {showSugg && (suggestions.length > 0 || inputIsNew) && (
            <div className="absolute top-full left-0 right-0 z-50 bg-popover border border-border rounded-md shadow-md mt-1 max-h-40 overflow-y-auto">
              {suggestions.map((t) => (
                <button key={t.id} type="button"
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
                  onMouseDown={(e) => { e.preventDefault(); addTag(t.name); }}>
                  {t.name}
                </button>
              ))}
              {inputIsNew && (
                <button type="button"
                  className="w-full text-left px-3 py-1.5 text-sm text-blue-400 hover:bg-accent"
                  onMouseDown={(e) => { e.preventDefault(); addTag(input.trim()); }}>
                  + 创建 &ldquo;{input.trim()}&rdquo;
                </button>
              )}
            </div>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" disabled={!input.trim()}
          onMouseDown={(e) => { e.preventDefault(); addTag(input); }}><Plus size={14} /></Button>
      </div>
    </div>
  );
}
