# 设计基线（Design Baseline）

> 版本：v1.0 | 日期：2026-03-11 | 状态：从代码反写
>
> 本文档记录"我们实际构建了什么"，从代码实现中反向工程得出。
> 与 `plan-baseline.md`（"我们想要构建什么"）交叉比对，得出偏差分析。

---

## 一、Phase 1 — 基础能力层 + 留痕基座（V1 Traditional）

**目录**：`apps/v1-traditional/`
**端口**：前端 3100 / 后端 3101

### 功能实现状态

| 编号 | 功能 | 状态 | 实现说明 |
|------|------|------|---------|
| F1.1 | 备案数据模型（直投/基金投/法人/其他） | 🔄 变更 | 实现了通用备案模型（filings 表），包含 type 字段支持分类，但未按直投/基金投/法人/其他做独立 Schema 区分；基金备案未预留 |
| F1.2 | 表单引擎（JSON Schema 驱动） | ✂️ 已裁剪 | 未实现 JSON Schema 驱动的可配置表单引擎，前端使用硬编码表单 |
| F1.3 | 审批流引擎（支持分级审批） | 🔄 变更 | 实现了 2 级审批链（直属上级 + 集团审批），但非配置驱动的通用引擎，而是硬编码的两级逻辑 |
| F1.4 | 外围系统 Mock（战投/法务/飞书） | 🔄 变更 | 实现了 Mock 路由组，但仅提供基础数据 Mock，未模拟战投/法务/飞书的完整联动机制 |
| F1.5 | 备案状态机（草稿→审批中→已完成/已驳回） | ✅ 已实现 | filing 服务实现了 draft → pending → approved/rejected 状态流转 |
| F1.6 | 底线规则引擎（必填/金额/关联校验） | ✂️ 已裁剪 | 未实现独立规则引擎，基础校验内嵌在路由/服务层 |
| F1.7 | 自动留痕基座（对话存档/操作日志/来源标注） | 🔄 变更 | 实现了 audit_logs 表和 audit 服务，记录操作日志；但无对话存档（V1 无对话）、无来源标注 |
| F1.8 | 备案列表与查询（多维度筛选） | 🔄 变更 | 实现了备案列表页面和 API，但筛选能力有限，无导出功能 |
| F1.9 | 附件上传与存储 | ✂️ 已裁剪 | 数据库有 attachments 表定义，但未实现上传/下载 API 和前端交互 |
| F1.10 | 用户认证与基础权限 | 🔄 变更 | 使用 X-User-Id 请求头模拟认证，无真实 SSO Mock，角色隔离通过 seed 数据中的 role 字段实现 |

### 实际交付物

- **后端**：Hono 框架，14 个 TS 文件
  - 5 个路由组：auth、filings（CRUD + submit）、approvals（2 级审批）、dashboard、mock
  - 3 个服务：filing（CRUD + submit + dashboard 统计）、approval（2 级审批链）、audit（操作日志）
- **前端**：Next.js 15 App Router + Tailwind CSS，9 个页面
  - 登录页、仪表盘、备案列表、备案详情、新建备案、审批页面
- **数据库**：PostgreSQL + Drizzle ORM，5 张表（users, filings, approvals, attachments, audit_logs）
- **种子数据**：5 个用户、5 条备案、3 条审批记录
- **部署**：Docker Compose + Nginx 反向代理 + 部署/验证脚本

---

## 二、Phase 2 — 智能辅助层（V2 AI-Native）

**目录**：`apps/v2-ai-native/`
**端口**：前端 3103 / 后端 3102

### 功能实现状态

| 编号 | 功能 | 状态 | 实现说明 |
|------|------|------|---------|
| F2.1 | 对话式备案发起（自然语言→结构化表单） | ✅ 已实现 | 实现了对话式备案 Hero 页面，左侧对话面板 + 右侧备案预览面板，通过自然语言对话生成结构化备案 |
| F2.2 | AI 预填充（项目上下文自动填写） | ✅ 已实现 | AI Mock Service 中实现了 prefill 能力（871 行 Mock 服务），根据对话上下文自动填充表单字段 |
| F2.3 | 文档驱动发起（上传→AI 提取→预填） | ✅ 已实现 | 实现了 doc extraction 端点，AI Mock Service 支持文档内容提取并预填备案表单 |
| F2.4 | 提交前底线自动检查（必填/金额/关联） | ✅ 已实现 | 实现了 baseline-check AI 端点，提交前自动校验必填字段、金额合理性等 |
| F2.5 | AI 风险评估（评估备案风险等级） | ✅ 已实现 | 实现了 risk-assess 端点，AI Mock Service 根据备案内容评估风险等级 |
| F2.6 | 发起人风险预判（提交前透明展示风险等级） | 🔄 变更 | 风险评估结果在备案预览面板中展示，但未做独立的"提交前风险预判"交互流程 |
| F2.7 | 审批 AI 摘要（一段话概括备案内容） | ✅ 已实现 | 实现了 summary AI 端点，审批页面展示 AI 生成的备案摘要 |
| F2.8 | 附件智能摘要（提取附件关键信息） | ✂️ 已裁剪 | 未独立实现附件摘要，文档提取功能部分覆盖此需求 |
| F2.9 | 审批风险面板（历史关联/异常/同类参考） | ✅ 已实现 | 审批页面包含 AI 风险面板，展示风险评估结果和建议 |
| F2.10 | AI 审批意见建议（起草意见供采纳） | ✅ 已实现 | 审批页面展示 AI 建议的审批意见，审批人可采纳或修改 |
| F2.11 | 审批上下文快照（记录审批人看到了什么） | ✂️ 已裁剪 | 未实现独立的上下文快照存储机制 |

### 实际交付物

- **后端**：Hono 框架，18 个 TS 文件，约 2066 行
  - 继承 V1 全部路由 + 新增 AI 路由
  - AI Mock Service（871 行）：prefill、doc extraction、risk assessment、summary、baseline check、query
  - 对话管理服务（conversation management）
  - 6 个 AI 端点：chat、extract、risk-assess、summary、baseline-check、query
- **前端**：Next.js 15，indigo/violet 主题色
  - 对话式备案发起页（Hero Page）：左侧对话 + 右侧备案预览
  - AI 增强审批页：摘要、风险面板、建议意见
  - 仪表盘、备案列表

---

## 三、Phase 3 — 主动洞察层（V3 Insights）

**目录**：`apps/v3-insights/`
**端口**：前端 3105 / 后端 3104

### 功能实现状态

| 编号 | 功能 | 状态 | 实现说明 |
|------|------|------|---------|
| F3.1 | 备案数据看板（趋势/分布/效率） | ✅ 已实现 | 实现了富分析仪表盘，包含趋势分析、分布统计、效率指标 |
| F3.2 | AI 洞察生成（自动发现趋势和异常） | ✅ 已实现 | analytics 服务实现了 insight generation，自动生成趋势洞察和异常发现 |
| F3.3 | 对话式数据查询（自然语言→结果） | ✅ 已实现 | query engine 实现了自然语言到 SQL 的转换，支持中文回答，覆盖 8 种查询类型 |
| F3.4 | 底线预警推送（累计金额/变更频率等） | 🔄 变更 | 实现了 baseline warnings 检测逻辑，在仪表盘中展示预警信息，但未实现主动推送机制 |
| F3.5 | 异常主动推送（飞书通知风险信号） | 🔄 变更 | 实现了异常检测（anomaly detection），在仪表盘中展示，但未对接飞书 Mock 推送 |
| F3.6 | 跨项目关联分析（暴露度/变更频率） | 🔄 变更 | project history 端点提供项目级历史数据，但未实现完整的跨项目暴露度和变更频率聚合分析 |
| F3.7 | 周期性报告生成（周报/月报） | ✅ 已实现 | report generator 支持周报和月报生成 |

### 实际交付物

- **后端**：Hono 框架，19 个 TS 文件，约 1238 行新增代码
  - Analytics 服务：dashboard stats、trend analysis、anomaly detection、baseline warnings、project history、insight generation
  - Query Engine：自然语言 → SQL，中文回答，8 种查询类型
  - Report Generator：周报/月报
  - 9 个 insight 端点
- **前端**：Next.js 15，emerald/teal 主题色
  - 富分析仪表盘：洞察卡片、预警列表、异常检测面板
  - 对话式查询界面
  - 报告生成页面

---

## 四、Phase 4 — 安全加固（V4 Synapse MCP）

**目录**：`apps/v4-synapse/mcp-server/`
**端口**：后端 3106

### 功能实现状态

| 编号 | 功能 | 状态 | 实现说明 |
|------|------|------|---------|
| F4.1 | AI 输入安全（prompt injection 防护） | ✅ 已实现 | 安全中间件实现了 input sanitization，检测和过滤 prompt injection 攻击 |
| F4.2 | AI 输出校验（不直接执行，需人确认） | ✅ 已实现 | output validation 中间件校验 AI 输出，human boundary 机制确保关键操作需人工确认 |
| F4.3 | 数据权限隔离（AI 不越权访问） | ✅ 已实现 | RBAC 中间件根据 Persona 角色控制工具访问权限，3 个 Persona 各有不同的工具权限集 |
| F4.4 | AI 操作审计日志 | ✅ 已实现 | audit log 中间件记录所有 MCP 工具调用的完整审计轨迹 |
| F4.5 | 人机边界控制（AI 不自动审批） | ✅ 已实现 | human boundary 中间件标记需人工确认的操作，审批等关键操作不允许 AI 自动执行 |
| F4.6 | 风险评估透明化（逻辑可查/可审计/可配置） | ✅ 已实现 | risk transparency 机制确保风险评估逻辑可追溯，合规规则引擎配置化 |
| F4.7 | 敏感数据处理（脱敏/私有化部署） | ✂️ 已裁剪 | 未实现独立的数据脱敏层，PoC 全部使用脱敏测试数据 |

### 实际交付物

- **后端**：Hono 框架，17 个 TS 文件，约 2579 行
  - 10 个 MCP 工具：filing_create / update / submit / get / list / extract / risk_assess / history / stats / anomaly_detect
  - 安全中间件管线（F4.1-F4.6）：input sanitization → permission check → execute → output validation → audit log
  - 3 个 Persona 角色：filing-initiator（发起人）、filing-approver（审批人）、filing-strategist（战略分析师）
  - 合规规则引擎：pre-hooks（必填字段校验、金额校验、风险驱动审批级别）+ post-hooks（同步、审计快照）
  - 工具执行管线：sanitize → permission → execute → validate → audit
- **前端**：无独立前端（MCP Server 设计为被 AI Agent 调用）

---

## 五、Phase 5 — 集成验证 + 结论输出

| 编号 | 功能 | 状态 | 说明 |
|------|------|------|------|
| F5.1 | 端到端场景验证 | ⏳ 待实现 | — |
| F5.2 | 传统 vs AI 模式对比度量 | ⏳ 待实现 | — |
| F5.3 | 四种意图达成度评估 | ⏳ 待实现 | — |
| F5.4 | 验证结论报告输出 | ⏳ 待实现 | — |
| F5.5 | 生产化路径建议 | ⏳ 待实现 | — |

---

## 六、技术架构（实际）

### 6.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Nginx 反向代理                            │
├─────────┬─────────┬─────────┬─────────┬─────────┬──────────────┤
│  V1 FE  │  V1 BE  │  V2 FE  │  V2 BE  │  V3 FE  │   V3 BE     │
│  :3100  │  :3101  │  :3103  │  :3102  │  :3105  │   :3104     │
│ Next.js │  Hono   │ Next.js │  Hono   │ Next.js │   Hono      │
├─────────┴─────────┴─────────┴─────────┴─────────┴──────────────┤
│                     V4 MCP Server :3106 (Hono)                  │
├─────────────────────────────────────────────────────────────────┤
│                   PostgreSQL (共享数据库)                         │
│              Drizzle ORM — 5 tables                              │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 技术选型（实际）

| 层 | 选型 | 说明 |
|----|------|------|
| 前端框架 | Next.js 15 App Router | 3 个前端应用（V1/V2/V3），各自独立主题色 |
| UI 样式 | Tailwind CSS | V1 默认、V2 indigo/violet、V3 emerald/teal |
| 后端框架 | Hono | 4 个后端服务（V1/V2/V3/V4），轻量高性能 |
| 数据库 | PostgreSQL + Drizzle ORM | 5 张表，所有版本共享同一数据库 |
| AI 能力 | Mock Service | 未接入真实 LLM，全部 AI 能力通过 Mock 服务模拟 |
| 包管理 | pnpm workspace (monorepo) | 共享包：@filing/shared、@filing/database、@filing/ui |
| 部署 | Docker Compose + Nginx | 一键部署脚本 + 验证脚本 |

### 6.3 与规划架构的偏差

| 规划 | 实际 | 偏差原因 |
|------|------|---------|
| 基于 Synapse AI 平台构建 | 独立 monorepo，4 个版本并行 | PoC 阶段独立验证，未依赖 Synapse 平台 |
| MiniMax 2.5 + Claude | AI Mock Service | PoC 优先验证交互体验，真实 LLM 集成为后续工作 |
| File-based JSON 存储 | PostgreSQL + Drizzle ORM | 关系型数据库更适合备案业务的关联查询需求 |
| Synapse 整体部署 | Docker Compose 独立部署 | 独立部署便于 PoC 快速验证 |
| YAML 配置驱动 | 代码硬编码逻辑 | PoC 阶段以速度优先，未实现配置化 |

---

## 七、共享包

| 包名 | 内容 | 状态 |
|------|------|------|
| @filing/shared | 15 个类型文件（filing, approval, user, api, attachment, audit-log, ai, insight, mcp） | 已实现 |
| @filing/database | 5 张表定义、migration、seed 数据 | 已实现 |
| @filing/ui | 占位包 | 未填充，各前端各自实现 UI 组件 |

---

## 八、统计数据

| 指标 | 数值 |
|------|------|
| 源文件数（.ts/.tsx） | 118 |
| 代码行数 | 12,559 |
| 单元测试数 | 0 |
| 验收测试方式 | curl 脚本手动验证 |
| 前端应用数 | 3（V1/V2/V3） |
| 后端服务数 | 4（V1/V2/V3/V4） |
| 数据库表数 | 5 |
| 端口占用 | V1=3100/3101, V2=3102/3103, V3=3104/3105, V4=3106 |
| 种子数据 | 5 用户 / 5 备案 / 3 审批 |

---

## 九、已知局限

### 9.1 架构局限

- **AI 全部 Mock**：所有 AI 能力（预填、提取、风险评估、摘要、洞察、查询）均为 Mock 实现，未接入真实 LLM
- **无真实认证**：使用 X-User-Id 请求头模拟用户身份，无 SSO/JWT/Session 机制
- **共享数据库**：4 个版本共享同一 PostgreSQL 实例和同一套表，无数据隔离
- **无配置化**：审批流、规则引擎、表单 Schema 均为代码硬编码，未实现 YAML/JSON 配置驱动

### 9.2 功能局限

- **无附件上传**：attachments 表存在但无上传/下载实现
- **无主动推送**：异常和预警仅在仪表盘展示，无飞书/邮件等主动推送
- **无上下文快照**：审批时 AI 展示的内容未持久化为快照
- **V4 无前端**：MCP Server 设计为 API 调用，无独立 UI

### 9.3 质量局限

- **零测试覆盖**：无单元测试、集成测试或端到端测试，仅通过 curl 脚本验证
- **无错误处理标准化**：各服务的错误处理方式不一致
- **无性能验证**：未做任何负载测试或性能基准测试

### 9.4 Phase 5 缺失

- 端到端集成验证、对比度量、意图达成度评估、结论报告均未开展
