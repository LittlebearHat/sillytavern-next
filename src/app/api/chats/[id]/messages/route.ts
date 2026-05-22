import { auth } from "@/lib/auth";
import { chatService } from "@/lib/services/chat-service";
import { NextResponse } from "next/server";

// GET - 获取聊天的所有消息
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId } = await props.params;
    const chat = await chatService.getById(chatId, session.user.id);
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json(chat.messages);
  } catch (error) {
    console.error("[Messages GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId } = await props.params;
    const body = await req.json();

    const result = await chatService.addMessage(chatId, session.user.id, {
      name: body.name,
      isUser: body.isUser,
      content: body.content,
      role: body.role,
      extra: body.extra,
      isSystem: body.isSystem,
      forceAvatar: body.forceAvatar,
      originalAvatar: body.originalAvatar,
      genStarted: body.genStarted,
      genFinished: body.genFinished,
    });

    if (!result) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[Messages POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
