"use client";

import { useState, useCallback, useRef } from "react";
import { Plus, X, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TagItem } from "./TagFilter";

// ========================
// 预设色盘
// ========================

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
];

// ========================
// TagManagerDialog
// ========================

interface TagManagerDialogProps {
  tags: TagItem[];
  onClose: () => void;
}

/** 标签管理弹窗 — 支持创建/编辑/删除标签及颜色选择 */
export function TagManagerDialog({ tags: initialTags, onClose }: TagManagerDialogProps) {
  const [tags, setTags] = useState<TagItem[]>(initialTags);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const refreshTags = useCallback(() => {
    fetch("/api/tags")
      .then((r) => (r.ok ? r.json() : []))
      .then(setTags)
      .catch(console.warn);
  }, []);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color: newColor }),
    });
    if (res.ok) {
      setNewName("");
      setNewColor(null);
      refreshTags();
    }
  };

  const handleUpdate = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    await fetch(`/api/tags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color: editColor }),
    });
    setEditingId(null);
    refreshTags();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个标签吗？关联将被移除。")) return;
    await fetch(`/api/tags/${id}`, { method: "DELETE" });
    refreshTags();
  };

  const startEditing = (tag: TagItem) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="bg-popover border border-border rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">标签管理</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        {/* 创建新标签 */}
        <div className="px-4 py-3 border-b border-border space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              placeholder="新标签名称..."
              className="flex-1 h-8 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button size="sm" className="h-8" onClick={handleCreate} disabled={!newName.trim()}>
              <Plus size={14} className="mr-1" /> 创建
            </Button>
          </div>
          {/* 色盘 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">颜色:</span>
            <button
              onClick={() => setNewColor(null)}
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px]",
                newColor === null ? "border-primary" : "border-border"
              )}
            >
              <X size={10} />
            </button>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={cn(
                  "w-5 h-5 rounded-full border-2 transition-transform",
                  newColor === c ? "border-primary scale-125" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* 标签列表 */}
        <div className="max-h-64 overflow-y-auto">
          {tags.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              暂无标签，创建一个开始分类吧
            </div>
          ) : (
            tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 px-4 py-2 hover:bg-muted/50 border-b border-border last:border-0"
              >
                {editingId === tag.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleUpdate(tag.id); if (e.key === "Escape") setEditingId(null); }}
                      className="flex-1 h-7 px-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      autoFocus
                    />
                    <div className="flex items-center gap-1">
                      {PRESET_COLORS.slice(0, 6).map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className={cn(
                            "w-4 h-4 rounded-full border",
                            editColor === c ? "border-primary" : "border-transparent"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleUpdate(tag.id)}>保存</Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingId(null)}>取消</Button>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5 flex-1 min-w-0">
                      {tag.color && <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />}
                      <span className="text-sm truncate">{tag.name}</span>
                      <span className="text-[11px] text-muted-foreground ml-1">({tag.characterCount})</span>
                    </span>
                    <button onClick={() => startEditing(tag)} className="p-1 text-muted-foreground hover:text-foreground" title="编辑">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(tag.id)} className="p-1 text-muted-foreground hover:text-destructive" title="删除">
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
