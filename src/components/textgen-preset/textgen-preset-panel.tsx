"use client";

import { useEffect, useState } from "react";
import { useTextGenPresetStore } from "@/stores/textgen-preset-store";
import { TEXTGEN_FIELD_SECTIONS } from "@/types/textgen";
import { PresetToolbar } from "./preset-toolbar";
import { SectionBlock } from "./section-block";
import { SamplerOrderEditor } from "./sampler-order-editor";
import { LogitBiasEditor } from "./logit-bias-editor";
import { QuickTuneCard } from "./quick-tune-card";
import { BackButton } from "@/components/ui/back-button";

type TabKey = "fields" | "sampler-order" | "logit-bias";

const TABS: { key: TabKey; label: string; sub: string }[] = [
  { key: "fields", label: "字段编辑", sub: "Fields" },
  { key: "sampler-order", label: "采样顺序", sub: "Sampler Order" },
  { key: "logit-bias", label: "Logit 偏置", sub: "Logit Bias" },
];

/** 文本补全预设主面板 */
export function TextGenPresetPanel() {
  const apiType = useTextGenPresetStore((s) => s.apiType);
  const settings = useTextGenPresetStore((s) => s.currentSettings);
  const setField = useTextGenPresetStore((s) => s.setField);
  const loadAll = useTextGenPresetStore((s) => s.loadAll);
  const loading = useTextGenPresetStore((s) => s.loading);
  const error = useTextGenPresetStore((s) => s.error);
  const presets = useTextGenPresetStore((s) => s.presets);
  const isDirty = useTextGenPresetStore((s) => s.isDirty);

  const [tab, setTab] = useState<TabKey>("fields");

  useEffect(() => {
    if (presets.length === 0) {
      void loadAll();
    }
  }, [loadAll, presets.length]);

  // F. 未保存改动时拦截浏览器关闭/刷新/前进后退
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  return (
    <div className="space-y-4 p-4 max-w-5xl mx-auto">
      <div className="space-y-1">
        <div className="flex items-center gap-3 flex-wrap">
          <BackButton />
          <h1 className="text-lg font-semibold">
            文本补全预设
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              Text Completion Preset
            </span>
          </h1>
          {/* F. 全局未保存徽标 */}
          {isDirty && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[11px]"
              title="当前预设有未保存的修改"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              未保存改动
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          完整 74 个采样字段，与原项目 SillyTavern preset JSON 双向兼容。预设可导入 / 导出 / 恢复内置 / 跨设备同步。
        </p>
      </div>

      <PresetToolbar />

      {error && (
        <div className="text-xs text-destructive border border-destructive/40 bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {loading && presets.length === 0 ? (
        <div className="text-sm text-muted-foreground">加载中…</div>
      ) : (
        <div className="space-y-3">
          {/* C. 高频字段快速调整卡片置顶 */}
          <QuickTuneCard
            settings={settings}
            apiType={apiType}
            onChange={setField}
          />

          {/* D. Tab 切换：字段 / 采样顺序 / Logit Bias */}
          <div className="flex items-center gap-1 border-b border-border">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-2 text-sm transition-colors border-b-2 -mb-px ${
                  tab === t.key
                    ? "border-primary text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                <span className="ml-1.5 text-[10px] opacity-60">{t.sub}</span>
              </button>
            ))}
          </div>

          {tab === "fields" && (
            <div className="space-y-3">
              {TEXTGEN_FIELD_SECTIONS.map((section) => (
                <SectionBlock
                  key={section.id}
                  section={section}
                  settings={settings}
                  apiType={apiType}
                  onChange={setField}
                />
              ))}
            </div>
          )}

          {tab === "sampler-order" && (
            <SamplerOrderEditor
              apiType={apiType}
              settings={settings}
              onChange={setField}
            />
          )}

          {tab === "logit-bias" && (
            <LogitBiasEditor settings={settings} onChange={setField} />
          )}
        </div>
      )}
    </div>
  );
}
