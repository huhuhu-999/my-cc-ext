---
name: cmd-feature-dev
description: 功能开发命令。当用户提供设计文档并要求开发功能时使用——开发功能、实现需求、按设计编码、功能开发流水线、编写代码、设计文档驱动开发、编码审查修复。
---

# 功能开发命令

将用户的功能开发需求委托给 `feature-dev` Agent 执行。该 Agent 串联完整开发流水线：

```
设计文档 → [询问 Worktree] → implement-from-design 编码 → code-reviewer 审查 → 修复 CRITICAL → 开发报告
```

各阶段说明：

- **Worktree 确认** — 询问用户是否在独立 worktree 中开发
- **implement-from-design** — 自底向上编码：枚举/常量 → DTO → Entity → Mapper → Service → Controller → 测试
- **code-reviewer** — 7 维审查（分层架构、JPA/DB、异常处理、安全、代码质量、测试、日志）
- **修复** — CRITICAL 必须阻塞修复，WARNING 逐项评估

## 执行方式

使用 `Agent` 工具启动：

```
Agent(
  subagent_type: "my-ext:feature-dev",
  description: "<一句话简述任务>",
  prompt: "<用户原始需求，完整传递>"
)
```

将用户的完整原始需求作为 `prompt` 传入，不要自行裁剪或改写。
