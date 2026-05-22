#!/bin/sh
# ============================================================
# SillyTavern Next 容器启动脚本
# 1. 自动执行数据库迁移
# 2. 自动创建默认管理员账号（幂等）
# 3. 启动 Next.js standalone 服务器
# ============================================================
set -e

echo "==========================================="
echo "  SillyTavern Next - Container Bootstrap"
echo "==========================================="

# 检查必填环境变量
if [ -z "$AUTH_SECRET" ]; then
  echo "[ERROR] AUTH_SECRET 未设置！请在 docker-compose.yml 或 .env 文件中配置。"
  echo "[ERROR] 生成方式: openssl rand -hex 32"
  exit 1
fi

# 确保数据目录存在
mkdir -p /app/data

# 运行迁移 + seed（幂等）
echo "[entrypoint] 执行初始化（迁移 + 种子数据）..."
npx tsx /app/scripts/start.ts || {
  echo "[entrypoint] 初始化失败，请检查日志"
  exit 1
}

echo "[entrypoint] 启动 Next.js 服务器..."
exec "$@"
