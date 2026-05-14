# 04 · 数据模型

## 4.1 ERD（核心实体）

```
                ┌──────────────┐
                │   projects   │
                └──────┬───────┘
        ┌─────────────┼─────────────┬─────────────┐
        │             │             │             │
        ▼             ▼             ▼             ▼
   ┌─────────┐  ┌──────────┐  ┌─────────────┐  ┌──────────────┐
   │chapters │  │characters│  │outline_nodes│  │writing_sess. │
   └────┬────┘  └────┬─────┘  └─────────────┘  └──────────────┘
        │            │
        │            ▼
        │     ┌────────────────────┐
        │     │character_relations │
        │     └────────────────────┘
        │
        ├────────────► annotations
        ├────────────► revisions
        └────────────► chapters_fts (FTS5)

        independent:
        ┌───────────────┐    ┌──────────┐    ┌────────────┐
        │ ai_credentials│    │ settings │    │ai_messages │
        └───────────────┘    └──────────┘    └────────────┘
```

## 4.2 SQL Schema (DDL)

```sql
-- 0001_init.sql

CREATE TABLE projects (
  id                 TEXT PRIMARY KEY,                -- ULID
  name               TEXT NOT NULL,
  description        TEXT,
  cover_path         TEXT,
  target_word_count  INTEGER NOT NULL DEFAULT 0,
  created_at         INTEGER NOT NULL,                -- unix ms
  updated_at         INTEGER NOT NULL,
  archived           INTEGER NOT NULL DEFAULT 0       -- 0/1
);

CREATE TABLE chapters (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id     TEXT REFERENCES chapters(id) ON DELETE CASCADE,  -- 卷/章树
  sort          INTEGER NOT NULL DEFAULT 0,
  title         TEXT NOT NULL,
  summary       TEXT,
  content_json  TEXT NOT NULL DEFAULT '{}',           -- TipTap JSON
  word_count    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft',        -- draft|revising|done
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX idx_chapters_project_sort ON chapters(project_id, parent_id, sort);

CREATE TABLE characters (
  id              TEXT PRIMARY KEY,
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  alias           TEXT,
  avatar_path     TEXT,
  role_type       TEXT,                               -- 主角|配角|反派|其他
  profile_md      TEXT NOT NULL DEFAULT '',
  attributes_json TEXT NOT NULL DEFAULT '{}',         -- 自由属性
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX idx_characters_project ON characters(project_id);

CREATE TABLE character_relations (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_id       TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  to_id         TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,                        -- 父子|师徒|敌对...
  note          TEXT
);

CREATE TABLE outline_nodes (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id   TEXT REFERENCES outline_nodes(id) ON DELETE CASCADE,
  sort        INTEGER NOT NULL DEFAULT 0,
  title       TEXT NOT NULL,
  content_md  TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'idea'            -- idea|drafting|done
);
CREATE INDEX idx_outline_project_sort ON outline_nodes(project_id, parent_id, sort);

CREATE TABLE annotations (
  id          TEXT PRIMARY KEY,
  chapter_id  TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  range_from  INTEGER NOT NULL,
  range_to    INTEGER NOT NULL,
  kind        TEXT NOT NULL,                          -- comment|todo|highlight
  note        TEXT,
  color       TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_annotations_chapter ON annotations(chapter_id);

CREATE TABLE revisions (
  id                TEXT PRIMARY KEY,
  chapter_id        TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  content_json      TEXT NOT NULL,
  word_count_delta  INTEGER NOT NULL DEFAULT 0,
  source            TEXT NOT NULL DEFAULT 'manual',   -- manual|ai_polish|review
  created_at        INTEGER NOT NULL
);
CREATE INDEX idx_revisions_chapter ON revisions(chapter_id, created_at);

CREATE TABLE writing_sessions (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  started_at    INTEGER NOT NULL,
  ended_at      INTEGER,
  words_written INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_sessions_project_time ON writing_sessions(project_id, started_at);

CREATE TABLE ai_messages (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scope       TEXT NOT NULL,                          -- chat|polish|review
  role        TEXT NOT NULL,                          -- system|user|assistant
  content     TEXT NOT NULL,
  tokens      INTEGER,
  created_at  INTEGER NOT NULL
);

CREATE TABLE settings (
  key    TEXT PRIMARY KEY,
  value  TEXT
);

-- AI 凭据：仅存密文，明文在 stronghold 中
CREATE TABLE ai_credentials (
  provider    TEXT PRIMARY KEY,                       -- openai|anthropic|gemini
  ciphertext  BLOB NOT NULL,
  nonce       BLOB NOT NULL,
  base_url    TEXT,                                   -- 兼容自部署
  model       TEXT
);

-- 全文检索（章节正文）
CREATE VIRTUAL TABLE chapters_fts USING fts5(
  chapter_id UNINDEXED,
  content,
  tokenize = 'unicode61'
);

-- 触发器：保持 fts 同步
CREATE TRIGGER chapters_ai AFTER INSERT ON chapters BEGIN
  INSERT INTO chapters_fts(chapter_id, content) VALUES (new.id, new.content_json);
END;
CREATE TRIGGER chapters_au AFTER UPDATE ON chapters BEGIN
  UPDATE chapters_fts SET content = new.content_json WHERE chapter_id = new.id;
END;
CREATE TRIGGER chapters_ad AFTER DELETE ON chapters BEGIN
  DELETE FROM chapters_fts WHERE chapter_id = old.id;
END;
```

## 4.3 ID 策略

使用 **ULID**（Crockford Base32, 26 字符），优点：
- 时间有序（便于按创建时间排序、避免索引热点）
- 字典序可比较（不需 unhex）
- 跨设备无冲突

Rust 侧 `ulid` crate；前端只读，绝不生成 ID（统一由 Rust 分配）。

## 4.4 时间戳约定

所有时间字段：**unix milliseconds (`INTEGER`)，UTC**。
- 显示用前端 `dayjs` 转本地时区。
- 跨平台/跨时区无歧义。

## 4.5 软删除？

v0.1 不引入软删除。"归档"用 `projects.archived`；章节误删可由 `revisions` 找回最近版本（保留最近 30 个版本）。

## 4.6 备份与迁移

- DB 文件位置：Tauri `path::app_data_dir()/wordforge/wordforge.db`
- 备份：复制整个文件即可；自动备份默认每日凌晨触发（用户可关）。
- Schema 迁移：`wordforge/src-tauri/migrations/000X_*.sql` 命名，由 Rust 侧 `sqlx::migrate!` 在启动时执行；**永不修改已发布的迁移文件**，新增即可。
