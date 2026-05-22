import { auth } from "@/lib/auth";
import { chatService } from "@/lib/services/chat-service";
import { NextResponse } from "next/server";

/**
 * POST /api/chats/[id]/branch
 * 从某条消息开始创建分支聊天，复制截止 messageId 的所有消息（含本身）。
 * body: { messageId: string }
 */
export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId } = await props.params;
    const body = await req.json().catch(() => ({}));
    const messageId = typeof body?.messageId === "string" ? body.messageId : "";
    if (!messageId) {
      return NextResponse.json({ error: "messageId required" }, { status: 400 });
    }

    const branched = await chatService.branch(chatId, messageId, session.user.id);
    if (!branched) {
      return NextResponse.json({ error: "Branch failed" }, { status: 404 });
    }
    return NextResponse.json(branched, { status: 201 });
  } catch (error) {
    console.error("[Chat Branch]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
