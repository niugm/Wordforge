# 02 · 系统架构

## 2.1 高层架构图

```
┌──────────────────────────────────────────────────────────────────┐
│                     Wordforge Desktop (Tauri 2)                  │
│                                                                  │
│  ┌────────────────── WebView (Frontend) ──────────────────┐      │
│  │  React 18 + TS + Vite                                  │      │
│  │                                                        │      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │      │
│  │  │  Pages   │  │  Stores  │  │ Services │              │      │
│  │  │ (router) │←→│(zustand) │←→│ (db/ai)  │              │      │
│  │  └──────────┘  └──────────┘  └─────┬────┘              │      │
│  │                                    │                    │      │
│  │             TipTap Editor          │                    │      │
│  └────────────────────────────────────│────────────────────┘      │
│                                       │                           │
│                            invoke / Channel (IPC)                 │
│                                       │                           │
│  ┌──────────────────── Rust Core ─────▼───────────────────┐      │
│  │                                                        │      │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐   │      │
│  │  │  Commands  │  │  AI Module │  │   DB Layer     │   │      │
│  │  │ (#[command]│  │ (provider  │  │ sqlx + sqlite  │   │      │
│  │  │  handlers) │  │  trait)    │  │ + migrations   │   │      │
│  │  └─────┬──────┘  └─────┬──────┘  └────────┬───────┘   │      │
│  │        │               │                  │            │      │
│  │        └───────────────┴──────────────────┘            │      │
│  │                                                        │      │
│  │  Stronghold (encrypted key vault)                      │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
       │                          │                       │
       ▼                          ▼                       ▼
   user data dir            ~/.wordforge/             external AI
   (sqlite file)            stronghold vault          (HTTPS)
```

## 2.2 进程模型

Tauri 2 仍是双进程：

- **Main (Rust)**：拥有原生权限（FS / OS / Network），承载数据库、AI 调用、密钥管理。
- **WebView (JS)**：渲染 UI，禁止直接访问 FS/Net；所有副作用必须经 `invoke()`。

这种"前端无密钥"的设计天然满足本地加密承诺。

## 2.3 数据流

### 写作时（Hot path）

```
用户键入
  → TipTap onUpdate
  → debounce(500ms)
  → invoke("save_chapter", {id, content_json, word_count})
  → Rust 写 SQLite (transaction)
  → emit("chapter:saved", {id, ts})
  → 前端 store 更新 lastSavedAt
```

### AI 精修

```
用户选中段落 → "精修"
  → invoke("ai_polish", {provider, prompt_kind, text, context})
  → Rust 从 stronghold 取 key
  → 发起流式请求（reqwest + eventsource-stream）
  → 通过 Tauri Channel 把 chunk 推到前端
  → 前端 diff 视图渲染建议
  → 用户接受 → invoke("replace_range", {chapter_id, range, new_text})
```

### 启动时

```
App 启动
  → Rust 初始化 db pool（如不存在则创建并跑 migrations）
  → 读取 settings(theme, last_project_id)
  → 前端 mount，invoke("list_projects")
  → 显示 Workspace 或 Welcome
```

## 2.4 关键模块边界

| 模块 | 责任 | 不该做 |
|---|---|---|
| `services/db` (TS) | 类型化 repository、参数序列化 | 直接拼 SQL；做业务校验 |
| `commands/*` (Rust) | 暴露 IPC + 参数校验 + 调用 db/ai | 直接持有全局可变状态（用 `tauri::State`） |
| `ai/` (Rust) | LlmProvider trait + 三家实现 | 持久化（持久化交给 db） |
| `db/` (Rust) | 连接池、迁移、低层 query | 业务逻辑（写在 commands） |
| `editor/` (TS) | TipTap 封装、扩展、序列化 | 网络/数据库调用 |

## 2.5 错误处理策略

- Rust 侧统一用 `thiserror::Error` 派生 `AppError`，实现 `Serialize`，前端拿到结构化错误。
- 前端 React Query 的 `onError` 走全局 toast；致命错误（DB 损坏）走 Error Boundary。
- 所有 `unwrap` 在生产代码里禁用（clippy lint 强制）。
