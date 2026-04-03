# CLAUDE.md — AI 协作指令

## 项目概述

投资管理 AI 原生体验探索，抛弃型 PoC。脱敏规则 + 公有云/本地资源快速验证。

## 交付纪律

1. **Session PDCA 不跳步**：Plan → Do → Check → Act，每次对话遵循
2. **场景先行**：编码前写验收场景标题 + 预期结果
3. **本地验证优先**：编译 + 测试通过后再提交
4. **粒度提交**：每个逻辑变更一个 commit
5. **经验即时编码**：验证有效的经验 5 分钟内写入本文件
6. **Bug 全局排查**：发现系统性 Bug 时立即全局排查同类问题

## 验证优先级

- 高：用户交互体验、AI 智能体验、安全性 — 不裁剪
- 适度：大规模调用 — 可裁剪，做设计预留

## 双基线比对

- **plan-baseline**：规划基线，定义"想要什么"，人 + AI 共创
- **design-baseline**：设计基线，每 Phase 交付后从代码反写"实际做了什么"
- 每 Phase 结束逐条比对：✅ 已实现 / ✂️ 已裁剪 / ⏳ 待实现 / 🔄 变更
- 比对结果指导后续 Phase 调整

## 文档更新规则

- WORK_LOG.md：每 Session 必须更新
- CLAUDE.md：经验验证后更新
- plan-baseline：共创阶段更新 + Phase 调整时更新
- design-baseline：每 Phase 交付后从代码反写
- 不更新不提交

## 四维记忆

每个 Session 维护四个维度的项目记忆：
- 时间（WORK_LOG）：发生了什么？为什么？
- 空间（代码 + 文档）：当前状态是什么？
- 质量（测试 + Bug）：什么能用？什么不能用？
- 知识（本文件）：我们学到了什么？

## 统计快照

每 Session 结束时在 WORK_LOG 记录：文件数、代码行数、测试数、Bug 数。

## 已知陷阱

### 海尔内部系统 API 对接（已验证，6轮试错）

- 认证必须两步走：IAM token → `checkUser`/`getTokenByIam` 换系统 token → 再调业务接口
- 响应格式不统一：`data` / `datas` / `rows` / `list` 都可能，代码必须全部兼容
- HTTP method 严格按接口文档，不能想当然（投前项目集是 POST 不是 GET）
- POST 请求即使无参数也要带 `Content-Type: application/json` + 空 body `{}`
- 测试/生产环境地址可能完全不同主机（`10.138.68.2:30302` vs `hsip.haier.net`），不能假设同域名
- 统一走后端代理，前端不直接调外部系统（避免 CORS + 认证复杂度）

### IAM 字段映射（已验证）

- `userName` = 工号（emp_code），不是用户名
- `nickName` = 显示姓名
- `account` = IAM 内部 ID，不是工号

## Forge 经验教训（已验证）

- 后补验收测试 → 16 处错误（场景必须先行）
- Docker 循环重建 → 本地验证优先（30 秒 vs 3 分钟）
- 经验不编码 → 同类问题跨 Session 重复（即时写入 CLAUDE.md）
- 单入口测试 → REST 通但其他入口不通（多入口测试）
- Phase 编号重命名 → 69 处全局替换耗时 2 小时（编号永不更改）
