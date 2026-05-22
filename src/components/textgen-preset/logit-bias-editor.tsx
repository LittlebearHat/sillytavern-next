"use client";

import { useState } from "react";
import { HintTip } from "@/components/world-info/hint-tip";
import { Button } from "@/components/ui/button";
import type { LogitBiasEntry, TextGenSettings } from "@/types/textgen";

interface Props {
  settings: TextGenSettings;
  onChange: <K extends keyof TextGenSettings>(key: K, value: TextGenSettings[K]) => void;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Logit Bias 编辑器：可任意添加 token / 字符串 → bias 值 */
export function LogitBiasEditor({ settings, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const list: LogitBiasEntry[] = Array.isArray(settings.logit_bias) ? settings.logit_bias : [];

  const commit = (next: LogitBiasEntry[]) => {
    onChange("logit_bias", next as TextGenSettings["logit_bias"]);
  };

  const add = () => commit([...list, { id: uid(), text: "", value: 0 }]);
  const remove = (idx: number) => commit(list.filter((_, i) => i !== idx));
  const updateAt = (idx: number, patch: Partial<LogitBiasEntry>) =>
    commit(list.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  const clear = () => {
    if (list.length === 0) return;
    if (!confirm("确定清空所有 Logit Bias？")) return;
    commit([]);
  };

  return (
    <div className="border border-border rounded-md">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent/30"
      >
        <span className="flex items-center gap-2">
          <span className="font-medium">Logit Bias</span>
          <span className="text-[10px] text-muted-foreground">(logit_bias · 共 {list.length} 项)</span>
          <HintTip text="对特定 token 或字符串施加偏置：正值=更可能出现，负值=更不可能。范围一般 -100 ~ 100，不同后端定义略有差异。" />
        </span>
        <span className="text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="p-3 space-y-2 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>每行一个偏置项；文本支持普通字符串或单个 token id。</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={add}>
                + 新增
              </Button>
              <Button size="sm" variant="outline" onClick={clear} disabled={list.length === 0}>
                清空
              </Button>
            </div>
          </div>

          {list.length === 0 ? (
            <div className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border rounded">
              暂无偏置项，点击 “+ 新增” 添加。
            </div>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_120px_36px] gap-2 text-[10px] text-muted-foreground px-1">
                <span>Token / 字符串</span>
                <span className="text-right">Bias 值</span>
                <span></span>
              </div>
              {list.map((entry, idx) => (
                <div
                  key={entry.id ?? idx}
                  className="grid grid-cols-[1fr_120px_36px] gap-2 items-center"
                >
                  <input
                    type="text"
                    value={entry.text}
                    onChange={(e) => updateAt(idx, { text: e.target.value })}
                    placeholder="例如：abc 或 token id"
                    className="w-full bg-background border border-input rounded h-8 px-2 text-xs"
                  />
                  <input
                    type="number"
                    value={entry.value}
                    step={0.1}
                    onChange={(e) => updateAt(idx, { value: Number(e.target.value) })}
                    className="w-full bg-background border border-input rounded h-8 px-2 text-xs text-right"
                  />
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="h-8 w-8 inline-flex items-center justify-center rounded text-destructive hover:bg-destructive/10"
                    title="删除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
