# Wordforge

> 为长文写作者打造的桌面创作工坊 —— 编辑、构思、AI 协作，一站合一。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Built with Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri&logoColor=white)](https://tauri.app/)

Wordforge 是一款基于 **Tauri 2 + React + TypeScript** 的本地优先桌面应用，
面向小说、剧本、专栏作者，把"写作工具链"压缩到一个轻量、跨平台的程序里。

## ✨ 核心特性

- **简洁纯粹的编辑器** —— TipTap / ProseMirror，专为长文打磨
- **章节 / 角色 / 大纲三位一体** —— 树形管理，互相跳转
- **写作看板** —— 字数实时统计、连续写作、热力图、目标进度
- **AI 协作** —— OpenAI 兼容协议、Anthropic Claude、Google Gemini
  - 段落精修：凝练 / 扩写 / 换语气 / 翻译
  - 章节校审：逻辑、连贯、人物口吻、伏笔四维评审
- **批注 / 标记** —— 行内 highlight / comment / TODO
- **本地优先** —— SQLite 单文件库，密钥本地加密；不联网也能写
- **跨平台** —— macOS (Apple Silicon + Intel) / Windows 10+

## 🚧 项目状态

`v0.0.0-pre` ——  开发文档已就绪，正在脚手架阶段。
路线图见 [`doc/08-roadmap.md`](./doc/08-roadmap.md)。

## 📚 开发文档

- [01 产品概览](./doc/01-overview.md)
- [02 系统架构](./doc/02-architecture.md)
- [03 技术选型](./doc/03-tech-stack.md)
- [04 数据模型](./doc/04-data-model.md)
- [05 AI 集成](./doc/05-ai-integration.md)
- [06 UI 设计](./doc/06-ui-design.md)
- [07 功能清单](./doc/07-features.md)
- [08 路线图](./doc/08-roadmap.md)
- [09 构建与发布](./doc/09-build-and-release.md)
- [10 编码规范](./doc/10-coding-conventions.md)

## 🛠 本地开发（脚手架就绪后）

```bash
pnpm install
pnpm tauri dev
```

详见 [`doc/09-build-and-release.md`](./doc/09-build-and-release.md)。

## 📜 License

MIT © 2026 niugm
