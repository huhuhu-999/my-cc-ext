---
name: cmd-superpowers
description: 设计规划命令。当用户描述需求后需要完整的设计到计划输出时使用——需求分析、头脑风暴、方案对比、设计规范、实施计划、技术方案、TDD 任务拆分、架构设计、API 设计、数据模型设计、帮我设计、做个方案、规划一下。
---

# 设计规划命令

将用户的设计规划需求委托给 `superpowers-planner` Agent 执行。该 Agent 执行三阶段流水线：

```
需求输入 → 阶段一：头脑风暴（需求澄清 → 方案对比 → 设计呈现）
         → 阶段二：设计规范 Spec（写入 doc/superpowers/specs/）
         → 用户审查门槛（等待用户批准）
         → 阶段三：实施计划 Plan（TDD 任务拆分 → 波次规划 → 依赖矩阵）
         → 执行交接
```

## 执行方式

使用 `Agent` 工具启动：

```
Agent(
  subagent_type: "my-ext:superpowers-planner",
  description: "<一句话简述任务>",
  prompt: "<用户原始需求，完整传递>"
)
```

将用户的完整原始需求作为 `prompt` 传入，不要自行裁剪或改写。
