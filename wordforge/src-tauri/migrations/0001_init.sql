-- 0001_init.sql
-- Initial schema for Wordforge. See doc/04-data-model.md.
-- Once released, never modify this file; create 0002_*.sql for changes.

CREATE TABLE projects (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  description        TEXT,
  cover_path         TEXT,
  target_word_count  INTEGER NOT NULL DEFAULT 0,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  archived           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE chapters (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id     TEXT REFERENCES chapters(id) ON DELETE CASCADE,
  sort          INTEGER NOT NULL DEFAULT 0,
  title         TEXT NOT NULL,
  summary       TEXT,
  content_json  TEXT NOT NULL DEFAULT '{}',
  word_count    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft',
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
  role_type       TEXT,
  profile_md      TEXT NOT NULL DEFAULT '',
  attributes_json TEXT NOT NULL DEFAULT '{}',
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX idx_characters_project ON characters(project_id);

CREATE TABLE character_relations (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_id       TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  to_id         TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  note          TEXT
);

CREATE TABLE outline_nodes (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id   TEXT REFERENCES outline_nodes(id) ON DELETE CASCADE,
  sort        INTEGER NOT NULL DEFAULT 0,
  title       TEXT NOT NULL,
  content_md  TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'idea'
);
CREATE INDEX idx_outline_project_sort ON outline_nodes(project_id, parent_id, sort);

CREATE TABLE annotations (
  id          TEXT PRIMARY KEY,
  chapter_id  TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  range_from  INTEGER NOT NULL,
  range_to    INTEGER NOT NULL,
  kind        TEXT NOT NULL,
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
  source            TEXT NOT NULL DEFAULT 'manual',
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
  scope       TEXT NOT NULL,
  role        TEXT NOT NULL,
  content     TEXT NOT NULL,
  tokens      INTEGER,
  created_at  INTEGER NOT NULL
);

CREATE TABLE settings (
  key    TEXT PRIMARY KEY,
  value  TEXT
);

CREATE TABLE ai_credentials (
  provider    TEXT PRIMARY KEY,
  ciphertext  BLOB NOT NULL,
  nonce       BLOB NOT NULL,
  base_url    TEXT,
  model       TEXT
);

CREATE VIRTUAL TABLE chapters_fts USING fts5(
  chapter_id UNINDEXED,
  content,
  tokenize = 'unicode61'
);

CREATE TRIGGER chapters_ai AFTER INSERT ON chapters BEGIN
  INSERT INTO chapters_fts(chapter_id, content) VALUES (new.id, new.content_json);
END;
CREATE TRIGGER chapters_au AFTER UPDATE ON chapters BEGIN
  UPDATE chapters_fts SET content = new.content_json WHERE chapter_id = new.id;
END;
CREATE TRIGGER chapters_ad AFTER DELETE ON chapters BEGIN
  DELETE FROM chapters_fts WHERE chapter_id = old.id;
END;
