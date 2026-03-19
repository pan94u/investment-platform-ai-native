# V1 审批流程升级实施计划

> 2026-03-12 · 对齐后待实施

## Context

当前 V1 审批流程存在五个核心缺陷：
1. 审批人硬编码 `supervisors[0]` / `groupApprovers[0]`，无法处理同人审批
2. 无组织数据抽象，未来无法低成本对接外部组织中心
3. 管理员无法干预审批人分配
4. 仅 Web UI 可审批，高管需 5 步操作
5. 审计日志在路由层调用，MCP/Webhook 等其他入口会跳过审计

本次升级引入 **OrgProvider + NotifyProvider** 双接口模式，重构审批引擎，新增撤回/改派/批量审批/飞书待办四项能力。

## 用户诉求原文

1. 两级审批可能是同一个人，因为组织设定原因，这种情况下两级审批要被捏合成一级审批
2. 组织中心的数据可能来源于多个数据源，要想好与其他数据中心或类组织中心数据源的集成方案，我要低成本集成
3. 在极限情况下应可以让管理员手工改审批人
4. 所有的审批不光从界面审批，更应从飞书待办直接审批
5. 当前的所有功能都有可能在权限授权的情况下被AI直接调用，故所有功能最好MCP化

附加确认：飞书凭据能拿到；撤回+批量审批纳入；优先级认同。

---

## 新状态机

```
draft ──submit──→ pending_level1 ──L1 approve──→ pending_level2 ──L2 approve──→ completed
  ↑                    │     │                       │     │
  │                    │  recall                     │  recall
  │                    ↓     ↓                       ↓     ↓
  │                 rejected  recalled             rejected  recalled
  │
  └──(同人捏合: pending_level1 ──L1 approve──→ completed, 跳过 L2)
```

撤回条件：filing 处于 pending_level1 或 pending_level2，且当前级别审批尚未 decided。

---

## 实施步骤

### Phase A: 基础设施 (数据库 + 类型 + 接口)

**A1. Schema 扩展** — `packages/database/src/schema/approvals.ts`
- 加列 `reassignedFrom: text('reassigned_from')` (nullable)
- 加列 `externalTodoId: text('external_todo_id')` (nullable)

**A2. 共享类型扩展** — `packages/shared/src/types/audit-log.ts`
- AuditAction 加: `'filing_recalled'` | `'approval_reassigned'` | `'approval_batch_approved'`

**A3. 前端常量** — `apps/v1-traditional/frontend/src/lib/constants.ts`
- STATUS_LABELS 加 `recalled: '已撤回'`
- STATUS_COLORS 加 `recalled: 'bg-slate-100 text-slate-600'`

**A4. Provider 接口定义** — 新建 `apps/v1-traditional/backend/src/providers/types.ts`
```typescript
export interface ApproverInfo {
  readonly userId: string;
  readonly name: string;
  readonly level: number; // 1-based
}

export interface ApproverChainContext {
  readonly creatorId: string;
  readonly creatorDepartment: string;
  readonly creatorDomain: string;
  readonly filingType: string;
  readonly amount: string;
}

export interface OrgProvider {
  getApproverChain(ctx: ApproverChainContext): Promise<readonly ApproverInfo[]>;
}

export interface TodoPayload {
  readonly approvalId: string;
  readonly filingId: string;
  readonly filingTitle: string;
  readonly filingNumber: string;
  readonly approverUserId: string;
  readonly approverName: string;
  readonly level: number;
  readonly creatorName: string;
  readonly amount: string;
  readonly filingType: string;
}

export interface NotifyProvider {
  pushTodo(payload: TodoPayload): Promise<string | null>; // returns externalTodoId
  updateTodo(externalTodoId: string, update: Record<string, string>): Promise<void>;
  closeTodo(externalTodoId: string, result: 'approved' | 'rejected' | 'recalled'): Promise<void>;
}
```

### Phase B: Provider 实现

**B1.** 新建 `providers/org-db.ts` — DatabaseOrgProvider (~80行)
- `getApproverChain()`: 查 supervisor + group_approver
- **同人捏合**: 如果 L1.userId === L2.userId，返回 `[{userId, name, level: 1}]` 单元素数组
- 优先匹配同 department/domain 的 supervisor，fallback 到任意 supervisor

**B2.** 新建 `providers/notify-mock.ts` — MockNotifyProvider (~25行)
- 所有方法 `console.log` + return null

**B3.** 新建 `providers/notify-feishu.ts` — FeishuNotifyProvider (~130行)
- `pushTodo()`: POST `https://open.feishu.cn/open-apis/task/v2/tasks` 创建任务
- `closeTodo()`: PATCH complete 任务
- `updateTodo()`: PATCH 更新任务
- 内部缓存 `tenant_access_token`（2h 过期）
- env vars: `FEISHU_APP_ID`, `FEISHU_APP_SECRET`
- 所有调用 try/catch，失败不阻断审批流程（降级为日志）

**B4.** 新建 `providers/index.ts` — 工厂 (~20行)
- `getOrgProvider()` → DatabaseOrgProvider 单例
- `getNotifyProvider()` → 有 FEISHU_APP_ID 时用 Feishu，否则 Mock

### Phase C: Service 层重构 (核心)

**C1. 重构 `services/filing.ts`** — submitFiling + 新增 recallFiling

`submitFiling(filingId, userId)` 改造:
1. 验证 draft + creator ownership（不变）
2. 查 filing + creator 信息
3. 调 `orgProvider.getApproverChain(context)` 获取审批链
4. **同人捏合**: chain.length === 1 时只建 1 条审批
5. 建审批记录 → `notifyProvider.pushTodo()`
6. Filing → pending_level1
7. **审计日志在此处写**（从路由层移入）

新增 `recallFiling(filingId, userId)`:
1. 验证 filing 是 pending_level1 或 pending_level2
2. 验证 creatorId === userId
3. 查当前级别的 pending 审批，确认未 decided
4. 更新 pending 审批 → status='rejected', comment='发起人撤回'
5. `notifyProvider.closeTodo(externalTodoId, 'recalled')`
6. Filing → recalled
7. 审计日志

**C2. 重构 `services/approval.ts`** — processApproval + 新增 reassign/batch

`processApproval(approvalId, approverId, action, comment?)` 改造:
1. 验证（不变）
2. 更新审批状态
3. `notifyProvider.closeTodo()` 关闭当前待办
4. **reject**: filing → rejected, 审计日志, return
5. **approve**: 查 filing + creator 信息, 调 `orgProvider.getApproverChain()` 获取完整链
   - 如果当前 level < chain.length: 建下一级审批 + pushTodo + filing → pending_level{n+1}
   - 如果当前 level >= chain.length（含同人捏合场景）: filing → completed
6. **审计日志在此处写**

新增 `reassignApproval(approvalId, adminUserId, newApproverId, reason?)`:
1. 验证审批 pending + admin 角色
2. 查新审批人信息
3. 记录 reassignedFrom = 旧 approverId
4. 更新审批记录 approverId/approverName
5. closeTodo(旧) + pushTodo(新)
6. 审计日志

新增 `batchApprove(approvalIds, approverId, comment?)`:
1. 查所有审批 where id IN ids AND approverId = approverId AND status = 'pending'
2. 逐条调 processApproval
3. 返回 `{ succeeded: string[], failed: {id, error}[] }`

### Phase D: Route 层 + Webhook

**D1. 新建 `middleware/require-role.ts`** (~15行)
- `requireRole(...roles)` Hono middleware factory

**D2. 改造 `routes/filings.ts`**
- 移除所有 `auditService.logAudit` 调用（已在 service 内）
- 新增 `POST /:id/recall`

**D3. 改造 `routes/approvals.ts`**
- 移除所有 `auditService.logAudit` 调用
- 新增 `PUT /:id/reassign` — requireRole('admin')
- 新增 `POST /batch-approve`

**D4. 新建 `routes/webhooks.ts`** (~50行)
- `POST /api/webhooks/feishu/approval-callback`
- 解析飞书事件 → 映射到 processApproval 调用
- 无 authMiddleware（飞书签名验证，PoC 可简化）

**D5. 改造 `index.ts`**
- 挂载 webhooks route

### Phase E: 前端适配

**E1. `api.ts`** — 新增 3 个 API 方法
- `recallFiling(id)` → POST
- `reassignApproval(id, newApproverId, reason?)` → PUT
- `batchApproveApprovals(ids, comment?)` → POST

**E2. `filings/[id]/page.tsx`** — 备案详情
- 添加「撤回」按钮: 条件 = status 是 pending_* + user 是 creator

**E3. `approvals/page.tsx`** — 审批待办
- 添加批量审批: 勾选框 + "批量同意" 按钮
- Admin 角色: 审批卡片上显示「改派」入口

---

## 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 改 | `packages/database/src/schema/approvals.ts` | +2 列 |
| 改 | `packages/shared/src/types/audit-log.ts` | +3 AuditAction |
| 新 | `backend/src/providers/types.ts` | 接口定义 |
| 新 | `backend/src/providers/org-db.ts` | DB 组织数据 |
| 新 | `backend/src/providers/notify-mock.ts` | Mock 通知 |
| 新 | `backend/src/providers/notify-feishu.ts` | 飞书通知 |
| 新 | `backend/src/providers/index.ts` | 工厂 |
| 新 | `backend/src/middleware/require-role.ts` | 角色守卫 |
| 改 | `backend/src/services/filing.ts` | submitFiling 重构 + recallFiling |
| 改 | `backend/src/services/approval.ts` | processApproval 重构 + reassign + batch |
| 改 | `backend/src/routes/filings.ts` | 去审计 + recall endpoint |
| 改 | `backend/src/routes/approvals.ts` | 去审计 + reassign/batch endpoints |
| 新 | `backend/src/routes/webhooks.ts` | 飞书回调 |
| 改 | `backend/src/index.ts` | 挂载 webhooks |
| 改 | `frontend/src/lib/constants.ts` | recalled 状态 |
| 改 | `frontend/src/lib/api.ts` | +3 API 方法 |
| 改 | `frontend/src/app/filings/[id]/page.tsx` | 撤回按钮 |
| 改 | `frontend/src/app/approvals/page.tsx` | 批量审批 + 改派 |

---

## 新增 API 端点

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/api/filings/:id/recall` | creator | 撤回已提交备案 |
| PUT | `/api/approvals/:id/reassign` | admin | 改派审批人 |
| POST | `/api/approvals/batch-approve` | approver | 批量审批 |
| POST | `/api/webhooks/feishu/approval-callback` | 飞书签名 | 飞书待办回调 |

---

## 验证计划

1. **基本审批不退化**: 提交 → L1 通过 → L2 通过 → completed
2. **同人捏合**: 让同一人同时匹配 L1/L2，提交后只生成 1 条审批，通过即 completed
3. **撤回**: 提交后在 L1 审批前撤回 → status=recalled
4. **撤回限制**: L1 已通过后尝试撤回 → 报错（已有 decided 记录）
5. **管理员改派**: admin 把 lisi 的待办改派给其他用户
6. **批量审批**: 创建 2+ 待办，一键批量通过
7. **飞书集成**: 提交后检查飞书是否收到待办（有凭据时）
8. **审计完整性**: 每个操作检查 audit_logs
9. **前端撤回/批量 UI**: 确认按钮出现和交互正确

---

## 优先级

| 优先级 | 项目 | Phase |
|--------|------|-------|
| P0 | OrgProvider + 同人捏合 | A4 + B1 + C1 |
| P0 | NotifyProvider 接口 + Mock | A4 + B2 + B4 |
| P0 | Service 层审计日志内聚 | C1 + C2 + D2 + D3 |
| P1 | 飞书待办真实集成 | B3 + D4 |
| P1 | 管理员改派 | C2 + D3 |
| P1 | 备案撤回 | C1 + D2 + E2 |
| P1 | 批量审批 | C2 + D3 + E3 |
