"use client";

import { useEffect, useRef } from "react";
import { useFormattingStore } from "@/stores/formatting-store";
import { useConnectionStore } from "@/lib/stores/connection-store";
import { ContextColumn } from "./context-column";
import { InstructColumn } from "./instruct-column";
import { SyspromptColumn } from "./sysprompt-column";
import { MiscColumn } from "./misc-column";
import { PromptManager } from "./prompt-manager";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";

/** 高级格式化 4 列主面板
 *
 * 顶部 Master Import / Master Export 与原项目 #af_master_import / #af_master_export 一致：
 * - 导出：一键打包当前激活的 6 段（preset/instruct/context/sysprompt/reasoning/srw）为
 *   ST-formatting-YYYY-MM-DD.json
 * - 导入：选择 master JSON 或单段 JSON，后端自动识别、分段写入并重载 4 类 + user formatting
 */
export function AdvancedFormattingPage() {
  const loadAllKinds = useFormattingStore((s) => s.loadAllKinds);
  const error = useFormattingStore((s) => s.error);
  const loadConnectionConfig = useConnectionStore((s) => s.loadConfig);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadAllKinds();
  }, [loadAllKinds]);

  /** Master Export：一键下载 6 段聚合包，文件名与原项目一致 */
  const onMasterExport = () => {
    const shortDate = new Date().toISOString().split("T")[0];
    const a = document.createElement("a");
    a.href = `/api/presets/master/export?download=1`;
    a.download = `ST-formatting-${shortDate}.json`;
    a.click();
  };

  /** Master Import：选中文件后 POST 到 /api/presets/import，后端自动识别 master / 单段 */
  const onMasterImportPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const baseName = file.name.replace(/\.json$/i, "");
      const res = await fetch("/api/presets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, fileName: baseName }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as {
        imported: { apiType: string; name: string; ok: boolean }[];
      };
      // 重载 4 类模板 + user formatting（含 srw）
      await loadAllKinds();
      try {
        const r = await fetch("/api/settings");
        if (r.ok) {
          const cfg = await r.json();
          loadConnectionConfig(cfg);
        }
      } catch (err) {
        console.warn("[advanced-formatting] reload settings", err);
      }
      const ok = json.imported.filter((x) => x.ok).length;
      const fail = json.imported.length - ok;
      alert(`导入完成：成功 ${ok} 段${fail > 0 ? `，失败 ${fail} 段` : ""}`);
    } catch (err) {
      console.error("[advanced-formatting] master import", err);
      alert(`导入失败：${(err as Error).message}`);
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BackButton />
            <h1 className="text-lg font-semibold">高级格式化 (Advanced Formatting)</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            配置上下文模板、Instruct 模式、系统提示词与全局格式化。主预设包 (Master) 与原项目 SillyTavern JSON 双向兼容。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            title="导入主预设包 (合并 6 段的 JSON) 或单个模板 JSON"
          >
            Master Import
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onMasterExport}
            title="一键导出当前激活的 6 段为主预设包 JSON"
          >
            Master Export
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={onMasterImportPick}
          />
        </div>
      </div>

      {error && (
        <div className="text-xs text-destructive border border-destructive/40 bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        <ContextColumn />
        <InstructColumn />
        <SyspromptColumn />
        <MiscColumn />
      </div>

      {/* Prompt Manager */}
      <PromptManager />
    </div>
  );
}
