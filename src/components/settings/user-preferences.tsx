"use client";

import { useEffect } from "react";
import { useConnectionStore } from "@/lib/stores/connection-store";
import { API_CATEGORY_LABELS, type ApiCategory } from "@/types/api-connections";

/**
 * 用户偏好设置面板：自动连接 / 默认 API 类别 / 密钥显示 / 聊天命名
 * 数据持久化复用 connection-store 的 saveConfig()。
 */
export function UserPreferences() {
  const { config, configLoaded, loadConfig } = useConnectionStore();
  const setAutoConnect = useConnectionStore.getState().setAutoConnect;
  const setActiveCategory = useConnectionStore.getState().setActiveCategory;

  // 本地 UI 状态
  const loaded = configLoaded;

  useEffect(() => {
    if (!configLoaded) {
      fetch("/api/settings")
        .then((r) => r.json())
        .then((data) => { loadConfig(data); })
        .catch(console.error);
    }
  }, [configLoaded, loadConfig]);

  if (!loaded) {
    return <div className="text-sm text-muted-foreground py-8 text-center">加载中…</div>;
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* 自动连接 */}
      <SettingRow
        title="自动连接"
        sub="Auto-connect"
        description="启动后自动连接上次使用的提供商和模型。"
      >
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.autoConnect}
            onChange={(e) => setAutoConnect(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </SettingRow>

      {/* 默认 API 类别 */}
      <SettingRow
        title="默认 API 类别"
        sub="Default Category"
        description="打开设置页面时默认选中的 API 类型。"
      >
        <select
          value={config.activeCategory}
          onChange={(e) => setActiveCategory(e.target.value as ApiCategory)}
          className="bg-background border border-input rounded-md px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
        >
          {(Object.keys(API_CATEGORY_LABELS) as ApiCategory[]).map((id) => (
            <option key={id} value={id}>
              {API_CATEGORY_LABELS[id]}
            </option>
          ))}
        </select>
      </SettingRow>

      {/* 使用说明 */}
      <div className="bg-muted/40 border border-border rounded-md p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground/80">使用提示</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>API 密钥保存在本地数据库，不会上传到任何第三方。</li>
          <li>连接成功后会自动拉取模型列表，首次可能需要几秒。</li>
          <li>「测试消息」按钮会发送一条短文本验证连接，会消耗少量 API 额度。</li>
          <li>多个提供商可以同时保存配置，在聊天页面顶部切换使用。</li>
        </ul>
      </div>
    </div>
  );
}

/** 单行设置项容器 */
function SettingRow({
  title,
  sub,
  description,
  children,
}: {
  title: string;
  sub: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="space-y-0.5">
        <h3 className="text-sm font-medium">
          {title}
          <span className="ml-2 text-xs text-muted-foreground font-normal">({sub})</span>
        </h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
