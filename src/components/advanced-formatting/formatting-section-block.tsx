"use client";

import { useState } from "react";
import { HintTip } from "@/components/world-info/hint-tip";
import { FormattingFieldRenderer } from "./formatting-field-renderer";
import type { FieldMeta, FieldSection } from "@/types/advanced-formatting";

interface Props {
  section: FieldSection;
  fieldMetas: FieldMeta[];
  values: Record<string, unknown>;
  defaultOpen?: boolean;
  onChange: (key: string, value: unknown) => void;
}

/** 通用字段分区折叠块 */
export function FormattingSectionBlock({ section, fieldMetas, values, defaultOpen, onChange }: Props) {
  const [open, setOpen] = useState(defaultOpen ?? true);

  const fields = section.fields
    .map((key) => fieldMetas.find((m) => m.key === key))
    .filter((m): m is FieldMeta => Boolean(m));

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
                <FormattingFieldRenderer
                  key={meta.key}
                  meta={meta}
                  value={values[meta.key]}
                  onChange={onChange}
                />
              ))}
            </div>
          )}
          {boolFields.length > 0 && (
            <div className="grid grid-cols-1 gap-2">
              {boolFields.map((meta) => (
                <FormattingFieldRenderer
                  key={meta.key}
                  meta={meta}
                  value={values[meta.key]}
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
