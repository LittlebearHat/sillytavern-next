"use client";

import { useState } from "react";
import type { WorldInfoEntry } from "@/types";
import {
  WORLD_INFO_LOGIC,
  WORLD_INFO_POSITION,
  WORLD_INFO_ROLE,
} from "@/types";
import { useWorldInfoStore } from "@/stores/worldinfo-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { HintTip } from "./hint-tip";

/** 单条词条编辑卡片 */
export function EntryEditor({ entry, expanded: initialExpanded = false }: { entry: WorldInfoEntry; expanded?: boolean }) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const upsertEntry = useWorldInfoStore((s) => s.upsertEntry);
  const deleteEntry = useWorldInfoStore((s) => s.deleteEntry);

  const update = (patch: Partial<WorldInfoEntry>) => {
    upsertEntry({ ...entry, ...patch });
  };

  return (
    <div className="border border-border rounded-md bg-card/50">
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground"
          title={expanded ? "折叠" : "展开"}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <Input
          value={entry.comment}
          placeholder="标题/备注"
          onChange={(e) => update({ comment: e.target.value })}
          className="flex-1 h-8"
        />
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={!entry.disable}
            onChange={(e) => update({ disable: !e.target.checked })}
          />
          启用
        </label>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (confirm("删除该词条？")) deleteEntry(entry.uid);
          }}
          className="h-8 w-8 text-muted-foreground hover:text-red-400"
          title="删除"
        >
          <Trash2 size={14} />
        </Button>
      </div>

      {expanded && (
        <div className="p-3 border-t border-border space-y-3 text-sm">
          <Field label="主关键词 (Primary Keys)" hint="命中该词条的主关键词。多个词用逗号分隔；支持正则，格式 /表达式/flags。例：剑、魔法、/^陆.+/i">
            <Input
              value={entry.key.join(", ")}
              onChange={(e) =>
                update({
                  key: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              className="h-8"
            />
          </Field>

          <Field label="次关键词 (Secondary Keys)" hint="配合「选择逻辑」使用。例如仅当主词与某个次词同时出现时才触发。需勾选「选择性」才生效。">
            <Input
              value={entry.keysecondary.join(", ")}
              onChange={(e) =>
                update({
                  keysecondary: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              className="h-8"
            />
          </Field>

          <Field label="内容 (Content)" hint="实际插入到 AI 提示词中的正文。可用 {{user}}/{{char}} 等宏。">
            <textarea
              value={entry.content}
              onChange={(e) => update({ content: e.target.value })}
              className="w-full min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="选择逻辑 (Selective Logic)" hint="主/次关键词的匹配关系。AND ANY：包含主词 且 包含任一次词；AND ALL：包含主词 且 包含所有次词；NOT ALL：不包含所有次词；NOT ANY：不包含任一次词。">
              <select
                value={entry.selectiveLogic}
                onChange={(e) => update({ selectiveLogic: Number(e.target.value) as WorldInfoEntry["selectiveLogic"] })}
                className="h-8 w-full bg-background border border-input rounded-md px-2 text-sm"
              >
                <option value={WORLD_INFO_LOGIC.AND_ANY}>AND ANY · 包含任一次词</option>
                <option value={WORLD_INFO_LOGIC.AND_ALL}>AND ALL · 包含所有次词</option>
                <option value={WORLD_INFO_LOGIC.NOT_ALL}>NOT ALL · 不包含所有次词</option>
                <option value={WORLD_INFO_LOGIC.NOT_ANY}>NOT ANY · 不包含任一次词</option>
              </select>
            </Field>

            <Field label="插入位置 (Position)" hint="词条内容插入到提示词的哪个位置。多数人使用「在角色描述之后」；「按深度插入」可控制距离最后 N 条消息的插入位置。">
              <select
                value={entry.position}
                onChange={(e) => update({ position: Number(e.target.value) as WorldInfoEntry["position"] })}
                className="h-8 w-full bg-background border border-input rounded-md px-2 text-sm"
              >
                <option value={WORLD_INFO_POSITION.before}>0 · 在角色描述之前</option>
                <option value={WORLD_INFO_POSITION.after}>1 · 在角色描述之后</option>
                <option value={WORLD_INFO_POSITION.ANTop}>2 · 作者注顶部 (AN Top)</option>
                <option value={WORLD_INFO_POSITION.ANBottom}>3 · 作者注底部 (AN Bottom)</option>
                <option value={WORLD_INFO_POSITION.atDepth}>4 · 按深度插入 (@ Depth)</option>
                <option value={WORLD_INFO_POSITION.EMTop}>5 · 示例消息顶部 (EM Top)</option>
                <option value={WORLD_INFO_POSITION.EMBottom}>6 · 示例消息底部 (EM Bottom)</option>
                <option value={WORLD_INFO_POSITION.outlet}>7 · Outlet (出口占位符)</option>
              </select>
            </Field>

            <NumberInput label="顺序 (Order)" hint="同一插入位置内多个词条的排序优先级。数值越大越靠近顶部/越优先。" value={entry.order} onChange={(v) => update({ order: v })} />
            <NumberInput
              label="触发概率 (Probability %)"
              hint="该词条被选中后实际生效的概率。90 以下可制造随机感。需勾选「启用概率」才生效。"
              value={entry.probability}
              min={0}
              max={100}
              onChange={(v) => update({ probability: v })}
            />
            <NumberInput label="插入深度 (Depth)" hint="仅当位置=「按深度插入」时生效。表示插入到「距离最后一条消息的第 N 条之前」。" value={entry.depth} onChange={(v) => update({ depth: v })} />
            <Field label="角色 (Role @ Depth)" hint="按深度插入时使用的消息角色。system=系统，user=用户，assistant=AI。">
              <select
                value={entry.role ?? 0}
                onChange={(e) => update({ role: Number(e.target.value) as WorldInfoEntry["role"] })}
                className="h-8 w-full bg-background border border-input rounded-md px-2 text-sm"
              >
                <option value={WORLD_INFO_ROLE.system}>system · 系统</option>
                <option value={WORLD_INFO_ROLE.user}>user · 用户</option>
                <option value={WORLD_INFO_ROLE.assistant}>assistant · AI</option>
              </select>
            </Field>

            <Field label="分组 (Group)" hint="同名分组内只选中一条（防重复），选择规则由「分组评分」控制。为空则不分组。">
              <Input value={entry.group} onChange={(e) => update({ group: e.target.value })} className="h-8" />
            </Field>
            <NumberInput
              label="分组权重 (Group Weight)"
              hint="在分组评分中的占比权重。数值越大被选中的概率越高。"
              value={entry.groupWeight}
              onChange={(v) => update({ groupWeight: v })}
            />

            <NumberInput
              label="扫描深度 (Scan Depth)"
              hint="覆盖全局设置：在最近多少条聊天中匹配关键词。0 = 使用全局默认。"
              value={entry.scanDepth ?? 0}
              onChange={(v) => update({ scanDepth: v || null })}
            />
            <NumberInput
              label="黏性 (Sticky)"
              hint="被触发后额外保留多少轮（即使后续不再匹配关键词也会继续生效）。0 = 关闭。"
              value={entry.sticky ?? 0}
              onChange={(v) => update({ sticky: v || null })}
            />
            <NumberInput
              label="冷却 (Cooldown)"
              hint="生效后的冷却轮数，在此期间不会再次被触发。0 = 关闭。"
              value={entry.cooldown ?? 0}
              onChange={(v) => update({ cooldown: v || null })}
            />
            <NumberInput
              label="延迟 (Delay)"
              hint="聊天轮数少于该值时不生效（延迟到聊天中后期才出现）。0 = 关闭。"
              value={entry.delay ?? 0}
              onChange={(v) => update({ delay: v || null })}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2">
            <Bool label="常驻 (Constant)" hint="常驻词条：不需匹配关键词，始终被插入。适合「世界规则」「人设约束」等始终生效的内容。" value={entry.constant} onChange={(v) => update({ constant: v })} />
            <Bool label="选择性 (Selective)" hint="启用后才会考虑次关键词与「选择逻辑」；关闭则只看主关键词是否命中。" value={entry.selective} onChange={(v) => update({ selective: v })} />
            <Bool label="启用概率 (Use Probability)" hint="勾选后「触发概率」才生效，否则匹配到就一定插入。" value={entry.useProbability} onChange={(v) => update({ useProbability: v })} />
            <Bool
              label="区分大小写 (Case Sensitive)"
              hint="关键词匹配是否区分大小写。默认不区分。"
              value={!!entry.caseSensitive}
              onChange={(v) => update({ caseSensitive: v })}
            />
            <Bool
              label="全词匹配 (Match Whole Words)"
              hint="勾选后仅在词边界匹配。例如 cat 不会被 category 误触发。中文一般不需要启用。"
              value={!!entry.matchWholeWords}
              onChange={(v) => update({ matchWholeWords: v })}
            />
            <Bool
              label="分组评分 (Use Group Scoring)"
              hint="同分组内按「分组权重×命中关键词数」评分选取最优词条，而非随机选一。"
              value={!!entry.useGroupScoring}
              onChange={(v) => update({ useGroupScoring: v })}
            />
            <Bool
              label="分组优先 (Group Override)"
              hint="勾选后该词条在分组中有优先权：只要被触发就掑除同组其他词条。"
              value={entry.groupOverride}
              onChange={(v) => update({ groupOverride: v })}
            />
            <Bool
              label="禁止递归 (Prevent Recursion)"
              hint="该词条被插入后，其内容不会被后续扫描轮次拿去匹配其他词条。可防递归爆炸。"
              value={entry.preventRecursion}
              onChange={(v) => update({ preventRecursion: v })}
            />
            <Bool
              label="排除递归 (Exclude Recursion)"
              hint="该词条只能被「原始聊天」触发，不会被其他被插入的词条递归触发。"
              value={entry.excludeRecursion}
              onChange={(v) => update({ excludeRecursion: v })}
            />
            <Bool label="向量化 (Vectorized)" hint="使用向量检索匹配（需后端向量服务支持）。一般用户保持关闭即可。" value={entry.vectorized} onChange={(v) => update({ vectorized: v })} />
            <Bool label="追加备注 (Add Memo)" hint="插入时同时带上该词条的「标题/备注」作为注释，方便调试与追踪来源。" value={entry.addMemo} onChange={(v) => update({ addMemo: v })} />
            <Bool
              label="忽略预算 (Ignore Budget)"
              hint="勾选后该词条不受 Token 预算限制，始终会被包含。谨慎对长内容勾选。"
              value={entry.ignoreBudget}
              onChange={(v) => update({ ignoreBudget: v })}
            />
          </div>

          <Field label="自动化 ID (Automation ID)" hint="供脚本/扩展调用的唯一标识。不写脚本可忽略。">
            <Input
              value={entry.automationId}
              onChange={(e) => update({ automationId: e.target.value })}
              className="h-8"
            />
          </Field>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground flex items-center gap-1">
        <span>{label}</span>
        {hint && <HintTip text={hint} />}
      </label>
      {children}
    </div>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  hint?: string;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8"
      />
    </Field>
  );
}

function Bool({
  label,
  value,
  hint,
  onChange,
}: {
  label: string;
  value: boolean;
  hint?: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs select-none">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4"
        />
        <span>{label}</span>
      </label>
      {hint && <HintTip text={hint} icon="ⓘ" />}
    </div>
  );
}
