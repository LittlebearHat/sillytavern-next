import { auth } from "@/lib/auth";
import { secretsService } from "@/lib/services/secrets-service";
import { NextRequest, NextResponse } from "next/server";

/** GET: 获取已配置的密钥列表 (不返回值)
 * ?key=xxx 查询单个密钥是否存在
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    const keyParam = req.nextUrl.searchParams.get("key");

    if (keyParam) {
      // Check if a specific key exists
      const value = await secretsService.getSecret(userId, keyParam);
      return NextResponse.json({ exists: !!value });
    }

    const keys = await secretsService.listKeys(userId);
    return NextResponse.json({ keys });
  } catch (error) {
    console.error("[Secrets GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST: 保存密钥 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    const body = await req.json();
    const { key, value } = body;

    if (!key || !value) {
      return NextResponse.json({ error: "key and value required" }, { status: 400 });
    }

    await secretsService.setSecret(userId, key, value);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Secrets POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE: 删除密钥 */
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "key parameter required" }, { status: 400 });
    }

    const success = await secretsService.deleteSecret(userId, key);
    if (!success) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("[Secrets DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
