CREATE TABLE `inv_users` (
	`id` varchar(36) NOT NULL,
	`username` varchar(50) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`name` varchar(100) NOT NULL,
	`role` varchar(20) NOT NULL,
	`department` varchar(100) NOT NULL,
	`domain` varchar(50) NOT NULL,
	`email` varchar(200),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `inv_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `inv_users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `inv_filings` (
	`id` varchar(36) NOT NULL,
	`filing_number` varchar(30) NOT NULL,
	`type` varchar(30) NOT NULL,
	`project_stage` varchar(20) NOT NULL DEFAULT 'invest',
	`project_category` varchar(50),
	`title` varchar(200) NOT NULL,
	`description` text NOT NULL,
	`project_name` varchar(200) NOT NULL,
	`legal_entity_name` varchar(200),
	`domain` varchar(50) NOT NULL,
	`industry` varchar(100) NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'CNY',
	`investment_ratio` decimal(5,2),
	`valuation_amount` decimal(15,2),
	`original_target` decimal(15,2),
	`new_target` decimal(15,2),
	`change_reason` text,
	`approval_groups` json NOT NULL DEFAULT ('[]'),
	`email_recipients` json NOT NULL DEFAULT ('[]'),
	`confirmed_by` varchar(36),
	`status` varchar(30) NOT NULL DEFAULT 'draft',
	`risk_level` varchar(10),
	`project_code` varchar(50),
	`creator_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`submitted_at` timestamp,
	`completed_at` timestamp,
	`filing_time` timestamp,
	CONSTRAINT `inv_filings_id` PRIMARY KEY(`id`),
	CONSTRAINT `inv_filings_filing_number_unique` UNIQUE(`filing_number`)
);
--> statement-breakpoint
CREATE TABLE `inv_approvals` (
	`id` varchar(36) NOT NULL,
	`filing_id` varchar(36) NOT NULL,
	`approver_id` varchar(36) NOT NULL,
	`approver_name` varchar(100) NOT NULL,
	`stage` varchar(20) NOT NULL DEFAULT 'business',
	`level` int NOT NULL,
	`group_name` varchar(20),
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`comment` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`decided_at` timestamp,
	`reassigned_from` varchar(36),
	`external_todo_id` varchar(100),
	CONSTRAINT `inv_approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inv_attachments` (
	`id` varchar(36) NOT NULL,
	`filing_id` varchar(36) NOT NULL,
	`filename` varchar(255) NOT NULL,
	`file_path` text NOT NULL,
	`file_size` int NOT NULL,
	`mime_type` varchar(100) NOT NULL,
	`uploaded_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `inv_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inv_audit_logs` (
	`id` varchar(36) NOT NULL,
	`action` varchar(50) NOT NULL,
	`entity_type` varchar(30) NOT NULL,
	`entity_id` text NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`user_name` varchar(100) NOT NULL,
	`detail` json NOT NULL DEFAULT ('{}'),
	`field_source` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `inv_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inv_approval_group_configs` (
	`id` varchar(36) NOT NULL,
	`group_name` varchar(30) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`user_name` varchar(100) NOT NULL,
	`user_email` varchar(200) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `inv_approval_group_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inv_email_cc_configs` (
	`id` varchar(36) NOT NULL,
	`group_name` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`email` varchar(200) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `inv_email_cc_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inv_user_roles` (
	`emp_code` varchar(20) NOT NULL,
	`role` varchar(20) NOT NULL,
	`created_by` varchar(20) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `inv_user_roles_emp_code` PRIMARY KEY(`emp_code`)
);
