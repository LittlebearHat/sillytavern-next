"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { User, Plus, Check, X, Pencil, Trash2, Copy, Lock, Star, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePersonaStore } from "@/stores/persona-store";
import { cn } from "@/lib/utils";

interface PersonaItem {
  id: string;
  name: string;
  description: string;
  avatar: string | null;
  isActive: boolean;
  isDefault: boolean;
  descriptionPosition: number;
  depth: number;
  depthRole: number;
  lorebookId: string | null;
  connections: { type: string; id: string }[];
}

const POSITION_LABELS: Record<number, string> = {
  0: "在 Prompt 中",
  1: "角色描述后",
  2: "作者注顶部",
  3: "作者注底部",
  4: "指定深度",
  9: "不注入",
};

const ROLE_LABELS: Record<number, string> = { 0: "System", 1: "User", 2: "Assistant" };

/**
 * PersonaSelector - 侧栏底部 Persona 切换 + 管理面板
 * 对齐原项目：描述注入位置、锁定系统、角色绑定、默认设置
 */
export function PersonaSelector() {
  const [personas, setPersonas] = useState<PersonaItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // 表单状态
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPosition, setFormPosition] = useState(0);
  const [formDepth, setFormDepth] = useState(2);
  const [formRole, setFormRole] = useState(0);

  const activePersona = personas.find((p) => p.isActive);

  const fetchPersonas = useCallback(() => {
    fetch("/api/personas")
      .then((r) => (r.ok ? r.json() : []))
      .then(setPersonas)
      .catch(() => setPersonas([]));
    // 同步刷新全局 store
    void usePersonaStore.getState().loadActive();
  }, []);

  useEffect(() => { fetchPersonas(); }, [fetchPersonas]);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
        setEditingId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleActivate = async (id: string) => {
    await fetch(`/api/personas/${id}`, { method: "POST" });
    fetchPersonas();
  };

  const handleDeactivate = async () => {
    await fetch("/api/personas/none", { method: "POST" });
    fetchPersonas();
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    await fetch("/api/personas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName.trim(),
        description: formDesc,
        descriptionPosition: formPosition,
        depth: formDepth,
        depthRole: formRole,
      }),
    });
    resetForm();
    setShowCreate(false);
    fetchPersonas();
  };

  const handleUpdate = async (id: string) => {
    if (!formName.trim()) return;
    await fetch(`/api/personas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName.trim(),
        description: formDesc,
        descriptionPosition: formPosition,
        depth: formDepth,
        depthRole: formRole,
      }),
    });
    setEditingId(null);
    fetchPersonas();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此 Persona？")) return;
    await fetch(`/api/personas/${id}`, { method: "DELETE" });
    fetchPersonas();
  };

  const handleDuplicate = async (id: string) => {
    await fetch(`/api/personas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    // Use a separate duplicate endpoint or just re-create
    const source = personas.find((p) => p.id === id);
    if (source) {
      await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${source.name} (Copy)`,
          description: source.description,
          descriptionPosition: source.descriptionPosition,
          depth: source.depth,
          depthRole: source.depthRole,
        }),
      });
      fetchPersonas();
    }
  };

  const handleSetDefault = async (id: string, isDefault: boolean) => {
    await fetch(`/api/personas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: !isDefault }),
    });
    fetchPersonas();
  };

  const startEdit = (p: PersonaItem) => {
    setEditingId(p.id);
    setFormName(p.name);
    setFormDesc(p.description);
    setFormPosition(p.descriptionPosition);
    setFormDepth(p.depth);
    setFormRole(p.depthRole);
    setShowCreate(false);
  };

  const resetForm = () => {
    setFormName("");
    setFormDesc("");
    setFormPosition(0);
    setFormDepth(2);
    setFormRole(0);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* 触发按钮 */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors",
          "hover:bg-muted/60",
          activePersona ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
          {activePersona?.avatar ? (
            <img src={activePersona.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <User size={14} className="text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[10px] text-muted-foreground leading-none mb-0.5">Persona</div>
          <div className="text-xs font-medium truncate">{activePersona?.name || "未选择"}</div>
        </div>
        <ChevronDown size={12} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {/* 下拉面板 */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden max-h-[420px] flex flex-col w-72">
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
            <span className="text-xs font-semibold">Persona 管理</span>
            <button onClick={() => { setShowCreate(!showCreate); setEditingId(null); resetForm(); }} className="text-muted-foreground hover:text-foreground">
              <Plus size={14} />
            </button>
          </div>

          {/* 创建/编辑表单 */}
          {(showCreate || editingId) && (
            <div className="px-3 py-2 border-b border-border space-y-2 shrink-0">
              <input
                type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                placeholder="Persona 名称" autoFocus
                className="w-full h-7 px-2 rounded border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <textarea
                value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                placeholder="描述（注入到 prompt 中的 {{persona}} 内容）" rows={3}
                className="w-full px-2 py-1 rounded border border-input bg-background text-[11px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[10px] text-muted-foreground">注入位置</label>
                  <select value={formPosition} onChange={(e) => setFormPosition(Number(e.target.value))} className="w-full h-6 px-1 rounded border border-input bg-background text-[10px]">
                    {Object.entries(POSITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {formPosition === 4 && (
                  <>
                    <div>
                      <label className="text-[10px] text-muted-foreground">深度</label>
                      <input type="number" value={formDepth} onChange={(e) => setFormDepth(Number(e.target.value))} min={0} max={999} className="w-full h-6 px-1 rounded border border-input bg-background text-[10px]" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">角色</label>
                      <select value={formRole} onChange={(e) => setFormRole(Number(e.target.value))} className="w-full h-6 px-1 rounded border border-input bg-background text-[10px]">
                        {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-1 justify-end">
                <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => { setShowCreate(false); setEditingId(null); }}>取消</Button>
                <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => editingId ? handleUpdate(editingId) : handleCreate()} disabled={!formName.trim()}>
                  {editingId ? "保存" : "创建"}
                </Button>
              </div>
            </div>
          )}

          {/* 列表 */}
          <div className="overflow-y-auto flex-1">
            {/* 无 Persona 选项 */}
            <button onClick={handleDeactivate} className={cn("w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50", !activePersona && "bg-primary/10 text-primary")}>
              <User size={13} className="shrink-0" />
              <span className="flex-1 text-left">默认（无 Persona）</span>
              {!activePersona && <Check size={12} className="text-primary shrink-0" />}
            </button>

            {personas.map((p) => (
              <div key={p.id} className={cn("flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 group", p.isActive && "bg-primary/10")}>
                <button onClick={() => handleActivate(p.id)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium truncate">{p.name}</span>
                    {p.isDefault && <Star size={10} className="text-yellow-500 fill-yellow-500 shrink-0" />}
                    {p.isActive && <Check size={10} className="text-primary shrink-0" />}
                  </div>
                  {p.description && <div className="text-[10px] text-muted-foreground truncate mt-0.5">{p.description.slice(0, 60)}</div>}
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] px-1 py-0 rounded bg-muted text-muted-foreground">{POSITION_LABELS[p.descriptionPosition] ?? "Prompt"}</span>
                    {p.connections.length > 0 && <span className="text-[9px] px-1 py-0 rounded bg-muted text-muted-foreground"><Lock size={8} className="inline" /> {p.connections.length}</span>}
                  </div>
                </button>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => handleSetDefault(p.id, p.isDefault)} className={cn("p-0.5", p.isDefault ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500")} title="设为默认"><Star size={11} /></button>
                  <button onClick={() => startEdit(p)} className="p-0.5 text-muted-foreground hover:text-foreground" title="编辑"><Pencil size={11} /></button>
                  <button onClick={() => handleDuplicate(p.id)} className="p-0.5 text-muted-foreground hover:text-foreground" title="复制"><Copy size={11} /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-0.5 text-muted-foreground hover:text-destructive" title="删除"><Trash2 size={11} /></button>
                </div>
              </div>
            ))}

            {personas.length === 0 && !showCreate && (
              <div className="px-3 py-6 text-center text-[11px] text-muted-foreground">暂无 Persona，点击 + 创建</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
