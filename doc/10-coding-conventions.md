# 10 · 编码规范

## 10.1 语言版本

- TypeScript：`"strict": true`，禁止 `any`（确需用时加 `// eslint-disable-next-line` 并注明原因）。
- Rust：`edition = "2021"`，`#![deny(unsafe_code)]`（除非显式解锁）。

## 10.2 目录与命名

| 类型 | 约定 | 示例 |
|---|---|---|
| React 组件文件 | PascalCase | `ChapterTree.tsx` |
| React hook | camelCase + `use` 前缀 | `useChapterTree.ts` |
| TS 工具模块 | kebab-case | `word-count.ts` |
| Rust mod | snake_case | `chapter.rs`, `db/mod.rs` |
| Tauri command | snake_case | `save_chapter` |
| 数据库表/字段 | snake_case | `writing_sessions` |
| 常量 | SCREAMING_SNAKE_CASE | `DEFAULT_AUTOSAVE_MS` |

## 10.3 React / TS 风格

- **函数组件**优先；不写 class。
- 单一职责：组件超过 ~200 行考虑拆分。
- props 用 interface，状态用 zustand，服务调用用 TanStack Query。
- 避免 `useEffect` 滥用：能在事件回调或 `useMemo` 解决就别 effect。
- 文件顶部导入顺序：标准库 → 第三方 → 项目（用 `@/` 别名）→ 相对路径。
- 不写 barrel `index.ts` re-export，除非组件库本身。

## 10.4 Rust 风格

- `cargo fmt` + `cargo clippy --all-targets -- -D warnings` 必须过。
- 错误：库内用 `thiserror`，进程入口用 `anyhow`。
- 对外 IPC 命令的所有公共参数 `Deserialize`，结果 `Serialize`。
- 不在 command 内 `unwrap()`；用 `?` + `AppError`。
- Long-running task：`tauri::async_runtime::spawn`，不要阻塞 main。

## 10.5 SQL 与迁移

- 迁移文件 `NNNN_short_desc.sql`，单调递增。
- **永不修改已发布的迁移**，新增向后兼容的迁移即可。
- 所有索引在迁移中显式声明。
- 列默认值 + NOT NULL，避免 nullable 字段污染业务逻辑。

## 10.6 Git / 提交规范

### 分支策略

- `main` 永远可发布
- 功能分支 `feat/<scope>`、`fix/<scope>`、`chore/<scope>`
- 通过 PR 合并；小变更可直接 push（个人项目阶段）

### Conventional Commits

```
<type>(<scope>): <subject>

[body]

[footer]
```

| type | 用途 |
|---|---|
| feat | 新功能 |
| fix | 缺陷修复 |
| docs | 仅文档 |
| style | 代码格式（不改语义） |
| refactor | 重构 |
| perf | 性能优化 |
| test | 测试 |
| build | 构建系统 / 依赖 |
| ci | CI 配置 |
| chore | 杂项 |
| revert | 回滚 |

例：

```
feat(editor): add tiptap autosave with 500ms debounce

- 防抖落库，避免每次按键 IO
- onCompositionStart/End 期间不触发，兼容中文 IME

Closes #12
```

## 10.7 PR 规范

- 标题用 Conventional Commits 风格
- 描述包含：背景 / 改动点 / 截图（如涉 UI） / 测试方式
- 单 PR 行数尽量 < 400 行，超出建议拆分

## 10.8 代码审查清单

- [ ] 命名清晰、不产生歧义
- [ ] 没有死代码 / 注释代码
- [ ] 没有 `console.log` / `dbg!`
- [ ] 修改 schema 是否同时加迁移？
- [ ] 是否影响安全（密钥、IPC 边界、SQL 拼接）？
- [ ] 是否影响性能热路径？

## 10.9 测试

- **TS 单测**：Vitest，关键纯函数（word-count、diff、prompt builder）
- **Rust 单测**：常规 `#[cfg(test)] mod tests`，覆盖 db query / ai prompt 构造
- **集成测试**：留到 v0.2（Tauri E2E）

## 10.10 i18n

- 所有面向用户的字符串放在 `src/i18n/<lang>.json`
- v0.1 默认仅中文；保留切换机制以便后续加英文
