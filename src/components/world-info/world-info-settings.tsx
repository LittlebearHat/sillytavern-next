"use client";

import { useState } from "react";
import { useWorldInfoStore } from "@/stores/worldinfo-store";
import {
  WORLD_INFO_INSERTION_STRATEGY,
  type WorldInfoInsertionStrategy,
} from "@/types";
import { HintTip } from "./hint-tip";

/** 全局世界书设置面板（对应 index.html L4757-4830） */
export function WorldInfoSettingsPanel() {
  const settings = useWorldInfoStore((s) => s.settings);
  const updateSettings = useWorldInfoStore((s) => s.updateSettings);
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-md">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <span>全局设置</span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="p-3 space-y-3 text-sm border-t border-border">
          <NumField
            label="扫描深度 (Scan Depth)"
            hint="每次生成时，取最近 N 条聊天记录去匹配世界书关键词。数值越大越能召回久远设定，但耗 token 也越多。推荐 4-10。"
            value={settings.world_info_depth}
            min={1}
            max={1000}
            onChange={(v) => updateSettings({ world_info_depth: v })}
          />
          <NumField
            label="最少激活 (Min Activations)"
            hint="每次至少强制激活多少条词条。如果关键词未命中足够条，将按 Order 按顺序补足。0 = 关闭。"
            value={settings.world_info_min_activations}
            min={0}
            max={1000}
            onChange={(v) => updateSettings({ world_info_min_activations: v })}
          />
          <NumField
            label="最少激活·最大深度 (Min Act. Depth Max)"
            hint="「最少激活」起作用时允许扫描的最大深度上限，超过则不再补足。"
            value={settings.world_info_min_activations_depth_max}
            min={0}
            max={1000}
            onChange={(v) => updateSettings({ world_info_min_activations_depth_max: v })}
          />
          <NumField
            label="Token 预算 % (Budget)"
            hint="世界书总占上下文的百分比上限。超过部分会被丢弃（优先保留 Order 靠前的词条）。推荐 25-40。"
            value={settings.world_info_budget}
            min={0}
            max={100}
            onChange={(v) => updateSettings({ world_info_budget: v })}
          />
          <NumField
            label="预算硬限 (Budget Cap, 0=不限)"
            hint="世界书总使用 token 的硬上限。与上面的百分比取「更严格」的那个。有些模型上下文小建议设个身。"
            value={settings.world_info_budget_cap}
            min={0}
            max={1000000}
            onChange={(v) => updateSettings({ world_info_budget_cap: v })}
          />
          <NumField
            label="最大递归步数 (Max Recursion Steps)"
            hint="「递归扫描」启用后的最大递归轮数，防止词条互相触发引起无限环。0 = 不限制（不推荐）。"
            value={settings.world_info_max_recursion_steps}
            min={0}
            max={100}
            onChange={(v) => updateSettings({ world_info_max_recursion_steps: v })}
          />

          <div className="grid grid-cols-2 gap-2">
            <BoolField
              label="递归扫描 (Recursive)"
              hint="允许被插入的词条内容再次被扫描以触发其他词条。可构建「词条链」但耗资源。"
              value={settings.world_info_recursive}
              onChange={(v) => updateSettings({ world_info_recursive: v })}
            />
            <BoolField
              label="区分大小写 (Case Sensitive)"
              hint="全局关键词匹配是否区分大小写。词条可单独覆盖。"
              value={settings.world_info_case_sensitive}
              onChange={(v) => updateSettings({ world_info_case_sensitive: v })}
            />
            <BoolField
              label="全词匹配 (Match Whole Words)"
              hint="全局仅在词边界匹配（避免 cat 匹中 category 这种误伤）。中文一般关闭。"
              value={settings.world_info_match_whole_words}
              onChange={(v) => updateSettings({ world_info_match_whole_words: v })}
            />
            <BoolField
              label="分组评分 (Group Scoring)"
              hint="同一分组内按「权重×命中关键词数」选取最优词条，而非随机选一。"
              value={settings.world_info_use_group_scoring}
              onChange={(v) => updateSettings({ world_info_use_group_scoring: v })}
            />
            <BoolField
              label="包含角色名 (Include Names)"
              hint="扫描关键词时将「发言人名」也拼进文本。某些词条需依赖名字才能命中。"
              value={settings.world_info_include_names}
              onChange={(v) => updateSettings({ world_info_include_names: v })}
            />
            <BoolField
              label="溢出告警 (Overflow Alert)"
              hint="超过 Token 预算被丢弃词条时在控制台提示，方便检查。"
              value={settings.world_info_overflow_alert}
              onChange={(v) => updateSettings({ world_info_overflow_alert: v })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <span>插入策略 (Insertion Strategy)</span>
              <HintTip text="全局书与角色书同时生效时的排列顺序。均匀：交错插入；角色优先：角色书靠前；全局优先：全局书靠前。" />
            </label>
            <select
              value={settings.world_info_character_strategy}
              onChange={(e) =>
                updateSettings({
                  world_info_character_strategy: Number(e.target.value) as WorldInfoInsertionStrategy,
                })
              }
              className="w-full bg-background border border-input rounded-md h-9 px-2 text-sm"
            >
              <option value={WORLD_INFO_INSERTION_STRATEGY.evenly}>均匀交错 (evenly)</option>
              <option value={WORLD_INFO_INSERTION_STRATEGY.character_first}>角色优先 (character first)</option>
              <option value={WORLD_INFO_INSERTION_STRATEGY.global_first}>全局优先 (global first)</option>
            </select>
          </div>

          <div className="pt-2 text-xs text-muted-foreground">
            已选全局世界书：{settings.globalSelect.length} 个
          </div>
        </div>
      )}
    </div>
  );
}

function NumField({
  label,
  value,
  min,
  max,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  hint?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs items-center">
        <span className="text-muted-foreground flex items-center gap-1">
          {label}
          {hint && <HintTip text={hint} />}
        </span>
        <span>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

function BoolField({
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
