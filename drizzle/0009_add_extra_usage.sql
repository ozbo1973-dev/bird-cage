-- Add extra_usage_cents column to user table for purchased extra AI usage budget
ALTER TABLE `user` ADD COLUMN `extra_usage_cents` integer NOT NULL DEFAULT 0;
