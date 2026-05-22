import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { UserConnectionConfig } from "@/types/api-connections";

const DEFAULT_SETTINGS: UserConnectionConfig = {
  activeCategory: "chat_completion",
  activeProviders: { chat_completion: "openai" },
  selectedModels: {},
  baseUrls: {},
  autoConnect: false,
  reverseProxies: [],
  activeProxy: {},
};

/**
 * GET /api/settings - 获取用户连接配置
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    const result = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, userId))
      .limit(1);

    if (result.length === 0) {
      return Response.json(DEFAULT_SETTINGS);
    }

    try {
      const data = JSON.parse(result[0].data) as UserConnectionConfig;
      return Response.json({ ...DEFAULT_SETTINGS, ...data });
    } catch {
      return Response.json(DEFAULT_SETTINGS);
    }
  } catch (error) {
    console.error("[Settings GET Error]", error);
    return Response.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

/**
 * PUT /api/settings - 保存用户连接配置
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    const body = (await req.json()) as Partial<UserConnectionConfig>;

    // 获取已有设置
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, userId))
      .limit(1);

    let currentData = DEFAULT_SETTINGS;
    if (existing.length > 0) {
      try {
        currentData = { ...DEFAULT_SETTINGS, ...JSON.parse(existing[0].data) };
      } catch {
        // ignore parse error
      }
    }

    // 合并新数据
    const merged: UserConnectionConfig = {
      ...currentData,
      ...body,
    };

    const jsonData = JSON.stringify(merged);

    if (existing.length > 0) {
      await db
        .update(settings)
        .set({ data: jsonData, updatedAt: new Date() })
        .where(eq(settings.userId, userId));
    } else {
      await db.insert(settings).values({
        id: randomUUID(),
        userId,
        data: jsonData,
        updatedAt: new Date(),
      });
    }

    return Response.json(merged);
  } catch (error) {
    console.error("[Settings PUT Error]", error);
    return Response.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
