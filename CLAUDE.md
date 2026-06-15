# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库定位

这是一个 Claude Code 插件仓库，提供数据库操作和 Claude Code 扩展开发相关的 Agent 和 Skill。

## 目录结构

```
.claude-plugin/plugin.json              # 插件元数据（名称、版本、描述）
agents/db-ops/AGENT.md                  # Agent: 数据库操作专家
agents/cc-ext-dev/AGENT.md              # Agent: Claude Code 扩展开发专家
agents/feature-dev/AGENT.md             # Agent: 功能开发流水线编排
agents/superpowers-planner/AGENT.md     # Agent: 设计+计划流水线
skills/gen-pgsql-ddl/SKILL.md           # Skill: PostgreSQL DDL 生成
skills/gen-java-enum/SKILL.md           # Skill: Java 枚举生成
skills/code-reviewer/SKILL.md           # Skill: Java 代码审查
skills/implement-from-design/SKILL.md   # Skill: 按设计文档编码
skills/fix/SKILL.md                     # Skill: 系统化缺陷修复
```

- **Agent** (`agents/<name>/AGENT.md`): 带 YAML frontmatter 定义工具集、模型、权限模式；正文为系统提示词
- **Skill** (`skills/<name>/SKILL.md`): 带 YAML frontmatter 定义名称和触发时机；正文为模板和规则
- `plugin.json` 的 `name` 作为插件标识，安装后 Agent/Skill 以 `plugin-name:agent-name` 形式注册

## 插件安装

```bash
claude plugins install .
claude plugins enable my-ext
```

## 现有扩展

### Agent: db-ops

数据库操作专家。技术探查驱动，适配 PostgreSQL/MySQL/SQL Server/Oracle 及 MyBatis-Plus/JPA 等多种框架。核心能力：

- **DDL 生成** — 若项目存在 `gen-pgsql-ddl` skill 则优先委托，否则手动生成
- **Entity + Mapper 编写** — 参考项目现有代码风格
- **SQL 审查** — 输出 CRITICAL/WARNING/INFO 三级报告
- **安全约束** — 强制参数化、禁止 `${}` 拼接变量值、IN 子句上限 1000
- **性能约束** — 避免 N+1、大表必须有 WHERE+分页、批量操作用批处理

详细提示词见 `agents/db-ops/AGENT.md`。

### Skill: gen-pgsql-ddl

PostgreSQL DDL 生成模板，面向特定项目的 `lmp` schema 规范。关键约定：

- 主键 `id bigserial`（无 DEFAULT）; 审计字段顺序固定; 删除标记 `int2 DEFAULT 0`
- 列名最长 28 字符，列名/类型/约束三列对齐
- 每列 + 表必须有 COMMENT
- 固定角色授权：`r_pabemlmpdata_dml`（读写）和 `r_pabemlmpdata_qry`（只读），含 SEQUENCE 授权
- 输出到 `tmp/` 目录，文件名 `operator_<业务>_init.sql`

详细模板见 `skills/gen-pgsql-ddl/SKILL.md`。

### Agent: cc-ext-dev

Claude Code 扩展开发专家。覆盖 Claude Code 全部扩展机制：Skill、Agent、Plugin、Hook、MCP Server、Workflow、Keybinding。核心能力：

- **统一探查流程** — 先读目标仓库 CLAUDE.md 和现有扩展，确保风格一致
- **Skill 开发** — YAML frontmatter + 模板/规则正文，description 决定触发时机
- **Agent 开发** — 工具选择、权限模式、工作流设计
- **Plugin 打包** — plugin.json 元数据，本地安装与调试
- **Hook 开发** — 7 种事件（PreToolUse、PostToolUse、Stop 等）+ command 类型
- **MCP Server 集成** — stdio/SSE/Streamable HTTP 三种传输方式配置
- **Workflow 开发** — agent/parallel/pipeline/phase API 及常见编排模式

详细规范见 `agents/cc-ext-dev/AGENT.md`。

### Agent: feature-dev

功能开发流水线编排者。串联 **设计文档定位 → Worktree 确认 → implement-from-design 编码 → code-reviewer 审查 → 修复 CRITICAL → 开发报告** 的完整流程。

详细流程见 `agents/feature-dev/AGENT.md`。

### Agent: superpowers-planner

设计+计划流水线。三个阶段：**头脑风暴（需求澄清 + 方案对比）→ 设计规范 Spec → 实施计划 Plan**（含 TDD 任务拆分、波次规划、依赖矩阵）。

详细流程见 `agents/superpowers-planner/AGENT.md`。

### Skill: gen-java-enum

Java `code ↔ msg` 枚举生成模板。自动探测项目包路径，生成含 `getCodeByMsg`/`getMsgByCode` 双向查找的枚举类。

详细模板见 `skills/gen-java-enum/SKILL.md`。

### Skill: code-reviewer

Java 代码审查。对 git diff 变更进行 7 维审查（分层架构、JPA/DB、异常处理、安全、代码质量、测试、日志），输出 CRITICAL/WARNING/INFO 三级报告。

详细规则见 `skills/code-reviewer/SKILL.md`。

### Skill: implement-from-design

按设计文档编码。遵循分层架构和编码规范，自底向上实现：枚举/常量 → DTO → Entity → Mapper → Service → Controller → 测试。

详细流程见 `skills/implement-from-design/SKILL.md`。

### Skill: fix

系统化缺陷修复。TDD 驱动：定位根因 → 复现测试(RED) → 最小修复(GREEN) → 验证 + code-reviewer 审查 → 修复报告。

详细流程见 `skills/fix/SKILL.md`。

## 注意事项

- 本插件中的 Agent 和 Skill 相互独立。Agent 通过工具列表中的 `Skill` 工具可以调用项目内已安装的 skill
- `plugin.json` 中的 `name` 字段即安装后的插件标识，变更需同步调整引用
