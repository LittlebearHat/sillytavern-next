"use client";

import { useState, useEffect, useMemo } from "react";
import { useConnectionStore } from "@/lib/stores/connection-store";
import type { ProviderRegistryEntry, ModelGroup } from "@/types/api-connections";

export function ModelSelector({ provider }: { provider: ProviderRegistryEntry }) {
  const { config, setSelectedModel, connectedModels } = useConnectionStore();
  const selectedModel = config.selectedModels[provider.id] || "";
  const [search, setSearch] = useState("");
  const [dynamicModels, setDynamicModels] = useState<{ id: string; name?: string }[]>([]);
  const [loading, setLoading] = useState(provider.models === "dynamic");

  useEffect(() => {
    if (provider.models !== "dynamic") return;
    let cancelled = false;
    fetch(`/api/connections/models?provider=${provider.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.models) {
          setDynamicModels(data.models);
        }
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [provider.id, provider.models]);

  const allModels = useMemo(() => {
    const remoteModels = connectedModels[provider.id];
    if (remoteModels?.length) {
      return remoteModels.map((id) => ({ id, name: id, group: "远程模型" }));
    }
    if (provider.models === "dynamic") {
      return dynamicModels.map((m) => ({ id: m.id, name: m.name || m.id, group: "可用模型" }));
    }
    return (provider.models as ModelGroup[]).flatMap((group) =>
      group.models.map((m) => ({ id: m.id, name: m.name || m.id, group: group.label }))
    );
  }, [provider, dynamicModels, connectedModels]);

  const filteredModels = useMemo(() => {
    if (!search) return allModels;
    const q = search.toLowerCase();
    return allModels.filter(
      (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
    );
  }, [allModels, search]);

  const groupedModels = useMemo(() => {
    const groups: Record<string, typeof filteredModels> = {};
    for (const m of filteredModels) {
      if (!groups[m.group]) groups[m.group] = [];
      groups[m.group].push(m);
    }
    return groups;
  }, [filteredModels]);

  if (loading) {
    return (
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          模型 <span className="opacity-60">(Model)</span>
        </label>
        <div className="text-xs text-muted-foreground py-2 animate-pulse">加载模型列表中…</div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">
        模型 <span className="opacity-60">(Model)</span>
      </label>

      {allModels.length > 10 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 搜索模型…"
          className="w-full bg-background border border-input rounded px-3 py-1 text-xs focus:border-primary focus:outline-none mb-1"
        />
      )}

      <select
        value={selectedModel}
        onChange={(e) => setSelectedModel(provider.id, e.target.value)}
        className="w-full bg-background border border-input rounded px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
      >
        <option value="">选择模型…</option>
        {Object.entries(groupedModels).map(([group, models]) => (
          <optgroup key={group} label={group}>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {allModels.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground">
          {provider.models === "dynamic"
            ? "请先连接以加载可用模型"
            : "暂无可用模型"}
        </p>
      )}
    </div>
  );
}
