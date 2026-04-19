ALTER TABLE `user` ADD `cancel_at_period_end` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `current_period_end` integer;