"use client";

import { useState } from "react";
import { Plug, Settings } from "lucide-react";
import { ApiConnections } from "@/components/settings/api-connections";
import { UserPreferences } from "@/components/settings/user-preferences";

const TABS = [
  { id: "connections", label: "API 连接配置", sub: "Connections", icon: Plug },
  { id: "preferences", label: "用户偏好", sub: "Preferences", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("connections");

  return (
    <div>
      {/* 顶层 Tab 导航 */}
      <div className="flex items-center gap-1 border-b border-border mb-6">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              }`}
            >
              <Icon
                size={15}
                className={`transition-colors ${
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                }`}
              />
              {tab.label}
              <span className="text-[10px] opacity-50 font-normal">{tab.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 内容区 */}
      {activeTab === "connections" && <ApiConnections />}
      {activeTab === "preferences" && <UserPreferences />}
    </div>
  );
}
