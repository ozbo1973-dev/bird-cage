ALTER TABLE `usage_logs` ADD `cost_millicents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `fragment_millicents` integer DEFAULT 0 NOT NULL;