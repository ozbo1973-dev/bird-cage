CREATE TABLE `email_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sender_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
	`recipient_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`sent_at` integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);
--> statement-breakpoint
CREATE INDEX `email_logs_recipientId_idx` ON `email_logs` (`recipient_id`);
--> statement-breakpoint
CREATE INDEX `email_logs_senderId_idx` ON `email_logs` (`sender_id`);
