import { auth } from "@/lib/auth";
import { chatService } from "@/lib/services/chat-service";
import { NextResponse } from "next/server";

/**
 * PATCH /api/chats/[id]/messages/[messageId]
 * 更新单条消息：编辑内容 / 切换 swipe / 隐藏 / 移动书签等
 *
 * body: {
 *   content?: string;
 *   swipes?: string[];
 *   swipeId?: number;
 *   swipeInfo?: SwipeInfo[];
 *   extra?: MessageExtra;
 *   isSystem?: boolean;
 *   forceAvatar?: string | null;
 *   originalAvatar?: string | null;
 *   genStarted?: string | null;
 *   genFinished?: string | null;
 *   bookmarkLink?: string | null;
 * }
 */
export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string; messageId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId, messageId } = await props.params;
    const body = await req.json();

    const result = await chatService.updateMessage(messageId, chatId, session.user.id, {
      content: body.content,
      swipes: body.swipes,
      swipeId: body.swipeId,
      swipeInfo: body.swipeInfo,
      extra: body.extra,
      isSystem: body.isSystem,
      forceAvatar: body.forceAvatar,
      originalAvatar: body.originalAvatar,
      genStarted: body.genStarted,
      genFinished: body.genFinished,
      bookmarkLink: body.bookmarkLink,
      createdAt: body.createdAt ? new Date(body.createdAt) : undefined,
    });

    if (!result) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Messages PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE /api/chats/[id]/messages/[messageId] */
export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string; messageId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId, messageId } = await props.params;
    const ok = await chatService.deleteMessage(messageId, chatId, session.user.id);
    if (!ok) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[Messages DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
