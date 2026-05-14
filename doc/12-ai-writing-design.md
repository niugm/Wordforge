# 12 · AI 辅助写作产品设计

> 更新时间：2026-05-15
>
> 目标：把 AI 能力设计成“写作者的编辑搭档”，而不是替作者自动续写整本书。第一阶段优先做安全、可控、可回滚的段落精修。

---

## 12.1 参考产品结论

### Notion AI

- 典型入口：选中文本后 `Ask AI`，也可通过 `/AI` 插入 AI block。
- 核心模式：基于当前页面上下文做总结、提炼、改写、翻译、语气调整。
- 对 Wordforge 的启发：AI 入口应贴近编辑区选区；输出应允许“替换 / 插入 / 继续追问”，不要让用户跳到独立聊天软件里。

参考：[Notion AI for docs](https://www.notion.com/help/guides/notion-ai-for-docs)

### Grammarly

- 典型能力：按语气、长度、正式程度改写；实时校对；生成想法和大纲。
- 核心模式：对已有文本给出即时建议，并强调“保持用户自己的声音”。
- 对 Wordforge 的启发：中文长文最怕 AI 抹平作者风格，因此每次精修都要有“保留原文风格 / 更凝练 / 更有画面感 / 更口语化”等明确控制项。

参考：[Grammarly AI Writing Assistant](https://www.grammarly.com/ai-writing-assistant)

### Sudowrite

- 典型能力：Write、Rewrite、Describe、Brainstorm、Expand、First Draft。
- 核心模式：面向小说作者，不只做语法，还支持感官描写、情节想法、扩写和风格重写。
- 对 Wordforge 的启发：我们应把“小说/长文专用动作”作为优势，例如“增强感官描写”“保持人物口吻”“检查伏笔一致性”，而不是只做通用办公写作。

参考：[Sudowrite Features](https://docs.sudowrite.com/getting-started/dQph1snuwbfMWG9wRjsNug/features/dq7YUMNy5ZMvKUJiRAisyT)

---

## 12.2 产品原则

1. **用户主控**：AI 只产出候选，不直接覆盖正文。
2. **选区优先**：段落精修以用户选中内容为入口；没有选区时默认使用当前段落。
3. **上下文可见**：每次调用前让用户知道会带入哪些上下文：当前章节、角色卡、大纲节点。
4. **可比较**：输出必须支持原文 / 建议文本对照，至少第一版提供纯文本 diff。
5. **可回滚**：应用替换前写入 revision，来源标记为 `ai_polish`。
6. **本地安全**：API Key 不进入 WebView 明文；AI 请求从 Rust 发起。
7. **不伪装作者**：保留 AI 操作历史，避免不可追踪的自动改写。

---

## 12.3 功能分层

### P0：AI 安全与调用底座

- 安全存储 API Key。
- Rust 侧 `LlmProvider` 抽象。
- OpenAI-compatible 首发，覆盖 OpenAI / DeepSeek / Kimi / 通义 / 自部署网关。
- 非流式调用先跑通，随后接 streaming。
- 每次调用写入 `ai_messages`。

### P0：F6 段落精修 MVP

入口：
- 选中文本后 BubbleMenu 出现 `AI` 按钮。
- 无选区时，可在当前段落通过快捷键 `Ctrl/Cmd+J` 呼出。
- 右侧 AI 面板提供同样入口。

动作：
- `凝练`：减少冗余，保留情节信息。
- `扩写`：增加细节和节奏，不改变事件走向。
- `增强描写`：偏 Sudowrite Describe，补充视觉、听觉、触觉、气味等感官细节。
- `调整语气`：更冷峻 / 更温柔 / 更悬疑 / 更口语。
- `保持人物口吻`：带入相关角色卡，避免对话变味。
- `自由指令`：用户自定义要求。

输出：
- 右侧 AI 面板展示生成结果。
- 操作按钮：`替换原文`、`插入下方`、`复制`、`重新生成`。
- 第一版可以先不做复杂行级 diff，但要保留原文和建议文本对照。

### P1：F7 章节校审

入口：
- 编辑区顶部章节状态旁增加 `AI 校审`。
- 右侧 AI 面板增加“章节校审”模式。

检查维度：
- 逻辑：事件因果、时间线、空间位置。
- 连贯：段落衔接、信息重复或跳跃。
- 人物口吻：对话是否符合角色卡。
- 伏笔：已埋线索是否矛盾，是否有可回收提示。

输出：
- 建议列表按维度分组。
- 每条建议包含：位置描述、问题、建议改法、严重程度。
- 支持 `跳转`、`忽略`、`复制建议`。

### P1：灵感与续写

- `下一段建议`：根据当前段落、章节摘要、大纲给 3 个可能推进方向。
- `脑暴`：角色名、地点名、冲突、伏笔、章节标题。
- `章节草稿`：基于大纲节点生成片段，不直接写入正文，只作为草稿卡片。

---

## 12.4 交互设计

### 编辑器选区入口

```text
选中文本
  → BubbleMenu 显示：B / I / U / S / AI
  → 点击 AI
  → Popover 显示快捷动作：凝练、扩写、增强描写、调整语气、自由指令
  → 选择动作后，右侧 AI 面板进入生成状态
```

选区超过 5000 字：
- 阻止直接调用。
- 提示：“选区较长，建议按段落分批处理。”

### 右侧 AI 面板

右侧栏当前已有 `AI / 批注 / 修订`，AI 面板建议分为三块：

- 顶部：模式切换 `精修 / 校审 / 脑暴`
- 中部：上下文选择
  - 当前章节：默认开启
  - 角色卡：自动推荐本章出现过的角色，允许手动勾选
  - 大纲：当前章节绑定大纲优先，未绑定时可手动选择
- 底部：结果历史
  - 每次生成是一张结果卡
  - 卡片有“替换 / 插入 / 复制 / 重试”

### 应用结果

`替换原文`：
- 写入一条 `revisions`，`source = 'ai_polish'`。
- 替换 TipTap 当前选区。
- 触发现有保存链路。

`插入下方`：
- 在当前段落后插入新段落。
- 不删除原文，适合比较。

---

## 12.5 上下文策略

第一阶段上下文包：

```ts
type AiContextPack = {
  projectName: string;
  chapterTitle: string;
  selectedText: string;
  beforeText?: string;      // 选区前约 500-1000 字
  afterText?: string;       // 选区后约 500-1000 字
  characters?: Array<{ name: string; roleType?: string; profileMd: string }>;
  outline?: Array<{ title: string; contentMd: string }>;
};
```

规则：
- 精修选区时，正文上下文只带选区前后片段，不默认上传整章。
- 校审章节时，可以上传整章，但需要显示“将发送当前章节全文”。
- 角色卡和大纲默认只带当前章节相关项；没有关联能力前，可先让用户手动勾选。
- 超出 token 上限时优先保留：系统提示词、用户选区、当前章节标题、角色卡摘要、前后文。

---

## 12.6 提示词策略

提示词不写在前端，放在 Rust：

```text
src-tauri/src/ai/prompts/
  polish_condense.md
  polish_expand.md
  polish_describe.md
  polish_tone.md
  polish_free.md
  chapter_review.md
```

基础系统提示：

```text
你是中文长篇写作编辑。你的任务是帮助作者改进文本，而不是替作者改变剧情。
必须遵守：
- 保留原文的核心事件、人物关系和叙事视角
- 不添加与上下文冲突的新事实
- 不解释你的工作，除非用户要求
- 输出中文
```

---

## 12.7 数据与留痕

已有表：
- `ai_credentials`
- `ai_messages`
- `revisions`

MVP 可先复用：
- `ai_messages.scope`: `polish` / `review` / `brainstorm`
- `ai_messages.role`: `system` / `user` / `assistant`
- `ai_messages.content`: prompt 或结果
- `ai_messages.tokens`: token 估算或 provider 返回值

建议后续新增字段或新表：
- `ai_messages.provider`
- `ai_messages.model`
- `ai_messages.chapter_id`
- `ai_messages.created_from_selection`
- `ai_results`：用于保存结果卡状态（accepted / ignored / copied）

---

## 12.8 技术落地顺序

### Step 1：安全存储

- 已选择 keyring crate 作为 v0.1 方案，API Key 写入系统凭据库。
- `save_ai_credential` 不再把明文或伪密文写入 SQLite。
- SQLite 只保存 provider、base_url、model、has_api_key sentinel。
- 旧版本误写入 SQLite 的 key 会在读取 AI 配置时迁移到 keyring，并把 SQLite 字段替换为 sentinel。

### Step 2：Provider 抽象

- 新增 `src-tauri/src/ai/`。
- 首发 `OpenAiCompatibleProvider`。
- 暂不做 Anthropic/Gemini 实调用，但保留 trait 和错误提示。

### Step 3：非流式段落精修

- `ai_polish` command。
- 前端选区入口 + 右侧 AI 面板结果卡。
- 支持替换 / 插入 / 复制。

### Step 4：Streaming

- 用 Tauri event 或 Channel 推送 chunk。
- 结果卡显示生成中状态。
- 支持中断 / 重试。

### Step 5：章节校审

- `ai_review_chapter` command。
- 输出 JSON schema。
- 右侧建议列表渲染。

---

## 12.9 MVP 验收标准

- 已配置 OpenAI-compatible provider 时，可以选中一段文字执行 `凝练`。
- API Key 不出现在前端状态、localStorage、toast、日志和 SQLite 明文字段中。
- 生成结果不会自动覆盖正文。
- 点击 `替换原文` 后，正文更新并写入 `revisions.source = 'ai_polish'`。
- 网络失败时显示错误 toast，并保留当前原文。
- 选区超过 5000 字时阻止调用并提示分段。

---

## 12.10 暂不做

- 自动整章续写并直接写入正文。
- 多 agent 复杂工作流。
- Web 搜索增强。
- 模仿真实在世作家风格。
- AI 检测或“去 AI 味”承诺。
