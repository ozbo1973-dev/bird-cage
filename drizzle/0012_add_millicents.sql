-- Add fragment_millicents to user table (accumulates sub-penny cost remainders across AI calls)
ALTER TABLE `user` ADD COLUMN `fragment_millicents` integer NOT NULL DEFAULT 0;

-- Add cost_millicents to usage_logs table (fractional millicent portion of each call's cost)
ALTER TABLE `usage_logs` ADD COLUMN `cost_millicents` integer NOT NULL DEFAULT 0;
