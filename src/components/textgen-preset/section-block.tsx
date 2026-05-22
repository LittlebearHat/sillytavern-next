"use client";

import { useState } from "react";
import { HintTip } from "@/components/world-info/hint-tip";
import { FieldRenderer } from "./field-renderer";
import {
  TEXTGEN_FIELD_META,
  type FieldSection,
  type TextGenSettings,
  type TextGenType,
  isFieldSupported,
} from "@/types/textgen";

interface Props {
  section: FieldSection;
  settings: TextGenSettings;
  apiType: TextGenType;
  defaultOpen?: boolean;
  onChange: <K extends keyof TextGenSettings>(key: K, value: TextGenSettings[K]) => void;
}

/** 字段分区折叠块（13 个分区共用） */
export function SectionBlock({ section, settings, apiType, defaultOpen, onChange }: Props) {
  const [open, setOpen] = useState(defaultOpen ?? section.id === "basic");

  const fields = section.fields
    .map((key) => TEXTGEN_FIELD_META.find((m) => m.key === key))
    .filter((m): m is (typeof TEXTGEN_FIELD_META)[number] => Boolean(m));

  // 简单两列布局：bool 字段排两列，其它单列
  const boolFields = fields.filter((f) => f.type === "bool");
  const otherFields = fields.filter((f) => f.type !== "bool");

  return (
    <div className="border border-border rounded-md">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent/30"
      >
        <span className="flex items-center gap-2">
          <span className="font-medium">{section.title}</span>
          <span className="text-[10px] text-muted-foreground">({section.enTitle})</span>
          {section.hint && <HintTip text={section.hint} />}
        </span>
        <span className="text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="p-3 space-y-3 border-t border-border">
          {otherFields.length > 0 && (
            <div className="space-y-3">
              {otherFields.map((meta) => (
                <FieldRenderer
                  key={String(meta.key)}
                  meta={meta}
                  value={(settings as Record<string, unknown>)[meta.key as string]}
                  disabled={!isFieldSupported(apiType, meta.key as string)}
                  onChange={onChange}
                />
              ))}
            </div>
          )}
          {boolFields.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {boolFields.map((meta) => (
                <FieldRenderer
                  key={String(meta.key)}
                  meta={meta}
                  value={(settings as Record<string, unknown>)[meta.key as string]}
                  disabled={!isFieldSupported(apiType, meta.key as string)}
                  onChange={onChange}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
