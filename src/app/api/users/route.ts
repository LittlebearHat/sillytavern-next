import { auth } from "@/lib/auth";
import { userService, createUserSchema, updateUserSchema } from "@/lib/services/user-service";
import { NextRequest } from "next/server";

// GET /api/users - 获取用户列表 (仅管理员)
export async function GET() {
  const session = await auth();
  if (!session?.user || !(session.user as any).admin) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const users = await userService.getAll();
  return Response.json(users);
}

// POST /api/users - 创建用户 (仅管理员)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !(session.user as any).admin) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const user = await userService.create(parsed.data);
    return Response.json(user, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create user";
    return Response.json({ error: message }, { status: 409 });
  }
}
