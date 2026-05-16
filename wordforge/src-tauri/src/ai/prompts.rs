use crate::ai::{ChatRequest, PolishKind};

const SYSTEM_PROMPT: &str = r#"你是中文长篇写作编辑。你的任务是帮助作者改进文本，而不是替作者改变剧情。
必须遵守：
- 保留原文的核心事件、人物关系和叙事视角
- 不添加与上下文冲突的新事实
- 保留作者原有风格，不把文本改成通用腔
- 不解释你的工作，除非用户要求
- 只输出改写后的中文正文"#;

pub fn polish_request(kind: PolishKind, text: &str, instruction: Option<&str>) -> ChatRequest {
    let mut task = match kind {
        PolishKind::Condense => {
            "请凝练下面这段文字：删去重复和拖沓表达，保留关键信息、情绪和节奏。".to_string()
        }
        PolishKind::Expand => {
            "请扩写下面这段文字：增加必要细节和节奏层次，但不要改变事件走向。".to_string()
        }
        PolishKind::Describe => {
            "请增强下面这段文字的描写：补充视觉、听觉、触觉或气味等感官细节，保持克制。".to_string()
        }
        PolishKind::Tone => {
            "请调整下面这段文字的语气：在不改变剧情和视角的前提下，让表达更稳定、更贴合长篇叙事。"
                .to_string()
        }
        PolishKind::Free => instruction
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("请按用户意图精修下面这段文字，保持剧情事实和叙事视角不变。")
            .to_string(),
    };
    if !matches!(kind, PolishKind::Free) {
        if let Some(extra) = instruction.map(str::trim).filter(|value| !value.is_empty()) {
            task.push_str("\n\n附加要求：");
            task.push_str(extra);
        }
    }

    ChatRequest {
        system_prompt: SYSTEM_PROMPT.to_string(),
        user_prompt: format!("{task}\n\n原文：\n{text}"),
    }
}

pub fn chapter_review_request(chapter_title: &str, text: &str) -> ChatRequest {
    ChatRequest {
        system_prompt: r#"你是中文长篇小说与长文校审编辑。你的任务是指出当前章节中最值得作者注意的问题，而不是替作者重写章节。
必须遵守：
- 只基于用户提供的章节文本判断，不编造未提供的情节
- 优先发现逻辑、连贯、人物口吻、伏笔/设定一致性问题
- 建议要具体、可执行，避免泛泛而谈
- 输出必须是合法 JSON，不要使用 Markdown，不要添加解释"#.to_string(),
        user_prompt: format!(
            r#"请校审下面这一章，并输出 JSON：

{{
  "issues": [
    {{
      "category": "logic | continuity | voice | foreshadowing",
      "severity": "high | medium | low",
      "location": "简短位置描述，例如：开头第三段 / 对话中段 / 结尾转折",
      "quote": "章节原文中的短引文，必须能在原文中直接找到，20 到 80 个字",
      "problem": "指出具体问题",
      "suggestion": "给出可执行修改建议"
    }}
  ]
}}

要求：
- 最多输出 8 条问题，按重要程度排序
- 如果没有明显问题，输出 {{"issues":[]}}
- category 只能使用 logic、continuity、voice、foreshadowing
- severity 只能使用 high、medium、low
- quote 必须逐字摘自章节正文，不要改写；如果无法确定位置则留空字符串

章节标题：{chapter_title}

章节正文：
{text}"#
        ),
    }
}
