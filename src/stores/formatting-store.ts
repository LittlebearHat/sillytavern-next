import { create } from "zustand";
import {
  contextTemplateSchema,
  instructTemplateSchema,
  syspromptTemplateSchema,
  reasoningTemplateSchema,
  DEFAULT_CONTEXT,
  DEFAULT_INSTRUCT,
  DEFAULT_SYSPROMPT,
  DEFAULT_REASONING,
  type ContextTemplate,
  type InstructTemplate,
  type SyspromptTemplate,
  type ReasoningTemplate,
  FORMATTING_API_TYPES,
  type FormattingApiType,
} from "@/types/advanced-formatting";

// ========== 公共类型 ==========
export interface TemplateItem {
  id: string;
  name: string;
  apiType: string | null;
  isDefault: boolean | null;
  isActive: boolean | null;
  updatedAt: string | null;
}

interface TemplateRaw extends TemplateItem {
  settings: Record<string, unknown>;
}

export type TemplateKind = FormattingApiType;
export type TemplateOf<K extends TemplateKind> = K extends "context"
  ? ContextTemplate
  : K extends "instruct"
    ? InstructTemplate
    : K extends "sysprompt"
      ? SyspromptTemplate
      : ReasoningTemplate;

interface KindMeta {
  parse: (raw: unknown) => unknown;
  defaults: unknown;
}

const KIND_META: Record<TemplateKind, KindMeta> = {
  context: { parse: (r) => contextTemplateSchema.parse(r ?? {}), defaults: DEFAULT_CONTEXT },
  instruct: { parse: (r) => instructTemplateSchema.parse(r ?? {}), defaults: DEFAULT_INSTRUCT },
  sysprompt: { parse: (r) => syspromptTemplateSchema.parse(r ?? {}), defaults: DEFAULT_SYSPROMPT },
  reasoning: { parse: (r) => reasoningTemplateSchema.parse(r ?? {}), defaults: DEFAULT_REASONING },
};

function parseByKind<K extends TemplateKind>(kind: K, raw: unknown): TemplateOf<K> {
  try {
    return KIND_META[kind].parse(raw) as TemplateOf<K>;
  } catch {
    return { ...(KIND_META[kind].defaults as object) } as TemplateOf<K>;
  }
}

// ========== Slice ==========
export interface TemplateSlice<T> {
  list: TemplateItem[];
  activeId: string | null;
  current: T;
  isDirty: boolean;
  loading: boolean;
  saving: boolean;
}

function emptySlice<K extends TemplateKind>(kind: K): TemplateSlice<TemplateOf<K>> {
  return {
    list: [],
    activeId: null,
    current: { ...(KIND_META[kind].defaults as object) } as TemplateOf<K>,
    isDirty: false,
    loading: false,
    saving: false,
  };
}

// ========== Store ==========
interface FormattingStoreState {
  context: TemplateSlice<ContextTemplate>;
  instruct: TemplateSlice<InstructTemplate>;
  sysprompt: TemplateSlice<SyspromptTemplate>;
  reasoning: TemplateSlice<ReasoningTemplate>;
  error: string | null;

  // 列表 / 切换
  loadAll: (kind: TemplateKind) => Promise<void>;
  loadAllKinds: () => Promise<void>;
  select: (kind: TemplateKind, id: string) => Promise<void>;

  // 字段编辑
  setField: <K extends TemplateKind>(kind: K, key: keyof TemplateOf<K> & string, value: unknown) => void;
  setSettings: <K extends TemplateKind>(kind: K, patch: Partial<TemplateOf<K>>) => void;
  replaceSettings: <K extends TemplateKind>(kind: K, next: TemplateOf<K>) => void;
  resetToActive: (kind: TemplateKind) => Promise<void>;

  // CRUD
  save: (kind: TemplateKind) => Promise<TemplateItem | null>;
  saveAs: (kind: TemplateKind, name: string) => Promise<TemplateItem | null>;
  rename: (kind: TemplateKind, id: string, name: string) => Promise<void>;
  remove: (kind: TemplateKind, id: string) => Promise<void>;
  setActive: (kind: TemplateKind, id: string) => Promise<void>;

  // 默认 / 导入导出
  restoreDefault: (kind: TemplateKind, name: string) => Promise<TemplateItem | null>;
  listDefaultNames: (kind: TemplateKind) => Promise<string[]>;
  importFromJson: (kind: TemplateKind, data: unknown, name?: string) => Promise<TemplateItem | null>;
  exportJson: (id: string) => Promise<void>;

  // 联动：根据模型名匹配 activation_regex 自动激活 instruct/context（bind_model_templates）
  autoActivateByModel: (modelName: string) => Promise<void>;
}

function setSlice(
  state: FormattingStoreState,
  kind: TemplateKind,
  patch: Partial<TemplateSlice<unknown>>,
): Partial<FormattingStoreState> {
  return { [kind]: { ...(state[kind] as TemplateSlice<unknown>), ...patch } } as Partial<FormattingStoreState>;
}

function getSlice(state: FormattingStoreState, kind: TemplateKind): TemplateSlice<unknown> {
  return state[kind] as TemplateSlice<unknown>;
}

export const useFormattingStore = create<FormattingStoreState>((set, get) => ({
  context: emptySlice("context"),
  instruct: emptySlice("instruct"),
  sysprompt: emptySlice("sysprompt"),
  reasoning: emptySlice("reasoning"),
  error: null,

  loadAll: async (kind) => {
    set((s) => setSlice(s, kind, { loading: true }));
    try {
      const res = await fetch(`/api/presets?apiType=${kind}`);
      if (!res.ok) throw new Error(`Failed to load ${kind} presets: ${res.status}`);
      const data = (await res.json()) as TemplateRaw[];
      const list: TemplateItem[] = data.map((p) => ({
        id: p.id,
        name: p.name,
        apiType: p.apiType,
        isDefault: p.isDefault,
        isActive: p.isActive,
        updatedAt: p.updatedAt,
      }));

      const active = data.find((p) => p.isActive) ?? null;
      const prevId = getSlice(get(), kind).activeId;
      const keepPrev = prevId ? data.find((p) => p.id === prevId) ?? null : null;
      const target = active ?? keepPrev ?? data[0] ?? null;

      set((s) =>
        setSlice(s, kind, {
          list,
          activeId: target?.id ?? null,
          current: target ? parseByKind(kind, target.settings) : { ...(KIND_META[kind].defaults as object) },
          isDirty: false,
          loading: false,
        }),
      );
    } catch (e) {
      console.error(`[formatting-store] loadAll(${kind})`, e);
      set((s) => ({ ...setSlice(s, kind, { loading: false }), error: (e as Error).message }));
    }
  },

  loadAllKinds: async () => {
    await Promise.all(
      Object.values(FORMATTING_API_TYPES).map((k) => get().loadAll(k as TemplateKind)),
    );
  },

  select: async (kind, id) => {
    try {
      const res = await fetch(`/api/presets/${id}`);
      if (!res.ok) throw new Error(`Failed to load preset: ${res.status}`);
      const data = (await res.json()) as TemplateRaw;
      set((s) =>
        setSlice(s, kind, {
          activeId: id,
          current: parseByKind(kind, data.settings),
          isDirty: false,
        }),
      );
    } catch (e) {
      console.error(`[formatting-store] select(${kind})`, e);
      set({ error: (e as Error).message });
    }
  },

  setField: (kind, key, value) => {
    set((s) => {
      const slice = getSlice(s, kind);
      const next = { ...(slice.current as Record<string, unknown>), [key]: value };
      return setSlice(s, kind, { current: next, isDirty: true });
    });
  },

  setSettings: (kind, patch) => {
    set((s) => {
      const slice = getSlice(s, kind);
      const next = { ...(slice.current as Record<string, unknown>), ...(patch as Record<string, unknown>) };
      return setSlice(s, kind, { current: next, isDirty: true });
    });
  },

  replaceSettings: (kind, next) => {
    const parsed = parseByKind(kind, next);
    set((s) => setSlice(s, kind, { current: parsed, isDirty: true }));
  },

  resetToActive: async (kind) => {
    const slice = getSlice(get(), kind);
    if (!slice.activeId) {
      set((s) =>
        setSlice(s, kind, {
          current: { ...(KIND_META[kind].defaults as object) },
          isDirty: false,
        }),
      );
      return;
    }
    await get().select(kind, slice.activeId);
  },

  save: async (kind) => {
    const slice = getSlice(get(), kind);
    if (!slice.activeId) return null;
    set((s) => setSlice(s, kind, { saving: true }));
    try {
      const res = await fetch(`/api/presets/${slice.activeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: slice.current }),
      });
      if (!res.ok) throw new Error(`Failed to save preset: ${res.status}`);
      const data = (await res.json()) as TemplateRaw;
      set((s) => {
        const cur = getSlice(s, kind);
        return setSlice(s, kind, {
          isDirty: false,
          saving: false,
          list: cur.list.map((p) => (p.id === slice.activeId ? { ...p, name: data.name, updatedAt: data.updatedAt } : p)),
        });
      });
      return data;
    } catch (e) {
      console.error(`[formatting-store] save(${kind})`, e);
      set((s) => ({ ...setSlice(s, kind, { saving: false }), error: (e as Error).message }));
      return null;
    }
  },

  saveAs: async (kind, name) => {
    const slice = getSlice(get(), kind);
    set((s) => setSlice(s, kind, { saving: true }));
    try {
      const res = await fetch(`/api/presets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          provider: kind,
          apiType: kind,
          settings: { ...(slice.current as object), name },
        }),
      });
      if (!res.ok) throw new Error(`Failed to create preset: ${res.status}`);
      const data = (await res.json()) as TemplateRaw;
      await get().loadAll(kind);
      await get().select(kind, data.id);
      set((s) => setSlice(s, kind, { activeId: data.id, saving: false }));
      return data;
    } catch (e) {
      console.error(`[formatting-store] saveAs(${kind})`, e);
      set((s) => ({ ...setSlice(s, kind, { saving: false }), error: (e as Error).message }));
      return null;
    }
  },

  rename: async (kind, id, name) => {
    try {
      const res = await fetch(`/api/presets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(`Failed to rename preset: ${res.status}`);
      const data = (await res.json()) as TemplateRaw;
      set((s) => {
        const cur = getSlice(s, kind);
        return setSlice(s, kind, {
          list: cur.list.map((p) => (p.id === id ? { ...p, name: data.name } : p)),
        });
      });
    } catch (e) {
      console.error(`[formatting-store] rename(${kind})`, e);
      set({ error: (e as Error).message });
    }
  },

  remove: async (kind, id) => {
    try {
      const res = await fetch(`/api/presets/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`Failed to delete preset: ${res.status}`);
      const slice = getSlice(get(), kind);
      const wasActive = slice.activeId === id;
      const remaining = slice.list.filter((p) => p.id !== id);
      set((s) =>
        setSlice(s, kind, {
          list: remaining,
          activeId: wasActive ? remaining[0]?.id ?? null : slice.activeId,
        }),
      );
      if (wasActive) {
        if (remaining[0]) await get().select(kind, remaining[0].id);
        else
          set((s) =>
            setSlice(s, kind, {
              current: { ...(KIND_META[kind].defaults as object) },
              isDirty: false,
            }),
          );
      }
    } catch (e) {
      console.error(`[formatting-store] remove(${kind})`, e);
      set({ error: (e as Error).message });
    }
  },

  setActive: async (kind, id) => {
    try {
      const res = await fetch(`/api/presets/${id}/activate`, { method: "POST" });
      if (!res.ok) throw new Error(`Failed to activate preset: ${res.status}`);
      set((s) => {
        const cur = getSlice(s, kind);
        return setSlice(s, kind, {
          list: cur.list.map((p) => ({ ...p, isActive: p.id === id })),
        });
      });
    } catch (e) {
      console.error(`[formatting-store] setActive(${kind})`, e);
      set({ error: (e as Error).message });
    }
  },

  restoreDefault: async (kind, name) => {
    try {
      const res = await fetch(`/api/presets/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, apiType: kind }),
      });
      if (!res.ok) throw new Error(`Failed to restore preset: ${res.status}`);
      const data = (await res.json()) as TemplateRaw;
      await get().loadAll(kind);
      await get().select(kind, data.id);
      set((s) => setSlice(s, kind, { activeId: data.id }));
      return data;
    } catch (e) {
      console.error(`[formatting-store] restoreDefault(${kind})`, e);
      set({ error: (e as Error).message });
      return null;
    }
  },

  listDefaultNames: async (kind) => {
    try {
      const res = await fetch(`/api/presets/restore?apiType=${kind}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data?.names) ? data.names : [];
    } catch {
      return [];
    }
  },

  importFromJson: async (kind, data, name) => {
    try {
      const settings = (typeof data === "object" && data) ? (data as Record<string, unknown>) : {};

      // 1) Master JSON 识别：含 instruct/context/sysprompt/preset/reasoning/srw 任一键的嵌套对象
      //    走 /api/presets/import 由后端按字段自动识别并分段写入，再重载所有 kind
      const MASTER_KEYS = ["instruct", "context", "sysprompt", "preset", "reasoning", "srw"];
      const isMaster = MASTER_KEYS.some((k) => {
        const v = settings[k];
        return v && typeof v === "object" && !Array.isArray(v);
      });

      if (isMaster) {
        const baseName = (name ?? (settings.name as string) ?? "Imported").toString();
        const res = await fetch(`/api/presets/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: settings, fileName: baseName }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed to import master: ${res.status}`);
        }
        const json = (await res.json()) as { imported: { apiType: string; name: string; ok: boolean }[] };
        // 重载全部 4 类，让 UI 看到刚导入的所有段
        await get().loadAllKinds();
        // 当前 kind 选中刚导入的对应段（若存在）
        const matched = json.imported.find((it) => it.apiType === kind && it.ok);
        if (matched) {
          const slice = getSlice(get(), kind);
          const created = slice.list.find((p) => p.name === matched.name);
          if (created) await get().select(kind, created.id);
        }
        return null;
      }

      // 2) 单段 JSON：原逻辑 — 直接走通用 POST /api/presets
      const finalName = (name ?? (settings.name as string) ?? `Imported ${kind}`).toString();
      const res = await fetch(`/api/presets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalName,
          provider: kind,
          apiType: kind,
          settings: { ...settings, name: finalName },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to import: ${res.status}`);
      }
      const created = (await res.json()) as TemplateRaw;
      await get().loadAll(kind);
      await get().select(kind, created.id);
      set((s) => setSlice(s, kind, { activeId: created.id }));
      return created;
    } catch (e) {
      console.error(`[formatting-store] importFromJson(${kind})`, e);
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
      console.error("[formatting-store] exportJson", e);
      set({ error: (e as Error).message });
    }
  },

  autoActivateByModel: async (modelName) => {
    if (!modelName) return;
    const tryMatch = async (kind: "instruct" | "context") => {
      const slice = getSlice(get(), kind);
      // 拉取完整列表（带 settings）
      try {
        const res = await fetch(`/api/presets?apiType=${kind}&seed=0`);
        if (!res.ok) return;
        const data = (await res.json()) as TemplateRaw[];
        for (const item of data) {
          const re = (item.settings as Record<string, unknown>)?.activation_regex;
          if (typeof re !== "string" || !re) continue;
          // 解析形如 /pattern/flags 或 plain pattern
          let pattern = re;
          let flags = "";
          const m = /^\/(.*)\/([gimsuy]*)$/.exec(re);
          if (m) {
            pattern = m[1];
            flags = m[2];
          }
          try {
            if (new RegExp(pattern, flags).test(modelName)) {
              if (slice.activeId !== item.id) {
                await get().setActive(kind, item.id);
                await get().select(kind, item.id);
              }
              break;
            }
          } catch {
            // 忽略非法正则
          }
        }
      } catch (e) {
        console.warn(`[formatting-store] autoActivateByModel(${kind})`, e);
      }
    };
    await Promise.all([tryMatch("instruct"), tryMatch("context")]);
  },
}));
