/**
 * 群组聊天激活策略 & 生成模式
 * 对齐原项目 public/scripts/group-chats.js
 */

// ========================
// 枚举定义
// ========================

/** 激活策略：决定下一个谁说话 */
export const GROUP_ACTIVATION_STRATEGY = {
  /** 自然激活：提及角色名、按健谈度随机 */
  NATURAL: 0,
  /** 列表激活：按成员顺序轮流 */
  LIST: 1,
  /** 手动激活：用户输入时才有回复 */
  MANUAL: 2,
  /** 池化激活：避免重复，从未说话者中选 */
  POOLED: 3,
} as const;

/** 生成模式：如何组织多角色回复 */
export const GROUP_GENERATION_MODE = {
  /** 替换模式：逐个角色轮流生成 */
  SWAP: 0,
  /** 追加模式：合并所有角色卡信息一起生成 */
  APPEND: 1,
  /** 追加（禁用）模式：同追加，但排除被禁用的成员 */
  APPEND_DISABLED: 2,
} as const;

export type ActivationStrategy = (typeof GROUP_ACTIVATION_STRATEGY)[keyof typeof GROUP_ACTIVATION_STRATEGY];
export type GenerationMode = (typeof GROUP_GENERATION_MODE)[keyof typeof GROUP_GENERATION_MODE];

// ========================
// 成员信息接口
// ========================

export interface GroupMember {
  id: string;
  name: string;
  avatar: string | null;
  talkativeness: number;
  disabled: boolean;
}

export interface GroupMessage {
  id: string;
  name: string;
  isUser: boolean;
  content: string;
  characterId?: string;
}

// ========================
// 激活策略实现
// ========================

/**
 * 自然激活（对齐原项目 activateNaturalOrder）：
 * 1. 扫描用户输入是否提及角色名字 → 返回第一个被提及的
 * 2. 按角色健谈度随机掷骰 → 第一个通过的就返回
 * 3. 无人被激活则从高健谈者中随机选一个
 * 每次只激活 1 个成员
 */
export function activateNatural(
  members: GroupMember[],
  userInput: string,
  lastSpeaker: string | null,
  allowSelfResponses: boolean,
): string[] {
  const enabledMembers = members.filter((m) => !m.disabled);
  if (enabledMembers.length === 0) return [];

  const bannedName = !allowSelfResponses ? lastSpeaker : null;

  // 1. 扫描提及 —— 找到第一个被提及的就返回
  if (userInput) {
    const inputLower = userInput.toLowerCase();
    for (const m of enabledMembers) {
      if (m.name === bannedName) continue;
      if (inputLower.includes(m.name.toLowerCase())) {
        return [m.id];
      }
    }
  }

  // 2. 按健谈度随机：第一个通过的就返回
  const shuffled = [...enabledMembers].sort(() => Math.random() - 0.5);
  const chattyPool: string[] = [];
  for (const m of shuffled) {
    if (m.name === bannedName) continue;
    if (m.talkativeness > 0) chattyPool.push(m.id);
    if (Math.random() < m.talkativeness) {
      return [m.id];
    }
  }

  // 3. 无人激活则随机选一个
  const pool = chattyPool.length > 0 ? chattyPool : enabledMembers.map((m) => m.id);
  const filtered = pool.filter((id) => {
    const m = members.find((x) => x.id === id);
    return m && m.name !== bannedName;
  });
  if (filtered.length > 0) {
    return [filtered[Math.floor(Math.random() * filtered.length)]];
  }
  if (pool.length > 0) {
    return [pool[Math.floor(Math.random() * pool.length)]];
  }
  return [];
}

/** 列表激活：按成员列表顺序全部轮流 */
export function activateList(members: GroupMember[]): string[] {
  return members.filter((m) => !m.disabled).map((m) => m.id);
}

/**
 * 手动激活：不自动激活任何人，用户必须通过“强制发言”按钮手动指定角色
 * 对齐原项目：Manual 策略下发消息不触发自动回复，仅 forceCharId 生效
 */
export function activateManual(_members: GroupMember[]): string[] {
  return [];
}

/**
 * 池化激活：确保每个成员都轮到一次才重复
 * 从消息末尾反向扫描 AI 回复，收集“当前轮次”已发言的角色
 * 一旦检测到同一角色第二次出现（说明进入了上一轮）就停止
 * 然后从未发言的成员中随机选一个
 */
export function activatePooled(
  members: GroupMember[],
  recentMessages: GroupMessage[],
  lastSpeaker: string | null,
): string[] {
  const enabled = members.filter((m) => !m.disabled);
  if (enabled.length === 0) return [];

  const enabledIds = new Set(enabled.map((m) => m.id));

  // 从末尾反向扫描，收集“当前轮次”已发言的角色
  const spokenIds = new Set<string>();
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i];
    // 跳过用户消息和无角色ID的消息
    if (msg.isUser || !msg.characterId) continue;
    // 跳过非启用成员的消息
    if (!enabledIds.has(msg.characterId)) continue;
    // 如果这个角色已经在 spoken 中，说明进入了上一轮的范围——停止
    if (spokenIds.has(msg.characterId)) break;
    spokenIds.add(msg.characterId);
  }

  // 找出还没发言的
  const notSpoken = enabled.filter((m) => !spokenIds.has(m.id));
  if (notSpoken.length > 0) {
    return [notSpoken[Math.floor(Math.random() * notSpoken.length)].id];
  }

  // 全部都说过 → 新轮次开始，排除上一个发言者
  const pool = lastSpeaker && enabled.length > 1
    ? enabled.filter((m) => m.id !== lastSpeaker)
    : enabled;
  return [pool[Math.floor(Math.random() * pool.length)].id];
}

/** 根据策略获取激活的成员列表 */
export function getActivatedMembers(
  strategy: ActivationStrategy,
  members: GroupMember[],
  userInput: string,
  lastSpeaker: string | null,
  allowSelfResponses: boolean,
  recentMessages: GroupMessage[],
): string[] {
  switch (strategy) {
    case GROUP_ACTIVATION_STRATEGY.NATURAL:
      return activateNatural(members, userInput, lastSpeaker, allowSelfResponses);
    case GROUP_ACTIVATION_STRATEGY.LIST:
      return activateList(members);
    case GROUP_ACTIVATION_STRATEGY.MANUAL:
      return activateManual(members);
    case GROUP_ACTIVATION_STRATEGY.POOLED:
      return activatePooled(members, recentMessages, lastSpeaker);
    default:
      return activateNatural(members, userInput, lastSpeaker, allowSelfResponses);
  }
}
