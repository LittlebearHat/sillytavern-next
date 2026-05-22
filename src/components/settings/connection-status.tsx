"use client";

const STATUS_CONFIG = {
  connected: { color: "bg-green-500", text: "已连接", animate: "" },
  disconnected: { color: "bg-zinc-500", text: "未连接", animate: "" },
  connecting: { color: "bg-blue-500", text: "连接中…", animate: "animate-pulse" },
  error: { color: "bg-red-500", text: "连接失败", animate: "" },
} as const;

export function ConnectionStatusBadge({
  status,
  model,
}: {
  status: "connected" | "disconnected" | "connecting" | "error";
  model?: string;
}) {
  const cfg = STATUS_CONFIG[status];

  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className={`w-2 h-2 rounded-full ${cfg.color} ${cfg.animate}`}
      />
      <span className="text-muted-foreground">
        {cfg.text}
        {status === "connected" && model && (
          <span className="ml-1 opacity-70">· {model}</span>
        )}
      </span>
    </span>
  );
}
