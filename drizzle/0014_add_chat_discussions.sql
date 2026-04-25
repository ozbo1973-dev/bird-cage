CREATE TABLE IF NOT EXISTS `chat_discussions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `title` text NOT NULL,
  `messages` text NOT NULL,
  `created_at` integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

CREATE INDEX IF NOT EXISTS `chat_discussions_userId_idx` ON `chat_discussions` (`user_id`);
