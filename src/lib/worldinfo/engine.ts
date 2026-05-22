/**
 * World Info / Lorebook 运行时引擎
 *
 * 核心入口：getWorldInfoPrompt(chat, settings, sources)
 * - 收集 entries（global + character + chat）
 * - 按 selectiveLogic 判定命中
 * - 递归扫描（preventRecursion / excludeRecursion / delayUntilRecursion）
 * - Token 预算控制（简易估算：~ chars/4）
 * - 按 position 0-7 分桶
 *
 * 字段对齐 SillyTavern 原项目 newWorldInfoEntryDefinition。
 */
import {
  WorldInfoEntry,
  WorldInfoSettings,
  WorldInfoLogic,
  WORLD_INFO_LOGIC,
  WORLD_INFO_POSITION,
  WORLD_INFO_INSERTION_STRATEGY,
  DEFAULT_WORLD_INFO_SETTINGS,
} from "@/types";

export interface WorldInfoSources {
  /** 全局 lorebook 词条 */
  global?: WorldInfoEntry[];
  /** 角色 character_book / 关联 lorebook 词条 */
  character?: WorldInfoEntry[];
  /** 聊天专属 lorebook 词条 */
  chat?: WorldInfoEntry[];
}

export interface WorldInfoPromptResult {
  /** 拼接好的字符串 (worldInfoBefore + worldInfoAfter)，便于直接注入 */
  worldInfoString: string;
  worldInfoBefore: string; // position 0
  worldInfoAfter: string; // position 1
  anBefore: string[]; // position 2
  anAfter: string[]; // position 3
  /** position 4: { depth, role, content }[] */
  worldInfoDepth: Array<{ depth: number; role: number; content: string }>;
  emTop: string[]; // position 5
  emBottom: string[]; // position 6
  outletEntries: Record<string, string[]>; // position 7 by outletName
  /** 命中词条快照 */
  activatedEntries: WorldInfoEntry[];
}

// ============================================================
// 工具函数
// ============================================================
const REGEX_LIKE = /^\/(.+)\/([gimsuy]*)$/;

/** 把字符串关键词转成正则（支持 /xx/flags 包围语法） */
function toRegex(
  keyword: string,
  caseSensitive: boolean,
  wholeWord: boolean,
): RegExp | null {
  if (!keyword) return null;
  const m = keyword.match(REGEX_LIKE);
  if (m) {
    try {
      return new RegExp(m[1], m[2]);
    } catch {
      return null;
    }
  }
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
  return new RegExp(pattern, caseSensitive ? "" : "i");
}

function anyMatch(text: string, keys: string[], caseSensitive: boolean, wholeWord: boolean): boolean {
  for (const k of keys) {
    const re = toRegex(k, caseSensitive, wholeWord);
    if (re && re.test(text)) return true;
  }
  return false;
}

function allMatch(text: string, keys: string[], caseSensitive: boolean, wholeWord: boolean): boolean {
  if (keys.length === 0) return false;
  for (const k of keys) {
    const re = toRegex(k, caseSensitive, wholeWord);
    if (!re || !re.test(text)) return false;
  }
  return true;
}

/** 判定一条词条是否命中 */
function evaluateEntry(
  entry: WorldInfoEntry,
  scanText: string,
  settings: WorldInfoSettings,
): boolean {
  if (entry.disable) return false;
  // constant 直接命中（仍受 probability 影响）
  if (entry.constant) return rollProbability(entry);

  const cs = entry.caseSensitive ?? settings.world_info_case_sensitive;
  const ww = entry.matchWholeWords ?? settings.world_info_match_whole_words;

  // 主关键词：任意命中
  const primaryHit = entry.key.length > 0 && anyMatch(scanText, entry.key, cs, ww);
  if (!primaryHit) return false;

  // selective + secondary keys：按逻辑判定
  if (entry.selective && entry.keysecondary && entry.keysecondary.length > 0) {
    const logic = entry.selectiveLogic as WorldInfoLogic;
    const anyKey = anyMatch(scanText, entry.keysecondary, cs, ww);
    const allKey = allMatch(scanText, entry.keysecondary, cs, ww);
    let pass = true;
    switch (logic) {
      case WORLD_INFO_LOGIC.AND_ANY:
        pass = anyKey;
        break;
      case WORLD_INFO_LOGIC.NOT_ALL:
        pass = !allKey;
        break;
      case WORLD_INFO_LOGIC.NOT_ANY:
        pass = !anyKey;
        break;
      case WORLD_INFO_LOGIC.AND_ALL:
        pass = allKey;
        break;
    }
    if (!pass) return false;
  }

  return rollProbability(entry);
}

function rollProbability(entry: WorldInfoEntry): boolean {
  if (!entry.useProbability) return true;
  const p = Math.max(0, Math.min(100, entry.probability ?? 100));
  if (p >= 100) return true;
  if (p <= 0) return false;
  return Math.random() * 100 < p;
}

/** 简易 token 估算：英文/数字 ~ 4 字符/token，中文 ~ 1 字符/token */
function estimateTokens(text: string): number {
  let total = 0;
  for (const ch of text) {
    if (/[\u4e00-\u9fff]/.test(ch)) total += 1;
    else total += 0.25;
  }
  return Math.ceil(total);
}

// ============================================================
// 主入口
// ============================================================
export interface GetWorldInfoPromptOptions {
  chat: string[]; // 聊天消息文本数组（最新在前 / 最新在尾均可，按 scanDepth 截）
  settings?: Partial<WorldInfoSettings>;
  sources: WorldInfoSources;
  /** 用于跨 turn 携带 sticky/cooldown 状态 */
  buffer?: WorldInfoEngineBuffer;
}

/** 跨 turn 状态缓冲（sticky/cooldown），持久化到 chat_metadata 即可 */
export interface WorldInfoEngineBuffer {
  /** uid -> 还剩 sticky 轮次 */
  sticky: Record<string, number>;
  /** uid -> 还剩 cooldown 轮次 */
  cooldown: Record<string, number>;
}

export function createBuffer(): WorldInfoEngineBuffer {
  return { sticky: {}, cooldown: {} };
}

export function getWorldInfoPrompt(opts: GetWorldInfoPromptOptions): WorldInfoPromptResult {
  const settings: WorldInfoSettings = {
    ...DEFAULT_WORLD_INFO_SETTINGS,
    ...(opts.settings ?? {}),
  };
  const buffer = opts.buffer ?? createBuffer();

  // 收集词条 + 标记来源
  const entries: Array<{ entry: WorldInfoEntry; source: "global" | "character" | "chat" }> = [];
  for (const e of opts.sources.global ?? []) entries.push({ entry: e, source: "global" });
  for (const e of opts.sources.character ?? []) entries.push({ entry: e, source: "character" });
  for (const e of opts.sources.chat ?? []) entries.push({ entry: e, source: "chat" });

  // 构建初始扫描文本（按全局 scanDepth 截取最新若干条）
  const scanDepth = Math.max(1, settings.world_info_depth || 1);
  const taken = opts.chat.slice(-scanDepth);
  let scanText = taken.join("\n");

  const activated = new Map<string, { entry: WorldInfoEntry; source: string }>();
  let recursionStep = 0;
  const maxSteps = Math.max(0, settings.world_info_max_recursion_steps || 0);

  // 主循环：初始扫描 + 递归
  while (true) {
    let newlyActivated = 0;
    for (const { entry, source } of entries) {
      const key = `${source}:${entry.uid}`;
      if (activated.has(key)) continue;

      // cooldown
      if ((buffer.cooldown[key] ?? 0) > 0) continue;
      // delayUntilRecursion：除非到达指定递归层
      const dur = entry.delayUntilRecursion;
      if (typeof dur === "number" && dur > 0 && recursionStep < dur) continue;
      if (typeof dur === "boolean" && dur && recursionStep < 1) continue;
      // 递归阶段不扫描带 excludeRecursion 的词条
      if (recursionStep > 0 && entry.excludeRecursion) continue;

      // sticky 强制保留（上一轮命中，本轮即使关键词不在也命中）
      if ((buffer.sticky[key] ?? 0) > 0) {
        activated.set(key, { entry, source });
        newlyActivated++;
        continue;
      }

      if (evaluateEntry(entry, scanText, settings)) {
        activated.set(key, { entry, source });
        newlyActivated++;
      }
    }

    if (recursionStep >= maxSteps) break;
    if (!settings.world_info_recursive) break;
    if (newlyActivated === 0) break;

    // 把本轮所有命中、未禁止递归的词条 content 加入 scanText
    const additions: string[] = [];
    for (const [, v] of activated) {
      if (v.entry.preventRecursion) continue;
      if (v.entry.content) additions.push(v.entry.content);
    }
    if (additions.length === 0) break;
    scanText = scanText + "\n" + additions.join("\n");
    recursionStep++;
  }

  // Group Scoring：同 group 互斥，按 groupWeight 选一个（受 useGroupScoring 控制）
  const useGroupScoring = settings.world_info_use_group_scoring;
  if (useGroupScoring) {
    const groups = new Map<string, Array<{ key: string; entry: WorldInfoEntry }>>();
    for (const [k, v] of activated) {
      const g = (v.entry.group || "").trim();
      if (!g) continue;
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push({ key: k, entry: v.entry });
    }
    for (const [, list] of groups) {
      if (list.length <= 1) continue;
      // groupOverride 的优先级最高
      const overrides = list.filter((x) => x.entry.groupOverride);
      const winners = overrides.length > 0 ? overrides : list;
      const totalWeight = winners.reduce((s, x) => s + Math.max(0, x.entry.groupWeight || 0), 0) || 1;
      let r = Math.random() * totalWeight;
      let chosen = winners[0];
      for (const x of winners) {
        r -= Math.max(0, x.entry.groupWeight || 0);
        if (r <= 0) {
          chosen = x;
          break;
        }
      }
      for (const x of list) {
        if (x.key !== chosen.key) activated.delete(x.key);
      }
    }
  }

  // Token 预算：按 budget 百分比 + budget_cap 上限，按 insertion_strategy 排序保留
  applyTokenBudget(activated, settings);

  // sticky / cooldown 衰减 & 写回
  for (const k of Object.keys(buffer.sticky)) {
    buffer.sticky[k] = Math.max(0, buffer.sticky[k] - 1);
    if (buffer.sticky[k] === 0) delete buffer.sticky[k];
  }
  for (const k of Object.keys(buffer.cooldown)) {
    buffer.cooldown[k] = Math.max(0, buffer.cooldown[k] - 1);
    if (buffer.cooldown[k] === 0) delete buffer.cooldown[k];
  }
  for (const [k, v] of activated) {
    if (v.entry.sticky && v.entry.sticky > 0) buffer.sticky[k] = v.entry.sticky;
    if (v.entry.cooldown && v.entry.cooldown > 0) buffer.cooldown[k] = v.entry.cooldown;
  }

  // 分桶
  return bucketize(activated, settings);
}

function applyTokenBudget(
  activated: Map<string, { entry: WorldInfoEntry; source: string }>,
  settings: WorldInfoSettings,
) {
  const list = Array.from(activated.entries()).map(([k, v]) => ({
    key: k,
    entry: v.entry,
    source: v.source,
    tokens: estimateTokens(v.entry.content || ""),
  }));

  // 按 strategy 排序：character_first / global_first / evenly
  const strat = settings.world_info_character_strategy;
  const order = (s: string) => {
    if (strat === WORLD_INFO_INSERTION_STRATEGY.character_first) {
      return s === "character" ? 0 : s === "chat" ? 1 : 2;
    }
    if (strat === WORLD_INFO_INSERTION_STRATEGY.global_first) {
      return s === "global" ? 0 : s === "chat" ? 1 : 2;
    }
    return 1; // evenly: 不区分
  };
  // 再按 order 字段降序
  list.sort((a, b) => {
    const o = order(a.source) - order(b.source);
    if (o !== 0) return o;
    return (b.entry.order ?? 0) - (a.entry.order ?? 0);
  });

  // 预算：budget% * world_info_budget_cap (cap 为 0 表示不限)
  const cap = settings.world_info_budget_cap > 0 ? settings.world_info_budget_cap : Infinity;
  // budget 在原项目里表示占总 max_context 的比例，这里做近似：直接当作 token 上限百分比 * 1024，
  // 实际 max_context 由调用方决定，保留 cap 即可作为硬上限
  const limit = Math.min(cap, Number.MAX_SAFE_INTEGER);

  let used = 0;
  const keep = new Set<string>();
  for (const item of list) {
    if (item.entry.ignoreBudget) {
      keep.add(item.key);
      continue;
    }
    if (used + item.tokens > limit) continue;
    keep.add(item.key);
    used += item.tokens;
  }
  // 删除被淘汰的
  for (const k of Array.from(activated.keys())) {
    if (!keep.has(k)) activated.delete(k);
  }
}

function bucketize(
  activated: Map<string, { entry: WorldInfoEntry; source: string }>,
  _settings: WorldInfoSettings,
): WorldInfoPromptResult {
  const buckets = {
    before: [] as WorldInfoEntry[],
    after: [] as WorldInfoEntry[],
    anTop: [] as WorldInfoEntry[],
    anBottom: [] as WorldInfoEntry[],
    atDepth: [] as WorldInfoEntry[],
    emTop: [] as WorldInfoEntry[],
    emBottom: [] as WorldInfoEntry[],
    outlet: [] as WorldInfoEntry[],
  };

  for (const [, v] of activated) {
    const e = v.entry;
    switch (e.position) {
      case WORLD_INFO_POSITION.before:
        buckets.before.push(e);
        break;
      case WORLD_INFO_POSITION.after:
        buckets.after.push(e);
        break;
      case WORLD_INFO_POSITION.ANTop:
        buckets.anTop.push(e);
        break;
      case WORLD_INFO_POSITION.ANBottom:
        buckets.anBottom.push(e);
        break;
      case WORLD_INFO_POSITION.atDepth:
        buckets.atDepth.push(e);
        break;
      case WORLD_INFO_POSITION.EMTop:
        buckets.emTop.push(e);
        break;
      case WORLD_INFO_POSITION.EMBottom:
        buckets.emBottom.push(e);
        break;
      case WORLD_INFO_POSITION.outlet:
        buckets.outlet.push(e);
        break;
    }
  }

  // 桶内按 order 降序排序
  for (const arr of Object.values(buckets)) {
    (arr as WorldInfoEntry[]).sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
  }

  const join = (arr: WorldInfoEntry[]) => arr.map((e) => e.content).filter(Boolean).join("\n");
  const list = (arr: WorldInfoEntry[]) => arr.map((e) => e.content).filter(Boolean);

  const worldInfoBefore = join(buckets.before);
  const worldInfoAfter = join(buckets.after);

  const outletEntries: Record<string, string[]> = {};
  for (const e of buckets.outlet) {
    const k = e.outletName || "default";
    if (!outletEntries[k]) outletEntries[k] = [];
    if (e.content) outletEntries[k].push(e.content);
  }

  return {
    worldInfoString: worldInfoBefore + (worldInfoBefore && worldInfoAfter ? "\n" : "") + worldInfoAfter,
    worldInfoBefore,
    worldInfoAfter,
    anBefore: list(buckets.anTop),
    anAfter: list(buckets.anBottom),
    worldInfoDepth: buckets.atDepth.map((e) => ({
      depth: e.depth ?? 4,
      role: e.role ?? 0,
      content: e.content,
    })),
    emTop: list(buckets.emTop),
    emBottom: list(buckets.emBottom),
    outletEntries,
    activatedEntries: Array.from(activated.values()).map((v) => v.entry),
  };
}
