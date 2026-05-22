"use client";

import { useEffect, useState, useCallback } from "react";
import { useConnectionStore } from "@/lib/stores/connection-store";
import { ConnectionStatusBadge } from "./connection-status";
import { ModelSelector } from "./model-selector";
import { ReverseProxyManager } from "./reverse-proxy";
import { API_CATEGORY_LABELS, type ApiCategory, type ProviderRegistryEntry } from "@/types/api-connections";

const CATEGORY_IDS: ApiCategory[] = [
  "chat_completion",
  "text_completion",
  "novelai",
  "ai_horde",
  "kobold_classic",
];

export function ApiConnections() {
  const { config, configLoaded, loadConfig, setActiveCategory, setActiveProvider } =
    useConnectionStore();
  const [providers, setProviders] = useState<ProviderRegistryEntry[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ProviderRegistryEntry | null>(null);

  useEffect(() => {
    if (!configLoaded) {
      fetch("/api/settings")
        .then((r) => r.json())
        .then((data) => loadConfig(data))
        .catch(console.error);
    }
  }, [configLoaded, loadConfig]);

  useEffect(() => {
    import("@/lib/constants/providers-registry").then((mod) => {
      const list = mod.getProvidersByCategory(config.activeCategory);
      setProviders(list);
      const activeId = config.activeProviders[config.activeCategory];
      const found = list.find((p) => p.id === activeId) || list[0] || null;
      setSelectedProvider(found);
    });
  }, [config.activeCategory, config.activeProviders]);

  const handleProviderChange = useCallback(
    (providerId: string) => {
      const found = providers.find((p) => p.id === providerId);
      if (found) {
        setSelectedProvider(found);
        setActiveProvider(config.activeCategory, providerId);
      }
    },
    [providers, config.activeCategory, setActiveProvider]
  );

  return (
    <div className="space-y-4">
      {/* API 类别 Tab */}
      <div className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-lg border border-border">
        {CATEGORY_IDS.map((id) => (
          <button
            key={id}
            onClick={() => setActiveCategory(id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              config.activeCategory === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {API_CATEGORY_LABELS[id]}
          </button>
        ))}
      </div>

      {/* 提供商选择 */}
      {providers.length > 1 && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">
            提供商 <span className="opacity-60">(Provider)</span>
          </label>
          <select
            value={selectedProvider?.id || ""}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 提供商信息卡片 */}
      {selectedProvider?.description && (
        <div className="flex items-start gap-2 bg-muted/40 border border-border rounded-md px-3 py-2">
          <span className="text-xs text-muted-foreground flex-1">{selectedProvider.description}</span>
          {selectedProvider.docsUrl && (
            <a
              href={selectedProvider.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs text-primary hover:underline"
            >
              文档 ↗
            </a>
          )}
        </div>
      )}

      {/* 配置表单 */}
      {selectedProvider && (
        <ProviderConfigForm key={selectedProvider.id} provider={selectedProvider} />
      )}
    </div>
  );
}

/**
 * 提供商配置表单 — 分「基本配置」和「高级配置」两个区块
 */
function ProviderConfigForm({ provider }: { provider: ProviderRegistryEntry }) {
  const { config, setSelectedModel, setBaseUrl, setConnectionStatus, setConnectedModels } =
    useConnectionStore();
  const connectionStatus = useConnectionStore((s) => s.connectionStatus[provider.id]);

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<"unknown" | "saved" | "none">("unknown");
  const [baseUrlInput, setBaseUrlInput] = useState(
    config.baseUrls[provider.id] || provider.defaultBaseUrl || ""
  );
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (provider.requiresApiKey) {
      let cancelled = false;
      fetch(`/api/secrets?key=${provider.secretKey}`)
        .then((r) => r.json())
        .then((data) => { if (!cancelled) setKeyStatus(data.exists ? "saved" : "none"); })
        .catch(() => { if (!cancelled) setKeyStatus("none"); });
      return () => { cancelled = true; };
    }
  }, [provider.id, provider.requiresApiKey, provider.secretKey]);

  const NO_STATUS_CHECK_PROVIDERS = ["anthropic", "claude", "ai21", "vertexai", "perplexity", "zai", "minimax"];

  const handleConnect = useCallback(async () => {
    setTesting(true);
    setTestMessage(null);
    setConnectionStatus(provider.id, "connecting");

    if (apiKey.trim() && (provider.requiresApiKey || provider.optionalApiKey)) {
      try {
        await fetch("/api/secrets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: provider.secretKey, value: apiKey }),
        });
        setKeyStatus("saved");
      } catch (err) {
        console.error("保存密钥失败:", err);
      }
    }

    if (baseUrlInput && baseUrlInput !== provider.defaultBaseUrl) {
      setBaseUrl(provider.id, baseUrlInput);
    }

    if (NO_STATUS_CHECK_PROVIDERS.includes(provider.id)) {
      setConnectionStatus(provider.id, "connected");
      setTestMessage({ type: "success", text: "密钥已保存，请点击「测试消息」验证连接。" });
      setTesting(false);
      return;
    }

    try {
      const res = await fetch("/api/connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: provider.id,
          apiKey: apiKey || undefined,
          baseUrl: baseUrlInput || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setConnectionStatus(provider.id, "connected");
        if (data.models?.length) {
          setConnectedModels(provider.id, data.models);
          if (!config.selectedModels[provider.id]) {
            setSelectedModel(provider.id, data.models[0]);
          }
        }
        setTestMessage({ type: "success", text: "连接成功！已获取模型列表。" });
      } else {
        setConnectionStatus(provider.id, "error");
        setTestMessage({ type: "error", text: data.error || "连接失败，请检查配置。" });
      }
    } catch (err) {
      setConnectionStatus(provider.id, "error");
      setTestMessage({
        type: "error",
        text: err instanceof Error ? err.message : "连接失败，请检查网络和配置。",
      });
    } finally {
      setTesting(false);
    }
  }, [provider, apiKey, baseUrlInput, config.selectedModels, setConnectionStatus, setConnectedModels, setSelectedModel, setBaseUrl]);

  const handleTestMessage = useCallback(async () => {
    setTesting(true);
    setTestMessage(null);

    try {
      const res = await fetch("/api/connections/test-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: provider.id,
          baseUrl: baseUrlInput || undefined,
          apiKey: apiKey || undefined,
          model: config.selectedModels[provider.id] || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setConnectionStatus(provider.id, "connected");
        setTestMessage({
          type: "success",
          text: `API 连接成功！${data.reply ? ` 回复: "${data.reply.slice(0, 50)}"` : ""}`,
        });
      } else {
        setConnectionStatus(provider.id, "error");
        setTestMessage({
          type: "error",
          text: data.error || "无法获取回复，请检查连接设置和 API Key。",
        });
      }
    } catch {
      setConnectionStatus(provider.id, "error");
      setTestMessage({
        type: "error",
        text: "无法获取回复，请检查连接设置和 API Key。",
      });
    } finally {
      setTesting(false);
    }
  }, [provider.id, baseUrlInput, apiKey, config.selectedModels, setConnectionStatus]);

  const hasAdvanced = provider.requiresBaseUrl || provider.supportsReverseProxy || (provider.extraFields && provider.extraFields.length > 0);

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      {/* ===== 基本配置 ===== */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          基本配置
        </h3>

        {/* API Key */}
        {(provider.requiresApiKey || provider.optionalApiKey) && (
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-2">
              <h4 className="text-sm font-medium">
                API 密钥
                <span className="ml-1 text-xs text-muted-foreground font-normal">({provider.name})</span>
              </h4>
              {provider.optionalApiKey && (
                <span className="text-xs text-muted-foreground">（可选）</span>
              )}
            </div>
            {provider.docsUrl && (
              <a
                href={provider.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                获取 API Key ↗
              </a>
            )}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setTestMessage(null); }}
                  placeholder={keyStatus === "saved" ? "••••••••• (已保存)" : "输入 API Key…"}
                  className="w-full bg-background border border-input rounded px-3 py-2 text-sm focus:border-primary focus:outline-none pr-14"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showKey ? "隐藏" : "显示"}
                </button>
              </div>
              {keyStatus === "saved" && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("确定删除已保存的 API Key？")) return;
                    try {
                      await fetch(`/api/secrets?key=${provider.secretKey}`, { method: "DELETE" });
                      setKeyStatus("none");
                      setApiKey("");
                    } catch (err) {
                      console.error("删除密钥失败:", err);
                    }
                  }}
                  className="px-3 py-2 text-xs text-destructive hover:text-destructive/80 bg-background border border-input hover:border-destructive rounded transition-colors"
                  title="删除已保存的 API Key"
                >
                  删除
                </button>
              )}
            </div>
            {keyStatus === "saved" && !apiKey && (
              <p className="text-xs text-muted-foreground">
                出于隐私保护，连接后密钥不再显示。输入新密钥可替换旧密钥。
              </p>
            )}
          </div>
        )}

        {/* 模型选择 */}
        <ModelSelector provider={provider} />
      </div>

      {/* ===== 高级配置（可折叠） ===== */}
      {hasAdvanced && (
        <div className="border-t border-border pt-3">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`}>▶</span>
            高级配置 <span className="opacity-60">(Advanced)</span>
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-3 pl-3 border-l-2 border-border">
              {/* 反向代理 */}
              {provider.supportsReverseProxy && (
                <ReverseProxyManager providerId={provider.id} />
              )}

              {/* Base URL */}
              {provider.requiresBaseUrl && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">
                    {provider.id === "custom" ? "自定义端点 (Base URL)" : "API 地址"}
                  </h4>
                  {provider.defaultBaseUrl && (
                    <p className="text-xs text-muted-foreground">
                      示例: {provider.defaultBaseUrl}
                    </p>
                  )}
                  <input
                    type="text"
                    value={baseUrlInput}
                    onChange={(e) => { setBaseUrlInput(e.target.value); setTestMessage(null); }}
                    placeholder={provider.defaultBaseUrl || "http://127.0.0.1:5001/v1"}
                    className="w-full bg-background border border-input rounded px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  {provider.id === "custom" && (
                    <p className="text-xs text-muted-foreground">
                      连不上？试试末尾加 <code className="bg-muted px-1 rounded">/v1</code>。
                      系统会自动拼接 <code className="bg-muted px-1 rounded">/chat/completions</code>。
                    </p>
                  )}
                </div>
              )}

              {/* 额外字段 */}
              {provider.extraFields?.map((field) => (
                <ExtraFieldInput key={field.id} field={field} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== 操作按钮 ===== */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <button
          onClick={handleConnect}
          disabled={testing}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
        >
          {testing ? "连接中…" : "连接"}
        </button>
        {testing && (
          <button
            onClick={() => setTesting(false)}
            className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
          >
            取消
          </button>
        )}
        <button
          onClick={handleTestMessage}
          disabled={testing}
          className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 disabled:opacity-50 rounded-md transition-colors"
          title="发送一条测试消息验证 API 是否正常工作（会消耗少量额度）"
        >
          测试消息
        </button>
        <div className="ml-auto">
          <ConnectionStatusBadge
            status={connectionStatus || "disconnected"}
            model={connectionStatus === "connected" ? config.selectedModels[provider.id] : undefined}
          />
        </div>
      </div>

      {/* 连接结果提示 */}
      {testMessage && (
        <div
          className={`flex items-start gap-2 text-sm px-3 py-2 rounded-md ${
            testMessage.type === "success"
              ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30"
              : "bg-destructive/10 text-destructive border border-destructive/30"
          }`}
        >
          <span className="flex-1">{testMessage.text}</span>
          <button
            onClick={() => setTestMessage(null)}
            className="shrink-0 opacity-60 hover:opacity-100 text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function ExtraFieldInput({
  field,
}: {
  field: NonNullable<ProviderRegistryEntry["extraFields"]>[number];
}) {
  const [value, setValue] = useState(field.defaultValue || "");

  if (field.type === "select" && field.options) {
    return (
      <div className="space-y-1">
        <h4 className="text-sm font-medium">{field.label}</h4>
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full bg-background border border-input rounded px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">请选择…</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={value === "true"}
          onChange={(e) => setValue(String(e.target.checked))}
          className="rounded border-input bg-background"
        />
        {field.label}
      </label>
    );
  }

  return (
    <div className="space-y-1">
      <h4 className="text-sm font-medium">{field.label}</h4>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={field.placeholder}
        className="w-full bg-background border border-input rounded px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}
