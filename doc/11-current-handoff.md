# 11 · 当前交接说明

> 更新时间：2026-05-14 22:50（`95d3e8f`、`4d04b91`、`8be6e2a`、`8a933fd`、`5bda4d9` 已提交；之后继续补了 F8 本段字数与 F10 分类展示）

## 当前分支状态

- 分支：`main`
- 远端状态：`main...origin/main [ahead 2]`
- `95d3e8f feat: add AI settings and project export` 已提交。
- `4d04b91 feat: improve export discovery` 已提交。
- `8be6e2a feat: enable automatic database backups` 已提交。
- `8a933fd feat: add chapter copy and export` 已提交。
- `5bda4d9 feat: add chapter body search` 已提交。
- 当前工作树包含 F8 本段字数与 F10 分类展示的未提交改动。

## 本轮已完成

### F12 设置完善

- SettingsDialog 新增 AI 配置页。
- 支持 OpenAI 兼容 / Anthropic / Gemini。
- 可保存 API Key、Base URL、模型。
- 前端只显示 `hasApiKey` 状态，不回显明文密钥。
- Rust IPC：
  - `list_ai_credentials`
  - `save_ai_credential`
  - `delete_ai_credential`

### F13 基础导出

- SettingsDialog 新增导出页。
- Rust 新增 `db::exports` 与 `commands::exports`。
- 支持当前作品导出：
  - Markdown 合并单文件
  - Markdown 按章拆分
  - Plain Text 合并单文件
  - Plain Text 按章拆分
- 导出目录：应用数据目录下 `wordforge/exports`。
- 导出时按章节树顺序输出，并将 TipTap JSON 转为 Markdown / 纯文本。
- 导出完成后 toast 提供“打开位置”，导出页显示最近一次导出并可打开位置。

### F14 自动备份深化

- 应用启动后后台检查自动备份。
- 若用户开启自动备份、配置备份目录，且本地时间已过 03:00，则当天最多自动备份一次。
- 每次手动/自动备份后保留最近 7 份 `wordforge-*.db`，超出删除最旧。

### F2 章节复制与单章导出

- 章节右键菜单新增“复制章节”，会复制当前章节及其子章节、正文、字数与状态。
- 章节右键菜单新增“导出章节”，支持 Markdown / Plain Text，导出当前章节及其子章节树。

### F10 正文检索

- 新增 Rust `db::search` / `commands::search`，通过 SQLite FTS5 检索章节正文。
- SearchDialog 合并章节标题/摘要、角色、大纲和正文命中结果。
- 章节保存时将 TipTap JSON 提取为纯文本写入 `chapters_fts`。
- SearchDialog 结果按章节 / 正文 / 角色 / 大纲分组。

### F8 本段 / 选中字数

- Footer 新增“本段 / 选中字数”。
- 编辑器输入、移动光标或改变选区时，按当前字数计数模式统计光标所在段落或选中文本。

### 章节缓存同步修复

- 修复右键修改章节状态后，编辑区顶部状态徽标不实时同步的问题。
- `useSetChapterStatus` 现在同时更新：
  - `["chapters", projectId]`
  - `["chapter", id]`
- 失败时会回滚缓存。
- 同步补齐同类缓存：
  - 重命名章节同步编辑区标题。
  - 移动章节同步单章详情。
  - 删除章节清理单章详情与章节内容缓存。

## 主要改动文件

- `wordforge/src-tauri/src/db/settings.rs`
- `wordforge/src-tauri/src/commands/settings.rs`
- `wordforge/src-tauri/src/db/exports.rs`
- `wordforge/src-tauri/src/commands/exports.rs`
- `wordforge/src-tauri/src/db/mod.rs`
- `wordforge/src-tauri/src/commands/mod.rs`
- `wordforge/src-tauri/src/lib.rs`
- `wordforge/src/components/shell/SettingsDialog.tsx`
- `wordforge/src/hooks/useSettings.ts`
- `wordforge/src/hooks/useChapters.ts`
- `wordforge/src/services/db.ts`
- `wordforge/src/types/db.ts`
- `doc/07-features.md`
- `doc/08-roadmap.md`

## 已验证

- `pnpm build` 通过。
- `pnpm lint` 通过，但仍有既有 shadcn Fast Refresh warning：
  - `src/components/ui/badge.tsx`
  - `src/components/ui/button.tsx`
  - `src/components/ui/tabs.tsx`
- `cargo check` 通过。
- `cargo clippy --all-targets -- -D warnings` 通过。
- `pnpm tauri dev` 已成功启动，Vite `http://localhost:1420` 返回 200。

## 注意事项

- AI Key 当前只是写入 `ai_credentials.ciphertext`，尚未接入 Stronghold/keyring 真加密；这是下一阶段 AI 调用前需要处理的安全债。
- 导出目前不走系统文件选择器，先写入应用数据目录；后续可接入 dialog/fs 插件。
- Docx 导出仍未实现。
- F15 CI/CD 还缺首次 GitHub Actions 实跑验证。

## 建议下一步

1. 提交当前 F8/F10 增强改动，建议提交信息：`feat: show paragraph words and grouped search`
2. 接着优先补 F15 Actions 实跑问题，或者做 F13 导出深化（文件选择器 / Docx）。
3. 如果继续 AI 方向，先处理密钥存储安全，再做 F6 段落精修。
