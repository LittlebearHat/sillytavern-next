# Changelog

本项目所有显著变更将记录于此文件。

格式遵循 [Keep a Changelog 1.1.0](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

> ### 升级安全约定
>
> - **Breaking Change** 必须在版本节点显式标注 `### ⚠️ Breaking Changes`，并给出迁移步骤
> - 新增 schema 字段优先使用「带默认值的可空列」，避免破坏旧数据
> - 涉及数据迁移脚本时，需在 `### Migration Notes` 写明回滚指引

## [Unreleased]

### Added

- `docker-entrypoint.sh` 启动时在执行迁移前自动备份数据库到 `/app/data/backups/`，文件命名 `sillytavern.db.bak.<YYYYMMDD-HHMMSS>`，默认保留最近 5 份
- `scripts/start.ts`（即 `npm run setup`）同步加入备份逻辑，本地开发升级时同样享受迁移前自动备份保护
- 新增本文件 `CHANGELOG.md`，集中记录所有 release 变更与升级注意事项
- README 新增「🔄 升级指南」章节，说明 Docker / 本地开发两种场景下的升级与回滚流程

### Changed

- 迁移失败时（`npm run setup` 与容器 entrypoint）会输出明确的 `cp` 回滚命令，指向最近一份自动备份
- 备份会同时复制 `.db-wal` / `.db-shm` 辅助文件，避免 WAL 模式下漏掉未 checkpoint 的事务

## [0.1.0] - 2026-05-13

### Added

- 项目首次开源发布，采用 AGPL-3.0 协议
- 角色卡：兼容 TavernCard V2/V3 规范，支持 PNG/JSON 双向导入导出
- 群聊：多角色轮换生成 / @点名启动 / Swipe 多版本 / 分支与检查点
- Persona：用户身份切换、`{{user}}` `{{char}}` 等宏变量替换
- 世界书：全局 / 角色级 / 聊天级三级联动，深度词条扫描
- 高级格式化：Context / Instruct / SysPrompt 模板可视化编辑
- 多 AI Provider：OpenAI、Anthropic、Google、OpenRouter、Ollama 等 35+
- Author's Note：作者注释自动注入提示词
- Docker 一键部署：自动迁移 + 创建默认管理员（admin/admin，首次登录后请立即修改）
- 数据自治：SQLite 单文件存储，便于备份迁移
