"use client";

import { useFormattingStore } from "@/stores/formatting-store";
import { useConnectionStore } from "@/lib/stores/connection-store";
import { TemplateToolbar } from "./template-toolbar";
import { FormattingSectionBlock } from "./formatting-section-block";
import {
  CONTEXT_FIELD_META,
  CONTEXT_FIELD_SECTIONS,
  DEFAULT_FORMATTING_GLOBAL,
} from "@/types/advanced-formatting";

/** 第一列：上下文模板
 *
 * 与原项目 Context Formatting 区域（index.html L4193-4235）保持一致：
 *  - always_force_name2 / single_line / trim_sentences / use_stop_strings / names_as_stop_strings
 *    属于 context 模板本身
 *  - collapse_newlines / trim_spaces 是全局 formatting，原项目也放在同一区域里以便联动配置
 */
export function ContextColumn() {
  const current = useFormattingStore((s) => s.context.current);
  const setField = useFormattingStore((s) => s.setField);

  const formatting = useConnectionStore((s) => s.config.formatting);
  const setFormatting = useConnectionStore((s) => s.setFormatting);

  const collapseNewlines =
    formatting?.collapse_newlines ?? DEFAULT_FORMATTING_GLOBAL.collapse_newlines;
  const trimSpaces =
    formatting?.trim_spaces ?? DEFAULT_FORMATTING_GLOBAL.trim_spaces;

  return (
    <div className="space-y-3">
      <TemplateToolbar kind="context" title="上下文模板" enTitle="Context Template" />
      <div className="space-y-2">
        {CONTEXT_FIELD_SECTIONS.map((section) => (
          <div key={section.id}>
            <FormattingSectionBlock
              section={section}
              fieldMetas={CONTEXT_FIELD_META}
              values={current as unknown as Record<string, unknown>}
              defaultOpen={section.id === "story"}
              onChange={(key, value) => setField("context", key, value)}
            />
            {/* 原项目 Context Formatting 区域还含两个全局 formatting 开关，
                贴在 "上下文格式化" 分区后面一致呈现 */}
            {section.id === "format" && (
              <div className="mt-2 space-y-2 border border-dashed border-border rounded-md p-3">
                <div className="text-[10px] text-muted-foreground">
                  全局格式化（应用于所有模板，与 Misc 列同步）
                </div>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={collapseNewlines}
                    onChange={(e) =>
                      setFormatting({ collapse_newlines: e.target.checked })
                    }
                  />
                  <span>
                    合并连续换行
                    <span className="text-muted-foreground ml-1">
                      (Collapse Consecutive Newlines)
                    </span>
                  </span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={trimSpaces}
                    onChange={(e) =>
                      setFormatting({ trim_spaces: e.target.checked })
                    }
                  />
                  <span>
                    修剪空格
                    <span className="text-muted-foreground ml-1">(Trim spaces)</span>
                  </span>
                </label>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
