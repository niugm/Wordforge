# 08 · 路线图

## 8.1 版本节奏

| 版本 | 目标 | 估时 | 状态 |
|---|---|---|---|
| v0.0.0 | 文档 + git 骨架 | 0.5 d | ✅ 当前 |
| v0.0.1 | Tauri+React 脚手架可启动 | 0.5 d | ⏳ |
| v0.0.2 | DB schema + 基础 CRUD | 1 d | |
| v0.0.3 | 编辑器 + 自动保存 | 1 d | |
| v0.0.4 | 字数统计 + Dashboard | 0.5 d | |
| v0.0.5 | AI 精修 + 章节校审 | 1.5 d | |
| v0.0.6 | 批注 + 全文检索 | 1 d | |
| v0.0.7 | 设置 / 导出 / 备份 | 0.5 d | |
| v0.0.8 | GitHub Actions CI/CD | 0.5 d | |
| v0.0.9 | 端到端打磨 + 修 bug | 1 d | |
| **v0.1.0** | 首个公开发布 | 0 | 🎯 |

> 总计约 8 人日。实际进度依赖工具链与外部 API 调试。

## 8.2 阶段对应实现 Phase（详见 plan）

| Roadmap 版本 | Plan Phase | 主提交信息 |
|---|---|---|
| v0.0.0 | Phase 0 | `chore: bootstrap repo with docs` |
| v0.0.1 | Phase 1 | `feat(scaffold): tauri+react+tailwind+shadcn baseline` |
| v0.0.2 | Phase 2 + 3 | `feat(db): sqlite schema + repositories` / `feat(core): crud` |
| v0.0.3 | Phase 4 | `feat(editor): tiptap with annotations & autosave` |
| v0.0.4 | Phase 5 | `feat(dashboard): word count + writing analytics` |
| v0.0.5 | Phase 6 | `feat(ai): provider adapters + polish + review` |
| v0.0.6 | Phase 7 | `feat(annotations): inline marks + sidebar` |
| v0.0.7 | Phase 8 | `feat(settings): theme/export/backup` |
| v0.0.8 | Phase 9 | `ci: github actions for lint + multi-os release` |
| v0.0.9 + v0.1.0 | Phase 10 | `chore: release v0.1.0` |

## 8.3 v0.2 候选

- 云同步（用户自带 WebDAV / iCloud）
- 自定义主密码加密 vault
- 插件系统（轻量 sandbox：用 QuickJS / Wasm）
- 协同（Yjs + WebSocket，可选）
- Linux 包（社区贡献）
- 移动端（Tauri Mobile，alpha 阶段视情况而定）

## 8.4 风险登记

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| Tauri 2 plugin-stronghold 在 Windows 编译困难 | 中 | 中 | 备选：keyring crate（OS Credential Manager） |
| TipTap 中文 IME 异常 | 中 | 高 | 监听 compositionstart/end，期间不触发 onUpdate |
| AI provider 接口频繁变动 | 中 | 中 | 抽象 LlmProvider trait，单测覆盖 |
| 代码签名证书缺失 | 高 | 中 | 首版不签名，发布时附加用户白名单说明 |
| SQLite 大文件性能 | 低 | 中 | FTS5 + 分页 + 索引；50 万字以下基本无忧 |
| GitHub Actions 配额 | 低 | 低 | macOS runner 较慢，必要时切到 self-hosted |
