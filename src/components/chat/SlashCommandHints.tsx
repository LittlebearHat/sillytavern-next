"use client";

import { cn } from "@/lib/utils";

export interface SlashCommand {
  cmd: string;
  alias?: string;
  description: string;
  usage?: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { cmd: "help", alias: "?", description: "查看帮助", usage: "/help" },
  { cmd: "clear", alias: "flush", description: "清空当前会话所有消息", usage: "/clear" },
  { cmd: "sys", description: "添加一条 system 隐藏消息", usage: "/sys <text>" },
  { cmd: "name", description: "修改最后一条消息的名字", usage: "/name <new name>" },
  { cmd: "branch", description: "从最后一条消息创建分支", usage: "/branch" },
  { cmd: "tts", description: "朗读最后一条 AI 消息", usage: "/tts" },
  { cmd: "roll", description: "掷骰", usage: "/roll NdM" },
  { cmd: "hide", description: "隐藏最后 N 条消息", usage: "/hide [N]" },
  { cmd: "unhide", description: "取消隐藏最后 N 条", usage: "/unhide [N]" },
  { cmd: "continue", description: "续写最后一条 AI 回复", usage: "/continue" },
  { cmd: "impersonate", description: "让 AI 帮你写下一条", usage: "/impersonate" },
  { cmd: "go", description: "跳转到第 N 条消息", usage: "/go N" },
  { cmd: "setvar", description: "设置聊天变量", usage: "/setvar key=value" },
  { cmd: "getvar", description: "获取变量值", usage: "/getvar key" },
  { cmd: "note", description: "设置作者注释", usage: "/note <text>" },
  { cmd: "model", description: "显示当前模型信息", usage: "/model" },
  { cmd: "token", description: "估算文本 token 数", usage: "/token [text]" },
  { cmd: "export", description: "导出当前对话为 Markdown", usage: "/export" },
];

interface SlashCommandHintsProps {
  input: string;
  visible: boolean;
  selectedIndex: number;
  onSelect: (cmd: SlashCommand) => void;
}

/** 获取过滤后的命令列表 */
export function getFilteredCommands(input: string): SlashCommand[] {
  if (!input.startsWith("/")) return [];
  const typed = input.slice(1).toLowerCase().split(" ")[0];
  if (!typed) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter(
    (c) => c.cmd.startsWith(typed) || (c.alias && c.alias.startsWith(typed))
  );
}

/** 斜杠命令提示下拉面板 */
export function SlashCommandHints({ input, visible, selectedIndex, onSelect }: SlashCommandHintsProps) {
  const filtered = getFilteredCommands(input);

  if (!visible || filtered.length === 0) return null;

  // 已经完整输入了命令+空格，不再显示提示
  const typed = input.slice(1).toLowerCase();
  const hasSpace = typed.includes(" ");
  const exactMatch = SLASH_COMMANDS.some((c) => c.cmd === typed || c.alias === typed);
  if (hasSpace || exactMatch) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 max-h-52 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg z-30">
      {filtered.map((cmd, i) => (
        <button
          key={cmd.cmd}
          type="button"
          onClick={() => onSelect(cmd)}
          className={cn(
            "w-full flex items-baseline gap-2 px-3 py-1.5 text-left text-sm transition-colors",
            i === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
          )}
        >
          <code className="text-xs font-mono text-primary shrink-0">/{cmd.cmd}</code>
          {cmd.alias && (
            <span className="text-[10px] text-muted-foreground shrink-0">/{cmd.alias}</span>
          )}
          <span className="text-xs text-muted-foreground truncate">{cmd.description}</span>
        </button>
      ))}
    </div>
  );
}
