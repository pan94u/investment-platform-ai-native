CREATE TABLE "approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"filing_id" text NOT NULL,
	"approver_id" text NOT NULL,
	"approver_name" varchar(100) NOT NULL,
	"level" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"comment" text,
	"reassigned_from" text,
	"external_todo_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"filing_id" text NOT NULL,
	"filename" varchar(255) NOT NULL,
	"file_path" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"action" varchar(50) NOT NULL,
	"entity_type" varchar(30) NOT NULL,
	"entity_id" text NOT NULL,
	"user_id" text NOT NULL,
	"user_name" varchar(100) NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"field_source" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "filings" (
	"id" text PRIMARY KEY NOT NULL,
	"filing_number" varchar(30) NOT NULL,
	"type" varchar(30) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"project_name" varchar(200) NOT NULL,
	"legal_entity_name" varchar(200),
	"domain" varchar(50) NOT NULL,
	"industry" varchar(100) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'CNY' NOT NULL,
	"investment_ratio" numeric(5, 2),
	"valuation_amount" numeric(15, 2),
	"original_target" numeric(15, 2),
	"new_target" numeric(15, 2),
	"change_reason" text,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"risk_level" varchar(10),
	"creator_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "filings_filing_number_unique" UNIQUE("filing_number")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"role" varchar(20) NOT NULL,
	"department" varchar(100) NOT NULL,
	"domain" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_filing_id_filings_id_fk" FOREIGN KEY ("filing_id") REFERENCES "public"."filings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_filing_id_filings_id_fk" FOREIGN KEY ("filing_id") REFERENCES "public"."filings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filings" ADD CONSTRAINT "filings_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;