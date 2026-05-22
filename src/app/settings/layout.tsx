import type { ReactNode } from "react";
import { BackButton } from "@/components/ui/back-button";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <BackButton />
          <h1 className="text-2xl font-bold">
            API 连接配置
            <span className="ml-2 text-sm font-normal text-muted-foreground">Settings</span>
          </h1>
        </div>
        {children}
      </div>
    </div>
  );
}
