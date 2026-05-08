# 03 · 技术选型

## 3.1 选型一览

| 层 | 选择 | 版本 | 替代方案 | 选择理由 |
|---|---|---|---|---|
| 桌面框架 | Tauri | 2.x | Electron, Wails | 体积小、Rust 生态、内置安全模型 |
| 前端框架 | React | 18 | Vue, Solid | 生态、shadcn/ui 直接可用 |
| 语言 | TypeScript | 5.x | — | 类型安全是长项目的命脉 |
| 构建 | Vite | 5.x | webpack, rsbuild | HMR 极快、Tauri 默认推荐 |
| 样式 | Tailwind CSS | 3.x | UnoCSS | 与 shadcn 配套；utility-first |
| 组件库 | shadcn/ui (Radix) | latest | Ant Design, Mantine | 源码进仓库可改，无 lock-in |
| 图标 | lucide-react | latest | heroicons | 与 shadcn 配套 |
| 状态 | Zustand | 4.x | Redux Toolkit, Jotai | 极简 API，<1KB |
| 异步 | TanStack Query | 5.x | SWR | 缓存/重试/失效一站式 |
| 路由 | React Router | 6.x | TanStack Router | 成熟稳定 |
| 编辑器 | TipTap | 2.x | Lexical, Slate | 文档完善；ProseMirror 内核稳健 |
| 拖拽 | dnd-kit | 6.x | react-dnd | 现代、性能好 |
| 图表 | Recharts | 2.x | ECharts | React-friendly，包小 |
| 表单 | React Hook Form + zod | 7+/3+ | Formik | RHF 性能、zod 类型推导 |
| Markdown | unified / remark | latest | marked | 校审报告渲染 |
| Diff | diff (npm) | 5.x | jsdiff | 段落精修对比视图 |
| 国际化 | i18next | 23.x | react-intl | 后续扩展用 |
| 测试 | Vitest + RTL | latest | Jest | 与 Vite 同源 |
| E2E | (暂略，v0.2) | — | Playwright | 优先把核心做完 |
| 数据库 | SQLite + sqlx | 0.7 | rusqlite | 编译期 SQL 校验 |
| 数据库插件 | tauri-plugin-sql | 2.x | 自管 | 标准化；可降级到 sqlx 直连 |
| 密钥库 | tauri-plugin-stronghold | 2.x | keyring crate | IOTA Stronghold，加密 sled |
| HTTP | reqwest + eventsource-stream | latest | hyper | 流式 SSE 简单 |
| 序列化 | serde / serde_json | 1.x | — | Rust 标准 |
| 错误 | thiserror + anyhow | latest | — | 库用 thiserror，bin 用 anyhow |
| 日志 | tracing + tracing-subscriber | latest | log | 结构化、async 友好 |
| 打包 | tauri-action | latest | 自写脚本 | 官方维护 |

## 3.2 包管理

**pnpm** ——  通过 `packageManager` 字段锁定版本。

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

| 插件 | 用途 |
|---|---|
| `tauri-plugin-sql` | SQLite 访问 |
| `tauri-plugin-stronghold` | 加密密钥库 |
| `tauri-plugin-fs` | 受控文件读写（导出 / 备份） |
| `tauri-plugin-dialog` | 文件选择对话框 |
| `tauri-plugin-clipboard-manager` | 剪贴板（粘贴格式化文本） |
| `tauri-plugin-shell` | 仅用于 "在浏览器打开链接" |
| `tauri-plugin-updater` | 自动更新（v0.2 启用） |
| `tauri-plugin-window-state` | 记住窗口大小/位置 |
| `tauri-plugin-os` | 平台检测（统一快捷键 Ctrl/Cmd） |

## 3.5 不选什么 + 原因

- **Electron**：体积、内存。
- **Lexical**：相对年轻，中文 IME 边角更多。
- **MongoDB / IndexedDB**：本地文件 + SQL 已足够，且便于备份。
- **Redux Toolkit**：本项目副作用集中在 IPC，Zustand 已够用。
- **CSS-in-JS (styled-components)**：与 Tailwind 双轨成本高。
