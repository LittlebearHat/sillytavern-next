"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Star, Download, Copy, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/characters/TextField";
import { TagsEditor } from "@/components/characters/TagsEditor";
import { AlternateGreetingsEditor } from "@/components/characters/AlternateGreetingsEditor";
import { syncCharacterTagsByNames } from "@/lib/services/tag-sync";
import { SAVE_FEEDBACK_MS } from "@/lib/constants/ui";
import type { CharacterFormData } from "@/types";
import Link from "next/link";

type CharacterEditData = CharacterFormData & { id: string };

interface WorldBookSummary {
  id: string;
  name: string;
}

export default function CharacterEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [character, setCharacter] = useState<CharacterEditData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [worldBooks, setWorldBooks] = useState<WorldBookSummary[]>([]);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/characters/${id}`)
      .then(r => { if (r.ok) return r.json(); throw new Error("Not found"); })
      .then(setCharacter)
      .catch(() => router.replace("/characters"));
  }, [id, router]);

  useEffect(() => {
    fetch("/api/worldinfo")
      .then(r => r.ok ? r.json() : [])
      .then((list) => {
        if (Array.isArray(list)) {
          setWorldBooks(list.map((b: { id: string; name: string }) => ({ id: b.id, name: b.name })));
        }
      })
      .catch(console.warn);
  }, []);

  const updateField = useCallback((field: keyof CharacterEditData, value: unknown) => {
    setCharacter(prev => prev ? { ...prev, [field]: value } : prev);
  }, []);

  const handleSave = async () => {
    if (!character) return;
    setSaving(true);
    setSaveStatus("idle");
    const { id: _id, ...data } = character;
    const res = await fetch(`/api/characters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    setSaveStatus(res.ok ? "saved" : "error");
    if (res.ok) {
      await syncCharacterTagsByNames(id, character.tags ?? []);
      setTimeout(() => setSaveStatus("idle"), SAVE_FEEDBACK_MS);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateField("avatar", reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleExport = (format: "json" | "png") => {
    window.open(`/api/characters/${id}/export?format=${format}`, "_blank");
  };

  const handleDuplicate = async () => {
    const res = await fetch(`/api/characters/${id}`, { method: "POST" });
    if (res.ok) {
      const dup = await res.json();
      router.push(`/characters/${dup.id}`);
    }
  };

  const handleDelete = async () => {
    if (!confirm("确定要删除此角色吗？此操作不可撤销。")) return;
    const res = await fetch(`/api/characters/${id}`, { method: "DELETE" });
    if (res.ok) router.replace("/characters");
  };

  if (!character) return <div className="flex items-center justify-center h-screen text-muted-foreground">加载中...</div>;

  return (
    <div className="flex flex-col h-screen">
      {/* Sticky Header */}
      <header className="h-14 border-b border-border flex items-center px-4 gap-3 shrink-0 bg-background z-10">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground" title="返回列表">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold truncate flex-1">{character.name || "未命名角色"}</h1>
        <button onClick={() => updateField("fav", !character.fav)} className={character.fav ? "text-yellow-400" : "text-muted-foreground hover:text-yellow-400"} title="收藏">
          <Star size={18} fill={character.fav ? "currentColor" : "none"} />
        </button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExport("png")} title="导出PNG">
          <Download size={16} />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDuplicate} title="复制角色">
          <Copy size={16} />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDelete} title="删除角色">
          <Trash2 size={16} />
        </Button>
        <div className="flex items-center gap-2 ml-2">
          {saveStatus === "saved" && <span className="text-xs text-green-500">已保存</span>}
          {saveStatus === "error" && <span className="text-xs text-destructive">失败</span>}
          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save size={14} className="mr-1" /> {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 flex gap-6">
          {/* Left: Avatar + Meta */}
          <div className="w-56 shrink-0 space-y-4">
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="aspect-[3/4] w-full rounded-lg border border-border bg-secondary cursor-pointer overflow-hidden relative group"
              title="点击更换头像"
            >
              {character.avatar ? (
                <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                  <Upload size={32} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm">
                更换头像
              </div>
            </div>
            <input ref={avatarInputRef} type="file" hidden accept="image/*" onChange={handleAvatarUpload} />

            <TagsEditor tags={character.tags} onChange={(t) => updateField("tags", t)} />

            <div className="space-y-3 text-sm">
              <TextField label="创建者 (Creator)" value={character.creator} onChange={(v) => updateField("creator", v)} />
              <TextField label="版本 (Version)" value={character.characterVersion} onChange={(v) => updateField("characterVersion", v)} />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">话语度 (Talkativeness)</label>
                <div className="flex items-center gap-2">
                  <input type="range" min={0} max={1} step={0.05} value={character.talkativeness} onChange={(e) => updateField("talkativeness", parseFloat(e.target.value))} className="flex-1 h-1.5" />
                  <span className="text-xs w-8 text-right text-muted-foreground">{character.talkativeness.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleExport("json")}>
                <Download size={14} className="mr-2" /> 导出 JSON
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleExport("png")}>
                <Download size={14} className="mr-2" /> 导出 PNG 角色卡
              </Button>
            </div>
          </div>

          {/* Right: Edit Fields */}
          <div className="flex-1 space-y-6 min-w-0">
            <TextField label="创建者备注 (Creator's Notes)" value={character.creatorNotes} onChange={(v) => updateField("creatorNotes", v)} multiline placeholder="角色卡的使用说明，不会发送给AI..." />
            <TextField label="角色名称 (Name)" value={character.name} onChange={(v) => updateField("name", v)} placeholder="给角色命名" />
            <TextField label="描述 (Description)" value={character.description} onChange={(v) => updateField("description", v)} multiline placeholder="描述角色的外貌和心理特征..." helpLink="https://docs.sillytavern.app/usage/core-concepts/characterdesign/#character-description" />
            <TextField label="第一条消息 (First Message)" value={character.firstMessage} onChange={(v) => updateField("firstMessage", v)} multiline placeholder="每次聊天开始时角色发送的第一条消息..." helpLink="https://docs.sillytavern.app/usage/core-concepts/characterdesign/#first-message" />
            <AlternateGreetingsEditor greetings={character.alternateGreetings} onChange={(g) => updateField("alternateGreetings", g)} />

            <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              {showAdvanced ? "▼" : "▶"} 高级设定 (Advanced Definitions)
            </button>

            {showAdvanced && (
              <div className="space-y-5 pl-2 border-l-2 border-primary/20">
                <TextField label="性格 (Personality)" value={character.personality} onChange={(v) => updateField("personality", v)} multiline placeholder="角色的性格特征概要..." />
                <TextField label="场景 (Scenario)" value={character.scenario} onChange={(v) => updateField("scenario", v)} multiline placeholder="角色所处的场景设定..." />
                <TextField label="对话示例 (Example Dialogue)" value={character.exampleDialogue} onChange={(v) => updateField("exampleDialogue", v)} multiline placeholder={"<START>\n{{user}}: Hello!\n{{char}}: Hi there! *waves*"} />
                <TextField label="系统提示词 (System Prompt)" value={character.systemPrompt} onChange={(v) => updateField("systemPrompt", v)} multiline placeholder="覆盖默认系统提示词（高级用户使用）..." />
                <TextField label="历史后指令 (Post-History Instructions)" value={character.postHistoryInstructions} onChange={(v) => updateField("postHistoryInstructions", v)} multiline placeholder="插入在聊天历史之后、AI回复之前的指令..." />

                {/* Character Book */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">角色书 (Character Book)</label>
                    <Link href="/world-info" className="text-xs text-primary hover:underline">管理世界书 →</Link>
                  </div>
                  <select
                    value={character.worldInfoBookId ?? ""}
                    onChange={(e) => updateField("worldInfoBookId", e.target.value || null)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">— 无（不绑定世界书） —</option>
                    {worldBooks.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    绑定后，进入此角色聊天时会自动激活该世界书。优先级：聊天书 &gt; 角色书 &gt; 全局书。
                  </p>
                  {character.characterBook && (
                    <p className="text-xs text-amber-500">
                      ⓘ 此角色卡内嵌了 character_book，导入时已自动转为独立世界书。
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
