"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useWorldInfoStore } from "@/stores/worldinfo-store";
import {
  Plus,
  Upload,
  Download,
  Pencil,
  Copy,
  Trash2,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { EntryList } from "./entry-list";
import { WorldInfoSettingsPanel } from "./world-info-settings";

export function WorldInfoPage() {
  const books = useWorldInfoStore((s) => s.books);
  const currentBook = useWorldInfoStore((s) => s.currentBook);
  const settings = useWorldInfoStore((s) => s.settings);
  const loadBooks = useWorldInfoStore((s) => s.loadBooks);
  const loadSettings = useWorldInfoStore((s) => s.loadSettings);
  const loadBook = useWorldInfoStore((s) => s.loadBook);
  const createBook = useWorldInfoStore((s) => s.createBook);
  const deleteBook = useWorldInfoStore((s) => s.deleteBook);
  const renameBook = useWorldInfoStore((s) => s.renameBook);
  const duplicateBook = useWorldInfoStore((s) => s.duplicateBook);
  const importBookFile = useWorldInfoStore((s) => s.importBookFile);
  const exportBook = useWorldInfoStore((s) => s.exportBook);
  const toggleGlobalSelect = useWorldInfoStore((s) => s.toggleGlobalSelect);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBooks();
    loadSettings();
  }, [loadBooks, loadSettings]);

  const handleCreate = async () => {
    const name = prompt("新世界书名称");
    if (!name?.trim()) return;
    const book = await createBook(name.trim());
    if (book) loadBook(book.id);
  };

  const handleRename = async () => {
    if (!currentBook) return;
    const name = prompt("新名称", currentBook.name);
    if (!name?.trim()) return;
    await renameBook(currentBook.id, name.trim());
  };

  const handleDuplicate = async () => {
    if (!currentBook) return;
    const name = prompt("副本名称", `${currentBook.name} - Copy`);
    const book = await duplicateBook(currentBook.id, name?.trim() || undefined);
    if (book) loadBook(book.id);
  };

  const handleDelete = async () => {
    if (!currentBook) return;
    if (!confirm(`确定删除世界书"${currentBook.name}"？`)) return;
    await deleteBook(currentBook.id);
  };

  const handleImportClick = () => fileRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const book = await importBookFile(file);
    if (book) loadBook(book.id);
    e.target.value = "";
  };

  return (
    <div className="flex h-full">
      {/* 左侧：世界书列表 + 全局设置 */}
      <aside className="w-80 border-r border-border p-4 overflow-y-auto space-y-4">
        <div className="flex items-center gap-2">
          <BackButton />
          <h2 className="text-lg font-semibold">世界书</h2>
        </div>

        {/* 全局多选 */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            全局生效
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto border border-border rounded-md p-2">
            {books.length === 0 && (
              <p className="text-xs text-muted-foreground">暂无世界书</p>
            )}
            {books.map((b) => (
              <label
                key={b.id}
                className="flex items-center gap-2 text-sm cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={settings.globalSelect.includes(b.id)}
                  onChange={(e) => toggleGlobalSelect(b.id, e.target.checked)}
                />
                <span className="truncate">{b.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 当前编辑选择 */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            编辑
          </h3>
          <select
            value={currentBook?.id ?? ""}
            onChange={(e) => {
              if (e.target.value) loadBook(e.target.value);
            }}
            className="w-full h-9 bg-background border border-input rounded-md px-2 text-sm"
          >
            <option value="">请选择...</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* 工具栏 */}
          <div className="grid grid-cols-3 gap-1">
            <Button size="sm" variant="outline" onClick={handleCreate} title="新建">
              <Plus size={14} />
              新建
            </Button>
            <Button size="sm" variant="outline" onClick={handleImportClick} title="导入">
              <Upload size={14} />
              导入
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => currentBook && exportBook(currentBook.id)}
              disabled={!currentBook}
              title="导出"
            >
              <Download size={14} />
              导出
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRename}
              disabled={!currentBook}
              title="重命名"
            >
              <Pencil size={14} />
              重命名
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDuplicate}
              disabled={!currentBook}
              title="复制"
            >
              <Copy size={14} />
              复制
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDelete}
              disabled={!currentBook}
              title="删除"
              className="text-red-400 hover:text-red-500"
            >
              <Trash2 size={14} />
              删除
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <WorldInfoSettingsPanel />
      </aside>

      {/* 右侧：词条编辑 */}
      <main className="flex-1 overflow-y-auto p-6">
        <EntryList />
      </main>
    </div>
  );
}
