"use client";

import { useState } from "react";
import { useConnectionStore } from "@/lib/stores/connection-store";
import type { ReverseProxyPreset } from "@/types/api-connections";

export function ReverseProxyManager({ providerId }: { providerId: string }) {
  const { config, addReverseProxy, removeReverseProxy, setActiveProxy } = useConnectionStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [password, setPassword] = useState("");

  const activeProxyId = config.activeProxy[providerId];
  const proxies = config.reverseProxies;

  const handleAdd = () => {
    if (!name.trim() || !url.trim()) return;
    const proxy: ReverseProxyPreset = {
      id: crypto.randomUUID(),
      name: name.trim(),
      url: url.trim(),
      password: password || undefined,
    };
    addReverseProxy(proxy);
    setActiveProxy(providerId, proxy.id);
    setName("");
    setUrl("");
    setPassword("");
    setShowForm(false);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground">
        反向代理 <span className="opacity-60">(Reverse Proxy)</span>
      </label>

      <div className="flex gap-2">
        <select
          value={activeProxyId || ""}
          onChange={(e) => setActiveProxy(providerId, e.target.value)}
          className="flex-1 bg-background border border-input rounded px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">无（直连）</option>
          {proxies.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-2.5 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded border border-border"
        >
          {showForm ? "取消" : "+ 添加"}
        </button>
        {activeProxyId && (
          <button
            onClick={() => {
              if (!confirm("确定删除此代理？")) return;
              removeReverseProxy(activeProxyId);
              setActiveProxy(providerId, "");
            }}
            className="px-2.5 py-1.5 text-xs text-destructive hover:text-destructive/80 bg-secondary hover:bg-secondary/80 rounded border border-border"
          >
            删除
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-md p-3 space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="代理名称"
            className="w-full bg-background border border-input rounded px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="代理 URL（例：https://proxy.example.com/v1）"
            className="w-full bg-background border border-input rounded px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码（可选）"
            className="w-full bg-background border border-input rounded px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!name.trim() || !url.trim()}
            className="px-3 py-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded"
          >
            保存代理
          </button>
        </div>
      )}
    </div>
  );
}
