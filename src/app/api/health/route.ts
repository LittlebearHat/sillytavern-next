/**
 * GET /api/health
 * 健康检查端点（供 Docker / K8s / 监控使用），无需鉴权
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ status: "ok", ts: Date.now() });
}
