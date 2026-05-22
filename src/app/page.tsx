"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatArea } from "@/components/chat/chat-area";
import { GroupSettingsPanel } from "@/components/groups/group-settings-panel";
import { useChatStore } from "@/stores/chat-store";
import { useConnectionStore } from "@/lib/stores/connection-store";

export default function Home() {
  const { currentCharacter } = useChatStore();
  const {
    config, connectionStatus, connectedModels, configLoaded,
    setSelectedModel, setConnectedModels, setConnectionStatus, loadConfig,
  } = useConnectionStore();

  const activeProvider = config.activeProviders[config.activeCategory] ?? "openai";
  const activeModel = config.selectedModels[activeProvider] ?? "";
  const isConnected = connectionStatus[activeProvider] === "connected";
  const models = connectedModels[activeProvider] ?? [];

  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 页面加载时恢复已保存的配置
  useEffect(() => {
    if (configLoaded) return;
    (async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === "object" && data.activeCategory) {
            loadConfig(data);
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    })();
  }, [configLoaded, loadConfig]);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // 从 API 刷新模型列表
  const handleFetchModels = useCallback(async () => {
    setFetchingModels(true);
    try {
      const baseUrl = config.baseUrls[activeProvider] || undefined;
      const res = await fetch("/api/connections/models?" + new URLSearchParams({
        provider: activeProvider,
        ...(baseUrl ? { baseUrl } : {}),
      }));
      if (res.ok) {
        const data = await res.json();
        if (data.models?.length) {
          setConnectedModels(activeProvider, data.models);
          setConnectionStatus(activeProvider, "connected");
          // 如果没有选中模型，自动选第一个
          if (!activeModel && data.models[0]) {
            setSelectedModel(activeProvider, data.models[0]);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch models:", err);
    } finally {
      setFetchingModels(false);
    }
  }, [activeProvider, activeModel, config.baseUrls, setConnectedModels, setConnectionStatus, setSelectedModel]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 h-14 border-b border-border flex items-center px-4 gap-3 shrink-0 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-medium overflow-hidden">
              {currentCharacter?.avatar && currentCharacter.avatar !== "none" && currentCharacter.avatar.startsWith("data:") ? (
                <img src={currentCharacter.avatar} alt={currentCharacter.name} className="w-full h-full object-cover" />
              ) : (
                currentCharacter?.name?.[0] ?? "AI"
              )}
            </div>
            <span className="text-sm font-medium">
              {currentCharacter?.name ?? "选择角色开始对话"}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
            <span>{activeProvider}</span>
            <span>|</span>
            {/* Model Selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-accent transition-colors text-foreground"
              >
                <span className="max-w-[200px] truncate">{activeModel || "未选择模型"}</span>
                <ChevronDown size={12} />
              </button>
              {showModelDropdown && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-popover border border-border rounded-lg shadow-lg z-50">
                  {/* Refresh button */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <span className="text-xs text-muted-foreground">模型列表</span>
                    <button
                      onClick={handleFetchModels}
                      disabled={fetchingModels}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={fetchingModels ? "animate-spin" : ""} />
                      {fetchingModels ? "获取中..." : "刷新"}
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {models.length === 0 ? (
                      <div className="p-3 text-xs text-muted-foreground">
                        暂无模型。点击上方&ldquo;刷新&rdquo;获取模型列表。
                      </div>
                    ) : (
                      models.map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            setSelectedModel(activeProvider, m);
                            setShowModelDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors truncate ${
                            m === activeModel ? "bg-accent text-accent-foreground font-medium" : ""
                          }`}
                        >
                          {m}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        {/* Chat */}
        <div className="flex-1 min-h-0 flex flex-row">
          <div className="flex-1 min-w-0 flex flex-col">
            <ChatArea />
          </div>
          <GroupSettingsPanel />
        </div>
      </main>
    </div>
  );
}
