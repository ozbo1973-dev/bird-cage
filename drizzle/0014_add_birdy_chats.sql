CREATE TABLE IF NOT EXISTS birdy_chats (
  id         INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id    TEXT    NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title      TEXT    NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

CREATE INDEX IF NOT EXISTS birdy_chats_user_id_idx ON birdy_chats (user_id);

CREATE TABLE IF NOT EXISTS birdy_chat_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  chat_id    INTEGER NOT NULL REFERENCES birdy_chats(id) ON DELETE CASCADE,
  role       TEXT    NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT    NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

CREATE INDEX IF NOT EXISTS birdy_chat_messages_chat_id_idx ON birdy_chat_messages (chat_id);
