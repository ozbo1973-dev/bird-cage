CREATE TABLE IF NOT EXISTS `email_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sender_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`sent_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`sender_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipient_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `email_logs_recipient_idx` ON `email_logs` (`recipient_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `email_logs_sender_idx` ON `email_logs` (`sender_id`);
