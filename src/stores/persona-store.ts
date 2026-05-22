import { create } from "zustand";

export interface ActivePersona {
  id: string;
  name: string;
  description: string;
  avatar: string | null;
  descriptionPosition: number;
  depth: number;
  depthRole: number;
}

interface PersonaStoreState {
  activePersona: ActivePersona | null;
  loading: boolean;
  /** 加载当前激活的 Persona */
  loadActive: () => Promise<void>;
  /** 设置激活的 Persona（同时调用 API） */
  activate: (id: string) => Promise<void>;
  /** 取消激活 */
  deactivate: () => Promise<void>;
}

export const usePersonaStore = create<PersonaStoreState>((set) => ({
  activePersona: null,
  loading: false,

  loadActive: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/personas");
      if (!res.ok) {
        set({ activePersona: null, loading: false });
        return;
      }
      const list = (await res.json()) as Array<ActivePersona & { isActive: boolean }>;
      const active = list.find((p) => p.isActive) ?? null;
      set({ activePersona: active, loading: false });
    } catch {
      set({ activePersona: null, loading: false });
    }
  },

  activate: async (id: string) => {
    await fetch(`/api/personas/${id}`, { method: "POST" });
    // 重新加载
    const res = await fetch("/api/personas");
    if (res.ok) {
      const list = (await res.json()) as Array<ActivePersona & { isActive: boolean }>;
      set({ activePersona: list.find((p) => p.isActive) ?? null });
    }
  },

  deactivate: async () => {
    await fetch("/api/personas/none", { method: "POST" });
    set({ activePersona: null });
  },
}));
