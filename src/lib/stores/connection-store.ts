import { create } from "zustand";
import type { ApiCategory, UserConnectionConfig, ReverseProxyPreset } from "@/types/api-connections";
import { DEFAULT_FORMATTING_GLOBAL, type FormattingGlobal } from "@/types/advanced-formatting";

interface ConnectionState {
  // 持久化配置
  config: UserConnectionConfig;
  // 运行时状态
  connectionStatus: Record<string, "connected" | "disconnected" | "connecting" | "error">;
  connectedModels: Record<string, string[]>; // provider -> model list from test
  configLoaded: boolean;

  // Actions
  setActiveCategory: (category: ApiCategory) => void;
  setActiveProvider: (category: ApiCategory, providerId: string) => void;
  setSelectedModel: (providerId: string, model: string) => void;
  setBaseUrl: (providerId: string, url: string) => void;
  setAutoConnect: (value: boolean) => void;
  setConnectionStatus: (providerId: string, status: "connected" | "disconnected" | "connecting" | "error") => void;
  setConnectedModels: (providerId: string, models: string[]) => void;
  addReverseProxy: (proxy: ReverseProxyPreset) => void;
  removeReverseProxy: (id: string) => void;
  setActiveProxy: (providerId: string, proxyId: string) => void;
  /** 返回全局 formatting（获取时自动添默认值，避免 undefined） */
  getFormatting: () => FormattingGlobal;
  /** 部分更新全局 formatting 字段并保存 */
  setFormatting: (patch: Partial<FormattingGlobal>) => void;
  loadConfig: (config: UserConnectionConfig) => void;
  saveConfig: () => Promise<void>;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  config: {
    activeCategory: "chat_completion",
    activeProviders: { chat_completion: "openai" },
    selectedModels: {},
    baseUrls: {},
    autoConnect: false,
    reverseProxies: [],
    activeProxy: {},
  },
  connectionStatus: {},
  connectedModels: {},
  configLoaded: false,

  setActiveCategory: (category) => {
    set((state) => ({
      config: { ...state.config, activeCategory: category },
    }));
    get().saveConfig();
  },

  setActiveProvider: (category, providerId) => {
    set((state) => ({
      config: {
        ...state.config,
        activeProviders: { ...state.config.activeProviders, [category]: providerId },
      },
    }));
    get().saveConfig();
  },

  setSelectedModel: (providerId, model) => {
    set((state) => ({
      config: {
        ...state.config,
        selectedModels: { ...state.config.selectedModels, [providerId]: model },
      },
    }));
    get().saveConfig();
  },

  setBaseUrl: (providerId, url) => {
    set((state) => ({
      config: {
        ...state.config,
        baseUrls: { ...state.config.baseUrls, [providerId]: url },
      },
    }));
    get().saveConfig();
  },

  setAutoConnect: (value) => {
    set((state) => ({
      config: { ...state.config, autoConnect: value },
    }));
    get().saveConfig();
  },

  setConnectionStatus: (providerId, status) => {
    set((state) => ({
      connectionStatus: { ...state.connectionStatus, [providerId]: status },
    }));
  },

  setConnectedModels: (providerId, models) => {
    set((state) => ({
      connectedModels: { ...state.connectedModels, [providerId]: models },
    }));
    // 也持久化到 config 中，刷新后不丢失
    set((state) => ({
      config: {
        ...state.config,
        connectedModels: { ...state.connectedModels, [providerId]: models },
      },
    }));
    get().saveConfig();
  },

  addReverseProxy: (proxy) => {
    set((state) => ({
      config: {
        ...state.config,
        reverseProxies: [...state.config.reverseProxies, proxy],
      },
    }));
    get().saveConfig();
  },

  removeReverseProxy: (id) => {
    set((state) => ({
      config: {
        ...state.config,
        reverseProxies: state.config.reverseProxies.filter((p) => p.id !== id),
      },
    }));
    get().saveConfig();
  },

  setActiveProxy: (providerId, proxyId) => {
    set((state) => ({
      config: {
        ...state.config,
        activeProxy: { ...state.config.activeProxy, [providerId]: proxyId },
      },
    }));
    get().saveConfig();
  },

  getFormatting: () => {
    const f = get().config.formatting;
    return { ...DEFAULT_FORMATTING_GLOBAL, ...(f ?? {}) };
  },

  setFormatting: (patch) => {
    set((state) => ({
      config: {
        ...state.config,
        formatting: {
          ...DEFAULT_FORMATTING_GLOBAL,
          ...(state.config.formatting ?? {}),
          ...patch,
        },
      },
    }));
    get().saveConfig();
  },

  loadConfig: (config) => {
    // 从持久化配置中恢复 connectedModels
    const savedModels = config.connectedModels ?? {};
    set({
      config,
      configLoaded: true,
      connectedModels: savedModels,
      // 有已保存模型的提供商标记为 connected
      connectionStatus: Object.fromEntries(
        Object.keys(savedModels).filter(k => savedModels[k]?.length > 0).map(k => [k, "connected" as const])
      ),
    });
  },

  saveConfig: async () => {
    const { config } = get();
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
    } catch (error) {
      console.error("[Connection Store] Failed to save config:", error);
    }
  },
}));
