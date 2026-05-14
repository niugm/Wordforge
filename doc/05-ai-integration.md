# 05 · AI 集成

## 5.1 设计目标

1. **多 Provider**：OpenAI 兼容 / Anthropic / Google Gemini，可拓展。
2. **零信任前端**：原文 API key 永不出现在 WebView 进程内。
3. **流式优先**：所有写作辅助场景都用 streaming，体验即时。
4. **可控上下文**：用户能挑"当前段落 / 当前章节 / 选定角色卡 / 大纲" 注入。
5. **可观察**：每次调用都写 `ai_messages`，方便回看与计费估算。

## 5.2 Rust 侧抽象

```rust
// src-tauri/src/ai/provider.rs
#[async_trait]
pub trait LlmProvider: Send + Sync {
    fn id(&self) -> &'static str;            // "openai" | "anthropic" | "gemini"
    async fn list_models(&self) -> Result<Vec<ModelInfo>>;
    async fn chat_stream(
        &self,
        req: ChatRequest,
        on_chunk: Box<dyn Fn(StreamChunk) + Send>,
    ) -> Result<ChatResult>;
}

pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<Message>,           // role + content
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
    pub system: Option<String>,
}
```

实现：
- `OpenAiCompatibleProvider`（覆盖 OpenAI / DeepSeek / Kimi / 通义 / 自部署）
- `AnthropicProvider`（`/v1/messages` + `event-stream`）
- `GeminiProvider`（`generativelanguage.googleapis.com`）

## 5.3 密钥管理

```
                ┌─────────────────────────┐
   user input → │  Settings UI (frontend) │
                └────────────┬────────────┘
                             │ invoke("save_credential", {provider, raw_key, base_url, model})
                             ▼
                ┌─────────────────────────┐
                │ commands::save_credential│
                │  1. open system keyring  │
                │  2. store raw_key        │
                │  3. write sentinel       │
                │  4. write ai_credentials │
                └─────────────────────────┘

   每次调用：
   commands::ai_chat
     → load keyring record by provider
     → instantiate provider with key
     → forward stream to frontend Channel
```

- v0.1 使用系统凭据库（keyring crate）；v0.2 可引入 Stronghold + 自定义主密码。
- 前端**只能**调 `is_credential_present(provider) -> bool`，永不读取明文。

## 5.4 IPC 协议

当前已实现非流式 MVP：

```ts
type AiPolishKind = 'condense' | 'expand' | 'describe' | 'tone' | 'free';

interface AiPolishArgs {
  provider: 'openai' | 'anthropic' | 'gemini';
  kind: AiPolishKind;
  text: string;
  instruction?: string | null;
  projectId?: string | null;
}

interface AiPolishResult {
  provider: 'openai' | 'anthropic' | 'gemini';
  model: string;
  kind: AiPolishKind;
  originalText: string;
  resultText: string;
}
```

说明：
- `openai` 已接入 OpenAI-compatible `/chat/completions` 非流式请求。
- `anthropic` / `gemini` 暂保留配置入口，调用时返回未支持提示。
- `projectId` 存在时，输入和输出会写入 `ai_messages.scope = 'polish'`。
- 超过 5000 字的文本会在 Rust 侧拒绝。

后续 streaming 目标协议：

```ts
// invoke
type AiPolishKind = 'condense' | 'expand' | 'tone-shift' | 'translate' | 'free';

interface AiPolishArgs {
  provider: 'openai' | 'anthropic' | 'gemini';
  kind: AiPolishKind;
  text: string;
  context?: { chapterId?: string; characterIds?: string[]; outlineIds?: string[] };
  options?: { tone?: string; targetLang?: string; lengthHint?: number };
  channel: Channel<StreamChunk>;        // Tauri 2 Channel
}

interface StreamChunk {
  type: 'text' | 'done' | 'error';
  delta?: string;
  usage?: { prompt: number; completion: number };
  message?: string;
}
```

## 5.5 Prompt 模板

模板维护在 `src-tauri/src/ai/prompts/`，编译期 `include_str!` 进二进制，避免运行时被篡改。

### 段落精修 / `condense`

```
你是中文长篇小说编辑。请把下面这段话凝练为更精炼的版本，
要求：
- 不丢失关键情节信息和人物口吻
- 长度大约为原文的 {len_ratio}
- 保留原作者风格

原文：
{text}

仅输出改写后的文本，不要解释。
```

### 章节校审 / `chapter-review`

```
你是资深编辑。请对下面这一章做四维评审，输出 JSON：

{
  "logic":     [{"line": 12, "issue": "...", "suggestion": "..."}],
  "coherence": [...],
  "voice":     [...],   // 人物口吻
  "foreshadow":[...]    // 伏笔与回收
}

章节内容：
{chapter_md}

已知人物卡：
{character_cards}

已知大纲：
{outline_md}
```

输出严格 JSON，前端解析后渲染：左侧标注行号 + 右侧建议卡片。

## 5.6 Token / 成本治理

- 估算：内置一个粗略 `estimate_tokens(text)`（中文字符 × 1.3）。
- 写入 `ai_messages.tokens`，看板可显示"近 30 天 AI 调用次数 / Token 用量"。
- 每次请求前若超过 provider 上下文上限，**Rust 侧自动截断"角色卡 + 大纲"**，保证当前章节完整传入。

## 5.7 错误恢复

- 网络错误：自动重试 1 次（指数退避），仍失败则 emit `error` chunk。
- 流中断：前端保留已收到的 delta，用户可"继续生成"（携带 `continue: true` + 已收到内容做 prefix）。
- 限流：Rust 侧解析 `429`/`Retry-After`，把信息透传给前端 toast。
