import { auth } from "@/lib/auth";
import { worldInfoService } from "@/lib/services/worldinfo-service";
import { NextRequest } from "next/server";

/** 导入 lorebook JSON。支持 multipart 文件或 JSON body { name?, json } */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const contentType = req.headers.get("content-type") || "";
  let json: unknown;
  let fileName: string | undefined;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "file required" }, { status: 400 });
    }
    fileName = file.name;
    const text = await file.text();
    try {
      json = JSON.parse(text);
    } catch {
      return Response.json({ error: "invalid JSON file" }, { status: 400 });
    }
  } else {
    const body = await req.json();
    json = (body as { json?: unknown })?.json ?? body;
    fileName = (body as { name?: string })?.name;
  }

  try {
    const item = await worldInfoService.importFromJson(userId, json, fileName);
    return Response.json(item, { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
