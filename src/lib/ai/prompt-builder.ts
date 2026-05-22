/**
 * 提示词构建器 - 将角色卡数据 + 聊天历史构建为 AI API 消息格式
 * 
 * 基于 SillyTavern prompt-converters.js 移植，适配 Vercel AI SDK 格式
 */

import type { CharacterCardV2Data } from "@/lib/parsers/character-card-parser";

/** AI 消息角色 */
export type MessageRole = "system" | "user" | "assistant";

/** AI 消息格式 (兼容 OpenAI Chat Completion) */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string;
}

/** 提示词构建上下文 */
export interface PromptContext {
  /** 角色数据 */
  character: CharacterCardV2Data;
  /** 聊天历史 */
  messages: Array<{
    content: string;
    isUser: boolean;
    name?: string;
  }>;
  /** 用户名称 */
  userName: string;
  /** 系统提示词 (用户自定义覆盖) */
  customSystemPrompt?: string;
  /** jailbreak / post-history instructions */
  postHistoryInstructions?: string;
  /** 最大 token 预算 (用于裁切历史) */
  maxContextTokens?: number;
}

/** 构建结果 */
export interface BuiltPrompt {
  messages: ChatMessage[];
  systemPrompt: string;
}

/**
 * 构建完整的提示词消息数组
 * 
 * 格式:
 * 1. [system] 主系统提示词 (角色描述 + 人格 + 场景)
 * 2. [system] 示例对话 (如果有)
 * 3. [system/user/assistant] 聊天历史
 * 4. [system] post_history_instructions (如果有)
 */
export function buildPrompt(ctx: PromptContext): BuiltPrompt {
  const { character, messages, userName } = ctx;
  const charName = character.name;

  // 构建系统提示词
  const systemParts: string[] = [];

  // 角色描述
  if (character.description) {
    systemParts.push(`[Character: ${charName}]\n${character.description}`);
  }

  // 人格特征
  if (character.personality) {
    systemParts.push(`[${charName}'s personality: ${character.personality}]`);
  }

  // 场景
  if (character.scenario) {
    systemParts.push(`[Scenario: ${character.scenario}]`);
  }

  // 自定义系统提示词 (角色卡级别)
  if (character.system_prompt) {
    systemParts.push(character.system_prompt);
  }

  // 用户自定义覆盖
  if (ctx.customSystemPrompt) {
    systemParts.push(ctx.customSystemPrompt);
  }

  const systemPrompt = systemParts.join("\n\n");

  // 构建消息数组
  const builtMessages: ChatMessage[] = [];

  // System message
  builtMessages.push({
    role: "system",
    content: systemPrompt,
  });

  // 示例对话 (解析为交替消息)
  if (character.mes_example) {
    const exampleMessages = parseExampleDialogue(
      character.mes_example,
      charName,
      userName
    );
    if (exampleMessages.length > 0) {
      builtMessages.push({
        role: "system",
        content: "[Example dialogue - follow this style]",
      });
      builtMessages.push(...exampleMessages);
      builtMessages.push({
        role: "system",
        content: "[Start of roleplay]",
      });
    }
  }

  // 聊天历史
  for (const msg of messages) {
    builtMessages.push({
      role: msg.isUser ? "user" : "assistant",
      content: msg.content,
      name: msg.name || (msg.isUser ? userName : charName),
    });
  }

  // Post-history instructions
  const phi =
    ctx.postHistoryInstructions || character.post_history_instructions;
  if (phi) {
    builtMessages.push({
      role: "system",
      content: phi,
    });
  }

  return { messages: builtMessages, systemPrompt };
}

/**
 * 解析示例对话格式
 * 
 * 格式:
 * <START>
 * {{user}}: Hello!
 * {{char}}: Hi there!
 * <START>
 * ...
 */
export function parseExampleDialogue(
  mesExample: string,
  charName: string,
  userName: string
): ChatMessage[] {
  if (!mesExample.trim()) return [];

  const messages: ChatMessage[] = [];

  // 替换占位符
  const processed = mesExample
    .replace(/\{\{char\}\}/gi, charName)
    .replace(/\{\{user\}\}/gi, userName);

  // 按 <START> 分块
  const blocks = processed.split(/<START>/i).filter((b) => b.trim());

  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      // 匹配 "Name: content" 格式
      const match = line.match(/^(.+?):\s*(.+)$/);
      if (match) {
        const [, name, content] = match;
        const isUser =
          name.trim().toLowerCase() === userName.toLowerCase();
        messages.push({
          role: isUser ? "user" : "assistant",
          content: content.trim(),
          name: name.trim(),
        });
      }
    }
  }

  return messages;
}

/**
 * 将 ChatMessage[] 转换为 Vercel AI SDK 兼容的 messages 格式
 * (去掉 name 字段，将 name 信息嵌入 content)
 */
export function toAISDKMessages(
  messages: ChatMessage[]
): Array<{ role: MessageRole; content: string }> {
  return messages.map((msg) => {
    // AI SDK 不支持 name 字段，将其嵌入 content
    if (msg.name && msg.role !== "system") {
      return {
        role: msg.role,
        content: `${msg.name}: ${msg.content}`,
      };
    }
    return { role: msg.role, content: msg.content };
  });
}

/**
 * 为 OpenAI 兼容 API 转换消息格式
 * 合并连续相同角色的消息
 */
export function mergeConsecutiveMessages(
  messages: ChatMessage[]
): ChatMessage[] {
  const merged: ChatMessage[] = [];

  for (const msg of messages) {
    if (
      merged.length > 0 &&
      merged[merged.length - 1].role === msg.role
    ) {
      merged[merged.length - 1].content += "\n\n" + msg.content;
    } else {
      merged.push({ ...msg });
    }
  }

  return merged;
}

/**
 * 为 Claude/Anthropic API 转换消息
 * Claude 要求 user/assistant 严格交替
 */
export function toClaudeMessages(messages: ChatMessage[]): {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
} {
  // 提取 system 消息
  const systemParts: string[] = [];
  const conversationMessages: ChatMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      // system 消息在对话开始前 → 归入 system prompt
      if (conversationMessages.length === 0) {
        systemParts.push(msg.content);
      } else {
        // 对话中间的 system 消息转为 user
        conversationMessages.push({ ...msg, role: "user" });
      }
    } else {
      conversationMessages.push(msg);
    }
  }

  // 合并连续相同角色
  const merged: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const msg of conversationMessages) {
    const role = msg.role === "system" ? "user" : msg.role;
    const content = msg.name
      ? `${msg.name}: ${msg.content}`
      : msg.content;

    if (merged.length > 0 && merged[merged.length - 1].role === role) {
      merged[merged.length - 1].content += "\n\n" + content;
    } else {
      merged.push({ role, content });
    }
  }

  // 确保第一条消息是 user
  if (merged.length === 0 || merged[0].role !== "user") {
    merged.unshift({ role: "user", content: "Let's get started." });
  }

  return {
    system: systemParts.join("\n\n"),
    messages: merged,
  };
}

/**
 * 为 Google Gemini API 转换消息
 * Gemini 使用 user/model 角色
 */
export function toGeminiMessages(messages: ChatMessage[]): {
  systemInstruction: string;
  contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>;
} {
  const systemParts: string[] = [];
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      if (contents.length === 0) {
        systemParts.push(msg.content);
      } else {
        // 中间的 system 转为 user
        const role = "user";
        const text = msg.content;
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts.push({ text });
        } else {
          contents.push({ role, parts: [{ text }] });
        }
      }
    } else {
      const role = msg.role === "assistant" ? "model" : "user";
      const text = msg.name
        ? `${msg.name}: ${msg.content}`
        : msg.content;

      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts.push({ text });
      } else {
        contents.push({ role, parts: [{ text }] });
      }
    }
  }

  return {
    systemInstruction: systemParts.join("\n\n"),
    contents,
  };
}
