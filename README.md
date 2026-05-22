# SillyTavern Next

> 基于 **Next.js 16 + TypeScript + SQLite** 重写的 SillyTavern 现代化前端，单机部署、开箱即用。

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

## ✨ 特性

- **角色卡系统**：兼容 TavernCard V2/V3 规范，支持 PNG/JSON 双向导入导出
- **群聊**：多角色轮换生成、@点名、Swipe 多版本、分支与检查点
- **Persona**：用户身份切换、宏变量替换（`{{user}}`/`{{char}}` 等）
- **世界书**：全局/角色级/聊天级三级联动，深度词条扫描
- **高级格式化**：Context / Instruct / SysPrompt 模板可视化编辑
- **多 AI 提供商**：OpenAI、Anthropic、Google、OpenRouter、本地 Ollama 等 35+
- **Author's Note**：作者注释自动注入提示词
- **数据自治**：SQLite 单文件存储，无外部依赖，便于备份迁移

## 🚀 快速开始

### 方式 1: Docker（推荐）

```bash
git clone https://github.com/<your-username>/sillytavern-next.git
cd sillytavern-next

# 1. 准备环境变量
cp .env.example .env
# 生成强随机密钥并写入 .env
echo "AUTH_SECRET=$(openssl rand -hex 32)" >> .env

# 2. 一键启动（自动构建 + 迁移 + 创建管理员）
docker compose up -d

# 3. 访问 http://localhost:3000
#    默认账号: admin / admin（首次登录后请立即修改密码）
```

### 方式 2: 本地开发

```bash
git clone https://github.com/<your-username>/sillytavern-next.git
cd sillytavern-next

# 1. 准备环境变量
cp .env.example .env.local
# 编辑 .env.local，至少设置 AUTH_SECRET

# 2. 安装依赖
npm install

# 3. 一键初始化（迁移 + 种子数据）
npm run setup

# 4. 启动开发服务器
npm run dev
```

打开 http://localhost:3000 ，默认账号 `admin/admin`。

## 🔧 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `AUTH_SECRET` | ✅ | NextAuth 签名密钥，生产环境务必使用 `openssl rand -hex 32` 生成的强随机串 |
| `AUTH_URL` | ⭕ | 站点访问 URL，默认 `http://localhost:3000` |
| `DATABASE_URL` | ⭕ | SQLite 数据库路径，默认 `./data/sillytavern.db` |
| `OPENAI_API_KEY` | ⭕ | OpenAI Key 默认值（推荐登录后在 UI 中按用户配置） |
| `ANTHROPIC_API_KEY` | ⭕ | Anthropic Key 默认值（同上） |
| `GOOGLE_GENERATIVE_AI_API_KEY` | ⭕ | Google AI Key 默认值（同上） |
| `PORT` | ⭕ | Docker 端口映射，默认 3000 |

> **API Key 存储说明**：登录用户的 API Key 优先存储于数据库 `secrets` 表（按 userId 加密隔离），环境变量只是缺失时的回退默认值。生产环境推荐让用户在 `Settings → API Connections` 中各自配置。

## 🛠 二次开发

### 目录结构

```
sillytavern-next/
├── src/
│   ├── app/                  # Next.js App Router (页面 + API 路由)
│   │   ├── api/              # 后端 API
│   │   ├── characters/       # 角色管理页
│   │   ├── chat/             # 聊天界面
│   │   └── settings/         # 设置页
│   ├── components/           # React 组件
│   │   ├── characters/       # 角色卡相关
│   │   ├── chat/             # 聊天 UI
│   │   ├── settings/         # 设置面板
│   │   └── ui/               # 基础 UI (shadcn 风格)
│   ├── hooks/                # 自定义 Hook
│   ├── lib/
│   │   ├── ai/               # AI Provider 适配
│   │   ├── auth.ts           # NextAuth 认证
│   │   ├── constants/        # 全局常量
│   │   ├── db/               # 数据库 schema + migration
│   │   ├── formatting/       # Prompt 格式化引擎
│   │   ├── parsers/          # 角色卡解析器
│   │   ├── services/         # 业务服务层
│   │   └── worldinfo/        # 世界书引擎
│   ├── stores/               # Zustand 全局状态
│   └── types/                # 共享 TypeScript 类型
├── drizzle/                  # 数据库迁移文件
├── scripts/                  # 工具脚本（seed、setup）
└── public/                   # 静态资源
```

### 技术栈

| 层 | 选型 |
|----|------|
| **框架** | Next.js 16 (App Router) + React 19 |
| **语言** | TypeScript 5 |
| **样式** | Tailwind CSS 4 |
| **状态** | Zustand 5 |
| **数据库** | SQLite (better-sqlite3) + Drizzle ORM |
| **认证** | NextAuth v5 (Credentials Provider) |
| **AI SDK** | Vercel AI SDK + 多 Provider 适配器 |
| **校验** | Zod 4 |

### 常用命令

```bash
npm run dev              # 启动开发服务器
npm run build            # 生产构建
npm run start            # 启动生产服务器（需先 build）
npm run setup            # 一键初始化（迁移 + seed）
npm run start:fresh      # 清空数据库后重新初始化
npm run db:generate      # 根据 schema 生成新迁移文件
npm run db:migrate       # 应用迁移
npm run db:seed          # 仅创建默认管理员
npm run lint             # ESLint 检查
npm run typecheck        # TypeScript 类型检查
```

### 添加新 AI Provider

1. 在 `src/lib/ai/providers.ts` 中注册 Provider
2. 在 `src/lib/constants/providers-registry.ts` 添加元信息
3. 在 `src/lib/services/secrets-service.ts` 的 `SECRET_KEYS` 中添加 Key 名

### 添加新数据表

1. 在 `src/lib/db/schema.ts` 中定义表
2. 运行 `npm run db:generate` 生成迁移
3. 运行 `npm run db:migrate` 应用迁移

## 📦 部署注意事项

- **不要用 Vercel/Netlify 等 Serverless 平台**：本项目依赖 SQLite 本地文件，需要长期运行的容器
- **数据卷必须挂载**：Docker 部署务必保留 `./data:/app/data` 卷映射
- **生产环境务必修改默认密码**：首次登录后在 Settings 中修改
- **AUTH_SECRET 必须强随机**：用 `openssl rand -hex 32` 生成
- **反向代理建议**：生产环境前置 Nginx/Caddy 提供 HTTPS

## 🤝 贡献

欢迎提 Issue 和 PR！请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 📜 License

本项目采用 **GNU Affero General Public License v3.0** 协议。

这是一个 **强 copyleft** 协议，关键条款：
- ✅ 你可以自由使用、修改、商用
- ⚠️ 衍生作品必须以 AGPL-3.0 开源
- ⚠️ **通过网络提供服务**也算分发，必须公开源码

完整协议见 [LICENSE](./LICENSE)。

## 🙏 致谢

- 灵感与功能对齐自 [SillyTavern](https://github.com/SillyTavern/SillyTavern)
- UI 组件基于 [shadcn/ui](https://ui.shadcn.com/) 思路
- AI SDK 基于 [Vercel AI SDK](https://sdk.vercel.ai/)
