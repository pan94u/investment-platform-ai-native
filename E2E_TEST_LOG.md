# E2E 测试日志

> 测试时间: 2026-04-02
> 测试范围: 10 大业务场景，25 条断言
> 测试环境: localhost:3100 (frontend) + localhost:3101 (backend) + PostgreSQL:5401

## 测试结果：25/25 PASS

### 场景 1: 基金投项目 + 全 5 组审批 + skipEmail
| 断言 | 结果 |
|------|------|
| 创建 fund_project 类型 | PASS |
| 5 组 group 审批全部创建 | PASS |
| 全通过→pending_confirmation | PASS |
| skipEmail=true→completed 且无 email_sent 日志 | PASS |

### 场景 2: 法人新设 + 驳回→修改→重新提交
| 断言 | 结果 |
|------|------|
| 驳回→filing 回到 draft | PASS |
| 修改金额后重新提交→pending_business | PASS |

### 场景 3: 对赌变更 + 撤回
| 断言 | 结果 |
|------|------|
| 撤回→draft | PASS |
| 所有 pending 审批已关闭 | PASS |

### 场景 4: 附件权限控制
| 断言 | 结果 |
|------|------|
| 非创建者删除被拒绝 | PASS |
| admin 可以删除 | PASS |

### 场景 5: 管理后台 CRUD + 权限
| 断言 | 结果 |
|------|------|
| admin 新增审批配置成功 | PASS |
| 非 admin 访问被拦截(403) | PASS |

### 场景 6: 无审批组→跳过 group + emailOverrides
| 断言 | 结果 |
|------|------|
| business 通过后直接→confirmation（跳过 group） | PASS |
| emailOverrides 自定义收件人→completed | PASS |
| 审计日志 toCount=1（自定义 1 人） | PASS |

### 场景 7: 批量审批
| 断言 | 结果 |
|------|------|
| 批量同意 2 条→succeeded=2 | PASS |

### 场景 8: projectCode 自动生成
| 断言 | 结果 |
|------|------|
| 不传 projectCode→自动生成 2026-04-02-NNN | PASS |

### 场景 9: admin 改派审批人
| 断言 | 结果 |
|------|------|
| 改派→新审批人=王五 | PASS |
| DB 中 approver_id 已更新 | PASS |

### 场景 10: 前端页面可访问
| 页面 | 结果 |
|------|------|
| / (登录页) | 200 PASS |
| /dashboard | 200 PASS |
| /filings | 200 PASS |
| /filings/new | 200 PASS |
| /approvals | 200 PASS |
| /admin | 200 PASS |

## 浏览器手工验证

| 功能 | 结果 |
|------|------|
| 新建备案：富文本编辑器+附件上传+项目编号 | PASS |
| 详情页：审批操作区（待您审批卡片） | PASS |
| 详情页：confirmation 阶段点确认→邮件预览弹窗 | PASS |
| 邮件预览弹窗：收件人/抄送可增删，主题可编辑 | PASS |
| 邮件预览弹窗："确认并发送邮件"/"仅确认不发邮件" | PASS |
| 管理后台：审批配置 + 邮件抄送名单 | PASS |
| 导航栏：admin 显示"管理"入口 | PASS |

## 覆盖的 5 类备案场景

| 类型 | 已测场景 |
|------|---------|
| 股权直投 | 新增投资、对赌变更、撤回、改派 |
| 基金投项目 | 新增（全 5 组审批） |
| 基金投资 | 退出（无审批组→跳过 group） |
| 法人新设 | 新设（驳回→重提交） |
| 其它 | 批量审批 |
