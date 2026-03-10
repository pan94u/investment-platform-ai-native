import { pgTable, text, timestamp, varchar, numeric, integer } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const filings = pgTable('filings', {
  id: text('id').primaryKey(),
  filingNumber: varchar('filing_number', { length: 30 }).notNull().unique(),
  type: varchar('type', { length: 30 }).notNull(),             // direct_investment | earnout_change | fund_exit | legal_entity_setup | other_change
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull().default(''),

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

  // 状态
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  riskLevel: varchar('risk_level', { length: 10 }),                           // low | medium | high (V3+)

  // 关联
  creatorId: text('creator_id').notNull().references(() => users.id),

  // 时间
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});
