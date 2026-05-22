"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorldInfoStore } from "@/stores/worldinfo-store";
import { EntryEditor } from "./entry-editor";
import { Plus, RefreshCw, ArrowDownAZ } from "lucide-react";

/** 词条列表 + 工具栏（对应 index.html L4831-4863） */
export function EntryList() {
  const currentBook = useWorldInfoStore((s) => s.currentBook);
  const newEntry = useWorldInfoStore((s) => s.newEntry);
  const loadBook = useWorldInfoStore((s) => s.loadBook);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"order" | "uid" | "comment">("order");
  const [openAll, setOpenAll] = useState(false);

  const entries = useMemo(() => {
    if (!currentBook) return [];
    let list = Object.values(currentBook.entries);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.comment.toLowerCase().includes(s) ||
          e.content.toLowerCase().includes(s) ||
          e.key.some((k) => k.toLowerCase().includes(s)),
      );
    }
    list.sort((a, b) => {
      if (sortBy === "order") return (b.order ?? 0) - (a.order ?? 0);
      if (sortBy === "uid") return a.uid - b.uid;
      return a.comment.localeCompare(b.comment);
    });
    return list;
  }, [currentBook, search, sortBy]);

  if (!currentBook) {
    return (
      <div className="text-center text-muted-foreground py-12 text-sm">
        请选择一个世界书
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => newEntry()}>
          <Plus size={14} />
          新建词条
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpenAll(true)}>
          全部展开
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpenAll(false)}>
          全部折叠
        </Button>
        <div className="flex items-center gap-1">
          <ArrowDownAZ size={14} className="text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-8 bg-background border border-input rounded-md px-2 text-xs"
          >
            <option value="order">按 Order</option>
            <option value="uid">按 UID</option>
            <option value="comment">按标题</option>
          </select>
        </div>
        <Input
          placeholder="搜索关键词 / 标题 / 内容"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 max-w-xs"
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => loadBook(currentBook.id)}
          title="刷新"
        >
          <RefreshCw size={14} />
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {entries.length} / {Object.keys(currentBook.entries).length} 条
        </span>
      </div>

      {/* 列表 */}
      <div className="space-y-2">
        {entries.length === 0 && (
          <p className="text-center text-muted-foreground py-8 text-sm">暂无词条</p>
        )}
        {entries.map((e) => (
          <EntryEditor key={e.uid} entry={e} expanded={openAll} />
        ))}
      </div>
    </div>
  );
}
