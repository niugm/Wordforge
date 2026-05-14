use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde::Serialize;
use serde_json::Value;
use sqlx::SqlitePool;

use crate::db::now_ms;
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub path: String,
    pub file_count: usize,
}

#[derive(Debug, Clone, sqlx::FromRow)]
struct ExportProject {
    id: String,
    name: String,
    description: Option<String>,
    target_word_count: i64,
}

#[derive(Debug, Clone, sqlx::FromRow)]
struct ExportChapter {
    id: String,
    parent_id: Option<String>,
    sort: i64,
    title: String,
    content_json: String,
    word_count: i64,
}

#[derive(Debug, Clone, Copy)]
enum ExportFormat {
    Markdown,
    PlainText,
}

#[derive(Debug, Clone, Copy)]
enum ExportMode {
    Merged,
    ChapterFiles,
}

pub async fn export_project(
    pool: &SqlitePool,
    app_data_dir: &Path,
    project_id: String,
    format: String,
    mode: String,
) -> AppResult<ExportResult> {
    let format = parse_format(&format)?;
    let mode = parse_mode(&mode)?;

    let project = get_project(pool, &project_id).await?;
    let chapters = list_chapters(pool, &project_id).await?;
    let ordered = order_chapters(chapters);
    let ext = match format {
        ExportFormat::Markdown => "md",
        ExportFormat::PlainText => "txt",
    };

    let export_root = app_data_dir.join("wordforge").join("exports").join(format!(
        "{}-{}",
        sanitize_filename(&project.name),
        now_ms()
    ));
    std::fs::create_dir_all(&export_root)?;

    match mode {
        ExportMode::Merged => {
            let path = export_root.join(format!("{}.{}", sanitize_filename(&project.name), ext));
            let rendered = render_project(&project, &ordered, format);
            std::fs::write(&path, rendered)?;
            Ok(ExportResult {
                path: path_to_string(path),
                file_count: 1,
            })
        }
        ExportMode::ChapterFiles => {
            let mut count = 0;
            for (index, (chapter, depth)) in ordered.iter().enumerate() {
                let filename = format!(
                    "{:03}-{}.{}",
                    index + 1,
                    sanitize_filename(&chapter.title),
                    ext
                );
                let path = export_root.join(filename);
                let rendered = render_chapter(chapter, *depth, format, false);
                std::fs::write(path, rendered)?;
                count += 1;
            }
            Ok(ExportResult {
                path: path_to_string(export_root),
                file_count: count,
            })
        }
    }
}

async fn get_project(pool: &SqlitePool, project_id: &str) -> AppResult<ExportProject> {
    let row = sqlx::query_as::<_, ExportProject>(
        "SELECT id, name, description, target_word_count
         FROM projects
         WHERE id = ?",
    )
    .bind(project_id)
    .fetch_optional(pool)
    .await?;

    row.ok_or_else(|| AppError::NotFound(format!("project {project_id}")))
}

async fn list_chapters(pool: &SqlitePool, project_id: &str) -> AppResult<Vec<ExportChapter>> {
    let rows = sqlx::query_as::<_, ExportChapter>(
        "SELECT id, parent_id, sort, title, content_json, word_count
         FROM chapters
         WHERE project_id = ?",
    )
    .bind(project_id)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

fn order_chapters(chapters: Vec<ExportChapter>) -> Vec<(ExportChapter, usize)> {
    let mut by_parent: HashMap<Option<String>, Vec<ExportChapter>> = HashMap::new();
    for chapter in chapters {
        by_parent
            .entry(chapter.parent_id.clone())
            .or_default()
            .push(chapter);
    }

    for siblings in by_parent.values_mut() {
        siblings.sort_by(|a, b| a.sort.cmp(&b.sort).then_with(|| a.title.cmp(&b.title)));
    }

    let mut ordered = Vec::new();
    push_children(None, 0, &mut by_parent, &mut ordered);

    let mut remaining: Vec<_> = by_parent.into_values().flatten().collect();
    remaining.sort_by(|a, b| a.sort.cmp(&b.sort).then_with(|| a.title.cmp(&b.title)));
    for chapter in remaining {
        ordered.push((chapter, 0));
    }

    ordered
}

fn push_children(
    parent_id: Option<String>,
    depth: usize,
    by_parent: &mut HashMap<Option<String>, Vec<ExportChapter>>,
    ordered: &mut Vec<(ExportChapter, usize)>,
) {
    let Some(children) = by_parent.remove(&parent_id) else {
        return;
    };

    for chapter in children {
        let id = chapter.id.clone();
        ordered.push((chapter, depth));
        push_children(Some(id), depth + 1, by_parent, ordered);
    }
}

fn render_project(
    project: &ExportProject,
    chapters: &[(ExportChapter, usize)],
    format: ExportFormat,
) -> String {
    let total_words: i64 = chapters.iter().map(|(chapter, _)| chapter.word_count).sum();
    let mut out = String::new();

    match format {
        ExportFormat::Markdown => {
            out.push_str(&format!("# {}\n\n", project.name));
            if let Some(description) = project
                .description
                .as_deref()
                .filter(|value| !value.is_empty())
            {
                out.push_str(description);
                out.push_str("\n\n");
            }
            out.push_str(&format!(
                "> 作品 ID：{} · 当前字数：{} · 目标字数：{}\n\n",
                project.id, total_words, project.target_word_count
            ));
        }
        ExportFormat::PlainText => {
            out.push_str(&project.name);
            out.push_str("\n\n");
            if let Some(description) = project
                .description
                .as_deref()
                .filter(|value| !value.is_empty())
            {
                out.push_str(description);
                out.push_str("\n\n");
            }
            out.push_str(&format!(
                "作品 ID：{} · 当前字数：{} · 目标字数：{}\n\n",
                project.id, total_words, project.target_word_count
            ));
        }
    }

    for (chapter, depth) in chapters {
        out.push_str(&render_chapter(chapter, *depth, format, true));
        out.push('\n');
    }

    out.trim_end().to_string() + "\n"
}

fn render_chapter(
    chapter: &ExportChapter,
    depth: usize,
    format: ExportFormat,
    nested: bool,
) -> String {
    let content = parse_tiptap_content(&chapter.content_json);
    let mut out = String::new();

    match format {
        ExportFormat::Markdown => {
            let level = if nested { (depth + 2).min(6) } else { 1 };
            out.push_str(&format!("{} {}\n\n", "#".repeat(level), chapter.title));
            out.push_str(&render_doc_markdown(&content));
        }
        ExportFormat::PlainText => {
            out.push_str(&chapter.title);
            out.push_str("\n\n");
            out.push_str(&render_doc_text(&content));
        }
    }

    out.trim_end().to_string() + "\n"
}

fn parse_tiptap_content(raw: &str) -> Value {
    serde_json::from_str(raw).unwrap_or(Value::Null)
}

fn render_doc_markdown(doc: &Value) -> String {
    let mut blocks = Vec::new();
    if let Some(content) = doc.get("content").and_then(Value::as_array) {
        for node in content {
            render_block_markdown(node, 0, &mut blocks);
        }
    }
    blocks.join("\n\n")
}

fn render_block_markdown(node: &Value, indent: usize, blocks: &mut Vec<String>) {
    let node_type = node.get("type").and_then(Value::as_str).unwrap_or_default();
    match node_type {
        "paragraph" => {
            let text = render_inline_markdown(node);
            if !text.trim().is_empty() {
                blocks.push(format!("{}{}", " ".repeat(indent), text.trim()));
            }
        }
        "heading" => {
            let level = node
                .get("attrs")
                .and_then(|attrs| attrs.get("level"))
                .and_then(Value::as_u64)
                .unwrap_or(2)
                .clamp(1, 6) as usize;
            let text = render_inline_markdown(node);
            if !text.trim().is_empty() {
                blocks.push(format!("{} {}", "#".repeat(level), text.trim()));
            }
        }
        "blockquote" => {
            let text = render_children_markdown(node, 0);
            if !text.trim().is_empty() {
                blocks.push(
                    text.lines()
                        .map(|line| format!("> {line}"))
                        .collect::<Vec<_>>()
                        .join("\n"),
                );
            }
        }
        "bulletList" => render_list_markdown(node, indent, false, blocks),
        "orderedList" => render_list_markdown(node, indent, true, blocks),
        "codeBlock" => {
            let text = render_inline_text(node);
            blocks.push(format!("```text\n{}\n```", text.trim_end()));
        }
        "horizontalRule" => blocks.push("---".into()),
        _ => {
            let text = render_children_markdown(node, indent);
            if !text.trim().is_empty() {
                blocks.push(text);
            }
        }
    }
}

fn render_children_markdown(node: &Value, indent: usize) -> String {
    let mut blocks = Vec::new();
    if let Some(content) = node.get("content").and_then(Value::as_array) {
        for child in content {
            render_block_markdown(child, indent, &mut blocks);
        }
    }
    blocks.join("\n\n")
}

fn render_list_markdown(node: &Value, indent: usize, ordered: bool, blocks: &mut Vec<String>) {
    let Some(items) = node.get("content").and_then(Value::as_array) else {
        return;
    };

    let mut lines = Vec::new();
    for (index, item) in items.iter().enumerate() {
        let prefix = if ordered {
            format!("{}.", index + 1)
        } else {
            "-".into()
        };
        let item_text = render_list_item_markdown(item, indent + 2);
        let mut item_lines = item_text.lines();
        let first = item_lines.next().unwrap_or_default();
        lines.push(format!("{}{} {}", " ".repeat(indent), prefix, first.trim()));
        for line in item_lines {
            lines.push(format!("{}{}", " ".repeat(indent + 2), line.trim()));
        }
    }

    if !lines.is_empty() {
        blocks.push(lines.join("\n"));
    }
}

fn render_list_item_markdown(node: &Value, nested_indent: usize) -> String {
    let mut parts = Vec::new();
    if let Some(content) = node.get("content").and_then(Value::as_array) {
        for child in content {
            match child
                .get("type")
                .and_then(Value::as_str)
                .unwrap_or_default()
            {
                "paragraph" => {
                    let text = render_inline_markdown(child);
                    if !text.trim().is_empty() {
                        parts.push(text);
                    }
                }
                "bulletList" => {
                    let mut nested = Vec::new();
                    render_list_markdown(child, nested_indent, false, &mut nested);
                    parts.extend(nested);
                }
                "orderedList" => {
                    let mut nested = Vec::new();
                    render_list_markdown(child, nested_indent, true, &mut nested);
                    parts.extend(nested);
                }
                _ => {
                    let text = render_children_markdown(child, nested_indent);
                    if !text.trim().is_empty() {
                        parts.push(text);
                    }
                }
            }
        }
    }
    parts.join("\n")
}

fn render_inline_markdown(node: &Value) -> String {
    let mut out = String::new();
    if let Some(content) = node.get("content").and_then(Value::as_array) {
        for child in content {
            match child
                .get("type")
                .and_then(Value::as_str)
                .unwrap_or_default()
            {
                "text" => out.push_str(&render_text_markdown(child)),
                "hardBreak" => out.push_str("  \n"),
                _ => out.push_str(&render_inline_markdown(child)),
            }
        }
    }
    out
}

fn render_text_markdown(node: &Value) -> String {
    let mut text = node
        .get("text")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();

    if let Some(marks) = node.get("marks").and_then(Value::as_array) {
        for mark in marks {
            match mark.get("type").and_then(Value::as_str).unwrap_or_default() {
                "code" => text = format!("`{text}`"),
                "bold" => text = format!("**{text}**"),
                "italic" => text = format!("*{text}*"),
                "strike" => text = format!("~~{text}~~"),
                "underline" => text = format!("<u>{text}</u>"),
                _ => {}
            }
        }
    }

    text
}

fn render_doc_text(doc: &Value) -> String {
    let mut blocks = Vec::new();
    if let Some(content) = doc.get("content").and_then(Value::as_array) {
        for node in content {
            render_block_text(node, 0, &mut blocks);
        }
    }
    blocks.join("\n\n")
}

fn render_block_text(node: &Value, indent: usize, blocks: &mut Vec<String>) {
    let node_type = node.get("type").and_then(Value::as_str).unwrap_or_default();
    match node_type {
        "paragraph" | "heading" | "codeBlock" => {
            let text = render_inline_text(node);
            if !text.trim().is_empty() {
                blocks.push(format!("{}{}", " ".repeat(indent), text.trim()));
            }
        }
        "blockquote" => {
            let text = render_children_text(node, indent);
            if !text.trim().is_empty() {
                blocks.push(text);
            }
        }
        "bulletList" => render_list_text(node, indent, false, blocks),
        "orderedList" => render_list_text(node, indent, true, blocks),
        "horizontalRule" => blocks.push("***".into()),
        _ => {
            let text = render_children_text(node, indent);
            if !text.trim().is_empty() {
                blocks.push(text);
            }
        }
    }
}

fn render_children_text(node: &Value, indent: usize) -> String {
    let mut blocks = Vec::new();
    if let Some(content) = node.get("content").and_then(Value::as_array) {
        for child in content {
            render_block_text(child, indent, &mut blocks);
        }
    }
    blocks.join("\n\n")
}

fn render_list_text(node: &Value, indent: usize, ordered: bool, blocks: &mut Vec<String>) {
    let Some(items) = node.get("content").and_then(Value::as_array) else {
        return;
    };

    let mut lines = Vec::new();
    for (index, item) in items.iter().enumerate() {
        let prefix = if ordered {
            format!("{}.", index + 1)
        } else {
            "-".into()
        };
        let item_text = render_list_item_text(item, indent + 2);
        let mut item_lines = item_text.lines();
        let first = item_lines.next().unwrap_or_default();
        lines.push(format!("{}{} {}", " ".repeat(indent), prefix, first.trim()));
        for line in item_lines {
            lines.push(format!("{}{}", " ".repeat(indent + 2), line.trim()));
        }
    }

    if !lines.is_empty() {
        blocks.push(lines.join("\n"));
    }
}

fn render_list_item_text(node: &Value, nested_indent: usize) -> String {
    let mut parts = Vec::new();
    if let Some(content) = node.get("content").and_then(Value::as_array) {
        for child in content {
            match child
                .get("type")
                .and_then(Value::as_str)
                .unwrap_or_default()
            {
                "paragraph" => {
                    let text = render_inline_text(child);
                    if !text.trim().is_empty() {
                        parts.push(text);
                    }
                }
                "bulletList" => {
                    let mut nested = Vec::new();
                    render_list_text(child, nested_indent, false, &mut nested);
                    parts.extend(nested);
                }
                "orderedList" => {
                    let mut nested = Vec::new();
                    render_list_text(child, nested_indent, true, &mut nested);
                    parts.extend(nested);
                }
                _ => {
                    let text = render_children_text(child, nested_indent);
                    if !text.trim().is_empty() {
                        parts.push(text);
                    }
                }
            }
        }
    }
    parts.join("\n")
}

fn render_inline_text(node: &Value) -> String {
    let mut out = String::new();
    if let Some(content) = node.get("content").and_then(Value::as_array) {
        for child in content {
            match child
                .get("type")
                .and_then(Value::as_str)
                .unwrap_or_default()
            {
                "text" => out.push_str(
                    child
                        .get("text")
                        .and_then(Value::as_str)
                        .unwrap_or_default(),
                ),
                "hardBreak" => out.push('\n'),
                _ => out.push_str(&render_inline_text(child)),
            }
        }
    }
    out
}

fn parse_format(format: &str) -> AppResult<ExportFormat> {
    match format {
        "markdown" => Ok(ExportFormat::Markdown),
        "plainText" => Ok(ExportFormat::PlainText),
        other => Err(AppError::InvalidInput(format!(
            "unsupported export format: {other}"
        ))),
    }
}

fn parse_mode(mode: &str) -> AppResult<ExportMode> {
    match mode {
        "merged" => Ok(ExportMode::Merged),
        "chapterFiles" => Ok(ExportMode::ChapterFiles),
        other => Err(AppError::InvalidInput(format!(
            "unsupported export mode: {other}"
        ))),
    }
}

fn sanitize_filename(value: &str) -> String {
    let sanitized: String = value
        .chars()
        .map(|ch| match ch {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '-',
            ch if ch.is_control() => '-',
            ch => ch,
        })
        .collect();
    let sanitized = sanitized.trim().trim_matches('.').to_string();
    if sanitized.is_empty() {
        "untitled".into()
    } else {
        sanitized.chars().take(80).collect()
    }
}

fn path_to_string(path: PathBuf) -> String {
    path.to_string_lossy().to_string()
}
