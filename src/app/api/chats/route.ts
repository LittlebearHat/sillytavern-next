import { auth } from "@/lib/auth";
import { chatService } from "@/lib/services/chat-service";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const characterId = searchParams.get("characterId") ?? undefined;
    const groupId = searchParams.get("groupId") ?? undefined;

    const result = await chatService.getAll(session.user.id, { characterId, groupId });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Chats GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = await chatService.create(session.user.id, {
      characterId: body.characterId,
      groupId: body.groupId,
      title: body.title,
      metadata: body.metadata,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[Chats POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
