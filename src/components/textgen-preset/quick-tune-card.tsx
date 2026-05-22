"use client";

import { FieldRenderer } from "./field-renderer";
import {
  TEXTGEN_FIELD_META,
  isFieldSupported,
  type TextGenSettings,
  type TextGenType,
} from "@/types/textgen";

interface Props {
  settings: TextGenSettings;
  apiType: TextGenType;
  onChange: <K extends keyof TextGenSettings>(key: K, value: TextGenSettings[K]) => void;
}

/** 高频字段快速调整卡片：把 6 个最常用的核采样器置顶展示，减少滚动。 */
const QUICK_KEYS = [
  "temp",
  "top_p",
  "top_k",
  "min_p",
  "rep_pen",
  "rep_pen_range",
] as const;

export function QuickTuneCard({ settings, apiType, onChange }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3 space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium">
          快速调整
          <span className="ml-2 text-[10px] text-muted-foreground font-normal">
            Quick Tune
          </span>
        </h3>
        <span className="text-[10px] text-muted-foreground">
          高频核采样器，下方分区有完整字段
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
        {QUICK_KEYS.map((k) => {
          const meta = TEXTGEN_FIELD_META.find((m) => m.key === k);
          if (!meta) return null;
          const value = (settings as unknown as Record<string, unknown>)[k];
          const supported = isFieldSupported(apiType, k);
          return (
            <FieldRenderer
              key={k}
              meta={meta}
              value={value}
              disabled={!supported}
              onChange={onChange}
            />
          );
        })}
      </div>
    </div>
  );
}
