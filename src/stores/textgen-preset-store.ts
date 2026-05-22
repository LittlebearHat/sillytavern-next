import { create } from "zustand";
import {
  DEFAULT_TEXTGEN_SETTINGS,
  TEXTGEN_TYPES,
  textGenSettingsSchema,
  type TextGenSettings,
  type TextGenType,
} from "@/types/textgen";

/** 列表里展示的 preset 摘要 */
export interface TextGenPresetItem {
  id: string;
  name: string;
  apiType: string | null;
  isDefault: boolean | null;
  isActive: boolean | null;
  updatedAt: string | null;
}

/** API 返回的完整 preset */
interface TextGenPresetRaw extends TextGenPresetItem {
  settings: Record<string, unknown>;
}

interface TextGenPresetState {
  /** 当前选择的后端类型（决定 fetch 哪批 preset、活跃 preset 的归属） */
  apiType: TextGenType;

  /** 当前 apiType 下的 preset 列表 */
  presets: TextGenPresetItem[];
  /** 当前选中正在编辑的 preset id */
  activePresetId: string | null;
  /** 当前编辑中的 settings（74 字段全量；用 setField 局部更新） */
  currentSettings: TextGenSettings;
  /** 当前 settings 是否相对于 active preset 有未保存改动 */
  isDirty: boolean;

  loading: boolean;
  saving: boolean;
  error: string | null;

  // ===== 列表 / 切换 =====
  setApiType: (apiType: TextGenType) => Promise<void>;
  loadAll: () => Promise<void>;
  select: (id: string) => Promise<void>;

  // ===== 字段编辑 =====
  setField: <K extends keyof TextGenSettings>(key: K, value: TextGenSettings[K]) => void;
  setSettings: (patch: Partial<TextGenSettings>) => void;
  replaceSettings: (next: TextGenSettings) => void;
  resetToActive: () => Promise<void>;

  // ===== CRUD =====
  save: () => Promise<TextGenPresetItem | null>;
  saveAs: (name: string) => Promise<TextGenPresetItem | null>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setActive: (id: string) => Promise<void>;

  // ===== 内置默认 / 导入导出 =====
  restoreDefault: (name: string) => Promise<TextGenPresetItem | null>;
  listDefaultNames: () => Promise<string[]>;
  importFromJson: (data: unknown, name?: string) => Promise<TextGenPresetItem | null>;
  exportJson: (id: string) => Promise<void>;
}

/** 把任意输入对象按 schema 解析成完整 TextGenSettings（缺省字段补默认值） */
function parseSettings(raw: unknown): TextGenSettings {
  try {
    return textGenSettingsSchema.parse(raw ?? {});
  } catch {
    return { ...DEFAULT_TEXTGEN_SETTINGS };
  }
}

function shallowEqualSettings(a: TextGenSettings, b: TextGenSettings): boolean {
  // 简易比对：字段较多，直接 JSON 序列化比较即可
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export const useTextGenPresetStore = create<TextGenPresetState>((set, get) => ({
  apiType: TEXTGEN_TYPES.OOBA,
  presets: [],
  activePresetId: null,
  currentSettings: { ...DEFAULT_TEXTGEN_SETTINGS },
  isDirty: false,

  loading: false,
  saving: false,
  error: null,

  setApiType: async (apiType) => {
    set({ apiType });
    await get().loadAll();
  },

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      // 后端 GET /api/presets?apiType=textgenerationwebui 会自动 seed 6 个内置默认
      const res = await fetch(`/api/presets?apiType=textgenerationwebui`);
      if (!res.ok) throw new Error(`Failed to load presets: ${res.status}`);
      const data = (await res.json()) as TextGenPresetRaw[];
      const list: TextGenPresetItem[] = data.map((p) => ({
        id: p.id,
        name: p.name,
        apiType: p.apiType,
        isDefault: p.isDefault,
        isActive: p.isActive,
        updatedAt: p.updatedAt,
      }));

      // 选中策略：优先 active；否则保留旧选中；否则第一个
      const active: TextGenPresetRaw | null = data.find((p) => p.isActive) ?? null;
      const prevId = get().activePresetId;
      const keepPrev: TextGenPresetRaw | null = prevId
        ? data.find((p) => p.id === prevId) ?? null
        : null;
      const target: TextGenPresetRaw | null = active ?? keepPrev ?? data[0] ?? null;

      set({
        presets: list,
        activePresetId: target?.id ?? null,
        currentSettings: target ? parseSettings(target.settings) : { ...DEFAULT_TEXTGEN_SETTINGS },
        isDirty: false,
      });
    } catch (e) {
      console.error("[textgen-preset-store] loadAll", e);
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  select: async (id) => {
    try {
      const res = await fetch(`/api/presets/${id}`);
      if (!res.ok) throw new Error(`Failed to load preset: ${res.status}`);
      const data = (await res.json()) as TextGenPresetRaw;
      set({
        activePresetId: id,
        currentSettings: parseSettings(data.settings),
        isDirty: false,
      });
    } catch (e) {
      console.error("[textgen-preset-store] select", e);
      set({ error: (e as Error).message });
    }
  },

  setField: (key, value) => {
    const next = { ...get().currentSettings, [key]: value };
    set({ currentSettings: next, isDirty: true });
  },

  setSettings: (patch) => {
    const next = { ...get().currentSettings, ...patch };
    set({ currentSettings: next, isDirty: true });
  },

  replaceSettings: (next) => {
    const parsed = parseSettings(next);
    set({ currentSettings: parsed, isDirty: true });
  },

  resetToActive: async () => {
    const id = get().activePresetId;
    if (!id) {
      set({ currentSettings: { ...DEFAULT_TEXTGEN_SETTINGS }, isDirty: false });
      return;
    }
    await get().select(id);
  },

  save: async () => {
    const id = get().activePresetId;
    if (!id) return null;
    set({ saving: true, error: null });
    try {
      const res = await fetch(`/api/presets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: get().currentSettings }),
      });
      if (!res.ok) throw new Error(`Failed to save preset: ${res.status}`);
      const data = (await res.json()) as TextGenPresetRaw;
      set({
        isDirty: false,
        presets: get().presets.map((p) =>
          p.id === id ? { ...p, name: data.name, updatedAt: data.updatedAt } : p,
        ),
      });
      return data;
    } catch (e) {
      console.error("[textgen-preset-store] save", e);
      set({ error: (e as Error).message });
      return null;
    } finally {
      set({ saving: false });
    }
  },

  saveAs: async (name) => {
    set({ saving: true, error: null });
    try {
      const res = await fetch(`/api/presets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          provider: "textgen",
          apiType: "textgenerationwebui",
          settings: get().currentSettings,
        }),
      });
      if (!res.ok) throw new Error(`Failed to create preset: ${res.status}`);
      const data = (await res.json()) as TextGenPresetRaw;
      await get().loadAll();
      // loadAll 之后选中新建的 preset
      await get().select(data.id);
      set({ activePresetId: data.id });
      return data;
    } catch (e) {
      console.error("[textgen-preset-store] saveAs", e);
      set({ error: (e as Error).message });
      return null;
    } finally {
      set({ saving: false });
    }
  },

  rename: async (id, name) => {
    try {
      const res = await fetch(`/api/presets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(`Failed to rename preset: ${res.status}`);
      const data = (await res.json()) as TextGenPresetRaw;
      set({
        presets: get().presets.map((p) => (p.id === id ? { ...p, name: data.name } : p)),
      });
    } catch (e) {
      console.error("[textgen-preset-store] rename", e);
      set({ error: (e as Error).message });
    }
  },

  remove: async (id) => {
    try {
      const res = await fetch(`/api/presets/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`Failed to delete preset: ${res.status}`);
      const wasActive = get().activePresetId === id;
      const remaining = get().presets.filter((p) => p.id !== id);
      set({
        presets: remaining,
        activePresetId: wasActive ? remaining[0]?.id ?? null : get().activePresetId,
      });
      if (wasActive) {
        if (remaining[0]) await get().select(remaining[0].id);
        else set({ currentSettings: { ...DEFAULT_TEXTGEN_SETTINGS }, isDirty: false });
      }
    } catch (e) {
      console.error("[textgen-preset-store] remove", e);
      set({ error: (e as Error).message });
    }
  },

  setActive: async (id) => {
    try {
      const res = await fetch(`/api/presets/${id}/activate`, { method: "POST" });
      if (!res.ok) throw new Error(`Failed to activate preset: ${res.status}`);
      // 同 apiType 下其它的全部失活
      set({
        presets: get().presets.map((p) => ({
          ...p,
          isActive: p.id === id ? true : false,
        })),
      });
    } catch (e) {
      console.error("[textgen-preset-store] setActive", e);
      set({ error: (e as Error).message });
    }
  },

  restoreDefault: async (name) => {
    try {
      const res = await fetch(`/api/presets/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(`Failed to restore preset: ${res.status}`);
      const data = (await res.json()) as TextGenPresetRaw;
      await get().loadAll();
      await get().select(data.id);
      set({ activePresetId: data.id });
      return data;
    } catch (e) {
      console.error("[textgen-preset-store] restoreDefault", e);
      set({ error: (e as Error).message });
      return null;
    }
  },

  listDefaultNames: async () => {
    try {
      const res = await fetch(`/api/presets/restore`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data?.names) ? data.names : [];
    } catch {
      return [];
    }
  },

  importFromJson: async (data, name) => {
    try {
      const res = await fetch(`/api/presets/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 后端读的是 fileName 字段，作为 JSON 里没有 name 字段时的预设名兑底
        body: JSON.stringify({ data, fileName: name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to import: ${res.status}`);
      }
      const result = await res.json();
      await get().loadAll();
      // import 可能返回单条或多条；选中第一个新建的 textgen
      const created: TextGenPresetRaw | TextGenPresetRaw[] = result.preset ?? result.presets ?? result;
      const list = Array.isArray(created) ? created : [created];
      const target = list.find((p) => p?.apiType === "textgenerationwebui") ?? list[0];
      if (target?.id) {
        await get().select(target.id);
        set({ activePresetId: target.id });
      }
      return target ?? null;
    } catch (e) {
      console.error("[textgen-preset-store] importFromJson", e);
      set({ error: (e as Error).message });
      return null;
    }
  },

  exportJson: async (id) => {
    try {
      const res = await fetch(`/api/presets/${id}/export`);
      if (!res.ok) throw new Error(`Failed to export: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="([^"]+)"/);
      a.download = m?.[1] || `preset-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[textgen-preset-store] exportJson", e);
      set({ error: (e as Error).message });
    }
  },
}));

/** 工具：判断 store 当前 settings 是否与传入 preset 一致（用于隐式判断 dirty） */
export function isSettingsEqual(a: TextGenSettings, b: TextGenSettings) {
  return shallowEqualSettings(a, b);
}
