"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTextGenPresetStore } from "@/stores/textgen-preset-store";
import { MasterDialog } from "./master-dialog";
import {
  TEXTGEN_TYPES,
  TEXTGEN_TYPE_LABELS,
  type TextGenType,
} from "@/types/textgen";

/** 顶栏：apiType 切换 / preset 选择（带搜索）/ 主次操作分组 CRUD */
export function PresetToolbar() {
  const apiType = useTextGenPresetStore((s) => s.apiType);
  const presets = useTextGenPresetStore((s) => s.presets);
  const activePresetId = useTextGenPresetStore((s) => s.activePresetId);
  const isDirty = useTextGenPresetStore((s) => s.isDirty);
  const saving = useTextGenPresetStore((s) => s.saving);
  const setApiType = useTextGenPresetStore((s) => s.setApiType);
  const select = useTextGenPresetStore((s) => s.select);
  const save = useTextGenPresetStore((s) => s.save);
  const saveAs = useTextGenPresetStore((s) => s.saveAs);
  const rename = useTextGenPresetStore((s) => s.rename);
  const remove = useTextGenPresetStore((s) => s.remove);
  const setActive = useTextGenPresetStore((s) => s.setActive);
  const exportJson = useTextGenPresetStore((s) => s.exportJson);
  const importFromJson = useTextGenPresetStore((s) => s.importFromJson);
  const restoreDefault = useTextGenPresetStore((s) => s.restoreDefault);
  const listDefaultNames = useTextGenPresetStore((s) => s.listDefaultNames);
  const resetToActive = useTextGenPresetStore((s) => s.resetToActive);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [defaultNames, setDefaultNames] = useState<string[]>([]);
  const [masterOpen, setMasterOpen] = useState(false);

  // E. 预设搜索过滤
  const [search, setSearch] = useState("");
  const filteredPresets = useMemo(() => {
    if (!search.trim()) return presets;
    const q = search.toLowerCase();
    return presets.filter((p) => p.name.toLowerCase().includes(q));
  }, [presets, search]);

  const activePreset = presets.find((p) => p.id === activePresetId);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 清空，方便下次选同一文件
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const baseName = file.name.replace(/\.json$/i, "");
      await importFromJson(data, baseName);
    } catch (err) {
      console.error("[preset-toolbar] import", err);
      alert("导入失败：JSON 解析错误");
    }
  };

  const onSaveAs = async () => {
    const name = prompt("新预设名称", activePreset?.name ? `${activePreset.name} (副本)` : "新预设");
    if (!name) return;
    await saveAs(name);
  };

  const onRename = async () => {
    if (!activePreset) return;
    const name = prompt("重命名预设", activePreset.name);
    if (!name || name === activePreset.name) return;
    await rename(activePreset.id, name);
  };

  const onDelete = async () => {
    if (!activePreset) return;
    if (!confirm(`确定删除预设 "${activePreset.name}"？此操作不可恢复。`)) return;
    await remove(activePreset.id);
  };

  const onSetActive = async () => {
    if (!activePreset) return;
    await setActive(activePreset.id);
  };

  const onOpenRestore = async () => {
    const names = await listDefaultNames();
    setDefaultNames(names);
    setRestoreOpen(true);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/30 p-3">
      {/* 第 1 行：API 类型 + 预设选择（带搜索） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            API 类型
            <span className="ml-1.5 text-[10px] opacity-60">API Type</span>
          </label>
          <select
            value={apiType}
            onChange={(e) => setApiType(e.target.value as TextGenType)}
            className="w-full bg-background border border-input rounded-md h-9 px-2 text-sm"
          >
            {Object.values(TEXTGEN_TYPES).map((t) => (
              <option key={t} value={t}>
                {TEXTGEN_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground flex items-center gap-2">
            <span>
              预设
              <span className="ml-1.5 text-[10px] opacity-60">Preset</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              （共 {presets.length} 项{search ? ` · 已筛 ${filteredPresets.length}` : ""}）
            </span>
          </label>
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="🔍 搜索预设…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-28 bg-background border border-input rounded-md h-9 px-2 text-xs"
            />
            <select
              value={activePresetId ?? ""}
              onChange={(e) => select(e.target.value)}
              className="flex-1 bg-background border border-input rounded-md h-9 px-2 text-sm min-w-0"
            >
              {filteredPresets.length === 0 && (
                <option value="">{search ? "（无匹配项）" : "（暂无预设）"}</option>
              )}
              {filteredPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.isActive ? "★ " : ""}
                  {p.name}
                  {p.isDefault ? " · 内置" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 第 2 行：主操作（高频，常用） */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide select-none mr-1">
          主操作
        </span>
        <Button
          size="sm"
          onClick={save}
          disabled={!activePresetId || !isDirty || saving}
          title="保存当前编辑到所选预设"
        >
          {saving ? "保存中…" : isDirty ? "保存 *" : "保存"}
        </Button>
        <Button size="sm" variant="outline" onClick={onSaveAs} title="基于当前编辑新建一个预设">
          另存为
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onRename}
          disabled={!activePresetId}
          title="重命名当前预设"
        >
          重命名
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onSetActive}
          disabled={!activePresetId || activePreset?.isActive === true}
          title="把当前预设设为该 API 类型的生效预设"
        >
          设为激活
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={resetToActive}
          disabled={!isDirty}
          title="放弃未保存改动，回到激活预设的值"
        >
          重置改动
        </Button>
      </div>

      {/* 第 3 行：次操作（导入导出 + 危险操作） */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide select-none mr-1">
          数据
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => activePresetId && exportJson(activePresetId)}
          disabled={!activePresetId}
          title="导出当前预设为 JSON 文件"
        >
          导出 JSON
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          title="从 JSON 文件导入预设"
        >
          导入 JSON
        </Button>
        <Button size="sm" variant="outline" onClick={onOpenRestore} title="从内置库恢复指定预设">
          恢复内置
        </Button>
        <Button size="sm" variant="outline" onClick={() => setMasterOpen(true)} title="主预设包：一次导入/导出多个预设段">
          主预设包
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="destructive"
          onClick={onDelete}
          disabled={!activePresetId}
          title="删除当前预设（不可恢复）"
        >
          删除
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={onPickFile}
        />
      </div>

      {/* 恢复内置弹层 */}
      {restoreOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setRestoreOpen(false)}
        >
          <div
            className="bg-popover text-popover-foreground rounded-md border border-border shadow-xl max-w-md w-full p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">恢复内置预设</h3>
              <button onClick={() => setRestoreOpen(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              选择一个内置 textgen 预设进行恢复。如同名预设已存在则会被覆盖；不存在则新建。
            </p>
            <div className="flex flex-wrap gap-2">
              {defaultNames.length === 0 && (
                <span className="text-xs text-muted-foreground">无可恢复项</span>
              )}
              {defaultNames.map((name) => (
                <Button
                  key={name}
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await restoreDefault(name);
                    setRestoreOpen(false);
                  }}
                >
                  {name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* 主预设包对话框 */}
      <MasterDialog open={masterOpen} onClose={() => setMasterOpen(false)} />
    </div>
  );
}
