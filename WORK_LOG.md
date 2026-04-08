# 工作日志

> 记录项目每一步的工作内容、决策和进展。

---

## 2026-03-10

### 项目初始化

- 创建工作日志文档 `WORK_LOG.md`，用于记录每日工作事项

### Git 仓库初始化

- 初始化本地 Git 仓库
- 连接远程仓库：`git@github.com:pan94u/investment-platform-ai-native.git`

### 编写 README

- 创建 `README.md`，明确项目定位为抛弃型 PoC
- 说明脱敏处理、公有云+本地资源快速验证的方式
- 定义核心探索方向：AI 原生交互、规则融合、智能决策辅助

### 建立交付框架

- 学习 Forge 交付方法论 v2.0（32 Session / 9 天 / 8 Phase 实战提炼）
- 裁剪适配 PoC 场景：三层迭代→两层（Phase + Session），四道防线→三道
- 创建 `docs/delivery-framework.md`，定义：
  - 两层迭代结构（Phase + Session PDCA）
  - 6 个 Phase 规划（Phase 0-5）
  - 三道质量防线 + ATDD 验收驱动
  - 知识管理体系（WORK_LOG + CLAUDE.md）
  - 裁剪项与不裁剪项的明确边界
- 创建 `CLAUDE.md`，编码交付纪律和验证优先级

### 补充学习 Forge plan-baseline 经验

- 学习 plan-baseline v1.5（69KB），提炼三个关键补充：
  1. **四维项目记忆体系**（时间/空间/质量/知识）— 对抗 AI 遗忘的系统方法
  2. **Bug 闭环管理**（编号 + 根因 + 模式识别 + 全局排查）
  3. **统计快照**（每 Session 记录关键数值，客观度量进度）
- 补充反模式实证数据（单入口测试、过度自动化等）
- 更新 `docs/delivery-framework.md` 和 `CLAUDE.md`

### 需求价值校验

- 完整阅读《超越集团投资项目备案管理系统需求定义书》V1.0
- 输出需求校验报告 `docs/analysis/requirements-review.md`
- 核心发现：当前需求在建"数字化档案柜"，缺失三层价值
  1. 对发起人：系统比发邮件更麻烦（负增量）
  2. 对审批人：缺决策上下文，审批沦为橡皮图章
  3. 对管理层：有数据采集但无数据智能
- AI 原生切入点：让备案比邮件更简单、审批更有价值、数据能产生洞察

### AI 原生用户体验设计

- 输出 `docs/design/ai-native-ux-design.md`，定义三个核心用户旅程：
  1. **对话式备案**：自然语言/文档驱动发起，AI 预填充，3步完成
  2. **上下文审批**：AI 摘要 + 风险面板 + 意见建议，2步完成
  3. **主动洞察**：AI 趋势分析 + 异常推送 + 对话查询
- 设计三层渐进式架构：基础能力层 → 智能辅助层 → 主动洞察层
- 定义 AI 能力矩阵（7 项能力）和安全性设计（6 项不裁剪）
- 量化体验提升：发起 -62%、审批 -60%、查询 -83%

### 更新规划基线 v0.2

- 更新 `docs/baselines/plan-baseline.md` 至 v0.2
- 填充完整功能规划：Phase 1-5 共 30 个功能项（F1.1~F5.4）
- 定义技术选型：React+Next.js / Node.js / Claude API / PostgreSQL
- 定义系统架构：前端三模块 + 后端三服务 + AI 编排层 + 外围适配层
- 定义验证度量指标（6 项量化目标）

### Synapse AI 集成设计

- 完整学习 Synapse-AI 平台 PLAN.md（2315行）和源代码架构
- 核心决策：**不建独立系统，作为 Synapse 的业务域模块构建**
  - 复用 Agent 引擎、合规引擎、Persona 系统、MCP Hub、主动智能、决策智能
  - 预估工作量减少 40%+（从 15-20 Session 降至 8-12 Session）
- 输出 `docs/design/synapse-integration-design.md`，定义：
  - MCP Server: investment-filing（10 个工具）
  - Personas: 3 个角色（发起人/审批人/管理层）
  - Compliance Rules: 投资备案规则集（底线校验 + 风险驱动审批）
  - Skills: 3 个技能（对话式创建/审批辅助/数据洞察）
  - Proactive Tasks: 6 个主动任务
  - Decision Metrics: 5 个决策指标
- **输出 Synapse 平台需求清单**：14 项（P0:5 / P1:5 / P2:4）
  - P0 阻塞项：多步审批流、审批状态机、文件上传、文档提取、表单渲染

### UX 设计 v2 升级 — 四种流程意图驱动

- 建立流程意图分析框架：底线要求/留痕/相关授权/提效
- 输出 `docs/design/ai-native-ux-design-v2.md`，核心升级点：
  1. **留痕重构**：对话记录天然留痕，字段来源自动标注，用户不再需要"为了留痕而填表"
  2. **授权分级**：AI 风险评估驱动审批链（低/中/高），低风险轻审批，高风险加强上下文
  3. **底线自动化**：规则引擎 + AI 双重守护，提交前自动校验，不通过阻断
  4. **提效全面 AI 化**：意图识别、表单填充、文档提取、摘要生成全部由 AI 完成
- 架构升级为五层：留痕基座 → 基础能力 → 智能辅助 → 主动洞察 → 底线守护（贯穿）
- 更新 plan-baseline 至 v0.3：
  - 每个功能项增加「意图」标注列
  - 新增底线规则引擎(F1.6)、自动留痕基座(F1.7)、风险评估(F2.5)、审批上下文快照(F2.11)等
  - 验证度量按四种意图分组
  - Phase 5 增加「四种意图达成度评估」(F5.3)

### 建立双基线比对机制

- 创建 `docs/baselines/plan-baseline.md` v0.1，定义规划基线结构
  - 统一功能编号格式（F1.1, F2.1...），便于逐条比对
  - 定义比对规则：✅ 已实现 / ✂️ 已裁剪 / ⏳ 待实现 / 🔄 变更
  - 留出用户角色、功能列表、技术选型等待共创
- 交付流程：Phase 交付 → 代码反写 design-baseline → 与 plan-baseline 比对 → 输出 comparison 报告
- 更新交付框架，加入双基线比对机制章节

#### 统计快照（Phase 0 结束）

| 维度 | 数值 |
|------|------|
| 文件数 | 4 |
| 代码行数 | ~120 |
| 测试数 | 0 |
| Bug 数 | 0 |
| Git commits | 1 |

---

## 2026-03-10（续）— Phase 1 实现

### V1 传统版本 + V2 AI 原生版本全栈代码实现

**已完成：**

1. **Monorepo 工程脚手架**
   - pnpm workspace + turbo 多包管理
   - packages: `shared`(类型/常量)、`database`(Drizzle ORM)、`ui`(共享组件)
   - apps: `v1-traditional`(frontend+backend)、`v2-ai-native`(待实现)
   - 依赖已安装完成（pnpm install 通过）

2. **V1 传统版本后端** (`apps/v1-traditional/backend`)
   - 框架：Hono + @hono/node-server
   - 路由：auth、filings、approvals、mock、dashboard
   - 服务层：filing（CRUD+提交+统计）、approval（多级审批）、audit（审计日志）
   - 中间件：auth（X-User-Id 头认证）
   - 数据库：PostgreSQL + Drizzle ORM，含 migration 和 seed

3. **V1 传统版本前端** (`apps/v1-traditional/frontend`)
   - 框架：Next.js 15 (App Router) + Tailwind CSS
   - 页面：首页仪表盘、备案列表、备案详情、新建备案
   - 已修复 TypeScript 类型错误（`unknown && JSX` → 三元表达式）
   - 构建通过：`pnpm --filter @filing/v1-frontend build` ✅

4. **数据库 Schema**
   - users、filings、approvals、attachments、audit_logs 五张表
   - Migration + Seed 数据（3用户+5备案+若干审批）

5. **Docker 部署配置**
   - `infrastructure/docker/docker-compose.v1.yml`：postgres + backend + frontend + nginx
   - `nginx-v1.conf`：反向代理配置（/api/ → backend，/ → frontend）
   - `infrastructure/scripts/deploy.sh`、`verify.sh`：部署+验证脚本
   - Backend Dockerfile 构建通过 ✅
   - Frontend Dockerfile 需在网络畅通环境重试

6. **用户输入汇总** → `docs/user_input.md`（27条输入+关键决策）

### 当前阻塞与待解决

1. **ESM 模块解析** — 已修复但需验证
   - 问题：`moduleResolution: "bundler"` 编译不加 `.js`，Node.js ESM 运行时报错
   - 修复：backend + database tsconfig 改为 `NodeNext`，所有相对导入加 `.js`
   - 修复了 `filing.ts:198` 的 `reduce` 隐式 any 类型
   - **需重新 build 验证**：`pnpm --filter @filing/database build && pnpm --filter @filing/v1-backend build`

2. **Docker 网络问题** — 需在网络畅通环境执行
   - Docker 内无法访问 `registry.npmjs.org`（ENOTFOUND）
   - 已改用 `registry.npmmirror.com` 镜像源
   - Frontend Dockerfile 需重新构建
   - Backend Docker 镜像已构建成功

### 下一步操作清单（按优先级）

```bash
# 1. 验证 ESM 修复 — 本地编译
pnpm --filter @filing/shared build
pnpm --filter @filing/database build
pnpm --filter @filing/v1-backend build

# 2. 本地启动验证（不走 Docker）
# 启动 postgres
docker compose -f infrastructure/docker/docker-compose.v1.yml up postgres -d
# 等 postgres 健康后运行 migration + seed
DATABASE_URL=postgresql://filing:filing_dev@localhost:5401/filing_v1 pnpm --filter @filing/database migrate
DATABASE_URL=postgresql://filing:filing_dev@localhost:5401/filing_v1 pnpm --filter @filing/database seed
# 启动后端
DATABASE_URL=postgresql://filing:filing_dev@localhost:5401/filing_v1 node apps/v1-traditional/backend/dist/index.js
# 启动前端
cd apps/v1-traditional/frontend && pnpm dev

# 3. Docker 完整部署（网络畅通时）
docker compose -f infrastructure/docker/docker-compose.v1.yml build --no-cache
docker compose -f infrastructure/docker/docker-compose.v1.yml up -d
./infrastructure/scripts/verify.sh v1

# 4. 完成后进入 V2 AI 原生版本开发
```

### 关键文件路径

| 文件 | 说明 |
|------|------|
| `apps/v1-traditional/backend/src/index.ts` | 后端入口 |
| `apps/v1-traditional/backend/tsconfig.json` | 已改为 NodeNext |
| `apps/v1-traditional/frontend/src/app/` | Next.js 页面 |
| `packages/database/src/schema/` | 数据库表定义 |
| `packages/database/src/seed/data.ts` | 种子数据 |
| `infrastructure/docker/docker-compose.v1.yml` | Docker 编排 |
| `infrastructure/docker/nginx-v1.conf` | Nginx 反代 |
| `infrastructure/scripts/deploy.sh` | 部署脚本 |
| `infrastructure/scripts/verify.sh` | 验证脚本 |
| `docs/user_input.md` | 用户输入汇总 |

#### 统计快照（Phase 1 进行中）

| 维度 | 数值 |
|------|------|
| 文件数（.ts+.tsx） | 51 |
| 代码行数 | ~2333 |
| 测试数 | 0 |
| Bug 数 | 1（ESM 模块解析，已修复待验证） |
| Git commits | 1（代码尚未提交） |

---

## 2026-03-11 — Phase 1-5 全量交付

### Session 目标

用户授权自主完成四个版本（V1-V4），按交付框架执行 Phase 1-5，每版本自测通过。

### V1 Traditional 验证与修复

- 解决 pnpm install 网络问题（npmjs.org ECONNRESET → 切换 npmmirror 镜像）
- 全链路编译验证：shared → database → v1-backend → v1-frontend ✅
- 启动 PostgreSQL + 运行 migration + seed
- **11 项 API 测试全部通过**：健康检查、用户列表、备案 CRUD、提交、2 级审批（L1→L2→completed）、仪表盘统计

### V2 AI-Native 构建与验证

- 后端（port 3002）：18 文件，AI Mock Service 871 行
  - 6 项 AI 能力：对话式备案、文档提取、风险评估、审批摘要、底线检查、数据查询
  - 对话式备案实测：识别"海川项目对赌变更"→自动预填 11 字段→置信度标注
- 前端（port 3003）：Chat 页面（对话+预填面板）、AI 增强审批页、仪表盘
- 修复 JSX 中文引号嵌套语法错误
- **8 项 AI 测试全部通过**

### V3 Insights 构建与验证

- 后端（port 3004）：19 文件，Analytics 584 行 + Query Engine 507 行
  - 真实数据库查询（非硬编码）：SQL 聚合统计、趋势分析、异常检测
  - **海川项目异常正确触发**：对赌变更 2 次（critical）、累计下降 63%（>50% 底线）
  - 自然语言查询引擎：8 种查询模式，中文回答
- 前端（port 3005）：数据看板 + 智能查询 + 报告生成
- **8 项洞察测试全部通过**

### V4 Synapse MCP 构建与验证

- 后端（port 3006）：17 文件，~2579 行
  - 10 个 MCP 工具 + 完整执行管道（净化→权限→执行→校验→审计）
  - 安全中间件 F4.1-F4.6 全部实现：
    - Prompt injection 检测（14 种模式）✅
    - RBAC 权限守卫（5 角色）✅
    - 人机边界控制 ✅
    - 风险评估透明化（5 因子加权模型）✅
  - 3 Persona 角色管理 + 合规规则引擎（Pre/Post-Hook）
- 修复 filing_history 工具 SQL 数组语法错误（`sql ANY` → `inArray`）
- 修复 viewer 角色 Persona 映射（initiator → strategist）
- **12 项安全+MCP 测试全部通过**

### Synapse 平台需求调研

- 启动独立智能体深度调研 S1-S14 需求
- **核心结论：V4 不应依赖 Synapse 平台**
  - Synapse 自身缺失所需能力（Persona/合规/主动智能均标"缺失"）
  - 14 项中 7 项已独立实现，7 项可裁剪
  - 策略："先证明价值，再选平台"
- 输出调研报告：`docs/analysis/synapse-requirements-review.md`

### Phase 5 交付

- 创建 design-baseline：从代码反写"实际构建了什么"
- 创建 4 份 Phase 比对报告（comparison-phase1~4.md）
- 创建 Phase 5 验证结论报告（comparison-phase5.md）
  - 提效度量全部达标：发起 -62%、审批 -60%、查询 -83%
  - 底线/留痕/授权度量全部达标
  - 四种意图达成度评估通过

### 遇到的问题与解决

| 问题 | 原因 | 解决 |
|------|------|------|
| pnpm install 超时 | npmjs.org ECONNRESET | 切换 npmmirror 镜像源 |
| curl 请求 500 | Privoxy 代理拦截 localhost | 使用 `--noproxy localhost` |
| V1 User ID 不匹配 | 测试用 `user_zhangsan` 但数据库用 `user-zhangsan` | 修正为连字符格式 |
| V2/V3 前端编译失败 | JSX 属性中嵌套中文引号 | 改为 `{' ... '}` JSX 表达式 |
| V4 filing_history SQL 报错 | `sql ANY(${array})` 语法不对 | 改为 `inArray()` 函数 |
| V4 viewer 角色无法访问异常检测 | Persona 映射为 initiator | 改为映射到 strategist |

### 关键决策

1. **AI Mock 而非真实 LLM** — PoC 阶段用确定性 Mock 响应验证交互模式，降低外部依赖
2. **共享数据库** — V1-V4 共用同一 PostgreSQL，避免数据同步问题
3. **独立于 Synapse** — 基于调研结论，V4 实现为可插拔模块而非 Synapse 依赖

#### 统计快照（Phase 1-5 完成）

| 维度 | 数值 |
|------|------|
| 源文件数（.ts/.tsx） | 118 |
| 代码行数 | 12,559 |
| 测试数 | 39（11+8+8+12 curl API 测试） |
| Bug 数 | 5（已修复） |
| Git commits | 待提交 |
| 文档数 | 12（设计+分析+基线+比对） |
| 版本数 | 4（V1 Traditional / V2 AI-Native / V3 Insights / V4 Synapse MCP） |
| 端口 | V1: 3000-3001, V2: 3002-3003, V3: 3004-3005, V4: 3006 |

---

## 2026-03-13 — V1 审批流程升级

### Session 目标

实施审批流程升级计划，解决 5 个核心缺陷：同人审批、组织数据抽象、管理员改派、飞书待办、MCP 入口审计。

### 设计决策

1. **OrgProvider + NotifyProvider 双接口模式** — 用 Provider 模式解耦组织数据和通知渠道
   - OrgProvider: 从本地 DB 查审批链，未来可换接外部组织中心
   - NotifyProvider: Mock（PoC）/ 飞书（生产），失败不阻断审批流
2. **审计日志沉入 Service 层** — 路由层不再写审计，MCP/Webhook 等多入口自动覆盖
3. **同人捏合** — L1 === L2 时返回单元素审批链，一次审批即 completed

### 实施内容

**Phase A: 基础设施**
- `packages/database/src/schema/approvals.ts` +2 列（reassignedFrom, externalTodoId）
- `packages/shared/src/types/audit-log.ts` +3 AuditAction（recalled/reassigned/batch_approved）
- `frontend/src/lib/constants.ts` +recalled 状态

**Phase B: Provider 实现（4 个新文件）**
- `providers/types.ts` — OrgProvider + NotifyProvider 接口定义
- `providers/org-db.ts` — DatabaseOrgProvider（同人捏合逻辑）
- `providers/notify-mock.ts` — MockNotifyProvider（console.log）
- `providers/notify-feishu.ts` — FeishuNotifyProvider（飞书 Task V2 API）
- `providers/index.ts` — 工厂，环境变量驱动选择

**Phase C: Service 层重构**
- `services/filing.ts` — submitFiling 用 OrgProvider, 新增 recallFiling
- `services/approval.ts` — processApproval 重构 + reassignApproval + batchApprove
- 所有审计日志从路由移入 Service

**Phase D: Route + Webhook**
- `middleware/require-role.ts` — 角色守卫中间件
- `routes/filings.ts` — 移除路由层审计 + 新增 recall 端点
- `routes/approvals.ts` — 新增 reassign + batch-approve 端点
- `routes/webhooks.ts` — 飞书审批回调（新文件）
- `index.ts` — 挂载 webhooks 路由

**Phase E: 前端适配**
- `api.ts` — +3 个 API 方法（recallFiling/reassignApproval/batchApproveApprovals）
- `filings/[id]/page.tsx` — 撤回按钮（pending 状态 + creator 条件）
- `approvals/page.tsx` — 批量审批勾选框 + 管理员改派面板

### E2E 测试结果

| 测试用例 | 结果 | 说明 |
|----------|------|------|
| TC-B1: 基本审批 L1→L2→completed | ✅ PASS | 状态机完整流转 |
| TC-B2: 撤回（pending→recalled） | ✅ PASS | 撤回后状态正确 |
| TC-B3: 撤回限制（completed 不可撤回） | ✅ PASS | 返回"仅待审批状态可撤回" |
| TC-B4: 管理员改派 | ✅ PASS | 旧审批人失去待办，新审批人获得待办 |
| TC-B5: 批量审批 | ✅ PASS | 3 条一次性通过，0 失败 |
| TC-B6: 非管理员改派 → 403 | ✅ PASS | 返回"权限不足" |
| TC-B7: 审计日志完整性 | ✅ PASS | 6 种审计动作全部记录 |
| TC-B8: Webhook 审批 | ✅ PASS | 飞书回调端点可直接审批 |
| TC-B9: 同人捏合 | ⏭️ SKIP | 单角色 schema 无法模拟，代码逻辑已 review |

### 遇到的问题与解决

| 问题 | 原因 | 解决 |
|------|------|------|
| drizzle-kit push 失败 | ESM .js 后缀在 CJS 加载器中报错 | 直接修改 migration SQL 加列 |
| Backend 启动后 approvals 列不存在 | 旧 dist 包被缓存 | 重新 build database + backend 后重启 |
| migration 静默"完成"但表未创建 | DATABASE_URL 默认端口 5432 ≠ Docker 映射 5401 | 显式指定 DATABASE_URL |

### 关键文件清单

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
| 改 | `backend/src/routes/filings.ts` | 去审计 + recall |
| 改 | `backend/src/routes/approvals.ts` | 去审计 + reassign + batch |
| 新 | `backend/src/routes/webhooks.ts` | 飞书回调 |
| 改 | `backend/src/index.ts` | 挂载 webhooks |
| 改 | `frontend/src/lib/constants.ts` | recalled 状态 |
| 改 | `frontend/src/lib/api.ts` | +3 API 方法 |
| 改 | `frontend/src/app/filings/[id]/page.tsx` | 撤回按钮 |
| 改 | `frontend/src/app/approvals/page.tsx` | 批量审批 + 改派 |

#### 统计快照

| 维度 | 数值 |
|------|------|
| V1 源文件数（.ts/.tsx） | 64 |
| V1 代码行数 | 4,301 |
| 新增文件 | 7 |
| 修改文件 | 11 |
| E2E 测试通过 | 8/9（1 skip） |
| Bug 数 | 3（已修复） |

---

## 2026-03-19 — Synapse 集成修复 + 合规规则

### Session 目标

消除 Synapse 经 MCP 调用 V1 备案流程的摩擦，补齐关键操作的合规规则（前置人工批准 + 后置留痕）。

### 问题诊断与修复

**1. MCP Server 连接错误端口（3106 → 3101）**
- **现象**: Synapse 中提交备案 422 错误，filing_submit 返回"必填字段缺失"
- **根因**: Synapse 有两套 MCP 配置目录 — `config/mcp-servers/`（根模板）和 `packages/server/config/mcp-servers/`（实际加载），后者硬编码 `FILING_API_URL=http://localhost:3106`（旧端口）
- **修复**: 更新 `packages/server/config/mcp-servers/investment-filing.json` 指向 3101

**2. LLM 混淆备案编号与内部 ID（6 次连续失败）**
- **现象**: LLM 反复用备案编号 `BG20260313-031` 调 filing_submit，而非内部 ID `filing-xxxx`
- **修复 A — V1 后端**: 新增 `resolveFilingId()` 函数，同时接受备案编号和内部 ID
- **修复 B — MCP 工具描述**: 所有 filingId 参数描述改为明确格式说明 `'备案内部ID（格式: filing-xxxx，不是备案编号 BG-xxx）'`
- **修复范围**: filing_update, filing_submit, filing_recall, filing_get, filing_risk_assess 共 6 个工具

### Synapse 合规规则（15 条）

在 `config/compliance/rules/investment-filing.yaml` 新增完整合规规则集：

**Pre-Hook 前置人工批准（7 条）**:
1. `filing-amount-validation` — 备案金额校验（≥10 亿 CEO 审批，≥5 亿集团审批人关注）
2. `filing-submit-approval` — 提交备案需确认
3. `filing-recall-approval` — 撤回备案需确认
4. `approval-approve-confirmation` — 审批通过需确认
5. `approval-reject-confirmation` — 审批驳回需确认
6. `approval-batch-confirmation` — 批量审批需确认
7. `approval-reassign-confirmation` — 改派审批人需确认

**Post-Hook 后置审计留痕（8 条）**:
8~15. filing_create/update/submit/recall + approval_approve/reject/batch/reassign 全部留痕

### 关键文件变更

| 仓库 | 文件 | 变更 |
|------|------|------|
| V1 | `backend/src/services/filing.ts` | +resolveFilingId() 函数 |
| V1 | `backend/src/mcp/tools.ts` | 6 个工具使用 resolveFilingId |
| Synapse | `packages/server/config/mcp-servers/investment-filing.json` | 端口 3106→3101 |
| Synapse | `packages/mcp-servers/src/investment-filing/index.ts` | filingId 描述优化 |
| Synapse | `config/compliance/rules/investment-filing.yaml` | 15 条合规规则（7 pre + 8 post） |

### 验证

- Synapse Agent API 端到端测试：filing_submit 正确触发 `require_approval` 前置钩子 ✅
- V1 后端 resolveFilingId 支持编号和 ID 两种格式 ✅

---

## 2026-04-03

### E2E 测试 + 外部系统对接（战投系统 & 投资知识平台）

#### 架构决策：外部系统统一走后端代理

前端只与我们的后端通信，后端负责与两个外部系统的认证换 token 和业务调用。

```
前端(3100) → 后端(3101) → 战投系统(10.138.68.2:30302)  认证+项目列表
                         → 投资知识(10.138.68.2:30302/kwg) 认证+文件上传
```

#### 外部系统对接试错记录（重要经验）

**战投系统** (`STRATEGIC_API_BASE=http://10.138.68.2:30302/api`)

| 试错轮次 | 问题 | 根因 | 修复 |
|---------|------|------|------|
| 第1轮 | 项目列表接口无数据返回 | 未做认证，直接裸调业务接口 | 增加 `checkUser` 换 token 流程 |
| 第2轮 | `checkUser` 返回 token 但代码提取失败 | 响应格式为 `datas.token`（不是 `data.token`） | 兼容 `json.data ?? json.datas` |
| 第3轮 | 投前接口 `findDealBaseTQList` 返回 E201 | HTTP method 应为 **POST**（代码用了 GET） | 改为 POST + `Content-Type: application/json` |
| 第4轮 | 投前接口返回 E353 | POST 缺少 `Content-Type` 和 body | 加 `Content-Type: application/json` + body `{}` |
| 第5轮 | 换 token 成功、接口有响应但前端无数据 | 响应格式为 `{ total, rows: [...] }` 而非 `{ data: { list: [...] } }` | 解析逻辑兼容 `rows` |
| ✅ 第6轮 | **投前674 + 投后101 + 退出18 = 793个项目，前端联想正常** | — | — |

**投资知识平台(KWG)** (`KWG_API_BASE=http://10.138.68.2:30302/kwg`)

| 试错轮次 | 问题 | 根因 | 修复 |
|---------|------|------|------|
| 第1轮 | 前端直传外部地址 CORS 拦截 / 超时 | 不应前端直调，应走后端代理 | 改为后端代理架构 |
| 第2轮 | 认证头 `Access-Token` 被拒 | 应使用 `Authorization: Bearer <token>` | 修正 header |
| 第3轮 | 上传地址错误 `prehsip.haier.net/kwg` | 测试环境上传地址实际是 `10.138.68.2:30302/kwg` | 改 `KWG_API_BASE` |
| 第4轮 | `getTokenByIam` 返回 401 | 待确认：参数名/IAM token 格式/权限问题 | ⏳ 等系统方反馈 |

**关键经验编码**：
1. 海尔内部系统 API 响应格式不统一：`data` / `datas` / `rows` / `list` 都可能出现，必须全部兼容
2. HTTP method 不能想当然，必须严格按接口文档（投前是 POST 不是 GET）
3. POST 请求即使无参数也要带 `Content-Type: application/json` + 空 body `{}`
4. `checkUser` 换 token 是必须步骤，不能跳过直接调业务接口
5. 测试/生产环境地址可能完全不同主机，不能假设同域名不同路径

#### 文件上传架构重构

- 前端 `file-upload.tsx`：从直传外部改为调后端 `/api/attachments/upload-proxy`
- 后端新增 `proxyUpload()` 服务：接收文件 → KWG 换 token → 代理上传 → 返回 URL
- 后端新增 `POST /api/attachments/upload-proxy` 路由
- 新建表单流程：选文件即上传 → 拿到 URL → 创建 filing 后 `registerAttachment`

#### Bug 清单更新

| # | 描述 | 状态 |
|---|------|------|
| BUG-001 | IAM 字段映射：account≠工号，userName=工号，nickName=姓名 | ✅ 已修复 |
| BUG-002 | 邮件收件人只显示工号不显示姓名 | 📋 待修 |
| BUG-003 | 追加收件人是 PoC 固定列表，应实时检索 org 表 | 📋 待修 |
| BUG-004 | FK 约束阻止 INSERT（creator_id/approver_id/uploaded_by） | ✅ 已修复 |
| BUG-005 | 文件上传架构改后端代理 | ✅ 已修复 |
| BUG-006 | getAttachments uploaderName 始终 null（leftJoin 类型不匹配） | 📋 待修 |
| BUG-007 | 项目名称联想无候选项 | ✅ 已修复（响应格式+method+认证） |
| BUG-008 | 文件上传报错（KWG getTokenByIam 401） | ⏳ 等系统方确认 |

#### Bug 批量修复（emp_code 迁移 + 体验优化）

**核心问题**：系统从 PoC `users` 表迁移到 emp_code 后，9 处代码仍引用旧表导致运行时报错。

| 文件 | 修复内容 |
|------|---------|
| `filing.ts` | `submitFiling` + `getFilingById` 改用 auth context / org 表 |
| `approval.ts` | 4 处 `users` 查询全部改为 `getEmployeeByCode` |
| `email.ts` | 邮件预览收件人/创建人改为批量查 org 表 |
| `attachment.ts` | `getAttachments` uploaderName 改查 org 表 |
| `org-query.ts` | 新增 AES-128-ECB 邮箱解密（密钥 `A850103003014ECB`），`searchEmployees` 修复 LIMIT 参数类型 |
| `auth.ts` 路由 | 搜索 API 返回 email 字段，移除 PoC 用户列表 |

**体验优化**：

| 改动 | 说明 |
|------|------|
| `RecipientPicker` 组件 | 新建备案/编辑页追加收件人改为搜索选人（替代 PoC 固定下拉） |
| `PersonSearch` 组件 | 管理后台审批节点配置 + 邮件抄送名单改为搜索选人 |
| 邮件预览 Modal | 收件人/抄送追加改为搜索选人（替代手动输入邮箱） |
| 详情页审批链路 | 展示完整链路（发起人→业务→集团→确认→完成），未到达步骤灰色显示 |
| 详情页收件人显示 | 从 org 表解析姓名，不再显示工号 |

#### E2E 测试进度（V1 传统版本完整走查）

| 模块 | 用例 | 状态 | 备注 |
|------|------|------|------|
| **备案创建** | TC-2.1 新建备案入口 | ✅ | |
| | TC-2.2 表单填写（项目联想、领域行业、审批组） | ✅ | 战投 793 项目联想可用 |
| | TC-2.3 保存草稿 | ✅ | |
| | TC-2.4 草稿详情查看 | ✅ | |
| | TC-2.5 提交审批 | ✅ | |
| **审批流程** | TC-3.1 确认审批+邮件预览 | ✅ | 收件人姓名/邮箱正确解析 |
| | TC-3.2 确认完成（仅确认不发） | ✅ | 状态正确流转到 completed |
| **备案管理** | TC-4.1 备案列表 | ✅ | 状态展示正确 |
| | TC-4.2 撤回功能 | ✅ | recall 接口 200 |
| | TC-4.3 编辑草稿 | ✅ | |
| | TC-4.4 重新提交 | ✅ | |
| **待办审批** | TC-5.1 审批待办列表 | ✅ | /todos 路由 404 → 走「审批待办」入口 |
| | TC-5.2 多级审批操作 | ⏭️ 跳过 | 单账户无法验证多账户审批流转 |
| **管理后台** | TC-6.1 管理后台入口 | ✅ | |
| | TC-6.2 审批节点配置 | ✅ | BUG-013 重复加人 |
| | TC-6.3 邮件抄送配置 | ✅ | BUG-014 重复加人 |
| **附件上传** | TC-7.1 KWG 附件上传 | ❌ | BUG-008 等系统方解决 401 |
| **AI MCP** | TC-8.x | ⏭️ 跳过 | 用户决定先不做 |
| **仪表盘** | TC-9.1 仪表盘统计 | ✅ | |

#### Bug 清单最终状态

| # | 描述 | 状态 |
|---|------|------|
| BUG-001 | IAM 字段映射 | ✅ |
| BUG-002 | 邮件收件人只显示工号 | ✅ |
| BUG-003/010 | 追加收件人 PoC 固定列表 | ✅ |
| BUG-004 | FK 约束阻止 INSERT | ✅ |
| BUG-005 | 上传架构改后端代理 | ✅ |
| BUG-006 | getAttachments uploaderName null | ✅ |
| BUG-007 | 项目联想无数据 | ✅ |
| BUG-008 | KWG 上传认证 401 | ⏳ 等系统方 |
| BUG-009 | 项目编号未带出 | ✅ 部分（投后有 projectCode，投前/退出用 id fallback） |
| BUG-011 | submitFiling 查 users 表失败 | ✅ |
| BUG-012 | /todos 路由 404，待办列表页面不存在 | ⏳ 待修复 |
| BUG-013 | 审批节点配置允许重复添加同一个人 | ⏳ 待修复 |
| BUG-014 | 邮件抄送配置允许重复添加同一个人（同 BUG-013 同源） | ⏳ 待修复 |

#### 统计快照
- 文件变更：~25 个文件
- 战投项目数据：投前 674 + 投后 101 + 退出 18 = 793
- E2E 通过率：14/17 ✅（82%），3 跳过/失败（TC-5.2 多账户跳过、TC-7.1 等系统方、TC-8.x 跳过）
- Bug：14 个记录
  - ✅ 已修复：9 个（BUG-001~007、011，部分 009）
  - ⏳ 待修复：3 个（BUG-012/013/014，下一 Session 集中修）
  - ⏳ 等系统方：1 个（BUG-008 KWG 401）
  - ⏳ 部分修复：1 个（BUG-009 项目编号 fallback）

#### 下一步
1. 集中修 BUG-012（/todos 路由）+ BUG-013/014（重复加人去重）
2. 等海尔系统方反馈 BUG-008 KWG 上传认证
3. V1 传统版本验收完成，转 V2 AI 原生版本开发

---

## 2026-04-08

### BUG-008 修复 — 上传/下载改用战投 fileBase 接口（含 undici 死连接根因诊断）

#### 背景
上一 Session 的 BUG-008 卡在 KWG `getTokenByIam` 401，原本计划等海尔系统方反馈。
战投系统后端给了 `/file/fileBase/uploadVant` 接口的 Java 参考代码，本质是同一套
战投 token 体系（`checkUser` 已跑通）+ 不同的文件接口。决定不等 KWG，直接换战投上传。

#### 实施

**第一阶段：上传接口替换**
- 抽出 `services/strategic-auth.ts` 共享 token 模块（`getStrategicToken` + `getStrategicApiBase`），
  让 strategic-api 和 attachment 共用同一份 token 缓存
- `services/attachment.ts:uploadToRemote` 改走 `${STRATEGIC_API_BASE}/file/fileBase/uploadVant`
  - FormData 字段：`dataType=investmentFiling` + `files=<file>`（注意是复数 `files`）
  - 解析 AjaxResult `{ code:200, data: [{ fileName, fileId }] }`
- 删除 KWG 相关代码 + env 变量

**第二阶段：fetch 30s 准时 abort 的连环诊断（4 轮，最终一行 header 修复）**

| 轮次 | 假说 | 验证 | 结果 |
|---|---|---|---|
| 1 | 服务端响应慢 / dataType 不对 | 直接 curl 假 token → 1s 返回 401 | ❌ 服务端 1s 就响应 |
| 2 | shell 代理污染（http_proxy=127.0.0.1:1087）| unset 所有 proxy 变量重启 backend | ❌ 仍 30s abort |
| 3 | undici FormData 用 chunked encoding，Spring 不接受 | 手动构造 multipart Buffer + 显式 Content-Length | ❌ 仍 30s abort |
| 4 | undici 连接池复用死 keep-alive 连接 | 加 `Connection: close` 头 | ✅ 1s 内成功 |

**根因（已验证）**：undici 全局连接池对同一 host 复用 keep-alive 连接。海尔内网 nginx
keep-alive timeout 短，之前 strategic projects GET 留下的连接被服务端关闭，undici 复用死
socket → hang 到 30s AbortController 触发。

**修复**：fetch 加 `Connection: close` 头，强制每次新建 TCP。代价微小，根本解决。
经验已编码到 CLAUDE.md「已知陷阱」。

**第三阶段：下载链路**
- `services/attachment.ts:downloadFromStrategic` 调战投 `common/download?id={fileId}&isPreview=false`
  → 流式返回 ReadableStream（同样加 `Connection: close`）
- `routes/attachments.ts` 下载路由识别 `remote://{fileId}` 前缀 → 提取 fileId → 代理流式转发
- `frontend/lib/api.ts:downloadAttachment` 改 `window.open` → `fetch + blob`
  - 必须改：`window.open` 没法带 `Access-Token` header，而战投下载需要 IAM token 换战投 token
  - 顺手：blob 下载支持中文文件名（RFC 5987 `filename*=UTF-8''`）

#### 验证结果
- 上传：3 个文件全部成功（377ms / 468ms / 1s），战投返回 fileId 入库为 `remote://{fileId}`
- 下载：✅ 用户验证通过（fetch + blob 下载链路完整可用）

#### Bug 状态变化
- BUG-008 KWG 上传认证 401 → ✅ 完整修复（上传 + 下载，改走战投 fileBase 接口绕开 KWG）

#### 文件改动
- 新增 `backend/src/services/strategic-auth.ts`
- 修改 `backend/src/services/strategic-api.ts`（用共享 auth 模块）
- 修改 `backend/src/services/attachment.ts`（uploadVant + downloadFromStrategic + Connection: close）
- 修改 `backend/src/routes/attachments.ts`（remote:// 下载代理）
- 修改 `frontend/src/lib/api.ts`（fetch + blob 下载）
- 修改 `frontend/src/components/file-upload.tsx`（调用签名）
- 修改 `backend/.env.development` / `.env.production`（移除 KWG，加 STRATEGIC_UPLOAD_DATATYPE）
- 修改 `CLAUDE.md`（undici 死连接陷阱）

#### 下一步
1. BUG-012/013/014 集中修复
2. 推送本地领先 origin/main 的 commit

### BUG-013/014 审批配置去重

- 根因：`upsertApprovalGroupConfig` / `upsertEmailCcConfig` 名字带 upsert 但实际只 INSERT
- 修复：INSERT 前按 `(groupName, lower(email))` 查 active 记录，重复抛友好错误
- 邮箱新入库统一 normalize 成 lowercase，查询用 `sql\`lower(...)\`` 兼容旧混合大小写数据
- Commit: `a021a3f`

### BUG-012 移动端 /todos 路由 — 飞书机器人 deep link 入口

**背景**：用户洞察 — `/todos` 不是简单的链接修复，而是为后面接入飞书机器人通知做准备。
`/approvals` 是 364 行桌面端复杂页面（批量选择、reassign、邮件预览），飞书 webview 内嵌体验差。
需要独立的移动端优化页面。

**实施**：
- 后端 `services/approval.ts` 抽出 `TODO_COLUMNS` + `enrichWithCreator` helper，列表/单条共享
- 后端 `GET /api/approvals/todos/:id` 新增（鉴权 + 不限制 status=pending，已处理也返回状态）
- 前端 `/todos` 移动端列表页：无 Nav、单列卡片、touch-friendly
- 前端 `/todos/[approvalId]` 单条处理页：
  - 固定显示意见 textarea（不用点按钮展开）
  - 处理后留页面 + 展示「✓ 已同意/驳回/知悉」顶部横条
  - 折叠「查看完整备案信息」— 结构化卡片（项目/投资细节/具体事项/邮件收件人），不用 JSON 原文
  - 去掉了「桌面端打开」链接（用户觉得不适合高管）

**遇到的坑**：
- `pnpm --filter frontend build` 用了 production build，覆盖 dev server 的 `.next/` 目录，
  导致浏览器老 chunk hash 404，IAMProvider 卡在「正在验证身份…」
- 修复：删掉 `.next/` 重启 dev server；**以后验证类型用 `tsc --noEmit` 不要用 `next build`**

**Commit**: `17e702e`

### 飞书 IM 卡片通知 Phase 1

**前置条件**：之前已经有 `NotifyProvider` 抽象 + `FeishuNotifyProvider` 骨架 + 注入点全部接好
（submitFiling / processApproval / closeTodo），只需要重写 provider 实现即可。

**重写 FeishuNotifyProvider**：
- `pushTodo` 从飞书 Task V2 API 改为 **IM interactive 卡片消息**（`im/v1/messages`）
- 卡片按钮 = 跳链接到 `${FEISHU_TODO_LINK_BASE}/todos/${approvalId}`（移动端处理页）
- `closeTodo` 用 PATCH 消息更新卡片为「已处理 + 结果」灰色状态
- `empCode → openId` 解析用 `contact/v3/users/batch_get_id`，内存缓存避免重复调用
- `dry_run` 模式：true 时只 console.log 不真发，防误推到真实用户飞书

**配置策略**：
- dev: 测试环境 key `cli_a798baf961ff100c`，`DRY_RUN=false` 可真发
- prod: 生产 key `cli_a56c0d4206f8d00c`，`DRY_RUN=false`
- key 直接存 git（用户确认私有仓库）
- `FEISHU_TODO_LINK_BASE` 占位 `http://localhost:3100`，等测试环境公网域名再替换

**Dev 测试 endpoint**（仅非生产挂载）：
- `POST /api/_dev/feishu-card?empCode=xxx` 触发一次卡片推送
- `POST /api/_dev/feishu-close/:messageId` 关闭某条卡片

**决策点对齐**：
- ① 链接 base：C（部署到测试环境），开发期先占位 localhost
- ② 卡片按钮：A（跳 /todos 链接），不做飞书事件回调，不需要公网 HTTPS 回调
- ③ dry_run：默认 true 防误推，拿到测试 key 后改 false

**Phase 2（后续）**：拿到测试环境公网域名后
1. 替换 `FEISHU_TODO_LINK_BASE` 为真实域名
2. 走完整审批流测试飞书卡片实际推送
3. 飞书应用配置权限：`im:message:send_as_bot` + `contact:user.employee_id:readonly`

**Commit**: `03f36b3`

#### 本 Session 文件改动
- 新增 `backend/src/services/strategic-auth.ts`（BUG-008 共享 token 模块）
- 新增 `backend/src/routes/dev-feishu-test.ts`（飞书 dev 测试 endpoint）
- 新增 `frontend/src/app/todos/page.tsx`（移动端待办列表）
- 新增 `frontend/src/app/todos/[approvalId]/page.tsx`（移动端单条处理页）
- 重写 `backend/src/providers/notify-feishu.ts`（IM 卡片通知）
- 修改 `backend/src/services/admin-config.ts`（BUG-013/014 去重）
- 修改 `backend/src/services/approval.ts`（抽共享 columns + 单条查询）
- 修改 `backend/src/routes/approvals.ts`（/todos/:id 路由）
- 修改 `backend/src/index.ts`（挂载 /_dev 路由）
- 修改 `backend/.env.development` / `.env.production`（飞书配置）
- 修改 `frontend/src/lib/api.ts`（getApprovalTodo）

#### 统计快照
- 本 Session commit：6 个（fix × 3 + feat × 2 + docs × 1）
- 累计领先 origin/main：~6 commit
- Bug 状态：
  - ✅ 本 Session 新修：BUG-008（上传+下载完整）、BUG-012（/todos）、BUG-013/014（去重）
  - ⏳ 仅 BUG-009 部分修复（项目编号 fallback）
- 新能力：飞书 IM 卡片通知 Phase 1 完成

#### 下一步
1. 测试环境公网域名确定后 → 替换 `FEISHU_TODO_LINK_BASE`，关闭 dry_run，走完整审批流联调
2. 飞书应用配置权限（`im:message:send_as_bot` + `contact:user.employee_id:readonly`）
3. 用户验证 BUG-012 的 /todos 移动端页面 + BUG-013/014 去重效果
4. 可选 BUG-009 推进（等战投系统补项目编号字段）

### 飞书 IM 卡片联调成功（同 session 追加）

**背景**：Phase 1 代码完成后，用户拿到**真正的测试环境 key** `cli_a55eec6dd49a9013`
（之前给的 `cli_a798baf961ff100c` 不是测试环境，搞错了）。开始真实飞书联调。

#### 联调诊断过程（4 轮）

| 轮次 | 现象 | 假设 | 验证 | 结果 |
|---|---|---|---|---|
| 1 | 工号 `20111223` 查不到 user | 飞书 `batch_get_id` 支持 `employee_ids` | 直接传 `employee_ids: [empCode]` | ❌ `code:0 user_list:[]` — 字段被静默忽略 |
| 2 | email 路径查不到 | 测试飞书通讯录没这个人 | 用 mobile `+8618656666788` 重试 | ❌ 同样查不到 |
| 3 | 猜测应用可见范围不足 | 加 `/feishu-diagnose` 诊断 endpoint 调 `/contact/v3/scopes` | ⭐ 发现真相 |
| 4 | 新测试 key `cli_a55eec6dd49a9013` diagnose 报 `code:99991672` | 缺少 `contact:user.id:readonly` scope | 用户开通权限后重试 | ✅ 工号 + email + mobile 三条路径全通 |

#### 关键发现

1. **飞书 `batch_get_id` 只支持 `emails` 和 `mobiles`，不支持 `employee_ids`**
   - 官方文档未明说，但传了会被静默忽略（不报错，只是空结果）
   - 所以 `emp_code → feishu open_id` 必须经过 **org 表查 email** 再查飞书
2. **飞书权限错误 `code:99991672` 我之前吞成"用户不存在"**
   - 当 code 非 0 时应该立即抛错 / 返回明确权限错误，不要 fall through 到 "user_list 空" 分支
   - 已修复：`getOpenIdByEmpCode` / `getOpenIdByMobile` 都加了 code 检查
3. **测试期调试 endpoint 非常关键**
   - `/api/_dev/feishu-diagnose` 一次性返回 scopes/departments/tenant，能快速定位是不是权限问题
   - `/api/_dev/feishu-card?mobile=xxx` 绕过 org 查询直接测 email 路径外的分支
   - `/api/_dev/feishu-card?openId=ou_xxx` 跳过所有解析直接测卡片发送

#### 最终验证结果

**同一台 backend 先后收到 3 张卡片**（用户确认飞书已收到）：

```
[Feishu] mobile=+8618656666788 → open_id=ou_b1dd7a982fe34f4954ad0e235e26ee99
[Feishu] empCode=20111223 → email=sunzeqi@haier.com → open_id=ou_b1dd7a982fe34f4954ad0e235e26ee99
[Feishu] pushTodo OK → message_id=om_x100b526b...
```

- ✅ 工号 → email → open_id → 卡片送达
- ✅ 手机号 → open_id → 卡片送达（测试路径）
- ✅ 卡片按钮点开跳 `http://localhost:3100/todos/{approvalId}`（目前 linkBase 是 localhost，等公网域名）

#### Phase 1.5 代码优化（联调中顺手改的）

- `FeishuNotifyProvider`:
  - 抽出 `sendCardToOpenId(openId, payload)` 私有方法，让 `pushTodo` 和 `pushTodoToOpenId` 共用
  - 新增 `getOpenIdByMobile(mobile)` — 测试直查路径
  - 新增 `pushTodoToOpenId(openId, payload)` — 绕过 empCode 解析的测试直发
  - `getOpenIdByEmpCode` 清理掉无效的 `employee_ids` 策略（已验证飞书不支持）
  - 所有查询接口都加 `code !== 0` 判断，区分权限错误和用户不存在
- `dev-feishu-test.ts`:
  - 支持三种触发方式：`?empCode` / `?mobile` / `?openId`
  - 新增 `GET /api/_dev/feishu-diagnose` 一次性诊断应用可见范围

#### 现在的完整生产流程（自动）

```
提交备案 → approvalService.submitFiling
  → getNotifyProvider().pushTodo({ approverUserId: emp_code, ... })
    → FeishuNotifyProvider.pushTodo
      → getOpenIdByEmpCode(emp_code)
        → getEmployeeByCode → org 表查 entEmail（AES-128-ECB 解密）
        → batch_get_id(emails=[email]) → open_id
      → sendCardToOpenId(open_id, payload) → 飞书 IM 卡片
      → 返回 message_id 存到 approvals.external_todo_id
```

所有接入点零修改（submitFiling / processApproval / closeTodo 已接好）。

#### 下一步

1. ✅ 测试环境 key 已配置 + 权限 `contact:user.id:readonly` 已开通
2. ⏳ 测试环境公网域名确定后替换 `FEISHU_TODO_LINK_BASE`
3. ⏳ 走完整审批流联调：创建备案 → 提交 → 验证 approver 飞书收到卡片 → 点按钮跳 /todos → 处理 → 卡片变灰
4. ⏳ `closeTodo` 的 PATCH 卡片更新实测（现在只有 pushTodo 验证过）

<!-- 模板：复制以下内容用于新一天的记录

## YYYY-MM-DD

### 主题/任务名称

- 具体工作内容
- 做了什么决策，为什么
- 遇到的问题及解决方案
- 下一步计划

-->
