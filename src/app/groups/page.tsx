"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Trash2, X, Check, Search, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { cn } from "@/lib/utils";
import { GroupCollageAvatar } from "@/components/groups/GroupCollageAvatar";
import { useChatStore } from "@/stores/chat-store";

interface GroupItem {
  id: string;
  name: string;
  members: string[];
  disabledMembers: string[];
  avatar: string | null;
  fav: boolean;
  activationStrategy: number;
  generationMode: number;
  allowSelfResponses: boolean;
  createdAt: string | null;
  dateLastChat: number | null;
}

interface CharacterItem {
  id: string;
  name: string;
  avatar: string | null;
  firstMessage?: string;
}

const 激活策略名: Record<number, string> = { 0: "自然", 1: "列表", 2: "手动", 3: "池化" };
const 生成模式名: Record<number, string> = { 0: "替换", 1: "追加", 2: "追加(禁用)" };

export default function GroupsPage() {
  const router = useRouter();
  const loadOrCreateGroupChat = useChatStore((s) => s.loadOrCreateGroupChat);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");

  const fetchAll = useCallback(() => {
    Promise.all([
      fetch("/api/groups").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/characters").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([g, c]) => { setGroups(g); setCharacters(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /** 打开群聊：加载或创建并跳到主页 */
  const openGroupChat = async (group: GroupItem) => {
    // 首个启用成员的 firstMessage 作为开场白
    const firstEnabled = group.members.find((id) => !group.disabledMembers.includes(id));
    const firstChar = firstEnabled ? characters.find((c) => c.id === firstEnabled) : null;
    const fm = firstChar?.firstMessage
      ? {
          name: firstChar.name,
          content: firstChar.firstMessage,
          originalAvatar: firstChar.id,
          forceAvatar: firstChar.avatar ?? undefined,
        }
      : undefined;
    await loadOrCreateGroupChat(group.id, { groupName: group.name, firstMessage: fm });
    router.push("/");
  };

  const handleCreate = async () => {
    if (!newName.trim() || selectedMembers.size === 0) return;
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), members: Array.from(selectedMembers) }),
    });
    if (res.ok) {
      setNewName("");
      setSelectedMembers(new Set());
      setShowCreate(false);
      fetchAll();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个群组和所有相关聊天吗？")) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getCharName = (id: string) => characters.find((c) => c.id === id)?.name ?? "Unknown";
  const avatarMap = new Map(characters.map((c) => [c.id, c.avatar]));

  const formatLastChat = (ts: number | null): string => {
    if (!ts) return "从未聊过";
    const d = new Date(ts);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - ts) / 60000);
    if (diffMin < 1) return "刚刚";
    if (diffMin < 60) return `${diffMin}分钟前`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}小时前`;
    return d.toLocaleDateString();
  };

  const filteredChars = memberSearch
    ? characters.filter((c) => c.name.toLowerCase().includes(memberSearch.toLowerCase()))
    : characters;

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b border-border shrink-0">
        <div className="flex items-center px-4 h-14 gap-3">
          <BackButton />
          <h1 className="text-lg font-semibold">群组聊天</h1>
          <div className="ml-auto">
            <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
              <Plus size={14} className="mr-1" /> 新建群组
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 创建表单 */}
        {showCreate && (
          <div className="border border-border rounded-lg bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold">创建新群组</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="群组名称"
              className="w-full h-8 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />

            {/* 成员选择 */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">选择成员（至少 1 个）</label>
              <div className="relative mb-2">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="搜索角色..."
                  className="w-full h-7 pl-7 pr-3 rounded border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-0.5 border border-border rounded-md p-1">
                {filteredChars.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => toggleMember(char.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1 rounded text-sm text-left transition-colors",
                      selectedMembers.has(char.id) ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0",
                      selectedMembers.has(char.id) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/50"
                    )}>
                      {selectedMembers.has(char.id) && <Check size={10} />}
                    </div>
                    <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden text-[10px]">
                      {char.avatar ? <img src={char.avatar} alt="" className="w-full h-full object-cover" /> : char.name[0]}
                    </div>
                    <span className="truncate">{char.name}</span>
                  </button>
                ))}
              </div>
              {selectedMembers.size > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {Array.from(selectedMembers).map((id) => (
                    <span key={id} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs">
                      {getCharName(id)}
                      <button onClick={() => toggleMember(id)}><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setSelectedMembers(new Set()); setNewName(""); }}>取消</Button>
              <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || selectedMembers.size === 0}>创建</Button>
            </div>
          </div>
        )}

        {/* 群组列表 */}
        {loading ? (
          <div className="text-center text-muted-foreground text-sm py-8">加载中...</div>
        ) : groups.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-12">
            <Users size={32} className="mx-auto mb-3 opacity-30" />
            <p>暂无群组，创建一个开始群组聊天</p>
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <div key={group.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:border-primary/50 transition-all">
                <div className="cursor-pointer" onClick={() => openGroupChat(group)}>
                  <GroupCollageAvatar
                    members={group.members}
                    avatarMap={avatarMap}
                    customAvatar={group.avatar}
                    size={40}
                    title={group.name}
                  />
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openGroupChat(group)}>
                  <h3 className="text-sm font-medium truncate">{group.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {group.members.length} 个成员 ·{" "}
                    {group.members.slice(0, 3).map((id) => getCharName(id)).join(", ")}
                    {group.members.length > 3 && ` +${group.members.length - 3}`}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {激活策略名[group.activationStrategy] ?? "自然"}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {生成模式名[group.generationMode] ?? "替换"}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70">{formatLastChat(group.dateLastChat)}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => openGroupChat(group)} title="开始对话">
                  <MessageCircle size={14} />
                </Button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(group.id); }}
                  className="p-1 text-muted-foreground hover:text-destructive shrink-0"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
