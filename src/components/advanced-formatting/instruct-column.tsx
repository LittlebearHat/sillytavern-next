"use client";

import { useFormattingStore } from "@/stores/formatting-store";
import { useConnectionStore } from "@/lib/stores/connection-store";
import { TemplateToolbar } from "./template-toolbar";
import { FormattingSectionBlock } from "./formatting-section-block";
import {
  INSTRUCT_FIELD_META,
  INSTRUCT_FIELD_SECTIONS,
} from "@/types/advanced-formatting";

/** 第二列：Instruct 模板 */
export function InstructColumn() {
  const current = useFormattingStore((s) => s.instruct.current);
  const setField = useFormattingStore((s) => s.setField);

  const formatting = useConnectionStore((s) => s.config.formatting);
  const setFormatting = useConnectionStore((s) => s.setFormatting);

  const enabled = formatting?.instruct_enabled ?? false;

  // bind_to_context 字段（在 instruct slice 内部，便于联动 context 选择）
  const bindToContext = Boolean((current as Record<string, unknown>)?.bind_to_context ?? false);

  const enableToggle = (
    <label className="flex items-center gap-1.5 text-xs">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => setFormatting({ instruct_enabled: e.target.checked })}
        className="h-4 w-4"
      />
      <span>启用 Instruct (Enabled)</span>
    </label>
  );

  return (
    <div className="space-y-3">
      <TemplateToolbar
        kind="instruct"
        title="Instruct 模板"
        enTitle="Instruct Template"
        disabled={!enabled}
        extra={enableToggle}
      />

      <div className={`space-y-2 ${enabled ? "" : "opacity-60 pointer-events-none"}`}>
        {/* bind_to_context 显式放最上方，便于联动 */}
        <label className="flex items-center gap-2 text-xs px-3 py-2 border border-border rounded-md">
          <input
            type="checkbox"
            checked={bindToContext}
            onChange={(e) => setField("instruct", "bind_to_context", e.target.checked)}
            className="h-4 w-4"
          />
          <span>绑定到上下文模板 (Bind to Context Template)</span>
          <span className="text-[10px] text-muted-foreground">勾选后切换 instruct 时同名 context 会自动激活</span>
        </label>

        {INSTRUCT_FIELD_SECTIONS.map((section) => (
          <FormattingSectionBlock
            key={section.id}
            section={section}
            fieldMetas={INSTRUCT_FIELD_META}
            values={current as unknown as Record<string, unknown>}
            defaultOpen={section.id === "control"}
            onChange={(key, value) => setField("instruct", key, value)}
          />
        ))}
      </div>
    </div>
  );
}
