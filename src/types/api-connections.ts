/**
 * API 连接配置类型定义
 * 支持 5 大 API 类型和 30+ 提供商
 */

// ========================
// API 大类
// ========================
export type ApiCategory =
  | "chat_completion"
  | "text_completion"
  | "novelai"
  | "ai_horde"
  | "kobold_classic";

export const API_CATEGORY_LABELS: Record<ApiCategory, string> = {
  chat_completion: "对话补全 (Chat Completion)",
  text_completion: "文本补全 (Text Completion)",
  novelai: "NovelAI",
  ai_horde: "AI Horde",
  kobold_classic: "KoboldAI Classic",
};

// ========================
// 模型选项
// ========================
export interface ModelOption {
  id: string;
  name: string;
  group?: string;
}

export interface ModelGroup {
  label: string;
  models: ModelOption[];
}

// ========================
// 提供商配置结构
// ========================
export interface ProviderRegistryEntry {
  id: string;
  name: string;
  category: ApiCategory;
  requiresApiKey: boolean;
  /** API Key 是可选的（不填也能连接） */
  optionalApiKey?: boolean;
  requiresBaseUrl: boolean;
  defaultBaseUrl?: string;
  baseUrlPlaceholder?: string;
  secretKey: string;
  models: ModelGroup[] | "dynamic";
  description?: string;
  docsUrl?: string;
  supportsReverseProxy?: boolean;
  /** 额外配置字段 */
  extraFields?: ExtraField[];
}

export interface ExtraField {
  id: string;
  label: string;
  type: "text" | "select" | "checkbox" | "multiselect";
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string;
  secretKey?: string; // 如果需要单独存储
}

// ========================
// 连接状态
// ========================
export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export interface ConnectionStatus {
  provider: string;
  state: ConnectionState;
  model?: string;
  error?: string;
  lastConnected?: string;
}

// ========================
// 用户的连接配置 (持久化到 settings)
// ========================
export interface UserConnectionConfig {
  /** 当前选中的 API 大类 */
  activeCategory: ApiCategory;
  /** 每个大类中当前选中的提供商 */
  activeProviders: Partial<Record<ApiCategory, string>>;
  /** 每个提供商选中的模型 */
  selectedModels: Record<string, string>;
  /** 每个提供商的 base URL 覆盖 */
  baseUrls: Record<string, string>;
  /** 自动连接 */
  autoConnect: boolean;
  /** Reverse proxy 预设 */
  reverseProxies: ReverseProxyPreset[];
  /** 每个提供商激活的 reverse proxy */
  activeProxy: Record<string, string>;
  /** 已获取的模型列表（持久化，刷新后不丢失） */
  connectedModels?: Record<string, string[]>;
  /** 高级格式化全局设置（对应原项目 Advanced Formatting 中的全局项） */
  formatting?: import("./advanced-formatting").FormattingGlobal;
}

export interface ReverseProxyPreset {
  id: string;
  name: string;
  url: string;
  password?: string;
}

// ========================
// API 请求/响应
// ========================
export interface TestConnectionRequest {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  model?: string;
  models?: string[];
  error?: string;
}

export interface FetchModelsRequest {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
}
