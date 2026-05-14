use crate::ai::{ChatRequest, PolishKind};

const SYSTEM_PROMPT: &str = r#"你是中文长篇写作编辑。你的任务是帮助作者改进文本，而不是替作者改变剧情。
必须遵守：
- 保留原文的核心事件、人物关系和叙事视角
- 不添加与上下文冲突的新事实
- 保留作者原有风格，不把文本改成通用腔
- 不解释你的工作，除非用户要求
- 只输出改写后的中文正文"#;

pub fn polish_request(kind: PolishKind, text: &str, instruction: Option<&str>) -> ChatRequest {
    let task = match kind {
        PolishKind::Condense => {
            "请凝练下面这段文字：删去重复和拖沓表达，保留关键信息、情绪和节奏。"
        }
        PolishKind::Expand => "请扩写下面这段文字：增加必要细节和节奏层次，但不要改变事件走向。",
        PolishKind::Describe => {
            "请增强下面这段文字的描写：补充视觉、听觉、触觉或气味等感官细节，保持克制。"
        }
        PolishKind::Tone => {
            "请调整下面这段文字的语气：在不改变剧情和视角的前提下，让表达更稳定、更贴合长篇叙事。"
        }
        PolishKind::Free => instruction
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("请按用户意图精修下面这段文字，保持剧情事实和叙事视角不变。"),
    };

    ChatRequest {
        system_prompt: SYSTEM_PROMPT.to_string(),
        user_prompt: format!("{task}\n\n原文：\n{text}"),
    }
}
