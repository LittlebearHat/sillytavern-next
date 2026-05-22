"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Character } from "@/types";

interface MentionPickerProps {
  /** 群组成员列表 */
  members: Character[];
  /** @ 后面的搜索文本（如 "@Ser" 中的 "Ser"） */
  query: string;
  /** 是否可见 */
  visible: boolean;
  /** 键盘高亮的索引 */
  selectedIndex: number;
  /** 选择某个角色 */
  onSelect: (member: Character) => void;
}

/**
 * 群聊 @ 提及选择器
 * 在输入 @ 后弹出，显示群组成员列表（支持搜索过滤）
 * 与 SlashCommandHints 同级别的浮层组件
 */
export function MentionPicker({
  members,
  query,
  visible,
  selectedIndex,
  onSelect,
}: MentionPickerProps) {
  const filtered = useMemo(() => {
    if (!query) return members;
    const q = query.toLowerCase();
    return members.filter((m) => m.name.toLowerCase().includes(q));
  }, [members, query]);

  if (!visible || filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 z-50">
      <div className="mx-3 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
        <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border">
          @ 提及角色（{filtered.length}）
        </div>
        <div className="max-h-[200px] overflow-y-auto">
          {filtered.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-accent transition-colors",
                i === selectedIndex && "bg-accent",
              )}
            >
              <div className="w-5 h-5 rounded-full overflow-hidden bg-secondary shrink-0 flex items-center justify-center">
                {m.avatar && m.avatar !== "none" && m.avatar.startsWith("data:") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[9px]">{m.name[0]}</span>
                )}
              </div>
              <span className="truncate">{m.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 从输入文本中提取最后一个 @ 的位置和搜索文本
 * 返回 null 表示当前不在 @ 提及模式
 */
export function extractMentionQuery(
  input: string,
  cursorPos: number,
): { atIndex: number; query: string } | null {
  // 从光标位置往前找最近的 @
  const before = input.slice(0, cursorPos);
  const lastAt = before.lastIndexOf("@");
  if (lastAt < 0) return null;

  // @ 前面必须是行首或空白（避免匹配邮箱等）
  if (lastAt > 0 && !/\s/.test(before[lastAt - 1])) return null;

  // @ 后面到光标的文本就是搜索内容（不能包含空格，否则说明已完成输入）
  const query = before.slice(lastAt + 1);
  if (query.includes(" ")) return null;

  return { atIndex: lastAt, query };
}
