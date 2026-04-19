-- Add cancellation scheduling columns to user table
ALTER TABLE `user` ADD COLUMN `cancel_at_period_end` integer NOT NULL DEFAULT 0;
ALTER TABLE `user` ADD COLUMN `current_period_end` integer;
