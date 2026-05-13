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
| v0.0.6 | F3 角色管理 + F4 大纲 | ⏳ 待开始 | |
| v0.0.7 | F9 批注 + F10 全文检索 | ⏳ 待开始 | |
| v0.0.8 | F6 AI 精修 + F7 章节校审 | ⏳ 待开始 | |
| v0.0.9 | F12 设置完整 + F13 导出 + F14 备份 | ⏳ 待开始 | |
| v0.0.10 | F15 CI/CD + 端到端打磨 + bug fix | ⏳ 待开始 | |
| **v0.1.0** | 首个公开发布 | 🎯 目标 | |

---

## 8.2 当前进度（截至 2026-05-13，commit `2fffb89`）

### 已完成

| 功能模块 | 实现细节 |
|---|---|
| **脚手架** | Tauri 2 + React 19 + Vite + TypeScript；Tailwind v4 + shadcn/ui (Radix Nova)；Zustand + TanStack Query + React Router v7 |
| **UI 骨架** | 三栏 Workspace（左侧边栏 / 编辑区 / 右侧边栏）；resizable panels（v4 API）；ThemeProvider（亮/暗/护眼）；CommandPalette / SettingsDialog / SearchDialog 框架 |
| **数据库** | SQLite via sqlx 直连（非 plugin-sql）；ULID 主键；unix ms 时间戳；AppError 统一错误序列化；`sqlx::migrate!` 自动迁移；完整 schema（projects / chapters / characters / outlines / annotations / revisions / writing_sessions / ai_messages / settings / ai_credentials / chapters_fts） |
| **F1 项目管理** | 新建 / 重命名 / 编辑信息（简介+目标字数）/ 归档 / 删除；启动自动回跳 last_project_id；切换作品按钮；OS 窗口标题跟随项目 |
| **F2 章节管理** | 树形 CRUD；dnd-kit 同级拖拽排序；Alt+↑↓ 键盘排序；状态标记（草稿/修订中/已完成）；跨父节点移动（MoveChapterDialog）；右键菜单完整 |
| **F5 编辑器** | TipTap v3 + StarterKit + CharacterCount + Underline + BubbleMenu；固定工具栏（H1-3/B/I/U/S/列表/引用/代码块/分割线）；选中文字浮动菜单（B/I/U/S）；500ms debounce 自动保存 + 卸载兜底；保存状态指示；TitleBar 面包屑动态 |
| **F8 字数统计** | writing_sessions 生命周期（mount start / unmount end）；localtime 时区修正；Footer 实时字数 + 今日累计；Dashboard：3 卡片（今日/连续/本月）+ 30 天热力图 + Recharts 柱状图 |
| **UX 细节** | Sonner toast 全局（所有写操作成功/错误提示）；Bundle 拆分（manualChunks：vendor-react/tiptap/recharts/dnd/ui） |

### 待实现（下阶段优先）

| 优先级 | 功能 | 说明 |
|---|---|---|
| P0 | F8 目标进度条 | Dashboard 今日字数 / target_word_count 进度 |
| P0 | F3 角色管理 | characters 表已建，RHF + zod 表单，角色卡 UI |
| P0 | F12 设置完整 | 字体、编辑器偏好、AI key 配置 |
| P0 | F15 CI/CD | GitHub Actions 双平台打包 |
| P1 | F5 编辑器深化 | 场景分割节点 / 注释 mark / IME 兼容测试 |
| P1 | F4 大纲管理 | outline_nodes 表已建，树形 UI |
| P1 | F9 批注 | annotations 表已建，mark 扩展 + 右侧面板 |
| P1 | F13 导出 | Markdown / Docx / Plain Text |
| P1 | F6 AI 精修 | 需先完成 F12 AI key 配置 |
| P1 | F7 章节校审 | 需先完成 F6 |
| P2 | F10 全文检索 | chapters_fts 已建，SearchDialog 框架已有 |
| P2 | F11 命令面板 | CommandPalette 框架已有，接真实数据 |
| P2 | F14 自动备份 | 定时任务 + db 复制 |

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
