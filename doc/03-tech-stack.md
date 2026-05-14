# 03 · 技术选型

## 3.1 选型一览

| 层 | 选择 | 版本 | 替代方案 | 选择理由 |
|---|---|---|---|---|
| 桌面框架 | Tauri | 2.x | Electron, Wails | 体积小、Rust 生态、内置安全模型 |
| 前端框架 | React | 19.x | Vue, Solid | 生态、shadcn/ui 直接可用 |
| 语言 | TypeScript | 5.x | — | 类型安全是长项目的命脉 |
| 构建 | Vite | 7.x | webpack, rsbuild | HMR 极快、Tauri 默认推荐 |
| 样式 | Tailwind CSS | 4.x | UnoCSS | 与 shadcn 配套；utility-first |
| 组件库 | shadcn/ui (Radix) | latest | Ant Design, Mantine | 源码进仓库可改，无 lock-in |
| 图标 | lucide-react | latest | heroicons | 与 shadcn 配套 |
| 状态 | Zustand | 5.x | Redux Toolkit, Jotai | 极简 API，<1KB |
| 异步 | TanStack Query | 5.x | SWR | 缓存/重试/失效一站式 |
| 路由 | React Router | 7.x | TanStack Router | 成熟稳定 |
| 编辑器 | TipTap | 3.x | Lexical, Slate | 文档完善；ProseMirror 内核稳健 |
| 拖拽 | dnd-kit | 6.x | react-dnd | 现代、性能好 |
| 图表 | Recharts | 3.x | ECharts | React-friendly，包小 |
| 表单 | React Hook Form + zod | 7+/3+ | Formik | RHF 性能、zod 类型推导 |
| Markdown | unified / remark | latest | marked | 校审报告渲染 |
| Diff | diff (npm) | 5.x | jsdiff | 段落精修对比视图 |
| 国际化 | i18next | 23.x | react-intl | 后续扩展用 |
| 测试 | Vitest + RTL | latest | Jest | 与 Vite 同源 |
| E2E | (暂略，v0.2) | — | Playwright | 优先把核心做完 |
| 数据库 | SQLite + sqlx | 0.8 | rusqlite, tauri-plugin-sql | 编译期 SQL 校验；Rust 侧直连，便于统一事务与迁移 |
| 密钥库 | tauri-plugin-stronghold | 2.x（计划） | keyring crate | IOTA Stronghold，加密 sled |
| HTTP | reqwest + eventsource-stream | latest | hyper | 流式 SSE 简单 |
| 序列化 | serde / serde_json | 1.x | — | Rust 标准 |
| 错误 | thiserror + anyhow | latest | — | 库用 thiserror，bin 用 anyhow |
| 日志 | tracing + tracing-subscriber | latest | log | 结构化、async 友好 |
| 打包 | tauri-action | latest | 自写脚本 | 官方维护 |

## 3.2 包管理

**pnpm** ——  项目应用位于 `wordforge/`，依赖由 `pnpm-lock.yaml` 锁定；后续可补 `packageManager` 字段锁定 pnpm 主版本。

```json
{ "packageManager": "pnpm@9.x" }
```

理由：
- 速度比 npm 快 2-3×
- 磁盘占用低（硬链接）
- workspace 友好（未来若拆 monorepo）

## 3.3 Node / Rust 版本策略

- Node：LTS（当前 20.x），`.nvmrc` 写 `20`。
- Rust：stable channel，`rust-toolchain.toml` 锁定，避免 nightly 漂移。

## 3.4 Tauri 关键插件

| 插件 | 状态 | 用途 |
|---|---|---|
| `tauri-plugin-opener` | 已接入 | 在系统默认浏览器打开链接 |
| `tauri-plugin-stronghold` | 计划 | 加密密钥库 |
| `tauri-plugin-fs` | 计划 | 受控文件读写（封面 / 导出 / 备份） |
| `tauri-plugin-dialog` | 计划 | 文件选择对话框 |
| `tauri-plugin-clipboard-manager` | 计划 | 剪贴板（粘贴格式化文本） |
| `tauri-plugin-updater` | v0.2 | 自动更新 |
| `tauri-plugin-window-state` | 计划 | 记住窗口大小/位置 |
| `tauri-plugin-os` | 计划 | 平台检测（统一快捷键 Ctrl/Cmd） |

数据库访问不使用 `tauri-plugin-sql`，统一由 Rust 侧 `sqlx` 直连 SQLite。

## 3.5 不选什么 + 原因

- **Electron**：体积、内存。
- **Lexical**：相对年轻，中文 IME 边角更多。
- **MongoDB / IndexedDB**：本地文件 + SQL 已足够，且便于备份。
- **Redux Toolkit**：本项目副作用集中在 IPC，Zustand 已够用。
- **CSS-in-JS (styled-components)**：与 Tailwind 双轨成本高。
