"use client";

import { HintTip } from "@/components/world-info/hint-tip";
import type { FieldMeta, TextGenSettings } from "@/types/textgen";

interface Props {
  meta: FieldMeta;
  value: unknown;
  disabled?: boolean;
  onChange: <K extends keyof TextGenSettings>(key: K, value: TextGenSettings[K]) => void;
}

/** 元数据驱动的单字段渲染器 */
export function FieldRenderer({ meta, value, disabled, onChange }: Props) {
  const key = meta.key as keyof TextGenSettings;

  // 数值型：滑块 + 输入框组合
  if (meta.type === "number") {
    const num = typeof value === "number" ? value : Number(value ?? 0);
    const min = meta.min ?? 0;
    const max = meta.max ?? 1;
    const step = meta.step ?? 0.01;
    return (
      <div className="space-y-1" aria-disabled={disabled}>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1 truncate">
            <span className="truncate" title={meta.enLabel}>{meta.label}</span>
            <span className="text-[10px] opacity-60">({meta.enLabel})</span>
            <HintTip text={meta.hint} />
          </span>
          <input
            type="number"
            value={Number.isFinite(num) ? num : 0}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={(e) => onChange(key, Number(e.target.value) as TextGenSettings[typeof key])}
            className="w-20 h-7 bg-background border border-input rounded px-1 text-xs text-right disabled:opacity-50"
          />
        </div>
        <input
          type="range"
          value={Number.isFinite(num) ? num : 0}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => onChange(key, Number(e.target.value) as TextGenSettings[typeof key])}
          className="w-full disabled:opacity-50"
        />
      </div>
    );
  }

  // 布尔
  if (meta.type === "bool") {
    const checked = Boolean(value);
    return (
      <div className="flex items-center gap-2 text-xs select-none" aria-disabled={disabled}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(key, e.target.checked as TextGenSettings[typeof key])}
            className="h-4 w-4 disabled:opacity-50"
          />
          <span className="truncate">
            {meta.label}
            <span className="ml-1 text-[10px] opacity-60">({meta.enLabel})</span>
          </span>
        </label>
        <HintTip text={meta.hint} icon="ⓘ" />
      </div>
    );
  }

  // 下拉
  if (meta.type === "select") {
    const v = (value as string | number | undefined) ?? meta.options?.[0]?.value ?? "";
    return (
      <div className="space-y-1" aria-disabled={disabled}>
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          <span>{meta.label}</span>
          <span className="text-[10px] opacity-60">({meta.enLabel})</span>
          <HintTip text={meta.hint} />
        </label>
        <select
          value={String(v)}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value;
            // 数字 option 自动转 number
            const opt = meta.options?.find((o) => String(o.value) === raw);
            const next = (typeof opt?.value === "number" ? Number(raw) : raw) as TextGenSettings[typeof key];
            onChange(key, next);
          }}
          className="w-full bg-background border border-input rounded h-8 px-2 text-xs disabled:opacity-50"
        >
          {meta.options?.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // 多行文本
  if (meta.type === "textarea") {
    const v = typeof value === "string" ? value : "";
    return (
      <div className="space-y-1" aria-disabled={disabled}>
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          <span>{meta.label}</span>
          <span className="text-[10px] opacity-60">({meta.enLabel})</span>
          <HintTip text={meta.hint} />
        </label>
        <textarea
          value={v}
          disabled={disabled}
          onChange={(e) => onChange(key, e.target.value as TextGenSettings[typeof key])}
          rows={3}
          className="w-full bg-background border border-input rounded p-2 text-xs font-mono leading-relaxed resize-y disabled:opacity-50"
        />
      </div>
    );
  }

  // 单行字符串
  if (meta.type === "string") {
    const v = typeof value === "string" ? value : "";
    return (
      <div className="space-y-1" aria-disabled={disabled}>
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          <span>{meta.label}</span>
          <span className="text-[10px] opacity-60">({meta.enLabel})</span>
          <HintTip text={meta.hint} />
        </label>
        <input
          type="text"
          value={v}
          disabled={disabled}
          onChange={(e) => onChange(key, e.target.value as TextGenSettings[typeof key])}
          className="w-full bg-background border border-input rounded h-8 px-2 text-xs disabled:opacity-50"
        />
      </div>
    );
  }

  // JSON
  if (meta.type === "json") {
    const v = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return (
      <div className="space-y-1" aria-disabled={disabled}>
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          <span>{meta.label}</span>
          <span className="text-[10px] opacity-60">({meta.enLabel})</span>
          <HintTip text={meta.hint} />
        </label>
        <textarea
          value={v}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value;
            try {
              const parsed = raw.trim() ? JSON.parse(raw) : null;
              onChange(key, parsed as TextGenSettings[typeof key]);
            } catch {
              // 暂存原始字符串，不阻塞输入
              onChange(key, raw as unknown as TextGenSettings[typeof key]);
            }
          }}
          rows={4}
          className="w-full bg-background border border-input rounded p-2 text-xs font-mono leading-relaxed resize-y disabled:opacity-50"
        />
      </div>
    );
  }

  return null;
}
