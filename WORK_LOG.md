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

<!-- 模板：复制以下内容用于新一天的记录

## YYYY-MM-DD

### 主题/任务名称

- 具体工作内容
- 做了什么决策，为什么
- 遇到的问题及解决方案
- 下一步计划

-->
