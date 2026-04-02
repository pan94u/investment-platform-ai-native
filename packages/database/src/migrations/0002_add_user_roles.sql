-- user_roles 表：存储用户角色配置
CREATE TABLE IF NOT EXISTS "user_roles" (
  "emp_code" varchar(20) PRIMARY KEY NOT NULL,
  "role" varchar(20) NOT NULL,
  "created_by" varchar(20) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
