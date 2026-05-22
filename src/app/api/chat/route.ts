import { streamText } from "ai";
import { auth } from "@/lib/auth";
import { getLanguageModel, getSecretKeyForProvider } from "@/lib/ai/providers";
import { secretsService } from "@/lib/services/secrets-service";
import { worldInfoService } from "@/lib/services/worldinfo-service";
import { getWorldInfoPrompt } from "@/lib/worldinfo/engine";
import { z } from "zod";
import type { AIProvider, WorldInfoEntry, WorldInfoSettings } from "@/types";

const ALL_PROVIDERS = [
  "openai", "anthropic", "google", "openrouter", "mistral",
  "cohere", "groq", "deepseek", "xai", "perplexity",
  "fireworks", "moonshot", "siliconflow", "minimax", "custom",
  "zai", "ollama", "koboldcpp", "llamacpp", "vllm",
  "aphrodite", "ooba", "generic", "togetherai", "infermaticai",
  "mancer", "dreamgen", "featherless", "nanogpt", "electronhub",
  "chutes", "pollinations", "aimlapi", "cometapi", "ai21",
] as const;

const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    })
  ),
  provider: z.enum(ALL_PROVIDERS).default("openai"),
  model: z.string().default("gpt-4o"),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(200000).optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  stopSequences: z.array(z.string()).optional(),
  systemPrompt: z.string().optional(),
  // 世界书集成
  worldInfo: z
    .object({
      globalBookIds: z.array(z.string()).optional(),
      characterBookId: z.string().optional(),
      chatBookIds: z.array(z.string()).optional(),
      settings: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  // 自定义 API 配置
  customBaseURL: z.string().optional(),
  customApiKey: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      messages, provider, model, temperature, maxTokens,
      topP, frequencyPenalty, presencePenalty, stopSequences,
      systemPrompt, worldInfo, customBaseURL, customApiKey,
    } = parsed.data;

    // ============================================================
    // World Info 集成
    // ============================================================
    let finalSystemPrompt = systemPrompt;
    let finalMessages = messages;
    if (worldInfo) {
      try {
        const userId = session.user.id;
        const collectEntries = async (id?: string) => {
          if (!id) return [] as WorldInfoEntry[];
          const book = await worldInfoService.getById(id, userId);
          if (!book) return [];
          return Object.values(book.entries) as WorldInfoEntry[];
        };
        const globalEntries: WorldInfoEntry[] = [];
        for (const gid of worldInfo.globalBookIds ?? []) {
          globalEntries.push(...(await collectEntries(gid)));
        }
        const characterEntries = await collectEntries(worldInfo.characterBookId);
        const chatEntries: WorldInfoEntry[] = [];
        for (const cid of worldInfo.chatBookIds ?? []) {
          chatEntries.push(...(await collectEntries(cid)));
        }

        const chatTexts = messages.map((m) => `${m.role}: ${m.content}`);
        const wi = getWorldInfoPrompt({
          chat: chatTexts,
          settings: worldInfo.settings as Partial<WorldInfoSettings> | undefined,
          sources: { global: globalEntries, character: characterEntries, chat: chatEntries },
        });

        // 拼接到 systemPrompt
        const parts: string[] = [];
        if (wi.worldInfoBefore) parts.push(wi.worldInfoBefore);
        if (finalSystemPrompt) parts.push(finalSystemPrompt);
        if (wi.worldInfoAfter) parts.push(wi.worldInfoAfter);
        if (wi.anBefore.length) parts.push(wi.anBefore.join("\n"));
        if (wi.anAfter.length) parts.push(wi.anAfter.join("\n"));
        if (wi.emTop.length) parts.push(wi.emTop.join("\n"));
        if (wi.emBottom.length) parts.push(wi.emBottom.join("\n"));
        finalSystemPrompt = parts.filter(Boolean).join("\n\n") || undefined;

        // atDepth 词条按 depth 插入 messages
        if (wi.worldInfoDepth.length > 0) {
          finalMessages = [...messages];
          // depth=0 代表最后一条；depth=N 表示倒数第 N 位之前
          const sorted = [...wi.worldInfoDepth].sort((a, b) => a.depth - b.depth);
          for (const item of sorted) {
            const role: "system" | "user" | "assistant" =
              item.role === 1 ? "user" : item.role === 2 ? "assistant" : "system";
            const idx = Math.max(0, finalMessages.length - item.depth);
            finalMessages.splice(idx, 0, { role, content: item.content });
          }
        }
      } catch (e) {
        console.error("[Chat API] World Info 集成失败", e);
      }
    }

    // 获取 API 密钥
    let apiKey: string | undefined = customApiKey;
    if (!apiKey) {
      const secretKey = getSecretKeyForProvider(provider as AIProvider);
      apiKey = (await secretsService.getSecret(session.user.id, secretKey)) ?? undefined;
      if (!apiKey) {
        // 回退: 尝试环境变量
        const envKey = `${provider.toUpperCase()}_API_KEY`;
        apiKey = process.env[envKey] ?? undefined;
      }
    }

    // 本地提供商不需要密钥
    const localProviders = ["ollama", "koboldcpp", "llamacpp", "vllm", "aphrodite", "ooba"];
    if (!apiKey && !localProviders.includes(provider)) {
      return Response.json(
        { error: `No API key configured for provider: ${provider}` },
        { status: 400 }
      );
    }

    const languageModel = getLanguageModel(provider as AIProvider, model, {
      apiKey: apiKey || "dummy",
      baseURL: customBaseURL,
    });

    const result = streamText({
      model: languageModel,
      messages: finalMessages,
      temperature,
      maxOutputTokens: maxTokens,
      topP,
      frequencyPenalty,
      presencePenalty,
      stopSequences,
      system: finalSystemPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[Chat API Error]", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
