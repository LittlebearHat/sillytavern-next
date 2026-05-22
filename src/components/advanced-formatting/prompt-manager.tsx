"use client";

import { useState, useRef } from "react";
import { GripVertical, Eye, EyeOff, ChevronDown, ChevronUp, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ========================
// Prompt 段定义
// ========================

export interface PromptSegment {
  id: string;
  label: string;
  description: string;
  /** 宏/占位符标识 */
  macro: string;
  /** 是否启用 */
  enabled: boolean;
  /** 是否可以被用户禁用 */
  canDisable: boolean;
  /** 预览内容 */
  preview?: string;
}

const DEFAULT_SEGMENTS: PromptSegment[] = [
  { id: "system_prompt", label: "系统提示词", description: "角色卡的 System Prompt 或模板系统提示词", macro: "{{system}}", enabled: true, canDisable: true },
  { id: "persona", label: "用户 Persona", description: "当前选中的 Persona 描述", macro: "{{persona}}", enabled: true, canDisable: true },
  { id: "char_description", label: "角色描述", description: "角色卡的 Description 字段", macro: "{{description}}", enabled: true, canDisable: false },
  { id: "char_personality", label: "角色性格", description: "角色卡的 Personality 字段", macro: "{{personality}}", enabled: true, canDisable: true },
  { id: "scenario", label: "场景设定", description: "角色卡的 Scenario 字段", macro: "{{scenario}}", enabled: true, canDisable: true },
  { id: "wi_before", label: "世界书 (前)", description: "World Info entries (position: before)", macro: "{{wiBefore}}", enabled: true, canDisable: true },
  { id: "example_dialogue", label: "对话示例", description: "角色卡的 Example Dialogue", macro: "{{mesExamples}}", enabled: true, canDisable: true },
  { id: "wi_after", label: "世界书 (后)", description: "World Info entries (position: after)", macro: "{{wiAfter}}", enabled: true, canDisable: true },
  { id: "chat_history", label: "聊天历史", description: "实际对话消息 (按 Instruct 模板渲染)", macro: "[chat]", enabled: true, canDisable: false },
  { id: "post_history", label: "后置指令", description: "角色卡的 Post-History Instructions (Author's Note)", macro: "{{post_history_instructions}}", enabled: true, canDisable: true },
];

// ========================
// 估算 Token 数
// ========================

function estimateTokens(text?: string): number {
  if (!text) return 0;
  // 粗略估算: ~4 字符 = 1 token (英文), ~1.5 字符 = 1 token (中文)
  const chinese = text.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const other = text.length - chinese;
  return Math.ceil(chinese / 1.5 + other / 4);
}

// ========================
// PromptManager 组件
// ========================

export function PromptManager() {
  const [segments, setSegments] = useState<PromptSegment[]>(DEFAULT_SEGMENTS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const dragRef = useRef<{ dragId: string | null; overId: string | null }>({ dragId: null, overId: null });

  const toggleSegment = (id: string) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id && s.canDisable ? { ...s, enabled: !s.enabled } : s))
    );
  };

  // HTML5 Drag handlers
  const handleDragStart = (id: string) => {
    dragRef.current.dragId = id;
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    dragRef.current.overId = id;
  };

  const handleDrop = () => {
    const { dragId, overId } = dragRef.current;
    if (!dragId || !overId || dragId === overId) {
      dragRef.current = { dragId: null, overId: null };
      return;
    }
    setSegments((prev) => {
      const items = [...prev];
      const fromIdx = items.findIndex((s) => s.id === dragId);
      const toIdx = items.findIndex((s) => s.id === overId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const [removed] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, removed);
      return items;
    });
    dragRef.current = { dragId: null, overId: null };
  };

  const totalTokens = segments
    .filter((s) => s.enabled)
    .reduce((sum, s) => sum + estimateTokens(s.preview), 0);

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <LayoutList size={16} className="text-primary" />
          <h3 className="text-sm font-semibold">Prompt Manager</h3>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {segments.filter((s) => s.enabled).length}/{segments.length} 段 · ~{totalTokens} tokens
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? <EyeOff size={12} className="mr-1" /> : <Eye size={12} className="mr-1" />}
          {showPreview ? "隐藏预览" : "预览"}
        </Button>
      </div>

      {/* Segment List */}
      <div className="divide-y divide-border">
        {segments.map((seg, idx) => (
          <div
            key={seg.id}
            draggable
            onDragStart={() => handleDragStart(seg.id)}
            onDragOver={(e) => handleDragOver(e, seg.id)}
            onDrop={handleDrop}
            className={cn(
              "flex items-start gap-2 px-3 py-2 transition-colors",
              !seg.enabled && "opacity-40",
              "hover:bg-muted/30"
            )}
          >
            {/* 拖拽手柄 */}
            <div className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
              <GripVertical size={14} />
            </div>

            {/* 序号 */}
            <span className="mt-0.5 text-[10px] text-muted-foreground font-mono w-5 text-right shrink-0">
              {idx + 1}
            </span>

            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{seg.label}</span>
                <code className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded font-mono">
                  {seg.macro}
                </code>
                {seg.preview && (
                  <span className="text-[10px] text-muted-foreground">
                    ~{estimateTokens(seg.preview)} tk
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{seg.description}</p>

              {/* 展开详情 */}
              {expandedId === seg.id && seg.preview && (
                <pre className="mt-1.5 text-[11px] text-foreground/80 bg-muted/50 rounded px-2 py-1.5 max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-mono border border-border">
                  {seg.preview}
                </pre>
              )}
            </div>

            {/* 操作 */}
            <div className="flex items-center gap-1 shrink-0 mt-0.5">
              {seg.preview && (
                <button
                  onClick={() => setExpandedId(expandedId === seg.id ? null : seg.id)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  title="展开/收起"
                >
                  {expandedId === seg.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              )}
              {seg.canDisable && (
                <button
                  onClick={() => toggleSegment(seg.id)}
                  className={cn(
                    "p-1 transition-colors",
                    seg.enabled
                      ? "text-primary hover:text-primary/70"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title={seg.enabled ? "禁用" : "启用"}
                >
                  {seg.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 预览面板 */}
      {showPreview && (
        <div className="border-t border-border px-4 py-3 bg-muted/20">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">Prompt 组装顺序预览</h4>
          <div className="flex flex-wrap gap-1.5">
            {segments
              .filter((s) => s.enabled)
              .map((seg, i) => (
                <div
                  key={seg.id}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-xs border border-primary/20"
                >
                  <span className="font-mono text-[10px] opacity-60">{i + 1}</span>
                  <span>{seg.label}</span>
                </div>
              ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            拖拽段落可调整顺序。禁用的段落不会出现在最终 prompt 中。
          </p>
        </div>
      )}
    </div>
  );
}
