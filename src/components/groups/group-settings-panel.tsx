"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronDown, Settings2, Mic, MicOff, ArrowUp, ArrowDown,
  X, Plus, Search, Trash2, Star, MessageCircle, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chat-store";
import { useGroupGeneration } from "@/hooks/useGroupGeneration";
import { useGroupAutoMode } from "@/hooks/useGroupAutoMode";
import { useGroupAutoModeStore } from "@/stores/group-auto-mode-store";
import type { Character } from "@/types";

interface GroupData {
  id: string;
  name: string;
  members: string[];
  disabledMembers: string[];
  avatar: string | null;
  fav: boolean;
  activationStrategy: number;
  generationMode: number;
  allowSelfResponses: boolean;
  generationModeJoinPrefix: string | null;
  generationModeJoinSuffix: string | null;
  autoModeDelay: number;
  hideMutedSprites: boolean;
}

export function GroupSettingsPanel() {
  const currentChat = useChatStore((s) => s.currentChat);
  const isGroupChat = !!currentChat?.groupId;
  const [group, setGroup] = useState<GroupData | null>(null);
  const [allChars, setAllChars] = useState<Character[]>([]);
  const [panelOpen, setPanelOpen] = useState(true);
  const [openDrawer, setOpenDrawer] = useState<"controls" | "members" | "add">("controls");

  // 启动 Auto Mode worker（hook 内部根据开关 + isGroupChat 自治）
  useGroupAutoMode();

  const reload = useCallback(async () => {
    if (!currentChat?.groupId) return;
    const [gRes, cRes] = await Promise.all([
      fetch(`/api/groups/${currentChat.groupId}`),
      fetch("/api/characters"),
    ]);
    if (gRes.ok) setGroup(await gRes.json());
    if (cRes.ok) setAllChars(await cRes.json());
  }, [currentChat?.groupId]);

  useEffect(() => {
    if (!isGroupChat) { setGroup(null); return; }
    void reload();
  }, [isGroupChat, reload]);

  const patchGroup = useCallback(async (patch: Partial<GroupData>) => {
    if (!group) return;
    setGroup((prev) => (prev ? { ...prev, ...patch } : prev));
    try {
      await fetch(`/api/groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch (e) { console.error("[GroupPanel] patch:", e); }
  }, [group]);

  if (!isGroupChat || !group) return null;

  if (!panelOpen) {
    return (
      <aside className="w-9 border-l border-border bg-card flex flex-col items-center py-2 shrink-0">
        <button onClick={() => setPanelOpen(true)} className="p-2 rounded hover:bg-muted text-muted-foreground" title="展开群组面板">
          <Settings2 size={16} />
        </button>
      </aside>
    );
  }

  const candidatesCount = allChars.length - group.members.length;

  return (
    <aside className="w-72 border-l border-border bg-card flex flex-col shrink-0 overflow-hidden">
      <header className="flex items-center gap-2 px-3 h-12 border-b border-border shrink-0">
        <Settings2 size={14} className="text-primary" />
        <h2 className="text-sm font-semibold flex-1 truncate">群组设置</h2>
        <button onClick={() => setPanelOpen(false)} className="p-1 rounded hover:bg-muted text-muted-foreground" title="折叠">
          <X size={14} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto">
        <DrawerHeader title="群组控制" open={openDrawer === "controls"} onClick={() => setOpenDrawer("controls")} />
        {openDrawer === "controls" && <ControlsBody group={group} patchGroup={patchGroup} onDeleted={reload} />}
        <DrawerHeader title={`当前成员 (${group.members.length})`} open={openDrawer === "members"} onClick={() => setOpenDrawer("members")} />
        {openDrawer === "members" && <MembersBody group={group} allChars={allChars} patchGroup={patchGroup} />}
        <DrawerHeader title={`添加成员 (${candidatesCount})`} open={openDrawer === "add"} onClick={() => setOpenDrawer("add")} />
        {openDrawer === "add" && <AddBody group={group} allChars={allChars} patchGroup={patchGroup} />}
      </div>
    </aside>
  );
}

function DrawerHeader({ title, open, onClick }: { title: string; open: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-3 h-9 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors border-b border-border">
      <span className="flex-1 text-left">{title}</span>
      <ChevronDown size={14} className={cn("transition-transform", !open && "-rotate-90")} />
    </button>
  );
}

function ControlsBody({ group, patchGroup, onDeleted }: { group: GroupData; patchGroup: (p: Partial<GroupData>) => Promise<void>; onDeleted: () => void }) {
  const isAppend = group.generationMode === 1 || group.generationMode === 2;
  const autoMode = useGroupAutoModeStore((s) => s.enabled);
  const toggleAuto = useGroupAutoModeStore((s) => s.toggle);

  const handleDelete = async () => {
    if (!confirm("删除群组将一并删除所有相关聊天，确定？")) return;
    await fetch(`/api/groups/${group.id}`, { method: "DELETE" });
    useChatStore.setState({ currentChat: null });
    onDeleted();
  };
  const handleUploadAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { void patchGroup({ avatar: reader.result as string }); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  return (
    <div className="px-3 py-3 space-y-2.5 border-b border-border">
      <label className="block">
        <span className="text-[10px] text-muted-foreground block mb-1">名称</span>
        <input type="text" value={group.name} onChange={(e) => patchGroup({ name: e.target.value })} className="w-full h-7 px-2 rounded border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
      </label>
      <div>
        <span className="text-[10px] text-muted-foreground block mb-1">头像</span>
        <div className="flex items-center gap-2">
          {group.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={group.avatar} alt="" className="w-12 h-12 rounded-full object-cover bg-secondary shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-xs text-muted-foreground shrink-0">自动</div>
          )}
          <div className="flex flex-col gap-1 flex-1">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" hidden onChange={handleUploadAvatar} />
              <span className="inline-flex items-center justify-center h-7 text-xs w-full border border-input rounded-md bg-background hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                <Upload size={11} className="mr-1" />上传
              </span>
            </label>
            {group.avatar && <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => patchGroup({ avatar: null })}>恢复拼贴</Button>}
          </div>
        </div>
      </div>
      <label className="block">
        <span className="text-[10px] text-muted-foreground block mb-1">激活策略</span>
        <select value={group.activationStrategy} onChange={(e) => patchGroup({ activationStrategy: Number(e.target.value) })} className="w-full h-7 px-2 rounded border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring">
          <option value={0}>Natural（自然 - 提及/健谈度）</option>
          <option value={1}>List（列表 - 全员轮流）</option>
          <option value={2}>Manual（手动 - 仅强制发言）</option>
          <option value={3}>Pooled（池化 - 未发言优先）</option>
        </select>
      </label>
      <label className="block">
        <span className="text-[10px] text-muted-foreground block mb-1">生成模式</span>
        <select value={group.generationMode} onChange={(e) => patchGroup({ generationMode: Number(e.target.value) })} className="w-full h-7 px-2 rounded border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring">
          <option value={0}>Swap（替换 - 每角色独立卡）</option>
          <option value={1}>Join（追加 - 合并启用成员）</option>
          <option value={2}>Join+Disabled（合并所有成员）</option>
        </select>
      </label>
      {isAppend && (
        <>
          <label className="block">
            <span className="text-[10px] text-muted-foreground block mb-1">Join 前缀（支持 {"{{char}}"} 和 {"<FIELDNAME>"}）</span>
            <textarea value={group.generationModeJoinPrefix ?? ""} onChange={(e) => patchGroup({ generationModeJoinPrefix: e.target.value })} rows={2} placeholder="[{{char}}]" className="w-full px-2 py-1 rounded border border-input bg-background text-xs resize-y focus:outline-none focus:ring-1 focus:ring-ring" />
          </label>
          <label className="block">
            <span className="text-[10px] text-muted-foreground block mb-1">Join 后缀</span>
            <textarea value={group.generationModeJoinSuffix ?? ""} onChange={(e) => patchGroup({ generationModeJoinSuffix: e.target.value })} rows={2} placeholder="---" className="w-full px-2 py-1 rounded border border-input bg-background text-xs resize-y focus:outline-none focus:ring-1 focus:ring-ring" />
          </label>
        </>
      )}
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={group.allowSelfResponses} onChange={(e) => patchGroup({ allowSelfResponses: e.target.checked })} />
        <span>允许角色连续发言</span>
      </label>
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={group.hideMutedSprites} onChange={(e) => patchGroup({ hideMutedSprites: e.target.checked })} />
        <span>隐藏静音成员 sprites</span>
      </label>
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={autoMode} onChange={toggleAuto} />
        <span className={cn(autoMode && "text-primary font-medium")}>启用自动模式（按延迟轮询发言）</span>
      </label>
      <label className="block">
        <span className="text-[10px] text-muted-foreground block mb-1">自动模式延迟（秒）</span>
        <input type="number" min={1} max={999} value={group.autoModeDelay} onChange={(e) => patchGroup({ autoModeDelay: Number(e.target.value) || 5 })} className="w-full h-7 px-2 rounded border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
      </label>
      <div className="flex items-center gap-1 pt-1">
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => patchGroup({ fav: !group.fav })} title={group.fav ? "取消收藏" : "收藏"}>
          <Star size={12} className={cn(group.fav && "fill-yellow-400 text-yellow-400")} />
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={handleDelete} title="删除群组">
          <Trash2 size={12} />
        </Button>
      </div>
    </div>
  );
}

function MembersBody({ group, allChars, patchGroup }: { group: GroupData; allChars: Character[]; patchGroup: (p: Partial<GroupData>) => Promise<void> }) {
  const [search, setSearch] = useState("");
  const groupGen = useGroupGeneration();
  const setIsGenerating = useChatStore((s) => s.setIsGenerating);
  const isGenerating = useChatStore((s) => s.isGenerating);

  const memberChars = useMemo(() => group.members.map((id) => allChars.find((c) => c.id === id)).filter((c): c is Character => Boolean(c)).filter((c) => search ? c.name.toLowerCase().includes(search.toLowerCase()) : true), [group.members, allChars, search]);

  const toggleDisabled = (id: string) => {
    const next = group.disabledMembers.includes(id) ? group.disabledMembers.filter((x) => x !== id) : [...group.disabledMembers, id];
    void patchGroup({ disabledMembers: next });
  };
  const removeMember = (id: string) => {
    void patchGroup({ members: group.members.filter((x) => x !== id), disabledMembers: group.disabledMembers.filter((x) => x !== id) });
  };
  const move = (id: string, dir: "up" | "down") => {
    const arr = [...group.members];
    const idx = arr.indexOf(id); if (idx < 0) return;
    const target = dir === "up" ? idx - 1 : idx + 1; if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    void patchGroup({ members: arr });
  };
  const forceSpeak = async (id: string) => {
    if (isGenerating) return;
    setIsGenerating(true);
    const ac = new AbortController();
    try {
      await groupGen.runGroupGeneration({ type: "normal", forceCharId: id, signal: ac.signal, onError: (m) => alert(`生成失败: ${m}`) });
    } finally { setIsGenerating(false); }
  };

  return (
    <div className="px-3 py-3 space-y-2 border-b border-border">
      <div className="relative">
        <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索成员..." className="w-full h-7 pl-6 pr-2 rounded border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
      </div>
      <div className="space-y-1">
        {memberChars.length === 0 && <p className="text-[11px] text-muted-foreground py-2 text-center">{group.members.length === 0 ? "Group is empty." : "无匹配结果"}</p>}
        {memberChars.map((c) => {
          const disabled = group.disabledMembers.includes(c.id);
          const idx = group.members.indexOf(c.id);
          return (
            <div key={c.id} className={cn("flex items-center gap-2 px-2 py-1.5 rounded text-xs border border-border/40", disabled && "opacity-50")}>
              <div className="w-7 h-7 rounded-full overflow-hidden bg-secondary shrink-0">
                {c.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px]">{c.name[0]}</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{c.name}</div>
                {c.characterVersion && <div className="text-[9px] text-muted-foreground truncate">{c.characterVersion}</div>}
              </div>
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => move(c.id, "up")} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none" title="上移"><ArrowUp size={9} /></button>
                <button onClick={() => move(c.id, "down")} disabled={idx === group.members.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none" title="下移"><ArrowDown size={9} /></button>
              </div>
              <button onClick={() => toggleDisabled(c.id)} className="p-1 text-muted-foreground hover:text-primary shrink-0" title={disabled ? "启用" : "静音"}>{disabled ? <MicOff size={11} /> : <Mic size={11} />}</button>
              <button onClick={() => forceSpeak(c.id)} disabled={isGenerating || disabled} className="p-1 text-muted-foreground hover:text-primary shrink-0 disabled:opacity-40" title="强制发言"><MessageCircle size={11} /></button>
              <button onClick={() => removeMember(c.id)} className="p-1 text-muted-foreground hover:text-destructive shrink-0" title="从群组移除"><X size={11} /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddBody({ group, allChars, patchGroup }: { group: GroupData; allChars: Character[]; patchGroup: (p: Partial<GroupData>) => Promise<void> }) {
  const [search, setSearch] = useState("");
  const candidates = useMemo(() => allChars.filter((c) => !group.members.includes(c.id)).filter((c) => search ? c.name.toLowerCase().includes(search.toLowerCase()) : true), [allChars, group.members, search]);
  const addMember = (id: string) => { void patchGroup({ members: [id, ...group.members] }); };
  return (
    <div className="px-3 py-3 space-y-2 border-b border-border">
      <div className="relative">
        <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索角色..." className="w-full h-7 pl-6 pr-2 rounded border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
      </div>
      <div className="space-y-1 max-h-[260px] overflow-y-auto">
        {candidates.length === 0 && <p className="text-[11px] text-muted-foreground py-2 text-center">{allChars.length === group.members.length ? "所有角色都已在群组中" : "无匹配结果"}</p>}
        {candidates.map((c) => (
          <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs border border-border/40 hover:bg-muted/40">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-secondary shrink-0">
              {c.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px]">{c.name[0]}</div>
              )}
            </div>
            <span className="flex-1 truncate">{c.name}</span>
            <button onClick={() => addMember(c.id)} className="p-1 text-primary hover:bg-primary/10 rounded shrink-0" title="加入群组"><Plus size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

