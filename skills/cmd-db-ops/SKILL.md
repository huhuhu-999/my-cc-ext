---
name: cmd-db-ops
description: 数据库操作命令。当用户需要操作数据库时使用——建表、写 SQL、查数据、生成 Entity 实体、创建 Mapper、SQL 调优、索引设计、DDL、DML、CRUD、分页查询、批量操作、慢查询审查、数据库迁移。
---

# 数据库操作命令

将用户的数据操作需求委托给 `db-ops` Agent 执行。该 Agent 会自动探查项目技术栈（ORM 框架、数据库类型、包路径），然后按任务类型选择工作流：

- DDL 建表 → 优先委托 `gen-pgsql-ddl` Skill
- Entity/Mapper 生成 → 优先委托 `gen-java-entity` Skill
- 查询/DML 编写 → ORM 内置方法优先，不足时手写 SQL
- SQL 审查 → 多维检查，输出分级报告

## 执行方式

使用 `Agent` 工具启动：

```
Agent(
  subagent_type: "my-ext:db-ops",
  description: "<一句话简述任务>",
  prompt: "<用户原始需求，完整传递>"
)
```

将用户的完整原始需求作为 `prompt` 传入，不要自行裁剪或改写。
