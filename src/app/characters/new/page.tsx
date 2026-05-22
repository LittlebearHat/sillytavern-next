"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Save, Star, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { TextField } from "@/components/characters/TextField";
import { TagsEditor } from "@/components/characters/TagsEditor";
import { AlternateGreetingsEditor } from "@/components/characters/AlternateGreetingsEditor";
import { syncCharacterTagsByNames } from "@/lib/services/tag-sync";
import type { CharacterFormData } from "@/types";

const emptyCharacter: CharacterFormData = {
  name: "",
  description: "",
  personality: "",
  scenario: "",
  firstMessage: "",
  exampleDialogue: "",
  creatorNotes: "",
  systemPrompt: "",
  postHistoryInstructions: "",
  alternateGreetings: [],
  tags: [],
  creator: "",
  characterVersion: "",
  talkativeness: 0.5,
  fav: false,
  avatar: null,
};

export default function NewCharacterPage() {
  const router = useRouter();
  const [character, setCharacter] = useState<CharacterFormData>(emptyCharacter);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const updateField = useCallback((field: keyof CharacterFormData, value: unknown) => {
    setCharacter(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateField("avatar", reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!character.name.trim()) { alert("角色名称不能为空"); return; }
    setSaving(true);
    const res = await fetch("/api/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(character),
    });
    setSaving(false);
    if (res.ok) {
      const created = await res.json();
      if (character.tags.length > 0) await syncCharacterTagsByNames(created.id, character.tags);
      router.replace(`/characters/${created.id}`);
    } else {
      alert("创建失败");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Sticky Header */}
      <header className="h-14 border-b border-border flex items-center px-4 gap-3 shrink-0 bg-background z-10">
        <BackButton href="/characters" />
        <h1 className="text-lg font-semibold flex-1">新建角色</h1>
        <button
          onClick={() => updateField("fav", !character.fav)}
          className={character.fav ? "text-yellow-400" : "text-muted-foreground hover:text-yellow-400"}
          title="收藏"
        >
          <Star size={18} fill={character.fav ? "currentColor" : "none"} />
        </button>
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save size={14} className="mr-1" /> {saving ? "创建中..." : "创建角色"}
        </Button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 flex gap-6">
          {/* Left: Avatar + Meta */}
          <div className="w-56 shrink-0 space-y-4">
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="aspect-[3/4] w-full rounded-lg border border-border bg-secondary cursor-pointer overflow-hidden relative group"
              title="点击上传头像"
            >
              {character.avatar ? (
                <img src={character.avatar} alt={character.name || "角色头像"} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
                  <Upload size={32} />
                  <span className="text-xs">上传头像</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm">
                {character.avatar ? "更换头像" : "上传头像"}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
