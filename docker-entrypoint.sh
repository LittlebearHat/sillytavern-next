#!/bin/sh
# ============================================================
# SillyTavern Next 容器启动脚本
# 1. 如果数据库已存在，迁移前自动备份（保留最近 5 份）
# 2. 自动执行数据库迁移
# 3. 自动创建默认管理员账号（幂等）
# 4. 启动 Next.js standalone 服务器
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

# ====== 迁移前自动备份 ======
DB_PATH="${DATABASE_URL:-/app/data/sillytavern.db}"
BACKUP_DIR="/app/data/backups"
KEEP_BACKUPS=5

if [ -f "$DB_PATH" ]; then
  mkdir -p "$BACKUP_DIR"
  TS=$(date +%Y%m%d-%H%M%S)
  BACKUP_FILE="$BACKUP_DIR/sillytavern.db.bak.$TS"
  echo "[entrypoint] 创建启动前备份: $BACKUP_FILE"
  # 用 sqlite3 .backup 命令最安全（在线备份，能处理 WAL）；
  # 没装 sqlite3 时退回到 cp（WAL 文件会一并 checkpoint）。
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'" || cp "$DB_PATH" "$BACKUP_FILE"
  else
    cp "$DB_PATH" "$BACKUP_FILE"
  fi
  # 仅保留最近 N 份备份
  ls -1t "$BACKUP_DIR"/sillytavern.db.bak.* 2>/dev/null \
    | tail -n +$((KEEP_BACKUPS + 1)) \
    | xargs -I {} rm -f "{}" 2>/dev/null || true
  echo "[entrypoint] 备份完成（保留最近 $KEEP_BACKUPS 份）"
else
  echo "[entrypoint] 首次启动，无需备份"
fi

# ====== 迁移 + 种子数据（幂等）======
echo "[entrypoint] 执行初始化（迁移 + 种子数据）..."
npx tsx /app/scripts/start.ts || {
  echo ""
  echo "[entrypoint][ERROR] 初始化失败！"
  if [ -f "$DB_PATH" ] && [ -d "$BACKUP_DIR" ]; then
    LATEST_BAK=$(ls -1t "$BACKUP_DIR"/sillytavern.db.bak.* 2>/dev/null | head -1)
    if [ -n "$LATEST_BAK" ]; then
      echo "[entrypoint][ERROR] 如需回滚，请执行："
      echo "[entrypoint][ERROR]   docker compose down"
      echo "[entrypoint][ERROR]   cp $LATEST_BAK $DB_PATH"
      echo "[entrypoint][ERROR]   docker compose up -d"
    fi
  fi
  exit 1
}

echo "[entrypoint] 启动 Next.js 服务器..."
exec "$@"
