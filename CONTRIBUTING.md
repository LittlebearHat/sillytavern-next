# 贡献指南

感谢你对 SillyTavern Next 的关注！本文档说明如何参与贡献。

## 提交 Issue

提 Issue 前请先：
1. 搜索是否已有相同问题
2. 提供足够的复现信息：
   - 环境（OS、Node 版本、浏览器）
   - 操作步骤
   - 期望行为 vs 实际行为
   - 错误日志（控制台 + 服务端）

## 提交 Pull Request

### 工作流

```bash
# 1. Fork 并 clone
git clone https://github.com/<your-username>/sillytavern-next.git
cd sillytavern-next

# 2. 创建分支
git checkout -b feat/your-feature

# 3. 开发 + 验证
npm install
npm run setup       # 初始化数据库
npm run dev
npm run typecheck   # 类型检查
npm run lint        # ESLint

# 4. 提交
git commit -m "feat: 你的功能描述"

# 5. 推送并发起 PR
git push origin feat/your-feature
```

### 分支命名规范

| 前缀 | 用途 | 示例 |
|------|------|------|
| `feat/` | 新功能 | `feat/group-mention` |
| `fix/` | Bug 修复 | `fix/branch-creation-fail` |
| `refactor/` | 重构（不改外部行为） | `refactor/extract-tags-editor` |
| `docs/` | 文档变更 | `docs/update-readme` |
| `chore/` | 构建/工具 | `chore/upgrade-deps` |
| `test/` | 测试相关 | `test/add-chat-store-test` |

### Commit Message 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <subject>

<body>
```

**Type**：
- `feat` 新功能
- `fix` Bug 修复
- `refactor` 重构
- `docs` 文档
- `style` 格式（不影响代码运行）
- `perf` 性能优化
- `test` 测试
- `chore` 构建/工具

**示例**：
```
feat(chat): 添加群聊 @ 提及自动补全
fix(branch): 修复消息 ID 前后端不同步导致分支创建失败
refactor(characters): 提取 TagsEditor 为共享组件
```

### PR 检查清单

提交 PR 前请确保：

- [ ] `npm run typecheck` 无错误
- [ ] `npm run lint` 无错误
- [ ] `npm run build` 构建成功
- [ ] 新功能有简要说明（Why + How）
- [ ] 涉及 schema 变更时附带迁移文件（`npm run db:generate`）
- [ ] 涉及 UI 时附截图或录屏
- [ ] 不要把 `.env*`、`data/*.db*` 等本地文件提交

## 代码风格

### 共享组件目录约定

- `src/components/ui/` — 通用基础 UI（按钮、输入框等）
- `src/components/<feature>/` — 按功能模块分组（如 `characters/`、`chat/`）
- 仅在两个或多个页面引用时才提取为共享组件
- 大组件（>200 行）拆分为独立文件

### TypeScript 规范

- 优先使用 `interface` 描述对象类型，`type` 用于联合/工具类型
- 共享类型放在 `src/types/index.ts`
- 避免 `any` 和 `as unknown as`，必要时优先扩展类型定义
- 异步函数必须 `await` 或显式 `void` / `.catch()` 处理

### 错误处理规范

- 关键操作（保存、同步）：`try/catch` + 用户可见的错误提示
- 非关键操作（加载建议、装饰性请求）：`.catch(console.warn)` 至少有日志
- 禁止 `.catch(() => {})` 完全吞掉异常（如必须忽略，加注释说明原因）

### Magic Number 规范

定时器、阈值、限制值等数字常量应集中在 `src/lib/constants/` 目录下。

## 开发优先级

当前关注的方向（欢迎选择参与）：

1. **测试覆盖**：核心流程（认证、消息持久化、群聊生成）的单元/集成测试
2. **chat-area.tsx 拆分**：1800 行的巨型组件需要拆为 hook + 子组件
3. **国际化**：i18n 支持（当前为中文硬编码）
4. **PWA**：离线缓存与移动端体验
5. **多模态**：图像、音频输入支持

## License

提交贡献即表示你同意将代码以 [AGPL-3.0](./LICENSE) 发布。
