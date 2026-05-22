"use client";

import { useState } from "react";
import { HintTip } from "@/components/world-info/hint-tip";
import { Button } from "@/components/ui/button";
import {
  APHRODITE_DEFAULT_ORDER,
  KOBOLDCPP_ORDER,
  LLAMACPP_DEFAULT_ORDER,
  OOBA_DEFAULT_ORDER,
  TEXTGEN_TYPES,
  type TextGenSettings,
  type TextGenType,
} from "@/types/textgen";

interface Props {
  apiType: TextGenType;
  settings: TextGenSettings;
  onChange: <K extends keyof TextGenSettings>(key: K, value: TextGenSettings[K]) => void;
}

/** OOBA / llamacpp / Aphrodite / KoboldCpp 四种 sampler 顺序的中文名 */
const SAMPLER_LABELS: Record<string, string> = {
  // OOBA
  repetition_penalty: "重复惩罚",
  presence_penalty: "存在惩罚",
  frequency_penalty: "频率惩罚",
  dry: "DRY",
  temperature: "温度",
  dynamic_temperature: "动态温度",
  quadratic_sampling: "二次采样",
  top_n_sigma: "Top N-Sigma",
  top_k: "Top K",
  top_p: "Top P",
  typical_p: "典型 P",
  epsilon_cutoff: "Epsilon 截断",
  eta_cutoff: "Eta 截断",
  tfs: "TFS",
  top_a: "Top A",
  min_p: "Min P",
  adaptive_p: "Adaptive P",
  mirostat: "Mirostat",
  xtc: "XTC",
  encoder_repetition_penalty: "编码器重复惩罚",
  no_repeat_ngram: "禁止 N-gram",
  // llamacpp 独有
  penalties: "惩罚组",
  typ_p: "典型 P",
  // aphrodite 独有
  top_nsigma: "Top N-Sigma",
  top_p_top_k: "Top P + Top K",
  quadratic: "二次采样",
};

/** KoboldCpp 数字索引 → 中文 */
const KOBOLDCPP_INDEX_LABELS: Record<number, string> = {
  6: "温度 (Temperature)",
  0: "Top K",
  1: "Top A",
  2: "Top P",
  3: "TFS",
  4: "典型 P (Typical P)",
  5: "重复惩罚 (Repetition Penalty)",
};

interface OrderConfig<T extends string | number> {
  /** settings 里的字段名 */
  fieldKey: keyof TextGenSettings;
  /** 默认顺序 */
  defaultOrder: readonly T[];
  /** label 解析 */
  getLabel: (item: T) => string;
}

/** 按 apiType 选 sampler 顺序字段；其它 api 不显示 */
function pickConfig(apiType: TextGenType):
  | OrderConfig<string>
  | OrderConfig<number>
  | null {
  switch (apiType) {
    case TEXTGEN_TYPES.OOBA:
    case TEXTGEN_TYPES.MANCER:
    case TEXTGEN_TYPES.VLLM:
    case TEXTGEN_TYPES.TABBY:
    case TEXTGEN_TYPES.INFERMATICAI:
    case TEXTGEN_TYPES.FEATHERLESS:
    case TEXTGEN_TYPES.HUGGINGFACE:
    case TEXTGEN_TYPES.GENERIC:
      return {
        fieldKey: "sampler_priority",
        defaultOrder: OOBA_DEFAULT_ORDER,
        getLabel: (s) => SAMPLER_LABELS[s] ?? s,
      } satisfies OrderConfig<string>;
    case TEXTGEN_TYPES.LLAMACPP:
      return {
        fieldKey: "samplers",
        defaultOrder: LLAMACPP_DEFAULT_ORDER,
        getLabel: (s) => SAMPLER_LABELS[s] ?? s,
      } satisfies OrderConfig<string>;
    case TEXTGEN_TYPES.APHRODITE:
      return {
        fieldKey: "samplers_priorities",
        defaultOrder: APHRODITE_DEFAULT_ORDER,
        getLabel: (s) => SAMPLER_LABELS[s] ?? s,
      } satisfies OrderConfig<string>;
    case TEXTGEN_TYPES.KOBOLDCPP:
      return {
        fieldKey: "sampler_order",
        defaultOrder: KOBOLDCPP_ORDER,
        getLabel: (n) => KOBOLDCPP_INDEX_LABELS[n] ?? `#${n}`,
      } satisfies OrderConfig<number>;
    default:
      return null;
  }
}

/** 拖拽采样器顺序编辑器 */
export function SamplerOrderEditor({ apiType, settings, onChange }: Props) {
  const config = pickConfig(apiType);
  const [open, setOpen] = useState(true);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  if (!config) {
    return (
      <div className="border border-border rounded-md px-3 py-2 text-xs text-muted-foreground">
        当前 API（{apiType}）不支持采样器顺序定制。
      </div>
    );
  }

  const fieldKey = config.fieldKey;
  const raw = (settings as Record<string, unknown>)[fieldKey as string];

  // 当前顺序：用现有值，缺失项用默认补足；多余项剔除
  const stored: (string | number)[] = Array.isArray(raw) ? (raw as (string | number)[]) : [];
  const allowed = new Set(config.defaultOrder as readonly (string | number)[]);
  const filtered = stored.filter((x) => allowed.has(x));
  const missing = (config.defaultOrder as readonly (string | number)[]).filter(
    (x) => !filtered.includes(x),
  );
  const order: (string | number)[] = [...filtered, ...missing];

  const commit = (next: (string | number)[]) => {
    onChange(fieldKey, next as TextGenSettings[typeof fieldKey]);
  };

  const onDragStart = (idx: number) => () => setDragIdx(idx);
  const onDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setOverIdx(idx);
  };
  const onDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const next = [...order];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    commit(next);
    setDragIdx(null);
    setOverIdx(null);
  };

  const move = (idx: number, delta: number) => {
    const target = idx + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[idx], next[target]] = [next[target], next[idx]];
    commit(next);
  };

  const reset = () => commit([...config.defaultOrder]);

  return (
    <div className="border border-border rounded-md">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent/30"
      >
        <span className="flex items-center gap-2">
          <span className="font-medium">采样器优先级</span>
          <span className="text-[10px] text-muted-foreground">
            (Sampler Priority · {String(fieldKey)})
          </span>
          <HintTip text="决定不同采样器的执行顺序。靠前的先生效，对结果有显著影响。拖拽或使用 ▲▼ 调整。" />
        </span>
        <span className="text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="p-3 space-y-2 border-t border-border">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>共 {order.length} 项</span>
            <Button size="sm" variant="outline" onClick={reset}>
              恢复默认顺序
            </Button>
          </div>
          <ul className="space-y-1">
            {order.map((item, idx) => {
              const isDragging = dragIdx === idx;
              const isOver = overIdx === idx && dragIdx !== null && dragIdx !== idx;
              const label =
                typeof item === "number"
                  ? (config as OrderConfig<number>).getLabel(item)
                  : (config as OrderConfig<string>).getLabel(item);
              return (
                <li
                  key={String(item)}
                  draggable
                  onDragStart={onDragStart(idx)}
                  onDragOver={onDragOver(idx)}
                  onDrop={onDrop(idx)}
                  onDragEnd={() => {
                    setDragIdx(null);
                    setOverIdx(null);
                  }}
                  className={[
                    "flex items-center gap-2 px-2 py-1.5 text-xs rounded border bg-background select-none cursor-grab",
                    isDragging ? "opacity-40" : "",
                    isOver ? "border-primary ring-1 ring-primary" : "border-input",
                  ].join(" ")}
                >
                  <span className="text-muted-foreground w-6 text-right">{idx + 1}.</span>
                  <span className="flex-1 truncate">
                    {label}
                    <span className="ml-2 text-[10px] opacity-50">
                      {typeof item === "string" ? item : `#${item}`}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="px-1.5 py-0.5 rounded hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent"
                    title="上移"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === order.length - 1}
                    className="px-1.5 py-0.5 rounded hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent"
                    title="下移"
                  >
                    ▼
                  </button>
                  <span className="text-muted-foreground cursor-grab" title="拖拽排序">
                    ⋮⋮
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
