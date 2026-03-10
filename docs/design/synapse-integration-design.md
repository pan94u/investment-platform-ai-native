# 投资备案系统 × Synapse AI 集成设计

> 日期：2026-03-10
>
> 核心决策：**不建独立系统，作为 Synapse 的业务域模块构建。**
> 投资备案系统 = MCP Server + Skills + Personas + Compliance Rules + Proactive Tasks + Decision Metrics

---

## 一、架构决策：为什么不建独立系统

### 对比分析

| 维度 | 独立系统 | Synapse 域模块 |
|------|---------|---------------|
| 对话式交互 | 自建 Chat UI + AI 编排 | ✅ 复用 Synapse Agent 引擎 + Chat UI |
| 审批流程 | 自建审批引擎 | ✅ 复用合规引擎 Pre-Hook + 审批流 |
| 角色权限 | 自建角色体系 | ✅ 复用 Persona 系统 |
| 留痕审计 | 自建审计日志 | ✅ 复用全链路审计轨迹 |
| 主动推送 | 自建定时任务 | ✅ 复用主动智能引擎 |
| 数据洞察 | 自建看板 + AI 分析 | ✅ 复用决策智能引擎 |
| 飞书通知 | 自建飞书集成 | ✅ 复用飞书 MCP Server |
| 外围系统 | 自建适配器 | ✅ 复用 MCP Hub + 适配器模式 |
| 组织知识 | 无 | ✅ 复用组织记忆（制度/决策/经验） |
| 开发工作量 | ~15-20 Session | ~8-12 Session（减少 40%+） |

### 集成后的架构定位

```
Synapse AI 平台
│
├── 通用基础设施（已有）
│   ├── Agent 引擎、Model Router
│   ├── MCP Hub、飞书/企微/邮件
│   ├── 合规引擎（Pre-Hook + Post-Hook）
│   ├── 主动智能、决策智能
│   ├── Persona 系统、组织记忆
│   └── Web UI（Chat + 决策驾驶舱）
│
└── 业务域模块
    ├── 投资管理（已有 invest-platform MCP）
    │
    ├── 投资备案（本次新增）⬅️
    │   ├── MCP Server: investment-filing
    │   ├── Personas: filing-initiator, filing-approver, filing-strategist
    │   ├── Compliance Rules: investment-filing.yaml
    │   ├── Skills: filing-create, filing-review, filing-insight
    │   ├── Proactive Tasks: filing-deadline, filing-anomaly
    │   └── Decision Metrics: filing volume, approval SLA, risk
    │
    ├── 法务（已有 legal MCP）
    └── 财务（已有 finance MCP）
```

---

## 二、投资备案域模块设计

### 2.1 MCP Server: investment-filing

在 Synapse 中新增一个 MCP Server，提供备案相关的所有工具能力。

**位置**: `packages/mcp-servers/src/investment-filing/`

**工具清单**:

| Tool | 说明 | 意图 |
|------|------|------|
| `filing_create` | 创建备案记录（草稿） | 提效 |
| `filing_update` | 更新备案内容 | 提效 |
| `filing_submit` | 提交备案（触发审批） | 授权 |
| `filing_get` | 获取备案详情 | 提效 |
| `filing_list` | 查询备案列表（多维度筛选） | 提效 |
| `filing_extract_from_doc` | 从上传文档提取备案信息 | 提效 |
| `filing_risk_assess` | 评估备案风险等级 | 授权 |
| `filing_history` | 获取项目/法人的历史备案记录 | 底线 |
| `filing_stats` | 备案统计数据（趋势/分布/效率） | 提效 |
| `filing_anomaly_detect` | 检测异常模式（变更频率/金额集中度） | 底线 |

**MCP 配置**: `config/mcp-servers/investment-filing.json`

```json
{
  "id": "investment-filing",
  "name": "投资备案管理",
  "description": "投资项目备案的创建、审批、查询、风险评估、数据洞察",
  "transport": "stdio",
  "command": "bun",
  "args": ["run", "packages/mcp-servers/src/investment-filing/index.ts"],
  "enabled": true,
  "autoStart": true,
  "permissions": {
    "tools": ["filing_*"],
    "resources": ["filing://*"],
    "requireApproval": ["filing_submit"]
  },
  "tags": ["investment", "filing", "compliance", "approval"],
  "category": "business"
}
```

**数据存储**: `data/investment-filing/`

```
data/investment-filing/
├── filings/              # 备案记录 {id}.json
├── drafts/               # 草稿 {id}.json
├── attachments/          # 附件存储
├── risk-assessments/     # 风险评估记录
├── approval-snapshots/   # 审批上下文快照（审批人看到了什么）
└── _index.json           # 检索索引
```

### 2.2 Personas: 投资备案角色

**角色 1: 备案发起人** `config/personas/filing-initiator.yaml`

```yaml
id: filing-initiator
name: 备案发起人
description: 各领域/产业负责提交投资备案申请的人员

personality:
  tone: professional
  focus: efficiency
  caution: medium

default_skills:
  - filing-create           # 对话式创建备案
  - filing-status            # 查看备案进度

allowed_mcp_servers:
  - investment-filing        # 创建/查看备案
  - invest-platform          # 获取项目信息（只读）
  - legal                    # 获取法人信息（只读）
  - feishu                   # 接收通知

allowed_tools:
  - filing_create
  - filing_update
  - filing_submit
  - filing_get
  - filing_list
  - filing_extract_from_doc
  - filing_risk_assess       # 提交前看风险预判
  - filing_history           # 查历史备案
  - invest_list_funds        # 获取项目列表
  - invest_dashboard         # 项目概览
  - feishu_send_msg          # 仅接收

compliance_ruleset: investment-filing

org_memory_access:
  - policies/investment/*    # 投资管理制度
  - knowledge/filing/*       # 备案相关知识
```

**角色 2: 备案审批人** `config/personas/filing-approver.yaml`

```yaml
id: filing-approver
name: 备案审批人
description: 集团战略部审批备案申请的人员

personality:
  tone: professional
  focus: accuracy
  caution: high

default_skills:
  - filing-review            # 审批辅助（摘要+风险+建议）
  - filing-insight           # 备案数据洞察

allowed_mcp_servers:
  - investment-filing        # 完整访问
  - invest-platform          # 项目详情
  - legal                    # 法人详情
  - feishu                   # 通知+待办

allowed_tools:
  - filing_*                 # 所有备案工具
  - invest_*                 # 所有投资工具（只读）
  - feishu_send_msg
  - feishu_create_approval

compliance_ruleset: investment-filing

proactive_tasks:
  - trigger: filing_submitted
    action: filing-approval-notify
  - schedule: "0 9 * * 1"
    action: filing-weekly-summary

org_memory_access:
  - policies/investment/*
  - decisions/investment/*   # 历史投资决策
  - lessons/investment/*     # 投资经验教训
  - knowledge/filing/*
```

**角色 3: 战略管理层** `config/personas/filing-strategist.yaml`

```yaml
id: filing-strategist
name: 战略管理层
description: 战略部领导，关注投资备案的全局态势和趋势

personality:
  tone: professional
  focus: insight
  caution: high

default_skills:
  - filing-insight           # 数据洞察
  - investment-analysis      # 投资分析（已有）
  - filing-report            # 定期报告

allowed_mcp_servers:
  - investment-filing        # 完整访问
  - invest-platform          # 完整访问
  - legal                    # 法人信息
  - bi                       # 数据分析
  - feishu                   # 通知

allowed_tools:
  - filing_*
  - invest_*
  - bi_*
  - feishu_send_msg

proactive_tasks:
  - schedule: "0 8 * * 1"
    action: filing-weekly-insight
  - trigger: filing_anomaly_detected
    action: filing-anomaly-alert
  - schedule: "0 9 1 * *"
    action: filing-monthly-report

org_memory_access:
  - "*"                      # 全访问
```

### 2.3 Compliance Rules: 投资备案规则

**位置**: `config/compliance/rules/investment-filing.yaml`

```yaml
# 投资备案合规规则
rules:
  # ─── 底线规则（Pre-Hook）───

  - id: filing-required-fields
    phase: pre
    description: 备案必填字段校验
    when:
      tool: "filing_submit"
    conditions:
      - if: "!input.projectId && !input.legalEntityId"
        then: deny
        reason: "备案必须关联项目或法人"
      - if: "!input.content"
        then: deny
        reason: "备案内容不能为空"
      - if: "!input.attachments || input.attachments.length === 0"
        then: deny
        reason: "见证性文档不能为空"

  - id: filing-amount-validation
    phase: pre
    description: 基金投项目金额校验
    when:
      tool: "filing_submit"
      condition: "input.filingType === 'fund_investment' && input.subScene === 'small_fund_invest'"
    conditions:
      - if: "input.amount >= 100000000"
        then: deny
        reason: "基金投项目金额≥1亿元，需上投决会审议，不可走备案"

  - id: filing-risk-driven-approval
    phase: pre
    description: 风险驱动的审批链路
    when:
      tool: "filing_submit"
    conditions:
      - if: "riskLevel === 'low'"
        then: require_approval
        approver: "filing-approver"
        reason: "低风险备案，仅需集团审批人确认"
      - if: "riskLevel === 'medium'"
        then: require_approval
        approver: ["filing-initiator-supervisor", "filing-approver"]
        reason: "中风险备案，需直属上级+集团审批人审批"
      - if: "riskLevel === 'high'"
        then: require_approval
        approver: ["filing-initiator-supervisor", "filing-approver"]
        flags: ["high-risk", "enhanced-context"]
        reason: "高风险备案，加强审批+风险标红"

  # ─── 底线规则（Post-Hook）───

  - id: filing-post-sync
    phase: post
    description: 审批通过后同步外围系统
    when:
      tool: "filing_submit"
      condition: "result.status === 'approved'"
    actions:
      - sync_invest_system: true   # 对赌目标回写
      - sync_legal_system: true    # 法人备案结果回传
      - notify:
          targets: ["project-owner", "filing-initiator"]
          message: "备案已通过，相关系统已同步"

  - id: filing-audit-snapshot
    phase: post
    description: 审批上下文快照（留痕）
    when:
      tool: "filing_submit"
    actions:
      - snapshot_approval_context: true  # 记录审批人看到的全部信息
      - auto_mask: false                 # 备案内容不脱敏（业务需要完整记录）
```

### 2.4 Skills: 投资备案技能

**Skill 1: 对话式备案创建** `config/skills/filing-create.yaml`

```yaml
name: filing-create
description: 通过自然对话或文档上传创建投资备案
allowed-tools:
  - filing_create
  - filing_update
  - filing_submit
  - filing_extract_from_doc
  - filing_risk_assess
  - filing_history
  - invest_dashboard
  - invest_list_funds
  - invest_deal_kanban
category: investment
status: active
```

**Skill 指令（SKILL.md）核心流程**:

```
1. 理解用户意图：自然语言 → 识别备案类型（直投/基金投/法人/其他）+ 子场景
2. 获取项目/法人信息：调用 invest_dashboard 或 legal MCP 获取关联数据
3. 如用户上传文档：调用 filing_extract_from_doc 提取结构化信息
4. AI 预填充表单：结合项目上下文、历史备案、文档内容生成完整备案
5. 底线检查：调用 filing_risk_assess 评估风险等级，校验必填项和规则
6. 展示预填结果 + 风险预判，请用户确认
7. 用户确认后调用 filing_submit（触发合规引擎 Pre-Hook 审批流）
```

**Skill 2: 审批辅助** `config/skills/filing-review.yaml`

```yaml
name: filing-review
description: 为审批人提供备案摘要、风险分析、历史上下文、意见建议
allowed-tools:
  - filing_get
  - filing_history
  - filing_risk_assess
  - filing_stats
  - filing_anomaly_detect
  - invest_dashboard
  - invest_deal_kanban
category: investment
status: active
```

**Skill 指令核心流程**:

```
1. 加载备案详情：调用 filing_get 获取完整信息
2. 生成 AI 摘要：一段话说清"谁要干什么"
3. 附件摘要：提取附件核心内容
4. 风险分析：调用 filing_risk_assess + filing_history + filing_anomaly_detect
   - 该项目/法人历史备案轨迹
   - 同领域近期备案趋势
   - 异常信号标红
5. 同类参考：调用 filing_stats 获取基准数据
6. 生成审批意见建议：基于风险分析和历史数据
7. 生成审批上下文快照（留痕）
```

**Skill 3: 备案数据洞察** `config/skills/filing-insight.yaml`

```yaml
name: filing-insight
description: 备案数据的趋势分析、异常检测、对话式查询
allowed-tools:
  - filing_stats
  - filing_anomaly_detect
  - filing_list
  - filing_history
  - invest_dashboard
  - bi_query_report
category: investment
status: active
```

### 2.5 Proactive Tasks: 主动智能

**位置**: `config/proactive/actions/`

| 任务 | 触发方式 | 目标角色 | 说明 |
|------|---------|---------|------|
| `filing-approval-notify` | 事件：备案提交 | filing-approver | 推送审批待办（含 AI 摘要 + 风险等级） |
| `filing-weekly-summary` | Cron: 周一 9:00 | filing-approver | 本周备案概况 + 在途事项 |
| `filing-weekly-insight` | Cron: 周一 8:00 | filing-strategist | 趋势分析 + 异常预警 + 底线监控 |
| `filing-monthly-report` | Cron: 每月1日 9:00 | filing-strategist | 月度备案数据报告 |
| `filing-anomaly-alert` | 事件：异常检测触发 | filing-strategist | 底线预警（累计金额/变更频率异常） |
| `filing-deadline-reminder` | Cron: 每日 9:00 | filing-approver | 超时审批催办 |

### 2.6 Decision Metrics: 备案决策指标

**位置**: 扩展 `config/decision/metrics.yaml`

```yaml
# 投资备案指标
filing_metrics:
  - id: filing_volume
    name: 备案数量
    query: "调用 filing_stats 获取本期备案总量和分类"
    frequency: daily
    alert_rules:
      - condition: "month_over_month_change > 0.5"
        severity: warning
        message: "备案数量月环比增长超50%"

  - id: filing_approval_sla
    name: 审批时效
    query: "计算平均审批耗时"
    frequency: daily
    unit: "小时"
    alert_rules:
      - condition: "value > 72"
        severity: warning
        message: "平均审批耗时超72小时"

  - id: filing_risk_distribution
    name: 风险分布
    query: "统计低/中/高风险备案占比"
    frequency: weekly

  - id: filing_clawback_frequency
    name: 对赌变更频率
    query: "统计近6个月对赌变更次数"
    frequency: weekly
    alert_rules:
      - condition: "any_project_changes > 2"
        severity: critical
        message: "有项目对赌变更超过2次"

  - id: filing_domain_concentration
    name: 领域集中度
    query: "各领域备案金额占比"
    frequency: monthly
    alert_rules:
      - condition: "any_domain_ratio > 0.4"
        severity: warning
        message: "单一领域备案金额占比超40%"
```

### 2.7 Org Memory: 组织记忆

**位置**: 扩展 `data/org-memory/`

```
data/org-memory/
├── policies/
│   └── investment/
│       ├── filing-rules.json        # 备案管理规范
│       ├── approval-thresholds.json # 审批阈值配置
│       └── risk-criteria.json       # 风险评估标准
├── decisions/
│   └── investment/
│       └── {decision-id}.json       # 重要备案决策记录
├── lessons/
│   └── investment/
│       └── {lesson-id}.json         # 备案相关经验教训
└── knowledge/
    └── filing/
        ├── faq.json                 # 常见问题
        └── best-practices.json      # 最佳实践
```

---

## 三、用户旅程在 Synapse 中的实现

### 旅程 1: 对话式备案 → Synapse Chat + filing-create Skill

```
发起人登录 Synapse → Persona 自动切换为 filing-initiator
    │
    ▼
在 Chat UI 中说: "海川项目要做对赌变更，文件在这里"
    │
    ▼
Agent 引擎 → 识别意图 → 加载 filing-create Skill
    │
    ├── 调用 invest_dashboard → 获取海川项目信息
    ├── 调用 filing_extract_from_doc → 从附件提取信息
    ├── 调用 filing_history → 获取历史备案
    ├── 调用 filing_create → 创建备案草稿（AI 预填充）
    └── 调用 filing_risk_assess → 评估风险等级
    │
    ▼
Agent 展示预填结果 + 底线检查 + 风险预判
    │
    ▼
用户确认 → Agent 调用 filing_submit
    │
    ▼
合规引擎 Pre-Hook:
    ├── 校验必填字段 ✅
    ├── 校验金额规则 ✅
    ├── 风险评估 → 中高风险 → 标准审批链
    └── 发起审批 → 飞书待办推送
    │
    ▼
Audit Trail 自动记录全链路（留痕）
```

### 旅程 2: 上下文审批 → Synapse Chat + filing-review Skill

```
审批人收到飞书待办通知（含 AI 摘要）
    │
    ▼
点击链接 → 进入 Synapse → Persona 切换为 filing-approver
    │
    ▼
Agent 自动加载 filing-review Skill:
    ├── AI 摘要
    ├── 风险面板（历史+异常+同类参考）
    ├── 附件摘要
    └── 审批意见建议
    │
    ▼
审批人做出决策 → Agent 执行审批操作
    │
    ▼
合规引擎 Post-Hook:
    ├── 对赌目标回写战投系统（调用 invest-platform MCP）
    ├── 审批上下文快照（留痕）
    └── 通知相关人员（调用 feishu MCP）
```

### 旅程 3: 主动洞察 → Synapse 决策驾驶舱 + filing-insight Skill

```
主动智能引擎 Cron 触发（周一 8:00）
    │
    ▼
Agent 以 filing-strategist 身份执行 filing-weekly-insight:
    ├── 调用 filing_stats → 本周数据
    ├── 调用 filing_anomaly_detect → 异常检测
    ├── 调用 filing_list → 在途事项
    └── AI 生成洞察报告
    │
    ▼
推送到战略管理层的 Synapse 决策驾驶舱
    + 飞书消息推送
    │
    ▼
管理层在 Chat 中追问: "哪些项目对赌变更超过2次？"
    → Agent 调用 filing_list + filing_history → 自然语言回答
```

---

## 四、Synapse 需求清单（需平台侧修改/增强）

### P0 — 必须有（阻塞核心功能）

| 编号 | 需求 | 说明 | 涉及模块 |
|------|------|------|---------|
| S1 | **多步审批流支持** | 当前合规引擎 Pre-Hook 审批为单步确认。备案需要支持多级审批链（直属上级→集团审批人），含驳回回退和转办 | compliance |
| S2 | **审批状态机** | 需要完整的审批生命周期管理：pending→approved/rejected/transferred，支持审批超时和催办 | compliance |
| S3 | **文件上传能力** | Agent 需要能接收用户上传的文件（PDF/Word/图片），当前 Chat UI 可能不支持 | web, agent-core |
| S4 | **文档内容提取工具** | 需要内置工具从 PDF/Word 中提取文本内容供 AI 分析 | agent-core/tools |
| S5 | **结构化表单渲染** | Chat 中 AI 生成的预填结果需要以结构化卡片形式展示（非纯文本），支持用户确认/修改 | web |

### P1 — 应该有（显著提升体验）

| 编号 | 需求 | 说明 | 涉及模块 |
|------|------|------|---------|
| S6 | **审批待办中心 UI** | 审批人需要一个专门的待办视图（不仅是 Chat 中处理），展示所有待审批项 + AI 摘要 | web |
| S7 | **Persona 动态切换** | 同一用户可能既是某项目的发起人又是另一项目的审批人，需要支持基于上下文的角色自动识别 | personas |
| S8 | **合规引擎自定义 Action** | Post-Hook 需要支持自定义 Action（如调用外部 MCP 同步数据），当前可能仅支持内置 Action | compliance |
| S9 | **事件总线增强** | 主动智能的事件触发需要支持 MCP Server 自定义事件（如 `filing_submitted`、`filing_anomaly_detected`） | proactive |
| S10 | **决策指标自定义数据源** | 决策引擎的数据采集器需支持从 filing MCP Server 直接获取指标，而非仅通过 Agent 对话 | decision-engine |

### P2 — 锦上添花

| 编号 | 需求 | 说明 | 涉及模块 |
|------|------|------|---------|
| S11 | **Rich Card 消息类型** | Chat 中支持富卡片消息（备案摘要卡、风险面板卡、审批操作卡），不仅是纯文本 | web, agent-core |
| S12 | **飞书审批集成** | 飞书 MCP Server 增加审批单创建和回调能力，实现飞书内直接审批 | mcp-servers/feishu |
| S13 | **数据导出工具** | filing MCP Server 支持将查询结果导出为 Excel | mcp-servers/investment-filing |
| S14 | **多 Persona 协作** | 审批过程中发起人和审批人的对话可以关联到同一备案记录上下文 | agent-core, personas |

---

## 五、投资平台侧实现范围

### 我们负责实现（本项目范围内）

| 模块 | 内容 | 预计工作量 |
|------|------|-----------|
| MCP Server | `investment-filing` 完整实现 | 2-3 Session |
| Personas | 3 个角色配置（YAML） | 0.5 Session |
| Compliance Rules | 投资备案规则集（YAML） | 0.5 Session |
| Skills | 3 个技能（SKILL.md + 指令） | 1-2 Session |
| Proactive Tasks | 6 个主动任务配置（YAML） | 0.5 Session |
| Decision Metrics | 5 个决策指标配置（YAML） | 0.5 Session |
| Org Memory | 初始知识条目 | 0.5 Session |
| Mock 数据 | 战投系统 / 法务系统模拟数据 | 1 Session |
| 集成测试 | 端到端验证 | 1-2 Session |

### Synapse 平台侧负责

按需求清单 S1-S14 由平台团队支持。

---

## 六、技术选型更新

| 层 | 原规划 | 更新 | 理由 |
|----|--------|------|------|
| 前端 | React + Next.js（独立） | Synapse Web（Next.js + shadcn/ui） | 复用平台 UI |
| 后端 | Node.js（独立） | Synapse Server（Hono） + MCP Server | 复用平台引擎 |
| AI | Claude API（直接调用） | Synapse Agent 引擎（MiniMax 2.5 + Claude） | 复用 Model Router |
| 数据 | PostgreSQL（独立） | File-based JSON（Synapse 标准） | 与平台一致 |
| 部署 | Docker Compose | Synapse 整体部署 | 统一部署 |

---

## 七、四种意图在 Synapse 中的映射

| 意图 | Synapse 基础设施 | 投资备案实现 |
|------|-----------------|------------|
| **底线要求** | 合规引擎 Pre-Hook + Post-Hook | `investment-filing.yaml` 规则集 |
| **留痕** | 全链路审计轨迹 + 组织记忆 | 对话存档 + 审批快照 + MCP 审计日志 |
| **相关授权** | Pre-Hook 审批流 + Persona 权限 | 风险驱动分级审批 + 角色隔离 |
| **提效** | Agent 引擎 + Skill 系统 + 主动智能 | 对话式备案 + 审批辅助 + 主动洞察 |
