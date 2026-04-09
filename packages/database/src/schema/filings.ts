import { mysqlTable, varchar, text, timestamp, decimal, json } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const filings = mysqlTable('inv_filings', {
  id: varchar('id', { length: 36 }).primaryKey(),
  filingNumber: varchar('filing_number', { length: 30 }).notNull().unique(),
  type: varchar('type', { length: 30 }).notNull(),                 // equity_direct | fund_project | fund_investment | legal_entity | other
  projectStage: varchar('project_stage', { length: 20 }).notNull().default('invest'),  // invest | exit
  projectCategory: varchar('project_category', { length: 50 }),    // 项目类型（13 选项）
  title: varchar('title', { length: 200 }).notNull(),              // 项目说明（一句话摘要）
  description: text('description').notNull(),                       // 备案具体事项

  // 项目信息
  projectName: varchar('project_name', { length: 200 }).notNull(),
  legalEntityName: varchar('legal_entity_name', { length: 200 }),
  domain: varchar('domain', { length: 50 }).notNull(),
  industry: varchar('industry', { length: 100 }).notNull(),

  // 金额
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),    // 万元
  currency: varchar('currency', { length: 10 }).notNull().default('CNY'),

  // 直投专有（保留列兼容旧数据，前端不再渲染）
  investmentRatio: decimal('investment_ratio', { precision: 5, scale: 2 }),
  valuationAmount: decimal('valuation_amount', { precision: 15, scale: 2 }),

  // 对赌变更专有（保留列兼容旧数据，前端不再渲染）
  originalTarget: decimal('original_target', { precision: 15, scale: 2 }),
  newTarget: decimal('new_target', { precision: 15, scale: 2 }),
  changeReason: text('change_reason'),

  // 流程相关
  approvalGroups: json('approval_groups').$type<string[]>().notNull().default([]),
  emailRecipients: json('email_recipients').$type<string[]>().notNull().default([]),
  confirmedBy: varchar('confirmed_by', { length: 36 }),

  // 状态
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  riskLevel: varchar('risk_level', { length: 10 }),

  // 项目编号
  projectCode: varchar('project_code', { length: 50 }),

  // 关联
  creatorId: varchar('creator_id', { length: 36 }).notNull(),

  // 时间
  createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  submittedAt: timestamp('submitted_at'),
  completedAt: timestamp('completed_at'),
  filingTime: timestamp('filing_time'),
});
