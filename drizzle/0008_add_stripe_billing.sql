-- Add Stripe billing columns to user table
ALTER TABLE `user` ADD COLUMN `stripe_customer_id` text;
-- SQLite/LibSQL does not support UNIQUE on ALTER TABLE ADD COLUMN; use a separate index
CREATE UNIQUE INDEX IF NOT EXISTS `user_stripe_customer_id_unique` ON `user` (`stripe_customer_id`);
ALTER TABLE `user` ADD COLUMN `stripe_subscription_id` text;
ALTER TABLE `user` ADD COLUMN `subscription_status` text;
ALTER TABLE `user` ADD COLUMN `spending_limit_cents` integer;
ALTER TABLE `user` ADD COLUMN `current_month_usage_cents` integer NOT NULL DEFAULT 0;

-- Create usage_logs table for tracking AI usage costs
CREATE TABLE IF NOT EXISTS `usage_logs` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `model_used` text NOT NULL,
  `cost_cents` integer NOT NULL DEFAULT 0,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);

CREATE INDEX IF NOT EXISTS `usage_logs_userId_createdAt_idx` ON `usage_logs` (`user_id`, `created_at`);
