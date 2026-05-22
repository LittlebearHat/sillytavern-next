"use client";

import { useFormattingStore } from "@/stores/formatting-store";
import { useConnectionStore } from "@/lib/stores/connection-store";
import { TemplateToolbar } from "./template-toolbar";
import { FormattingSectionBlock } from "./formatting-section-block";
import { FormattingFieldRenderer } from "./formatting-field-renderer";
import {
  REASONING_FIELD_META,
  FORMATTING_GLOBAL_FIELD_META,
  FORMATTING_GLOBAL_FIELD_SECTIONS,
  DEFAULT_FORMATTING_GLOBAL,
} from "@/types/advanced-formatting";

/** 第四列：Misc — Reasoning 模板 + 全局格式化 */
export function MiscColumn() {
  const current = useFormattingStore((s) => s.reasoning.current);
  const setField = useFormattingStore((s) => s.setField);

  const formatting = useConnectionStore((s) => s.config.formatting) ?? DEFAULT_FORMATTING_GLOBAL;
  const setFormatting = useConnectionStore((s) => s.setFormatting);

  return (
    <div className="space-y-4">
      {/* Reasoning Template */}
      <div className="space-y-3">
        <TemplateToolbar
          kind="reasoning"
          title="推理模板"
          enTitle="Reasoning Template"
        />
        <div className="space-y-3">
          {REASONING_FIELD_META.map((meta) => (
            <FormattingFieldRenderer
              key={meta.key}
              meta={meta}
              value={(current as unknown as Record<string, unknown>)[meta.key]}
              onChange={(key, value) => setField("reasoning", key, value)}
            />
          ))}
        </div>
      </div>

      {/* 全局 Formatting */}
      <div className="space-y-2 border-t border-border pt-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <span>全局格式化设置</span>
          <span className="text-[10px] text-muted-foreground font-normal">(Global Formatting)</span>
        </h2>
        {FORMATTING_GLOBAL_FIELD_SECTIONS.map((section) => (
          <FormattingSectionBlock
            key={section.id}
            section={section}
            fieldMetas={FORMATTING_GLOBAL_FIELD_META}
            values={formatting as unknown as Record<string, unknown>}
            defaultOpen={section.id === "format" || section.id === "tokenizer"}
            onChange={(key, value) => setFormatting({ [key]: value })}
          />
        ))}
      </div>
    </div>
  );
}
