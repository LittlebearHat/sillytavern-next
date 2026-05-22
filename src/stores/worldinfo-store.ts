import { create } from "zustand";
import type {
  WorldInfo,
  WorldInfoEntry,
  WorldInfoSettings,
} from "@/types";
import { DEFAULT_WORLD_INFO_SETTINGS, createDefaultWorldInfoEntry } from "@/types";

interface WorldInfoState {
  /** 全部 lorebook 列表 */
  books: WorldInfo[];
  /** 当前正在编辑的 lorebook */
  currentBook: WorldInfo | null;
  /** 全局设置（含 globalSelect） */
  settings: WorldInfoSettings;

  loading: boolean;

  // ================== 列表 ==================
  loadBooks: () => Promise<void>;
  createBook: (name: string) => Promise<WorldInfo | null>;
  deleteBook: (id: string) => Promise<void>;
  renameBook: (id: string, name: string) => Promise<void>;
  duplicateBook: (id: string, name?: string) => Promise<WorldInfo | null>;
  importBookFile: (file: File) => Promise<WorldInfo | null>;
  exportBook: (id: string) => Promise<void>;

  // ================== 当前 book ==================
  loadBook: (id: string) => Promise<void>;
  setCurrentBook: (book: WorldInfo | null) => void;

  // ================== 词条 ==================
  upsertEntry: (entry: Partial<WorldInfoEntry>) => Promise<WorldInfoEntry | null>;
  deleteEntry: (uid: number) => Promise<void>;
  newEntry: () => Promise<WorldInfoEntry | null>;

  // ================== 设置 ==================
  loadSettings: () => Promise<void>;
  updateSettings: (patch: Partial<WorldInfoSettings>) => Promise<void>;
  toggleGlobalSelect: (bookId: string, selected: boolean) => Promise<void>;
}

export const useWorldInfoStore = create<WorldInfoState>((set, get) => ({
  books: [],
  currentBook: null,
  settings: DEFAULT_WORLD_INFO_SETTINGS,
  loading: false,

  loadBooks: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/worldinfo");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      set({ books: Array.isArray(data) ? data : [] });
    } catch (e) {
      console.error("[wi-store] loadBooks", e);
    } finally {
      set({ loading: false });
    }
  },

  createBook: async (name) => {
    try {
      const res = await fetch("/api/worldinfo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, entries: {} }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const book: WorldInfo = await res.json();
      await get().loadBooks();
      return book;
    } catch (e) {
      console.error("[wi-store] createBook", e);
      return null;
    }
  },

  deleteBook: async (id) => {
    try {
      const res = await fetch(`/api/worldinfo/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete");
      const { currentBook } = get();
      if (currentBook?.id === id) set({ currentBook: null });
      await get().loadBooks();
    } catch (e) {
      console.error("[wi-store] deleteBook", e);
    }
  },

  renameBook: async (id, name) => {
    try {
      const res = await fetch(`/api/worldinfo/${id}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      const updated: WorldInfo = await res.json();
      const { currentBook } = get();
      set({
        books: get().books.map((b) => (b.id === id ? updated : b)),
        currentBook: currentBook?.id === id ? updated : currentBook,
      });
    } catch (e) {
      console.error("[wi-store] renameBook", e);
    }
  },

  duplicateBook: async (id, name) => {
    try {
      const res = await fetch(`/api/worldinfo/${id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(name ? { name } : {}),
      });
      if (!res.ok) throw new Error("Failed to duplicate");
      const book: WorldInfo = await res.json();
      await get().loadBooks();
      return book;
    } catch (e) {
      console.error("[wi-store] duplicateBook", e);
      return null;
    }
  },

  importBookFile: async (file) => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/worldinfo/import", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to import");
      }
      const book: WorldInfo = await res.json();
      await get().loadBooks();
      return book;
    } catch (e) {
      console.error("[wi-store] importBookFile", e);
      return null;
    }
  },

  exportBook: async (id) => {
    try {
      const res = await fetch(`/api/worldinfo/${id}/export`);
      if (!res.ok) throw new Error("Failed to export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="([^"]+)"/);
      a.download = m?.[1] || "lorebook.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[wi-store] exportBook", e);
    }
  },

  loadBook: async (id) => {
    try {
      const res = await fetch(`/api/worldinfo/${id}`);
      if (!res.ok) throw new Error("Failed to load book");
      const book: WorldInfo = await res.json();
      set({ currentBook: book });
    } catch (e) {
      console.error("[wi-store] loadBook", e);
    }
  },

  setCurrentBook: (book) => set({ currentBook: book }),

  upsertEntry: async (entry) => {
    const { currentBook } = get();
    if (!currentBook) return null;
    try {
      const res = await fetch(`/api/worldinfo/${currentBook.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      if (!res.ok) throw new Error("Failed to upsert entry");
      const saved: WorldInfoEntry = await res.json();
      // 重新拉一次 book 保证一致
      await get().loadBook(currentBook.id);
      return saved;
    } catch (e) {
      console.error("[wi-store] upsertEntry", e);
      return null;
    }
  },

  deleteEntry: async (uid) => {
    const { currentBook } = get();
    if (!currentBook) return;
    try {
      const res = await fetch(`/api/worldinfo/${currentBook.id}/entries/${uid}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete entry");
      await get().loadBook(currentBook.id);
    } catch (e) {
      console.error("[wi-store] deleteEntry", e);
    }
  },

  newEntry: async () => {
    const { currentBook } = get();
    if (!currentBook) return null;
    const uids = Object.values(currentBook.entries).map((e) => e.uid);
    const nextUid = uids.length === 0 ? 0 : Math.max(...uids) + 1;
    const entry = createDefaultWorldInfoEntry(nextUid);
    return get().upsertEntry(entry);
  },

  loadSettings: async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) return;
      const data = await res.json();
      const wi = (data?.worldInfo ?? data?.data?.worldInfo) as Partial<WorldInfoSettings> | undefined;
      if (wi) set({ settings: { ...DEFAULT_WORLD_INFO_SETTINGS, ...wi } });
    } catch (e) {
      console.error("[wi-store] loadSettings", e);
    }
  },

  updateSettings: async (patch) => {
    const next: WorldInfoSettings = { ...get().settings, ...patch };
    set({ settings: next });
    try {
      // 拉当前 settings，再合并 worldInfo 字段写回
      const cur = await fetch("/api/settings").then((r) => (r.ok ? r.json() : {}));
      const merged = { ...(cur ?? {}), worldInfo: next };
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });
    } catch (e) {
      console.error("[wi-store] updateSettings", e);
    }
  },

  toggleGlobalSelect: async (bookId, selected) => {
    const { settings } = get();
    const set0 = new Set(settings.globalSelect);
    if (selected) set0.add(bookId);
    else set0.delete(bookId);
    await get().updateSettings({ globalSelect: Array.from(set0) });
  },
}));
