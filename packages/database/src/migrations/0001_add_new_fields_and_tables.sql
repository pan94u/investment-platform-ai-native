-- Add missing columns to existing tables

-- users: add email
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" varchar(200);

-- filings: add project_code, filing_time, project_stage, approval_groups, email_recipients, confirmed_by
ALTER TABLE "filings" ADD COLUMN IF NOT EXISTS "project_stage" varchar(20) DEFAULT 'invest' NOT NULL;
ALTER TABLE "filings" ADD COLUMN IF NOT EXISTS "approval_groups" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "filings" ADD COLUMN IF NOT EXISTS "email_recipients" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "filings" ADD COLUMN IF NOT EXISTS "confirmed_by" text;
ALTER TABLE "filings" ADD COLUMN IF NOT EXISTS "project_code" varchar(50);
ALTER TABLE "filings" ADD COLUMN IF NOT EXISTS "filing_time" timestamp with time zone;

-- approvals: add stage, group_name
ALTER TABLE "approvals" ADD COLUMN IF NOT EXISTS "stage" varchar(20) DEFAULT 'business' NOT NULL;
ALTER TABLE "approvals" ADD COLUMN IF NOT EXISTS "group_name" varchar(20);

--> statement-breakpoint

-- New table: approval_group_configs
CREATE TABLE IF NOT EXISTS "approval_group_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"group_name" varchar(30) NOT NULL,
	"user_id" text NOT NULL,
	"user_name" varchar(100) NOT NULL,
	"user_email" varchar(200) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint

-- New table: email_cc_configs
CREATE TABLE IF NOT EXISTS "email_cc_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"group_name" varchar(30) NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(200) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
