# Changelog

本项目所有显著变更将记录于此文件。

格式遵循 [Keep a Changelog 1.1.0](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

> ### 🤖 自动化维护
>
> 从 **0.1.0** 开始，本文件由 [release-please](https://github.com/googleapis/release-please) 根据 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 自动生成。
> 贡献者**无需手写** CHANGELOG，只需保证 commit 信息使用 `feat:` `fix:` `feat!:` `BREAKING CHANGE:` 等规范前缀。
>
> ### 升级安全约定
>
> - **Breaking Change** 必须使用 `feat!:` / `fix!:` 或在 commit body 写 `BREAKING CHANGE:`，release-please 会自动生成 `### ⚠️ BREAKING CHANGES` 小节
> - 新增 schema 字段优先使用「带默认值的可空列」，避免破坏旧数据
> - 涉及数据迁移脚本时，需在 PR 描述中写明回滚指引

## [0.2.1](https://github.com/LittlebearHat/sillytavern-next/compare/v0.2.0...v0.2.1) (2026-05-22)


### 📝 文档 (Documentation)

* 新增repo wiki ([2315ef2](https://github.com/LittlebearHat/sillytavern-next/commit/2315ef2d013ad8a5888b96ac64b3fc5a118fe0be))

## [0.2.0](https://github.com/LittlebearHat/sillytavern-next/compare/v0.1.0...v0.2.0) (2026-05-22)


### ✨ 新增 (Features)

* 新增数据库备份 ([e0e8b5a](https://github.com/LittlebearHat/sillytavern-next/commit/e0e8b5a09333cc284bbe606c69bf73c08c88c500))
* 项目初始化 ([3a95f34](https://github.com/LittlebearHat/sillytavern-next/commit/3a95f347bb42fa1331203f5dcd089d11f21308ba))


### 📝 文档 (Documentation)

* action接管changelog ([6c16e63](https://github.com/LittlebearHat/sillytavern-next/commit/6c16e63c3ce212373f56666ffe4f45660fdcc42f))

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

### 运维 / 发布机制

- `docker-entrypoint.sh` 与 `npm run setup` 在迁移前自动备份数据库到 `data/backups/`，保留最近 5 份，迁移失败时输出 `cp` 回滚命令
- 备份同时复制 `.db-wal` / `.db-shm`，避免 WAL 模式下漏掉未 checkpoint 的事务
- 接入 release-please，后续版本号与 CHANGELOG 根据 Conventional Commits 自动生成
