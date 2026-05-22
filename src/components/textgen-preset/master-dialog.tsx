"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTextGenPresetStore } from "@/stores/textgen-preset-store";

interface MasterMeta {
  apiType: string;
  masterKey: string;
  name: string | null;
}

const SECTION_LABELS: Record<string, string> = {
  preset: "文本补全 (Text Completion)",
  instruct: "指令模式 (Instruct)",
  context: "上下文模板 (Context)",
  sysprompt: "系统提示词 (Sysprompt)",
  reasoning: "推理格式 (Reasoning)",
  srw: "回复格式 (SRW)",
};

const ALL_KEYS = ["preset", "instruct", "context", "sysprompt", "reasoning", "srw"];

interface ImportSection {
  apiType: string;
  name: string;
  ok: boolean;
}

/** 主预设包对话框：导入 / 导出 6 段聚合 JSON */
export function MasterDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  /** 导入成功后的额外回调（高级格式化页面传入以重载 formatting store） */
  onImported?: (sections: ImportSection[]) => void | Promise<void>;
}) {
  const [meta, setMeta] = useState<MasterMeta[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(ALL_KEYS));
  const [busy, setBusy] = useState(false);
  const [importResult, setImportResult] = useState<ImportSection[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadAll = useTextGenPresetStore((s) => s.loadAll);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/presets/master/export");
        if (!res.ok) throw new Error(await res.text());
        const json = (await res.json()) as { meta: MasterMeta[] };
        if (cancelled) return;
        setMeta(json.meta ?? []);
        const next = new Set<string>();
        for (const m of json.meta ?? []) {
          if (m.name) next.add(m.masterKey);
        }
        setSelected(next.size > 0 ? next : new Set(ALL_KEYS));
        setImportResult(null);
      } catch (err) {
        console.error("[master-dialog] load meta", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const toggleKey = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const onExport = async () => {
    if (selected.size === 0) {
      alert("请至少选择一段");
      return;
    }
    const apiTypes = ALL_KEYS.filter((k) => selected.has(k))
      .map((k) => meta.find((m) => m.masterKey === k)?.apiType)
      .filter((v): v is string => Boolean(v));
    setBusy(true);
    try {
      const url = `/api/presets/master/export?download=1&apiTypes=${encodeURIComponent(apiTypes.join(","))}`;
      const a = document.createElement("a");
      a.href = url;
      a.click();
    } finally {
      setBusy(false);
    }
  };

  const onPickImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const baseName = file.name.replace(/\.json$/i, "");
      const res = await fetch("/api/presets/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data, fileName: baseName }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { imported: ImportSection[] };
      setImportResult(json.imported ?? []);
      // 重载当前 textgen 列表
      await loadAll();
      // 额外回调（高级格式化重载 4 类）
      if (onImported) await onImported(json.imported ?? []);
    } catch (err) {
      console.error("[master-dialog] import", err);
      alert("导入失败：JSON 解析或服务端错误");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-popover text-popover-foreground rounded-md border border-border shadow-xl max-w-lg w-full p-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">主预设包 (Master Preset)</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          主预设包将多段（文本补全 / Instruct / Context / Sysprompt / Reasoning / SRW）打包为一个
          JSON。导出时每段使用当前激活的预设；导入时按字段自动识别每段并写入对应类型。
        </p>

        {/* 段选择 */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">选择要导出的段</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_KEYS.map((key) => {
              const m = meta.find((x) => x.masterKey === key);
              const has = !!m?.name;
              const checked = selected.has(key);
              return (
                <label
                  key={key}
                  className={`flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-xs cursor-pointer ${has ? "" : "opacity-60"}`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleKey(key)}
                      disabled={!has}
                    />
                    <span>{SECTION_LABELS[key] ?? key}</span>
                  </span>
                  <span className="text-muted-foreground truncate max-w-[120px]" title={m?.name ?? ""}>
                    {m?.name ?? "—"}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onExport} disabled={busy || selected.size === 0}>
            导出主预设包
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            导入主预设包
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={onPickImportFile}
          />
        </div>

        {/* 导入结果 */}
        {importResult && (
          <div className="space-y-1 border-t border-border pt-3">
            <div className="text-xs text-muted-foreground">导入结果</div>
            <ul className="space-y-1 text-xs">
              {importResult.length === 0 && (
                <li className="text-muted-foreground">未识别到任何段</li>
              )}
              {importResult.map((r, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className={r.ok ? "text-emerald-500" : "text-rose-500"}>
                    {r.ok ? "✓" : "✗"}
                  </span>
                  <span className="text-muted-foreground">[{r.apiType}]</span>
                  <span className="truncate">{r.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
