"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { MessageSquare, Users, Settings, BookOpen, Sliders, Wand2, PanelLeftClose, PanelLeft, Plus, Trash2, Pencil, ChevronDown, Search, GitBranch, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PersonaSelector } from "@/components/settings/PersonaSelector";
import { GroupCollageAvatar } from "@/components/groups/GroupCollageAvatar";
import { useChatStore } from "@/stores/chat-store";
import type { Character, Chat } from "@/types";

interface SidebarProps {
  className?: string;
}

interface GroupItem {
  id: string;
  name: string;
  members: string[];
  disabledMembers: string[];
  avatar: string | null;
  fav: boolean;
  activationStrategy: number;
  generationMode: number;
  dateLastChat: number | null;
}

const navItems = [
  { icon: Users, label: "角色管理", href: "/characters" },
  { icon: UsersRound, label: "群组聊天", href: "/groups" },
  { icon: BookOpen, label: "世界设定", href: "/world-info" },
  { icon: Sliders, label: "文本补全", href: "/textgen-presets" },
  { icon: Wand2, label: "高级格式化", href: "/advanced-formatting" },
  { icon: Settings, label: "API 连接配置", href: "/settings" },
];

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loadingChars, setLoadingChars] = useState(true);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  /** 当前选中的群组。与 currentCharacter 互斥；设为 null 表示角色模式 */
  const [selectedGroup, setSelectedGroup] = useState<GroupItem | null>(null);

  const {
    currentCharacter,
    currentChat,
    chats,
    setCurrentCharacter,
    startNewChat,
    loadChat,
    loadChatsForCharacter,
    loadChatsForGroup,
    loadOrCreateGroupChat,
    deleteChat,
    renameChat,
  } = useChatStore();

  // 加载角色列表
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/characters");
        if (res.ok) {
          const data = await res.json();
          setCharacters(Array.isArray(data) ? data : data.data ?? []);
        }
      } catch (err) {
        console.error("Failed to load characters:", err);
      } finally {
        setLoadingChars(false);
      }
    })();
  }, []);

  // 加载群组列表
  const reloadGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load groups:", err);
    } finally {
      setLoadingGroups(false);
    }
  }, []);
  useEffect(() => { void reloadGroups(); }, [reloadGroups]);

  // 选择角色
  const handleSelectCharacter = useCallback(async (character: Character) => {
    setSelectedGroup(null); // 退出群组模式
    setCurrentCharacter(character);
    // 加载该角色的聊天历史
    await loadChatsForCharacter(character.id);
    // 获取最新 chats
    const currentChats = useChatStore.getState().chats;
    if (currentChats.length > 0) {
      await loadChat(currentChats[0].id);
    } else {
      await startNewChat(character);
    }
  }, [setCurrentCharacter, loadChatsForCharacter, loadChat, startNewChat]);

  // 选择群组
  const handleSelectGroup = useCallback(async (group: GroupItem) => {
    setSelectedGroup(group);
    setCurrentCharacter(null); // 退出角色模式，但保留 currentChat
    // 加载/创建群聊（与首个启用成员的 firstMessage）
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
  }, [characters, setCurrentCharacter, loadOrCreateGroupChat]);

  // 新建聊天
  const handleNewChat = useCallback(async () => {
    if (selectedGroup) {
      // 群组模式：为该群创建新聊天
      const firstEnabled = selectedGroup.members.find((id) => !selectedGroup.disabledMembers.includes(id));
      const firstChar = firstEnabled ? characters.find((c) => c.id === firstEnabled) : null;
      const title = `与 ${selectedGroup.name} · ${new Date().toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}`;
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: selectedGroup.id, title }),
      });
      if (res.ok) {
        const chat: Chat = await res.json();
        // 注入首条开场白
        if (firstChar?.firstMessage) {
          await fetch(`/api/chats/${chat.id}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: firstChar.name,
              isUser: false,
              content: firstChar.firstMessage,
              role: "assistant",
              originalAvatar: firstChar.id,
              forceAvatar: firstChar.avatar,
            }),
          });
        }
        await loadChatsForGroup(selectedGroup.id);
        await loadChat(chat.id);
      }
    } else if (currentCharacter) {
      await startNewChat(currentCharacter);
    }
  }, [selectedGroup, currentCharacter, characters, loadChatsForGroup, loadChat, startNewChat]);

  // 切换聊天
  const handleSelectChat = useCallback(async (chat: Chat) => {
    await loadChat(chat.id);
  }, [loadChat]);

  const charAvatarMap = useMemo(
    () => new Map(characters.map((c) => [c.id, c.avatar])),
    [characters],
  );

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-border transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <h1 className="text-lg font-bold text-primary">SillyTavern</h1>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          variant="outline"
          className={cn("w-full justify-start gap-2", collapsed && "justify-center px-0")}
          onClick={handleNewChat}
          disabled={!currentCharacter && !selectedGroup}
        >
          <Plus size={18} />
          {!collapsed && <span>新建聊天</span>}
        </Button>
      </div>

      {/* 角色选择器（下拉浮层 + 搜索） */}
      {!collapsed && (
        <CharacterPicker
          characters={characters}
          loading={loadingChars}
          current={currentCharacter}
          onSelect={handleSelectCharacter}
        />
      )}

      {/* 群组选择器 */}
      {!collapsed && (
        <GroupPicker
          groups={groups}
          loading={loadingGroups}
          current={selectedGroup}
          avatarMap={charAvatarMap}
          onSelect={handleSelectGroup}
        />
      )}

      {/* Chat History for current character OR group */}
      {!collapsed && (currentCharacter || selectedGroup) && (
        <div className="flex-1 px-3 overflow-y-auto border-t border-border pt-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            <MessageSquare size={12} className="inline mr-1" />
            聊天记录
            {selectedGroup && <span className="ml-1 text-primary">({selectedGroup.name})</span>}
          </h3>
          <div className="space-y-1">
            {chats.length === 0 && (
              <p className="text-xs text-muted-foreground px-2">无记录</p>
            )}
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  "group flex items-center gap-1 px-2 py-1.5 rounded text-xs transition-colors",
                  currentChat?.id === chat.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <button
                  onClick={() => handleSelectChat(chat)}
                  className="flex-1 text-left truncate flex items-center gap-1"
                  title={chat.title || "未命名会话"}
                >
                  {(chat.title || "").includes("检查点") && (
                    <GitBranch size={10} className="text-primary shrink-0" />
                  )}
                  {chat.title || "未命名会话"}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = prompt("重命名会话", chat.title ?? "");
                    if (next != null && next.trim() && next.trim() !== chat.title) {
                      void renameChat(chat.id, next);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
                  title="重命名"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("确定删除这条聊天记录？")) {
                      deleteChat(chat.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all"
                  title="删除"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Persona Selector + Navigation 固定在底部 */}
      <div className="mt-auto">
        {!collapsed && (
          <div className="px-2 py-1 border-t border-border">
            <PersonaSelector />
          </div>
        )}
        <nav className="p-2 space-y-1 border-t border-border">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
                collapsed && "justify-center px-0"
              )}
            >
              <item.icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}

/** 角色下拉选择器：默认只显示当前角色（一行），点击展开浮层列表 + 搜索，不占侧边栏固定高度 */
function CharacterPicker({
  characters,
  loading,
  current,
  onSelect,
}: {
  characters: Character[];
  loading: boolean;
  current: Character | null;
  onSelect: (c: Character) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return characters;
    const q = search.toLowerCase();
    return characters.filter((c) => c.name.toLowerCase().includes(q));
  }, [characters, search]);

  return (
    <div ref={ref} className="px-3 pb-2 relative">
      {/* 触发器：显示当前角色 */}
      <button
        onClick={() => { setOpen(!open); setSearch(""); }}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md border border-border bg-background hover:bg-accent/50 text-sm transition-colors"
      >
        {current ? (
          <>
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium shrink-0 overflow-hidden">
              {current.avatar && current.avatar !== "none" && current.avatar.startsWith("data:") ? (
                <img src={current.avatar} alt={current.name} className="w-full h-full object-cover" />
              ) : (
                current.name[0]
              )}
            </div>
            <span className="truncate flex-1 text-left">{current.name}</span>
          </>
        ) : (
          <span className="text-muted-foreground flex-1 text-left">
            {loading ? "加载中…" : "选择角色"}
          </span>
        )}
        <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {/* 下拉浮层 */}
      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
          {/* 搜索框 */}
          {characters.length > 5 && (
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索角色…"
                  autoFocus
                  className="w-full bg-background border border-input rounded pl-7 pr-2 py-1 text-xs focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* 角色列表 */}
          <div className="max-h-[240px] overflow-y-auto py-1">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-2">
                {characters.length === 0 ? (
                  <Link href="/characters" className="underline" onClick={() => setOpen(false)}>
                    暂无角色，去创建
                  </Link>
                ) : (
                  "无匹配结果"
                )}
              </p>
            )}
            {filtered.map((char) => (
              <button
                key={char.id}
                onClick={() => { onSelect(char); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors",
                  current?.id === char.id
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-accent/50"
                )}
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium shrink-0 overflow-hidden">
                  {char.avatar && char.avatar !== "none" && char.avatar.startsWith("data:") ? (
                    <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />
                  ) : (
                    char.name[0]
                  )}
                </div>
                <span className="truncate">{char.name}</span>
                {current?.id === char.id && (
                  <span className="ml-auto text-[10px] text-primary">当前</span>
                )}
              </button>
            ))}
          </div>

          {/* 底部统计 */}
          <div className="px-3 py-1.5 border-t border-border text-[10px] text-muted-foreground">
            共 {characters.length} 个角色{search && ` · 匹配 ${filtered.length}`}
          </div>
        </div>
      )}
    </div>
  );
}

/** 群组下拉选择器 */
function GroupPicker({
  groups,
  loading,
  current,
  avatarMap,
  onSelect,
}: {
  groups: GroupItem[];
  loading: boolean;
  current: GroupItem | null;
  avatarMap: Map<string, string | null | undefined>;
  onSelect: (g: GroupItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, search]);

  return (
    <div ref={ref} className="px-3 pb-2 relative">
      <button
        onClick={() => { setOpen(!open); setSearch(""); }}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md border border-border bg-background hover:bg-accent/50 text-sm transition-colors"
      >
        {current ? (
          <>
            <GroupCollageAvatar
              members={current.members}
              avatarMap={avatarMap}
              customAvatar={current.avatar}
              size={24}
            />
            <span className="truncate flex-1 text-left">{current.name}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">群</span>
          </>
        ) : (
          <>
            <UsersRound size={16} className="text-muted-foreground shrink-0" />
            <span className="text-muted-foreground flex-1 text-left">
              {loading ? "加载中…" : groups.length === 0 ? "暂无群组" : "选择群组"}
            </span>
          </>
        )}
        <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
          {groups.length > 5 && (
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索群组…"
                  autoFocus
                  className="w-full bg-background border border-input rounded pl-7 pr-2 py-1 text-xs focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          )}
          <div className="max-h-[240px] overflow-y-auto py-1">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-2">
                {groups.length === 0 ? (
                  <Link href="/groups" className="underline" onClick={() => setOpen(false)}>
                    暂无群组，去创建
                  </Link>
                ) : (
                  "无匹配结果"
                )}
              </p>
            )}
            {filtered.map((g) => (
              <button
                key={g.id}
                onClick={() => { onSelect(g); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors",
                  current?.id === g.id
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-accent/50",
                )}
              >
                <GroupCollageAvatar
                  members={g.members}
                  avatarMap={avatarMap}
                  customAvatar={g.avatar}
                  size={24}
                />
                <span className="truncate flex-1">{g.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{g.members.length}人</span>
                {current?.id === g.id && (
                  <span className="text-[10px] text-primary shrink-0">当前</span>
                )}
              </button>
            ))}
          </div>
          <div className="px-3 py-1.5 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between">
            <span>共 {groups.length} 个群组{search && ` · 匹配 ${filtered.length}`}</span>
            <Link href="/groups" className="text-primary hover:underline" onClick={() => setOpen(false)}>管理</Link>
          </div>
        </div>
      )}
    </div>
  );
}
