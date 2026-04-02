# 规划基线：V1 PoC → 正式应用转换

> 版本：v1.0 | 日期：2026-04-02 | 状态：共创中
>
> 本文档定义 V1 从 PoC 转正式应用"需要做什么"。
> 交付完成后反写 design-baseline，两者比对得出偏差。

---

## 一、转换目标

将 V1 传统备案管理从 **PoC（5 人 Mock 数据 + X-User-Id 模拟认证）** 转为 **正式应用（海尔账号中心认证 + 真实组织数据 + 可配置角色权限）**，支持内部真实用户使用。

### 不变的

- Hono 后端 + Next.js 15 前端 + PostgreSQL 业务库架构不变
- 三阶段审批引擎（business → group → confirmation）不变
- 审批节点配置表 + 邮件抄送配置表机制不变
- 附件上传、富文本、战投 API 代理等已交付功能不变

### 要变的

| 模块 | PoC | 正式 |
|------|-----|------|
| 用户身份 | X-User-Id header + 本地 5 人 | 网关解析 user-account header（emp_code） |
| 组织数据 | 本地 users 表 seed | MySQL jbs_haier2.td_hrp2001_emp_org 实时查询 |
| 领域/行业 | 硬编码 3 领域 9 行业 | 从 org 表动态查询 field_name/pt_name |
| 审批链 | supervisor/admin 简化模型 | line1_manager_code 逐级上溯 |
| 角色权限 | role 字段写死 seed | 后台配置，emp_code 绑定角色 |
| 开发环境 | 无认证 | user-account 默认 20111223 |

---

## 二、数据源

### 2.1 组织数据库（只读）

**表**：`jbs_haier2.td_hrp2001_emp_org`

| 字段 | 说明 | 用途 |
|------|------|------|
| emp_code | 员工编码 | 唯一身份识别（= user-account header） |
| emp_name | 员工姓名 | 显示名 |
| ent_email | 企业邮箱 | 邮件通知 |
| field_code / field_name | 生态圈代码/名称 | → 领域（domain） |
| pt_code / pt_name | 平台代码/名称 | → 行业（industry） |
| xw_code / xw_name | 小微代码/名称 | 组织层级 |
| three_type_person | 三类人 | 创客/小微主/平台主 |
| line1_manager_code / line1_manager_name | 一级直线经理 | 审批链上溯 |
| pl_code / pl_name | 产品线代码/名称 | 辅助信息 |

**连接信息**（环境变量）：

| 环境 | 地址 | 库 | 用户 | 密码 |
|------|------|-----|------|------|
| 测试 | 10.250.12.15:3100 | jbs_haier2 | jbs_test | l#1yCNYn8Qex |
| 生产 | 10.250.29.126:3306 | jbs_haier2 | dp_hsip | i8%hZnjaq! |

### 2.2 业务数据库（读写）

PostgreSQL（现有），存储 filings、approvals、attachments、audit_logs、approval_group_configs、email_cc_configs。

新增 `user_roles` 表存储角色配置。

---

## 三、实施计划

### Step 1: 组织数据接入

> 目标：后端能查 MySQL org 表，获取员工信息和组织层级

#### 1.1 MySQL 连接

- 新增 `packages/database/src/org-connection.ts` — mysql2 连接池（只读）
- 环境变量：`ORG_DB_HOST`, `ORG_DB_PORT`, `ORG_DB_NAME`, `ORG_DB_USER`, `ORG_DB_PASS`
- 依赖：`mysql2`（后端）

#### 1.2 OrgQuery 服务

- 新增 `apps/v1-traditional/backend/src/services/org-query.ts`
- `getEmployeeByCode(empCode)` → 查 emp_name, ent_email, field_name, pt_name, three_type_person, line1_manager_code
- `getManagerChain(empCode, maxDepth=5)` → 递归查 line1_manager_code 构建审批链
- `getDistinctDomains()` → SELECT DISTINCT field_code, field_name（领域列表）
- `getIndustriesByDomain(fieldCode)` → SELECT DISTINCT pt_code, pt_name WHERE field_code=?（行业列表）
- 查询结果内存缓存 10 分钟

#### 1.3 OrgProvider 重构

- `getBusinessApproverChain` → 用 `getManagerChain` 从 org 表上溯（line1_manager → line1_manager 的 line1_manager...）
- 同人捏合逻辑保持不变
- 降级：org 表查不到时回退到本地 users 表（兼容测试环境）

#### 验收场景

- `getEmployeeByCode('20111223')` 返回正确的姓名、邮箱、生态圈
- `getManagerChain('20111223')` 返回逐级上溯的经理链
- `getDistinctDomains()` 返回真实的生态圈列表
- 审批链预览 API 使用真实 org 数据

---

### Step 2: 身份认证正式化

> 目标：通过网关 header 识别用户，自动创建本地记录

#### 2.1 Auth Middleware 改造

- 线上：从 `user-account` header 取 emp_code（网关已解析 token）
- 开发环境：`user-account` 默认 `20111223`（环境变量 `DEV_USER_ACCOUNT=20111223`）
- 用 emp_code 查本地 `users` 表：
  - 存在 → 直接使用
  - 不存在 → 从 org 表查员工信息 → 自动创建 users 记录（角色默认 initiator）
- 删除 PoC 的 X-User-Id 逻辑

#### 2.2 去掉本地 Users 表

- **不建本地用户表**，用户信息实时从 org MySQL 表查询
- `creatorId`、`approverId`、`uploadedBy` 等所有 userId 字段改为存 emp_code
- 原有的 `users` 表外键关联全部去掉，改为应用层查 org 表解析姓名/邮箱
- 需要用户姓名/邮箱的地方统一通过 `orgQuery.getEmployeeByCode(empCode)` 获取

#### 2.3 角色配置表

- 新增 `user_roles` 表（PostgreSQL）：`emp_code`, `role`, `created_by`, `created_at`
- admin 后台页面增加"用户角色管理"Tab
- 角色：`initiator`（默认）| `admin` | `viewer`
- 不在 user_roles 表中的用户默认为 initiator
- 审批人角色由 approval_group_configs 表控制

#### 2.4 前端认证流改造

- IAMProvider 保持（已接入 SaaS 版账号中心）
- 登录成功后：IAM 返回的 emp_code → 调后端 `/api/auth/me` → 返回 org 信息 + 角色
- 删除 PoC 登录选人页

#### 验收场景

- 开发环境：user-account 默认 20111223，自动创建用户记录
- 线上环境：网关传入 user-account，后端正确识别用户
- 新用户首次访问 → 自动从 org 表同步信息创建本地记录
- admin 后台可配置用户角色

---

### Step 3: 领域行业动态化 + 审批链真实上溯

> 目标：前端下拉选项从 org 表动态加载，审批链走真实直线经理

#### 3.1 动态领域/行业 API

- `GET /api/org/domains` → 返回 field_code + field_name 列表
- `GET /api/org/industries?fieldCode=xxx` → 返回 pt_code + pt_name 列表
- 前端新建/编辑页下拉从 API 加载，替换硬编码的 `DOMAIN_LABELS` / `INDUSTRIES`

#### 3.2 审批链真实上溯

- `getBusinessApproverChain` 用 `getManagerChain` 递归查 line1_manager_code
- 上溯终止条件：找到 three_type_person = '平台主' 或深度达到 5 级
- 每级审批人从 org 表取 emp_code + emp_name
- approval_group_configs 表的 userId 改为存 emp_code

#### 3.3 发起人信息自动带出

- 新建备案时，领域/行业从当前用户的 org 信息自动填充
- 前端表单领域字段默认值 = 用户的 field_name
- 允许手动修改（跨领域备案）

#### 验收场景

- 新建备案 → 领域下拉显示真实生态圈列表
- 选领域 → 行业下拉显示该生态圈下的平台列表
- 张三的领域/行业自动填充为其 org 表中的值
- 提交审批 → 审批链预览显示真实直线经理上溯链
- 审批流转正确走到真实经理

---

## 四、依赖关系

```
Step 1（组织数据接入）
  └─→ Step 2（身份认证）— 依赖 org 查询能力
  └─→ Step 3（领域行业 + 审批链）— 依赖 org 查询 + 认证
```

Step 1 是基础，Step 2 和 Step 3 可部分并行。

## 五、新增依赖

| 包 | 位置 | 用途 |
|---|---|---|
| `mysql2` | backend | 连接 jbs_haier2 MySQL |

## 六、环境变量

```env
# 组织数据库
ORG_DB_HOST=10.250.12.15
ORG_DB_PORT=3100
ORG_DB_NAME=jbs_haier2
ORG_DB_USER=jbs_test
ORG_DB_PASS=l#1yCNYn8Qex

# 开发环境默认用户
DEV_USER_ACCOUNT=20111223

# 文档上传
DOC_UPLOAD_URL=http://10.138.68.2:30302/kwg/api/kwgDocument/upload

# 战投 API
STRATEGIC_API_ENABLED=false

# SMTP（可选）
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## 七、风险与降级

| 风险 | 降级方案 |
|------|---------|
| MySQL org 表不可达 | 回退到本地 users 表（PoC 模式） |
| org 表数据不全（缺 line1_manager_code） | 审批链上溯在断点处终止，使用 admin 作为最终审批人 |
| 新用户 emp_code 在 org 表中不存在 | 创建本地记录，角色 = initiator，领域/行业手动填写 |
| 领域/行业数据量过大 | 缓存 + 前端搜索过滤 |

## 八、不做的事（边界）

- 不做 V2/V3/V4（AI 原生/洞察/MCP）
- 不做 token 验证（网关已处理）
- 不做 org 表写入（只读）
- 不做实时组织数据同步（缓存 10 分钟即可）
- 不改审批引擎核心逻辑（三阶段不变）
