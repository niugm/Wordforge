# 08 · 路线图

## 8.1 版本节奏

| 版本 | 目标 | 状态 | 主要 Commit |
|---|---|---|---|
| v0.0.0 | 文档 + git 骨架 | ✅ 完成 | `d904df2` |
| v0.0.1 | Tauri + React 脚手架可启动 | ✅ 完成 | `566a582` |
| v0.0.2 | UI 骨架 + 三栏布局 | ✅ 完成 | `4646062` |
| v0.0.3 | DB + F1 项目管理 | ✅ 完成 | `c036103` |
| v0.0.4 | F2 章节管理 + F5 编辑器 | ✅ 完成 | `e91f015` |
| v0.0.5 | F5 工具栏 + F8 字数统计 + UX 打磨 | ✅ 完成 | `b8aaaf2` `70cbcc6` `2d7417a` `48608ed` `5522175` `2fffb89` |
| v0.0.6 | F3 角色管理 + F4 大纲 | 🚧 进行中 | |
| v0.0.7 | F9 批注 + F10 全文检索 | ⏳ 待开始 | |
| v0.0.8 | F6 AI 精修 + F7 章节校审 | ⏳ 待开始 | |
| v0.0.9 | F12 设置完整 + F13 导出 + F14 备份 | 🚧 进行中 | |
| v0.0.10 | F15 CI/CD + 端到端打磨 + bug fix | ⏳ 待开始 | |
| **v0.1.0** | 首个公开发布 | 🎯 目标 | |

---

## 8.2 当前进度（截至 2026-05-14，工作树）

### 已完成

| 功能模块 | 实现细节 |
|---|---|
| **脚手架** | Tauri 2 + React 19 + Vite + TypeScript；Tailwind v4 + shadcn/ui (Radix Nova)；Zustand + TanStack Query + React Router v7 |
| **UI 骨架** | 三栏 Workspace（左侧边栏 / 编辑区 / 右侧边栏）；resizable panels（v4 API）；ThemeProvider（亮/暗/护眼）；CommandPalette / SettingsDialog / SearchDialog 框架；Workspace shell 已接入语义图标（左右 Tab、Footer 字数区、TitleBar 面包屑）；章节树、搜索弹窗、命令面板、设置弹窗完成第一轮视觉精修 |
| **数据库** | SQLite via sqlx 直连（非 plugin-sql）；ULID 主键；unix ms 时间戳；AppError 统一错误序列化；`sqlx::migrate!` 自动迁移；完整 schema（projects / chapters / characters / outlines / annotations / revisions / writing_sessions / ai_messages / settings / ai_credentials / chapters_fts） |
| **F1 项目管理** | 新建 / 重命名 / 编辑信息（简介+目标字数）/ 归档 / 删除；启动自动回跳 last_project_id；切换作品按钮；OS 窗口标题跟随项目 |
| **F2 章节管理** | 树形 CRUD；dnd-kit 同级拖拽排序；Alt+↑↓ 键盘排序；状态标记（草稿/修订中/已完成）；跨父节点移动（MoveChapterDialog）；Rust 侧禁止移动到自身/后代节点下并禁止跨作品挂载；右键菜单完整；章节状态 / 重命名 / 移动后同步章节树与编辑区详情缓存；支持复制章节树与单章节 Markdown / Plain Text 导出；章节树区分文件夹/文档图标，选中态、拖拽手柄和状态点已做轻量视觉精修 |
| **F3 角色管理** | characters 表已接入 Rust CRUD + Tauri IPC；前端 repo/hooks；左侧栏角色 Tab；角色卡支持姓名、别名、身份、头像路径、画像 Markdown、自定义属性 JSON；卡片/列表视图切换 |
| **F4 大纲管理** | outline_nodes 表已接入 Rust CRUD + Tauri IPC；前端 repo/hooks；左侧栏大纲 Tab；自由层级树；支持节点标题、Markdown 内容、状态、同级排序、跨父节点移动、删除；Rust 侧防环与跨作品校验 |
| **F5 编辑器** | TipTap v3 + StarterKit + CharacterCount + Underline + BubbleMenu；固定工具栏（H1-3/B/I/U/S/列表/引用/代码块/分割线）；选中文字浮动菜单（B/I/U/S）；500ms debounce 自动保存 + 卸载兜底；保存状态指示；TitleBar 面包屑动态；专注模式隐藏侧栏/标题栏/页脚并保留退出浮层 |
| **F8 字数统计** | writing_sessions 生命周期（mount start / unmount end / 30 秒无输入自动结束）；再次输入自动开启新 session；localtime 时区修正；Footer 实时字数 + 今日累计（含当前编辑会话增量）+ 本段/选中字数；Dashboard：今日/本周/本月/连续写作卡片 + 全书目标进度条 + 30/90/365 天热力图 + Recharts 柱状图；设置中支持字符 / 不计空白 / 中英混合计数模式 |
| **F10 基础搜索** | SearchDialog 已接入当前作品的章节标题/摘要、角色卡、大纲节点搜索；结果可跳转章节或切换左侧角色/大纲 Tab；前端结果显示命中片段并高亮关键词；章节正文接入 SQLite FTS5，保存时写入纯文本索引；结果按章节 / 正文 / 角色 / 大纲分组；分组标题、结果图标徽块、空状态与加载态已精修 |
| **F11 命令面板** | CommandPalette 已接入真实数据；支持导航命令、设置/搜索操作、章节跳转、角色/大纲 Tab 切换；最近使用置顶并持久化最近 6 个项目；命令项已改为图标徽块 + 主副文本结构，增强导航/操作/章节/角色/大纲的可扫读性 |
| **F12 设置** | SettingsDialog 已接入编辑器偏好；支持字体族、字号、行高、编辑区宽度，偏好持久化到 `wordforge-ui` 并实时应用到 TipTap 编辑器；字数计数模式持久化并应用到章节保存和会话增量；备份目录/自动备份开关写入 SQLite `settings` 表；AI Provider 配置支持 OpenAI 兼容 / Anthropic / Gemini，密钥只写不回显，前端仅显示配置状态；设置 Tab、分组标题、AI provider、备份开关、导出/字数选项卡片已完成语义图标和状态精修 |
| **F13 导出** | SettingsDialog 新增导出页；Rust 侧按章节树顺序导出当前作品；支持 Markdown / Plain Text，支持合并单文件与按章拆分；导出文件写入应用数据目录 `wordforge/exports`；导出完成后可从 toast 或导出页打开导出位置 |
| **F14 备份** | 已接入备份设置读取/保存与手动立即备份；Rust 侧复制当前 SQLite DB 到指定目录并生成 `wordforge-时间戳.db`；应用启动后若已过本地时间 03:00，当天最多自动备份一次；保留最近 7 份备份 |
| **F15 CI/CD** | 已新增 `.github/workflows/ci.yml` 与 `release.yml`；CI 在 push/PR 上执行 lint、前端 build、cargo fmt、clippy；release 在 tag `v*` 上生成 Tauri draft release（Windows + macOS universal） |
| **UX 细节** | Sonner toast 全局（所有写操作成功/错误提示）；Bundle 拆分（manualChunks：vendor-react/tiptap/recharts/dnd/ui）；标题栏面包屑分隔线垂直居中；Shell 图标语义统一 |

### 待实现（下阶段优先）

| 优先级 | 功能 | 说明 |
|---|---|---|
| P0 | F15 CI/CD | 首次 Actions 实跑验证；必要时修正 runner 依赖与产物命名 |
| P1 | F5 编辑器深化 | 场景分割节点 / 注释 mark / IME 兼容测试 |
| P1 | F3 角色关系深化 | character_relations 表已建；关系成对添加、`@姓名` 引用跳转、插入角色卡到当前段落 |
| P1 | F4 大纲深化 | 节点 ↔ 章节双向关联；大纲拖拽到章节树自动创建章节（需要新增绑定迁移） |
| P1 | F9 批注 | annotations 表已建，mark 扩展 + 右侧面板 |
| P1 | F13 导出深化 | Docx 导出与文件选择器 |
| P1 | F6 AI 精修 | 需先完成 F12 AI key 配置 |
| P1 | F7 章节校审 | 需先完成 F6 |
| P2 | F10 全文检索深化 | 优化大稿件排序与高亮 |

---

## 8.3 关键技术决策（已定，不再讨论）

| 项目 | 决策 |
|---|---|
| DB 方案 | sqlx 0.8 直连，不用 tauri-plugin-sql |
| 主键 | ULID，由 Rust 独占生成，前端不传 id |
| 时间 | unix milliseconds (i64)，std::time，不引 chrono |
| 序列化 | Rust snake_case + `#[serde(rename_all="camelCase")]`；前端全 camelCase |
| 错误 | `AppError` enum → `{ code, message }` JSON |
| 表单 | 简单表单用 useState；F3+ 复杂表单启用 RHF + zod |
| Resizable panels | react-resizable-panels v4：`orientation` 替代 `direction`，size 用字符串 `"22%"` |
| TipTap BubbleMenu | `@tiptap/react/menus` 子路径 + `@tiptap/extension-bubble-menu`（v3 拆包） |
| Toast | sonner 2.x，ThemedToaster 跟随 light/dark |
| Bundle | Vite manualChunks 拆 vendor-react/tiptap/recharts/dnd/ui |

---

## 8.4 v0.2 候选

- 云同步（用户自带 WebDAV / iCloud）
- 自定义主密码加密 vault
- 插件系统（轻量 sandbox：QuickJS / Wasm）
- 协同（Yjs + WebSocket，可选）
- Linux 包（社区贡献）
- 移动端（Tauri Mobile，alpha 阶段视情况而定）

---

## 8.5 风险登记

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| Tauri 2 plugin-stronghold 在 Windows 编译困难 | 中 | 中 | 备选：keyring crate（OS Credential Manager） |
| TipTap 中文 IME 异常 | 中 | 高 | 监听 compositionstart/end，期间不触发 onUpdate |
| AI provider 接口频繁变动 | 中 | 中 | 抽象 LlmProvider trait，单测覆盖 |
| 代码签名证书缺失 | 高 | 中 | 首版不签名，发布时附加用户白名单说明 |
| SQLite 大文件性能 | 低 | 中 | FTS5 + 分页 + 索引；50 万字以下基本无忧 |
| GitHub Actions 配额 | 低 | 低 | macOS runner 较慢，必要时切到 self-hosted |
