import { pgTable, text, timestamp, varchar, numeric, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const filings = pgTable('filings', {
  id: text('id').primaryKey(),
  filingNumber: varchar('filing_number', { length: 30 }).notNull().unique(),
  type: varchar('type', { length: 30 }).notNull(),                 // equity_direct | fund_project | fund_investment | legal_entity | other
  projectStage: varchar('project_stage', { length: 20 }).notNull().default('invest'),  // invest | exit | change | other
  title: varchar('title', { length: 200 }).notNull(),              // 项目说明（一句话摘要）
  description: text('description').notNull().default(''),          // 备案具体事项

  // 项目信息
  projectName: varchar('project_name', { length: 200 }).notNull(),
  legalEntityName: varchar('legal_entity_name', { length: 200 }),
  domain: varchar('domain', { length: 50 }).notNull(),
  industry: varchar('industry', { length: 100 }).notNull(),

  // 金额
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),    // 万元
  currency: varchar('currency', { length: 10 }).notNull().default('CNY'),

  // 直投专有
  investmentRatio: numeric('investment_ratio', { precision: 5, scale: 2 }),   // %
  valuationAmount: numeric('valuation_amount', { precision: 15, scale: 2 }),  // 万元

  // 对赌变更专有
  originalTarget: numeric('original_target', { precision: 15, scale: 2 }),    // 万元
  newTarget: numeric('new_target', { precision: 15, scale: 2 }),              // 万元
  changeReason: text('change_reason'),

  // 流程相关
  approvalGroups: jsonb('approval_groups').$type<string[]>().notNull().default([]),  // 发起人勾选的审批组 ['finance','hr',...]
  emailRecipients: jsonb('email_recipients').$type<string[]>().notNull().default([]),  // 邮件收件人 userId[]
  confirmedBy: text('confirmed_by'),     // 最终确认人 userId

  // 状态
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  riskLevel: varchar('risk_level', { length: 10 }),                           // low | medium | high (V3+)

  // 项目编号
  projectCode: varchar('project_code', { length: 50 }),        // 项目编号

  // 关联
  creatorId: text('creator_id').notNull(), // emp_code，不再引用本地 users 表

  // 时间
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  filingTime: timestamp('filing_time', { withTimezone: true }),  // 备案时间=邮件发出时间
});
