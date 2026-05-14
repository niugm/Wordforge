# 11 · 当前交接说明

> 更新时间：2026-05-15（已校准路线图状态，AI 功能调为高优先）

## 当前分支状态

- 分支：`main`
- 远端状态：`main...origin/main`（本地与远端同步）
- `95d3e8f feat: add AI settings and project export` 已提交。
- `4d04b91 feat: improve export discovery` 已提交。
- `8be6e2a feat: enable automatic database backups` 已提交。
- `8a933fd feat: add chapter copy and export` 已提交。
- `5bda4d9 feat: add chapter body search` 已提交。
- `c7a79ca feat: show paragraph words and grouped search` 已提交。
- `6f4b31c fix: update scope word count on selection` 已提交。
- `14a86a3 style: polish workspace shell` 已提交。
- `style: refine chapter tree` 已提交。
- `style: polish search and command surfaces` 已提交。
- `style: polish settings dialog` 已提交。
- `style: refine settings option cards` 已提交。
- `feat: choose project export directory` 已提交。
- 当前工作树干净。

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
- 导出页已接入系统目录选择器，可指定导出目录；未选择时仍使用应用数据目录下 `wordforge/exports`。
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

### UI 精修阶段 1

- 新增 `IconLabel` 小组件统一 icon + text 呈现。
- 左侧栏 Tab、右侧栏 Tab、Footer 字数区、TitleBar 面包屑接入 lucide 语义图标。
- TitleBar 分隔符弱化，Footer 字数信息改为图标化显示。

### UI 精修阶段 2

- ChapterTree 顶部标题接入 `BookOpen` 图标与轻量分隔线。
- 章节节点按层级状态区分图标：父章节关闭为 `Folder`，展开为 `FolderOpen`，叶子章节为 `FileText`。
- 章节树选中态改为更柔和的圆角背景与轻微阴影，hover/focus 状态更细。
- 拖拽手柄改为 hover 渐显，当前章节保留弱可见提示。
- 草稿 / 修订中 / 已完成状态点降低饱和度，并增加背景 ring，视觉上更稳。

### UI 精修阶段 3

- CommandPalette 命令项改为图标徽块 + 主副文本结构，导航 / 操作 / 章节 / 角色 / 大纲使用不同语义色。
- CommandPalette 最近使用项增加历史徽块和原命令小图标，空状态接入搜索图标。
- SearchDialog 结果区增加更稳的空状态 / 加载态，正文搜索时显示旋转加载图标。
- SearchDialog 分组标题接入图标和计数胶囊。
- SearchDialog 结果项改为带边框的语义色图标徽块，匹配类型标签复用同一套语义色。

### UI 精修阶段 4

- SettingsDialog 顶部 Tab 改为五列布局，并统一接入 `IconLabel`。
- 外观 / AI / 备份 / 导出 / 字数页的分组标题统一为 `SectionHeading`，带语义图标徽块和说明文字。
- 本阶段只改呈现层，不改变设置保存、备份、导出、AI 密钥相关业务逻辑。

### UI 精修阶段 5

- SettingsDialog AI provider 卡片增加语义图标徽块，选中态改为 `primary/5` 背景与轻微阴影。
- 备份页自动备份从原生 checkbox 改为自定义开关，保留原有 `onChange` 业务逻辑。
- 新增 `SettingOptionCard`，统一导出格式、导出方式、字数计数模式的卡片结构。
- 导出 / 字数选项卡片统一为图标徽块 + 主副文本 + 选中态边框，减少局部样式重复。
- SettingsDialog 顶部描述“外观 / AI / 备份 / 导出 / 字数计数”已改为仅屏幕阅读器可见，不再占用视觉空间。

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
- `wordforge/src-tauri/capabilities/default.json`
- `wordforge/src-tauri/Cargo.toml`
- `wordforge/src-tauri/Cargo.lock`
- `wordforge/src-tauri/src/db/mod.rs`
- `wordforge/src-tauri/src/commands/mod.rs`
- `wordforge/src-tauri/src/lib.rs`
- `wordforge/src/components/shell/SettingsDialog.tsx`
- `wordforge/src/hooks/useSettings.ts`
- `wordforge/src/hooks/useChapters.ts`
- `wordforge/src/services/db.ts`
- `wordforge/src/types/db.ts`
- `wordforge/src/components/ui/icon-label.tsx`
- `wordforge/src/components/workspace/TitleBar.tsx`
- `wordforge/src/components/workspace/Footer.tsx`
- `wordforge/src/components/workspace/LeftSidebar.tsx`
- `wordforge/src/components/workspace/RightSidebar.tsx`
- `wordforge/src/components/workspace/panels/ChapterTree.tsx`
- `wordforge/src/components/shell/CommandPalette.tsx`
- `wordforge/src/components/shell/SearchDialog.tsx`
- `wordforge/src/components/shell/SettingsDialog.tsx`
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
- 导出已接入 `tauri-plugin-dialog` 做目录选择；未选择时仍写入应用数据目录。
- Docx 导出仍未实现。
- F15 CI/CD 还缺首次 GitHub Actions 实跑验证。

## 建议下一步

1. AI 功能进入高优先级：先处理 AI Key 安全存储，再实现 LLM provider 抽象与段落精修调用链路。
2. F13 后续只剩 Docx 导出，可排在 AI 主链路之后。
3. F15 CI/CD 仍需首次 GitHub Actions 实跑验证。
