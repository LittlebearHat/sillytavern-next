"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useFormattingStore, type TemplateKind } from "@/stores/formatting-store";

interface Props {
  kind: TemplateKind;
  /** 顶部标题 */
  title: string;
  enTitle: string;
  /** 是否禁用整列（用于 instruct_enabled / sysprompt_enabled 关闭时） */
  disabled?: boolean;
  /** 列尾扩展槽（如 sysprompt 启用 toggle） */
  extra?: React.ReactNode;
}

/** 通用模板顶栏：选择 / 保存 / 另存 / 重命名 / 删除 / 设为激活 / 重置 / 导入 / 导出 / 恢复内置 */
export function TemplateToolbar({ kind, title, enTitle, disabled, extra }: Props) {
  const slice = useFormattingStore((s) => s[kind]);
  const select = useFormattingStore((s) => s.select);
  const save = useFormattingStore((s) => s.save);
  const saveAs = useFormattingStore((s) => s.saveAs);
  const rename = useFormattingStore((s) => s.rename);
  const remove = useFormattingStore((s) => s.remove);
  const setActive = useFormattingStore((s) => s.setActive);
  const resetToActive = useFormattingStore((s) => s.resetToActive);
  const exportJson = useFormattingStore((s) => s.exportJson);
  const importFromJson = useFormattingStore((s) => s.importFromJson);
  const restoreDefault = useFormattingStore((s) => s.restoreDefault);
  const listDefaultNames = useFormattingStore((s) => s.listDefaultNames);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [defaultNames, setDefaultNames] = useState<string[]>([]);

  const activeItem = slice.list.find((p) => p.id === slice.activeId);
  /** 当前生效（会被 prompt 构造使用）的那个模板，与下拉选中的"当前编辑对象"可能不同 */
  const liveItem = slice.list.find((p) => p.isActive === true);
  const isLiveSelected = !!activeItem && activeItem.id === liveItem?.id;

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const baseName = file.name.replace(/\.json$/i, "");
      await importFromJson(kind, data, baseName);
    } catch (err) {
      console.error("[template-toolbar] import", err);
      alert("导入失败：JSON 解析错误");
    }
  };

  const onSaveAs = async () => {
    const name = prompt("新模板名称", activeItem?.name ? `${activeItem.name} (副本)` : "新模板");
    if (!name) return;
    await saveAs(kind, name);
  };

  const onRename = async () => {
    if (!activeItem) return;
    const name = prompt("重命名模板", activeItem.name);
    if (!name || name === activeItem.name) return;
    await rename(kind, activeItem.id, name);
  };

  const onDelete = async () => {
    if (!activeItem) return;
    if (!confirm(`确定删除模板 "${activeItem.name}"？此操作不可恢复。`)) return;
    await remove(kind, activeItem.id);
  };

  const onSetActive = async () => {
    if (!activeItem) return;
    await setActive(kind, activeItem.id);
  };

  const onOpenRestore = async () => {
    const names = await listDefaultNames(kind);
    setDefaultNames(names);
    setRestoreOpen(true);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <span>{title}</span>
          <span className="text-[10px] text-muted-foreground font-normal">({enTitle})</span>
        </h2>
        {/* extra（如启用 toggle）不受 disabled 影响，始终可点 */}
        {extra}
      </div>

      {/* 以下区域受 disabled 控制：disabled 时只变灰并拦截事件，不影响上方 toggle */}
      <div className={disabled ? "opacity-60 pointer-events-none space-y-2" : "space-y-2"}>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
          <span>当前模板 (Template)</span>
          {slice.isDirty && <span className="text-[10px] text-amber-500">● 未保存</span>}
          {liveItem && (
            <span
              className="text-[10px] text-emerald-500 ml-auto"
              title="当前生效的模板。生效中的模板会被拼接进你对 AI 发送的 Prompt。同一类只能有一个生效中，点“设为生效”可以把当前选中的换上去。"
            >
              ● 生效中: {liveItem.name}
            </span>
          )}
        </label>
        <select
          value={slice.activeId ?? ""}
          onChange={(e) => select(kind, e.target.value)}
          className="w-full bg-background border border-input rounded-md h-9 px-2 text-sm"
        >
          {slice.list.length === 0 && <option value="">（暂无）</option>}
          {slice.list.map((p) => (
            <option key={p.id} value={p.id}>
              {p.isActive ? "★ " : ""}
              {p.name}
              {p.isDefault ? " · 内置" : ""}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-muted-foreground/80 leading-snug">
          下拉只是切换“在看/编辑”哪个模板；要让改动真正应用到对话，需要点下面的“设为生效”。同类同时只能有 1 个生效，不存在“取消生效”；如需临时关闭本类，请用列顶部的启用开关。
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" onClick={() => save(kind)} disabled={!slice.activeId || !slice.isDirty || slice.saving}>
          {slice.saving ? "…" : "保存"}
        </Button>
        <Button size="sm" variant="outline" onClick={onSaveAs}>另存</Button>
        <Button size="sm" variant="outline" onClick={onRename} disabled={!slice.activeId}>重命名</Button>
                <Button
                  size="sm"
                  variant={isLiveSelected ? "secondary" : "outline"}
                  onClick={onSetActive}
                  disabled={!slice.activeId || isLiveSelected}
                  title={
                    isLiveSelected
                      ? "当前选中的已是生效中的模板；不需要取消，如需切换请先选另一个再点本按钮。"
                      : "把当前选中的模板设为生效中，下一条 prompt 会使用该模板拼接。"
                  }
                >
                  {isLiveSelected ? "✓ 生效中" : "设为生效"}
                </Button>
        <Button size="sm" variant="outline" onClick={() => resetToActive(kind)} disabled={!slice.isDirty}>重置</Button>
        <Button size="sm" variant="outline" onClick={() => slice.activeId && exportJson(slice.activeId)} disabled={!slice.activeId} title="仅导出当前选中的单个模板。如需一次打包 6 段请用顶部 Master Export。">导出此模板</Button>
        <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} title="导入单个模板 JSON。Master JSON 请用顶部 Master Import。">导入此模板</Button>
        <Button size="sm" variant="outline" onClick={onOpenRestore}>恢复内置</Button>
        <Button size="sm" variant="destructive" onClick={onDelete} disabled={!slice.activeId}>删除</Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={onPickFile}
        />
      </div>

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
              <h3 className="text-sm font-medium">恢复内置 {title} 模板</h3>
              <button onClick={() => setRestoreOpen(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              选择一个内置模板进行恢复。同名将被覆盖；不存在则新建。
            </p>
            <div className="flex flex-wrap gap-2 max-h-[60vh] overflow-y-auto">
              {defaultNames.length === 0 && (
                <span className="text-xs text-muted-foreground">无可恢复项</span>
              )}
              {defaultNames.map((name) => (
                <Button
                  key={name}
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await restoreDefault(kind, name);
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
      </div>
    </div>
  );
}
