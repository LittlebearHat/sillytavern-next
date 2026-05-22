"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Star, Grid3X3, List, Upload,
  Copy, Trash2, X, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { TagFilter } from "@/components/characters/TagFilter";
import { cn } from "@/lib/utils";

interface CharacterItem {
  id: string;
  name: string;
  description: string;
  avatar: string | null;
  fav: boolean;
  tags: string[];
  creator: string;
  createdAt: string | null;
  updatedAt: string | null;
}

type SortField = "name" | "createdAt" | "updatedAt" | "fav";
type SortOrder = "asc" | "desc";

async function loadCharacters(query?: string): Promise<CharacterItem[]> {
  const url = query
    ? `/api/characters?q=${encodeURIComponent(query)}`
    : "/api/characters";
  const res = await fetch(url);
  if (res.ok) return res.json();
  return [];
}

function sortCharacters(chars: CharacterItem[], field: SortField, order: SortOrder): CharacterItem[] {
  return [...chars].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "name": cmp = a.name.localeCompare(b.name); break;
      case "fav": cmp = (a.fav ? 1 : 0) - (b.fav ? 1 : 0); break;
      case "createdAt": cmp = (a.createdAt || "").localeCompare(b.createdAt || ""); break;
      case "updatedAt": cmp = (a.updatedAt || "").localeCompare(b.updatedAt || ""); break;
    }
    return order === "desc" ? -cmp : cmp;
  });
}

export default function CharactersPage() {
  const router = useRouter();
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [filteredCharIds, setFilteredCharIds] = useState<Set<string> | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const fetchCharacters = useCallback((query?: string) => {
    loadCharacters(query)
      .then(setCharacters)
      .catch((err) => console.error("Failed to fetch characters:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCharacters(); }, [fetchCharacters]);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { fetchCharacters(value || undefined); }, 300);
  };

  const handleTagSelectionChange = useCallback((tagIds: string[]) => {
    setSelectedTagIds(tagIds);
    if (tagIds.length === 0) {
      setFilteredCharIds(null);
      return;
    }
    fetch(`/api/tags?filter=${tagIds.join(",")}`)
      .then((r) => (r.ok ? r.json() : { characterIds: [] }))
      .then((data: { characterIds: string[] }) => setFilteredCharIds(new Set(data.characterIds)))
      .catch(() => setFilteredCharIds(new Set()));
  }, []);

  const handleToggleFav = async (id: string, currentFav: boolean) => {
    await fetch(`/api/characters/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fav: !currentFav }) });
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, fav: !currentFav } : c)));
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/characters/import", { method: "POST", body: formData });
        if (!res.ok) { const err = await res.json(); alert(`导入失败: ${err.error}`); }
      } catch (err) { console.error("Import error:", err); }
    }
    fetchCharacters();
    e.target.value = "";
  };

  const handleDuplicate = async (id: string) => {
    const res = await fetch(`/api/characters/${id}`, { method: "POST" });
    if (res.ok) fetchCharacters();
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`确定要删除 ${ids.length} 个角色吗？此操作不可撤销。`)) return;
    for (const id of ids) { await fetch(`/api/characters/${id}`, { method: "DELETE" }); }
    setSelected(new Set());
    setBulkMode(false);
    fetchCharacters();
  };

  const handleBulkToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = filteredCharIds ? characters.filter((c) => filteredCharIds.has(c.id)) : characters;
  const sorted = sortCharacters(filtered, sortField, sortOrder);

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b border-border shrink-0">
        <div className="flex items-center px-4 h-14 gap-3">
          <BackButton />
          <h1 className="text-lg font-semibold whitespace-nowrap">角色管理</h1>
          <div className="relative flex-1 max-w-xs ml-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="搜索角色..." className="h-8 w-full pl-8 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            {search && (
              <button onClick={() => { setSearch(""); fetchCharacters(); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <select value={`${sortField}-${sortOrder}`} onChange={(e) => { const [f, o] = e.target.value.split("-") as [SortField, SortOrder]; setSortField(f); setSortOrder(o); }} className="h-8 px-2 rounded-md border border-input bg-background text-xs">
              <option value="name-asc">A-Z</option>
              <option value="name-desc">Z-A</option>
              <option value="createdAt-desc">最新创建</option>
              <option value="createdAt-asc">最早创建</option>
              <option value="updatedAt-desc">最近修改</option>
              <option value="fav-desc">收藏优先</option>
            </select>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewMode(v => v === "grid" ? "list" : "grid")}>
              {viewMode === "grid" ? <List size={16} /> : <Grid3X3 size={16} />}
            </Button>
            <Button variant={bulkMode ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()); }} title="批量编辑">
              <Check size={16} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => importRef.current?.click()} title="导入角色卡">
              <Upload size={16} />
            </Button>
            <input ref={importRef} type="file" hidden accept=".png,.json" multiple onChange={handleImport} />
            <Button size="sm" onClick={() => router.push("/characters/new")}>
              <Plus size={14} className="mr-1" /> 新建
            </Button>
          </div>
        </div>
        {bulkMode && selected.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 border-t border-border text-sm">
            <span className="text-muted-foreground">已选择 {selected.size} 个角色</span>
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set(sorted.map(c => c.id)))}>全选</Button>
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>取消全选</Button>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(Array.from(selected))}>
              <Trash2 size={14} className="mr-1" /> 删除
            </Button>
          </div>
        )}
      </header>

      <TagFilter selectedTagIds={selectedTagIds} onSelectionChange={handleTagSelectionChange} />

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">加载中...</div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground text-sm gap-3">
            <p className="text-base">{search || selectedTagIds.length > 0 ? "没有找到匹配的角色" : "还没有角色"}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push("/characters/new")}>创建角色</Button>
              <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}>
                <Upload size={14} className="mr-1" /> 导入角色卡
              </Button>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {sorted.map((char) => (
              <div key={char.id} onClick={() => bulkMode ? handleBulkToggle(char.id) : router.push(`/characters/${char.id}`)} className={cn("group cursor-pointer rounded-lg border bg-card overflow-hidden transition-all", bulkMode && selected.has(char.id) ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50")}>
                <div className="aspect-[3/4] bg-secondary relative flex items-center justify-center overflow-hidden">
                  {char.avatar ? (<img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />) : (<span className="text-3xl font-bold text-muted-foreground/50">{char.name[0]?.toUpperCase()}</span>)}
                  {char.fav && (<div className="absolute top-1.5 right-1.5"><Star size={14} className="fill-yellow-400 text-yellow-400 drop-shadow" /></div>)}
                  {bulkMode && (<div className="absolute top-1.5 left-1.5"><div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center", selected.has(char.id) ? "bg-primary border-primary text-primary-foreground" : "bg-background/80 border-muted-foreground/50")}>{selected.has(char.id) && <Check size={12} />}</div></div>)}
                </div>
                <div className="p-2">
                  <h3 className="text-sm font-medium truncate">{char.name}</h3>
                  {char.creator && (<p className="text-[11px] text-muted-foreground truncate">by {char.creator}</p>)}
                  {char.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {char.tags.slice(0, 2).map((tag) => (<span key={tag} className="text-[10px] px-1 py-0.5 rounded bg-secondary text-secondary-foreground">{tag}</span>))}
                      {char.tags.length > 2 && (<span className="text-[10px] text-muted-foreground">+{char.tags.length - 2}</span>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {sorted.map((char) => (
              <div key={char.id} onClick={() => bulkMode ? handleBulkToggle(char.id) : router.push(`/characters/${char.id}`)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all", bulkMode && selected.has(char.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-card")}>
                {bulkMode && (<div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center shrink-0", selected.has(char.id) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/50")}>{selected.has(char.id) && <Check size={12} />}</div>)}
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                  {char.avatar ? (<img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />) : (<span className="text-sm font-bold text-muted-foreground">{char.name[0]?.toUpperCase()}</span>)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium truncate">{char.name}</h3>
                    {char.fav && <Star size={12} className="fill-yellow-400 text-yellow-400 shrink-0" />}
                  </div>
                  {char.description && (<p className="text-xs text-muted-foreground truncate">{char.description}</p>)}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {char.tags.slice(0, 2).map((tag) => (<span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{tag}</span>))}
                </div>
                {!bulkMode && (
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handleToggleFav(char.id, char.fav); }} className="p-1 hover:text-yellow-400"><Star size={14} className={char.fav ? "fill-yellow-400 text-yellow-400" : ""} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDuplicate(char.id); }} className="p-1 hover:text-primary" title="复制"><Copy size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete([char.id]); }} className="p-1 hover:text-destructive" title="删除"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
