# Phase 实施规划

> 日期：2026-03-10
>
> 4 个版本、4 个独立应用，渐进式验证 AI 原生体验的价值。

---

## 一、4 个应用定位

| 应用 | 版本 | 定位 | 核心验证 |
|------|------|------|---------|
| **v1-traditional** | V1 | 传统备案系统（基线对照） | 传统 CRUD + 审批流，作为对比基准 |
| **v2-ai-enhanced** | V2 | AI 增强备案系统 | 对话式发起、AI 摘要、智能看板 |
| **v3-intent-driven** | V3 | 意图驱动备案系统 | 四种意图分离、风险驱动审批、自动留痕 |
| **v4-synapse** | V4 | Synapse 集成备案系统 | 平台级 AI 原生、角色画像、主动智能、组织记忆 |

**每个应用**：
- 独立可部署（docker compose up 即可运行）
- 独立可体验（完整的业务闭环 + 演示数据）
- 独立可验证（自动化测试 + 本地验证脚本）

---

## 二、技术架构统一

### 2.1 单应用架构（V1-V3 共用）

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   nginx      │────▶│   frontend   │     │   postgres   │
│   :80        │     │   Next.js    │     │   :5432      │
│              │────▶│   :3000      │     │              │
│              │     ├──────────────┤     │              │
│              │────▶│   backend    │────▶│              │
│              │     │   Hono       │     │              │
│              │     │   :3001      │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 2.2 V4 架构（基于 Synapse）

V4 作为 Synapse 的域模块运行在 Synapse 平台上，不独立部署前后端。

### 2.3 技术栈

| 组件 | 选型 | 说明 |
|------|------|------|
| 前端 | Next.js 15 + React 19 + TailwindCSS + shadcn/ui | 与 Synapse 保持一致 |
| 后端 | Hono (TypeScript) + Bun | 轻量高性能 |
| 数据库 | PostgreSQL 16 Alpine | 参照 forge |
| ORM | Drizzle ORM | TypeScript 原生，轻量 |
| AI | Claude API (Anthropic SDK) | V2/V3 使用 |
| 反向代理 | nginx Alpine | 统一入口 |
| 包管理 | pnpm + Turborepo | Monorepo 管理 |
| 容器化 | Docker + Docker Compose | 本地 Docker Desktop |

### 2.4 Monorepo 结构

```
investment-platform-ai-native/
├── package.json                    # Monorepo 根
├── pnpm-workspace.yaml
├── turbo.json
│
├── packages/
│   ├── shared/                     # 共享类型、常量、工具函数
│   │   └── src/
│   │       ├── types/              # Filing, Approval, User 等类型
│   │       ├── constants/          # 备案场景、状态枚举
│   │       └── utils/              # 通用工具
│   │
│   ├── database/                   # 数据库 Schema + 迁移
│   │   └── src/
│   │       ├── schema/             # Drizzle Schema
│   │       ├── migrations/         # SQL 迁移文件
│   │       └── seed/               # 演示数据（每个版本独立 seed）
│   │
│   └── ui/                         # 共享 UI 组件
│       └── src/
│           ├── components/         # Button, Card, Dialog, Table 等
│           └── layouts/            # 页面布局
│
├── apps/
│   ├── v1-traditional/             # V1: 传统备案系统
│   │   ├── frontend/               # Next.js
│   │   ├── backend/                # Hono API
│   │   └── Dockerfile.*
│   │
│   ├── v2-ai-enhanced/             # V2: AI 增强备案系统
│   │   ├── frontend/               # Next.js + Chat UI
│   │   ├── backend/                # Hono API + AI 编排
│   │   └── Dockerfile.*
│   │
│   ├── v3-intent-driven/           # V3: 意图驱动备案系统
│   │   ├── frontend/               # Next.js + Chat + 风险面板
│   │   ├── backend/                # Hono API + AI + 风险引擎
│   │   └── Dockerfile.*
│   │
│   └── v4-synapse/                 # V4: Synapse 域模块
│       ├── mcp-server/             # MCP Server: investment-filing
│       ├── config/                 # Personas, Skills, Rules, Tasks
│       └── README.md               # 集成指南
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.v1.yml
│   │   ├── docker-compose.v2.yml
│   │   ├── docker-compose.v3.yml
│   │   ├── docker-compose.v4.yml
│   │   ├── nginx.conf
│   │   └── .env.example
│   └── scripts/
│       ├── build.sh                # 统一构建脚本
│       ├── deploy.sh               # 部署脚本（指定版本）
│       ├── verify.sh               # 本地验证脚本
│       └── seed.sh                 # 数据初始化
│
├── tests/
│   ├── e2e/                        # 端到端测试
│   │   ├── v1/
│   │   ├── v2/
│   │   ├── v3/
│   │   └── v4/
│   └── api/                        # API 集成测试
│
└── docs/                           # 已有文档
```

---

## 三、Phase 规划

### Phase 0 — 项目初始化 + 交付框架 ✅（当前已完成）

- [x] Git 仓库初始化
- [x] 交付框架建立
- [x] 需求分析和价值校验
- [x] AI 原生 UX 设计（v1/v2）
- [x] Synapse 集成设计
- [x] Plan-baseline 建立

### Phase 1 — 工程基座 + V1 传统备案系统

**目标**：搭建 Monorepo 工程基座，完成 V1 传统备案系统（作为对比基线）。

#### Session 1.1 — Monorepo 脚手架 + 数据库

| 任务 | 产出 |
|------|------|
| 初始化 pnpm + Turborepo Monorepo | package.json, turbo.json |
| 创建 packages/shared（类型定义） | Filing, Approval, User 类型 |
| 创建 packages/database（Drizzle Schema） | 完整数据模型 + 迁移 |
| PostgreSQL Docker 配置 | docker-compose.v1.yml（仅 DB） |
| 数据库 seed 脚本 | 演示数据：项目、法人、用户、历史备案 |

**验收**：`pnpm db:migrate && pnpm db:seed` 运行成功，数据库有演示数据。

#### Session 1.2 — V1 后端 API

| 任务 | 产出 |
|------|------|
| V1 Backend 骨架（Hono + Drizzle） | apps/v1-traditional/backend |
| 备案 CRUD API | POST/GET/PUT /api/filings |
| 审批流 API（固定两级） | POST /api/filings/:id/submit, /approve, /reject |
| 查询与筛选 API | GET /api/filings?type=&status=&dateFrom= |
| Mock 外围系统（战投/法务） | GET /api/mock/projects, /api/mock/legal-entities |
| API 集成测试 | tests/api/v1/ |

**验收**：API 测试全部通过，curl 可完成备案创建→提交→审批全流程。

#### Session 1.3 — V1 前端 + Docker 部署

| 任务 | 产出 |
|------|------|
| V1 Frontend 骨架（Next.js + shadcn） | apps/v1-traditional/frontend |
| 备案列表页 | 多维度筛选、状态标签 |
| 新建备案页 | 菜单选场景 → 表单填写 → 附件上传 → 提交 |
| 审批待办页 | 待办列表 → 表单详情 → 同意/驳回 |
| 首页看板 | 备案数量统计、分类分布 |
| Docker 完整部署 | nginx + frontend + backend + postgres |
| 本地验证脚本 | infrastructure/scripts/verify.sh |
| Dockerfile（frontend + backend） | 多阶段构建 |

**验收**：`docker compose -f docker-compose.v1.yml up` → 浏览器完整走通备案流程。

### Phase 2 — V2 AI 增强备案系统

**目标**：在 V1 基础上叠加 AI 能力层，验证对话式交互的体验提升。

#### Session 2.1 — AI 编排层 + 对话式备案

| 任务 | 产出 |
|------|------|
| V2 Backend（fork V1 + AI 编排层） | apps/v2-ai-enhanced/backend |
| Claude API 集成 | AI 服务封装（意图识别、信息提取、摘要生成） |
| 对话式备案 API | POST /api/ai/chat（流式响应 SSE） |
| AI 预填充 API | POST /api/ai/prefill（项目上下文→表单字段） |
| 文档提取 API | POST /api/ai/extract-from-doc（上传文件→结构化数据） |
| API 测试 | tests/api/v2/ |

**验收**：通过对话或上传文档，AI 能正确识别备案类型并预填表单。

#### Session 2.2 — 审批 AI 摘要 + 智能看板

| 任务 | 产出 |
|------|------|
| 审批摘要 API | GET /api/ai/filing-summary/:id |
| 附件摘要 API | GET /api/ai/attachment-summary/:id |
| AI 审批意见建议 | GET /api/ai/approval-suggestion/:id |
| 自然语言查询 API | POST /api/ai/query（text→SQL→结果→自然语言） |
| AI 洞察生成 API | GET /api/ai/insights（趋势+异常） |

**验收**：审批页面有 AI 摘要和意见建议，看板能显示 AI 洞察。

#### Session 2.3 — V2 前端 + Docker 部署

| 任务 | 产出 |
|------|------|
| V2 Frontend（fork V1 + Chat UI） | apps/v2-ai-enhanced/frontend |
| 对话式备案界面（Chat 组件） | 自然语言输入 + AI 实时响应 |
| AI 预填表单确认界面 | 卡片式展示 + 确认/修改 |
| 审批页 AI 摘要面板 | 摘要 + 附件摘要 + 意见建议 |
| 智能看板页 | AI 洞察 + 对话查询入口 |
| Docker 部署 | docker-compose.v2.yml |

**验收**：`docker compose -f docker-compose.v2.yml up` → 对话式备案 3 步完成。

### Phase 3 — V3 意图驱动备案系统

**目标**：基于四种意图框架重构，验证风险驱动审批和自动留痕。

#### Session 3.1 — 风险评估引擎 + 底线规则引擎

| 任务 | 产出 |
|------|------|
| V3 Backend（fork V2 + 意图框架） | apps/v3-intent-driven/backend |
| 风险评估引擎 | 多维度评分（金额/变更频率/降幅/历史/集中度）→ 低/中/高 |
| 底线规则引擎 | 必填校验、金额规则、关联校验，阻断不合规提交 |
| 分级审批路由 | 低风险→轻审批，中风险→标准，高风险→加强 |
| 自动留痕服务 | 对话存档、字段来源标注、审批上下文快照 |
| API 测试 | tests/api/v3/ |

**验收**：不同风险等级的备案自动走不同审批链路，底线规则阻断不合规提交。

#### Session 3.2 — V3 前端 + Docker 部署

| 任务 | 产出 |
|------|------|
| V3 Frontend（fork V2 + 风险面板） | apps/v3-intent-driven/frontend |
| 发起人风险预判展示 | 提交前显示风险等级 + 审批关注点 |
| 审批人风险面板 | 为什么是高风险 + 历史轨迹 + 同类参考 |
| 低风险精简审批卡 | 一屏一键确认 |
| 高风险加强审批页 | 标红 + 完整上下文 |
| 留痕追溯页 | 查看完整决策链（对话+来源+快照） |
| 底线监控看板 | 底线预警 + 趋势洞察 |
| Docker 部署 | docker-compose.v3.yml |

**验收**：`docker compose -f docker-compose.v3.yml up` → 风险分级审批完整体验。

### Phase 4 — V4 Synapse 集成备案系统

**目标**：将备案系统作为 Synapse 域模块实现，验证平台级 AI 原生体验。

#### Session 4.1 — MCP Server + 配置

| 任务 | 产出 |
|------|------|
| MCP Server: investment-filing | apps/v4-synapse/mcp-server/ |
| 10 个工具实现 | filing_create/update/submit/get/list/extract/risk/history/stats/anomaly |
| 3 个 Persona 配置 | filing-initiator, filing-approver, filing-strategist |
| 合规规则集 | investment-filing.yaml |
| 3 个 Skill 定义 | filing-create, filing-review, filing-insight |
| 6 个主动任务配置 | 审批通知、周报、月报、异常预警、催办 |
| 5 个决策指标 | metrics.yaml 扩展 |

**验收**：MCP Server 工具可通过 Synapse Agent 调用，完成备案全流程。

#### Session 4.2 — Synapse 集成 + Docker 部署

| 任务 | 产出 |
|------|------|
| Synapse 配置集成 | 将 Persona/Skill/Rules/Tasks 部署到 Synapse |
| 演示数据注入 | org-memory 知识条目 + 备案历史数据 |
| 端到端验证 | 3 个旅程（对话备案/上下文审批/主动洞察）全部走通 |
| Docker 部署 | docker-compose.v4.yml（Synapse + filing MCP + PostgreSQL） |

**验收**：`docker compose -f docker-compose.v4.yml up` → 通过 Synapse 完成备案全流程。

### Phase 5 — 验证 + 验收 + 结论

#### Session 5.1 — 自动化验证 + 对比度量

| 任务 | 产出 |
|------|------|
| E2E 测试（4 个版本） | tests/e2e/v1~v4 |
| 对比度量脚本 | 步骤数、操作时间、信息完整度 |
| 4 个版本对比报告 | 量化价值差异 |
| 验证结论文档 | docs/analysis/verification-report.md |

**验收**：4 个版本全部通过自动化验证，对比报告数据完整。

#### Session 5.2 — 基线比对 + 结论输出

| 任务 | 产出 |
|------|------|
| Design-baseline 反写 | 从代码实现提取实际架构 |
| Plan vs Design 比对 | comparison-phase1~5.md |
| 最终结论报告 | 生产化建议 + 技术选型 + 架构方案 |

---

## 四、Docker 部署规范（参照 forge）

### 4.1 docker-compose 模板

```yaml
# docker-compose.vN.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: filing_vN
      POSTGRES_USER: filing
      POSTGRES_PASSWORD: ${DB_PASSWORD:-filing_dev}
    volumes:
      - vN-postgres-data:/var/lib/postgresql/data
    ports:
      - "${DB_PORT:-5432}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U filing"]
      interval: 5s
      timeout: 3s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 512M

  backend:
    build:
      context: .
      dockerfile: apps/vN/backend/Dockerfile
    environment:
      DATABASE_URL: postgresql://filing:${DB_PASSWORD:-filing_dev}@postgres:5432/filing_vN
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}   # V2/V3 only
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"]
      interval: 10s
      timeout: 3s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M

  frontend:
    build:
      context: .
      dockerfile: apps/vN/frontend/Dockerfile
    depends_on:
      backend:
        condition: service_healthy
    deploy:
      resources:
        limits:
          cpus: "0.25"
          memory: 256M

  nginx:
    image: nginx:alpine
    ports:
      - "${APP_PORT:-80}:80"
    volumes:
      - ./infrastructure/docker/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - frontend
      - backend
    deploy:
      resources:
        limits:
          cpus: "0.25"
          memory: 64M

volumes:
  vN-postgres-data:
```

### 4.2 端口分配（4 个版本可同时运行）

| 版本 | Web 端口 | DB 端口 | 数据库名 |
|------|---------|---------|---------|
| V1 | 8001 | 5401 | filing_v1 |
| V2 | 8002 | 5402 | filing_v2 |
| V3 | 8003 | 5403 | filing_v3 |
| V4 | 8004 | 5404 | filing_v4 |

### 4.3 部署命令

```bash
# 构建并启动某个版本
./infrastructure/scripts/deploy.sh v1

# 内部执行：
# 1. pnpm build --filter=@filing/v1-*
# 2. docker compose -f infrastructure/docker/docker-compose.v1.yml build
# 3. docker compose -f infrastructure/docker/docker-compose.v1.yml up -d
# 4. docker compose exec backend pnpm db:migrate
# 5. docker compose exec backend pnpm db:seed
# 6. ./infrastructure/scripts/verify.sh v1

# 启动所有版本
./infrastructure/scripts/deploy.sh all

# 验证某个版本
./infrastructure/scripts/verify.sh v1
```

### 4.4 验证脚本（verify.sh）

```bash
# 每个版本运行以下检查：
# 1. 健康检查：curl /health
# 2. API 冒烟测试：创建备案 → 提交 → 审批
# 3. 前端可访问：curl 首页 200
# 4. 数据库连通：pg_isready
# 输出：PASS / FAIL + 详细日志
```

---

## 五、演示数据设计

所有版本共用脱敏后的演示数据：

### 5.1 组织架构

| 领域 | 产业 | 示例项目 |
|------|------|---------|
| 智慧住居 | 住居科技 | 海川项目（直投）、创新科技（法人新设） |
| 产业金融 | 金融投资 | 星辰基金（基金投）、瑞丰项目（直投） |
| 大健康 | 医疗科技 | 康明项目（直投）、健康科技（法人新设） |

### 5.2 用户角色

| 用户 | 角色 | 密码 |
|------|------|------|
| zhangsan | 发起人（智慧住居） | demo123 |
| lisi | 发起人直属上级 | demo123 |
| wangwu | 集团审批人（战略部） | demo123 |
| admin | 系统管理员 | admin123 |
| ceo | 管理层（查看） | demo123 |

### 5.3 历史备案（预置）

| 备案 | 类型 | 状态 | 说明 |
|------|------|------|------|
| BG20250301-001 | 直投投资 | 已完成 | 海川项目首次投资 2 亿 |
| BG20251101-002 | 对赌变更 | 已完成 | 海川项目对赌从 8000 万→5000 万 |
| BG20260201-003 | 基金投退出 | 已完成 | 星辰基金项目退出 |
| BG20260205-004 | 法人新设 | 已完成 | 创新科技法人设立 |
| BG20260301-005 | 对赌变更 | 审批中 | 海川项目对赌从 5000 万→3000 万（演示用） |

---

## 六、Session 预估与交付节奏

| Phase | Session 数 | 预计时长 | 累计 |
|-------|-----------|---------|------|
| Phase 0（已完成） | 1 | — | 1 |
| Phase 1（工程基座+V1） | 3 | 6-9h | 4 |
| Phase 2（V2 AI 增强） | 3 | 6-9h | 7 |
| Phase 3（V3 意图驱动） | 2 | 4-6h | 9 |
| Phase 4（V4 Synapse） | 2 | 4-6h | 11 |
| Phase 5（验证+结论） | 2 | 4-6h | 13 |
| **总计** | **13** | **~26h** | |

---

## 七、交付检查清单

每个 Session 结束前必须完成：

- [ ] 代码编译通过（pnpm build）
- [ ] 单元测试通过（pnpm test）
- [ ] API 测试通过（当前 Phase 涉及的 API）
- [ ] Docker 构建成功
- [ ] 本地验证脚本通过（verify.sh）
- [ ] WORK_LOG 更新（含统计快照）
- [ ] Git 提交（粒度提交）

每个 Phase 结束前必须完成：

- [ ] Docker Desktop 部署成功
- [ ] 演示数据可用
- [ ] 端到端业务流程走通
- [ ] 验收测试文档就绪
- [ ] **用户亲自验收**
