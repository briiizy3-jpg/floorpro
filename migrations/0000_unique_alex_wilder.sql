CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`client_name` text,
	`client_address` text,
	`notes` text,
	`created_at` text DEFAULT '2026-09-28T17:41:00.477Z' NOT NULL,
	`updated_at` text DEFAULT '2026-09-28T17:41:00.477Z' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`name` text NOT NULL,
	`width` real NOT NULL,
	`length` real NOT NULL,
	`shape` text DEFAULT 'rectangular' NOT NULL,
	`material_type` text DEFAULT 'plank' NOT NULL,
	`material_width` real,
	`material_length` real,
	`pattern` text DEFAULT 'straight' NOT NULL,
	`waste_factor` real DEFAULT 10 NOT NULL,
	`price_per_unit` real,
	`labor_per_sqft` real,
	`layout_data` text,
	`created_at` text DEFAULT '2026-09-28T17:41:00.478Z' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`plan` text NOT NULL,
	`amount` real NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`start_date` text DEFAULT '2026-09-28T17:41:00.479Z' NOT NULL,
	`end_date` text,
	`created_at` text DEFAULT '2026-09-28T17:41:00.479Z' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`email` text,
	`plan` text DEFAULT 'free' NOT NULL,
	`subscription_status` text DEFAULT 'inactive' NOT NULL,
	`trial_ends_at` text,
	`created_at` text DEFAULT '2026-09-28T17:41:00.474Z' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);