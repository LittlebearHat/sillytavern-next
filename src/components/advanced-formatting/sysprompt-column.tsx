"use client";

import { useFormattingStore } from "@/stores/formatting-store";
import { useConnectionStore } from "@/lib/stores/connection-store";
import { TemplateToolbar } from "./template-toolbar";
import { FormattingFieldRenderer } from "./formatting-field-renderer";
import { SYSPROMPT_FIELD_META } from "@/types/advanced-formatting";

/** 第三列：系统提示词模板 */
export function SyspromptColumn() {
  const current = useFormattingStore((s) => s.sysprompt.current);
  const setField = useFormattingStore((s) => s.setField);

  const formatting = useConnectionStore((s) => s.config.formatting);
  const setFormatting = useConnectionStore((s) => s.setFormatting);

  const enabled = formatting?.sysprompt_enabled ?? true;

  const enableToggle = (
    <label className="flex items-center gap-1.5 text-xs">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => setFormatting({ sysprompt_enabled: e.target.checked })}
        className="h-4 w-4"
      />
      <span>启用 System Prompt (Enabled)</span>
    </label>
  );

  return (
    <div className="space-y-3">
      <TemplateToolbar
        kind="sysprompt"
        title="系统提示词"
        enTitle="System Prompt"
        disabled={!enabled}
        extra={enableToggle}
      />

      <div className={`space-y-3 ${enabled ? "" : "opacity-60 pointer-events-none"}`}>
        {SYSPROMPT_FIELD_META.map((meta) => (
          <FormattingFieldRenderer
            key={meta.key}
            meta={meta}
            value={(current as unknown as Record<string, unknown>)[meta.key]}
            onChange={(key, value) => setField("sysprompt", key, value)}
          />
        ))}
      </div>
    </div>
  );
}
