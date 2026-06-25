# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库定位

这是一个 Claude Code 插件仓库，提供数据库操作、代码审查、缺陷修复、功能开发流水线、设计规划和 Claude Code 扩展开发等 Agent 和 Skill。

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
skills/add-javadoc/SKILL.md              # Skill: JavaDoc 文档注释补充
skills/gen-java-entity/SKILL.md          # Skill: Java Entity + Mapper 生成
skills/write-a-skill/SKILL.md            # Skill: 编写 Agent Skill
skills/cmd-db-ops/SKILL.md               # Skill: 数据库操作命令（→ db-ops Agent）
skills/cmd-cc-ext-dev/SKILL.md           # Skill: 扩展开发命令（→ cc-ext-dev Agent）
skills/cmd-feature-dev/SKILL.md          # Skill: 功能开发命令（→ feature-dev Agent）
skills/cmd-superpowers/SKILL.md          # Skill: 设计规划命令（→ superpowers-planner Agent）
```

- **Agent** (`agents/<name>/AGENT.md`): 带 YAML frontmatter 定义工具集、模型、权限模式；正文为系统提示词
- **Skill** (`skills/<name>/SKILL.md`): 带 YAML frontmatter 定义名称和触发时机；正文为模板和规则
- `plugin.json` 的 `name` 作为插件标识，安装后 Agent/Skill 以 `plugin-name:agent-name` 形式注册

## 插件安装

```bash
claude plugins install .
claude plugins enable my-ext
```

## 插件卸载

```bash
claude plugins uninstall my-ext
```

## 现有扩展

### Agent: db-ops

数据库操作专家。技术探查驱动，适配 PostgreSQL/MySQL 及 MyBatis-Plus/MyBatis/JPA 等多种框架。核心能力：

- **DDL 生成** — 若项目存在 `gen-pgsql-ddl` skill 则优先委托，否则手动生成
- **Entity + Mapper 编写** — 若项目存在 `gen-java-entity` skill 则优先委托，否则参考现有代码风格手动生成
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

### Skill: gen-java-entity

根据 DDL 或表结构生成 Java Entity + Mapper/Repository。自动适配项目 ORM 框架（MyBatis-Plus / MyBatis / JPA）和包路径。关键约定：

- **前置探查** — 先通过 CLAUDE.md、`pom.xml`/`build.gradle`、现有注解确认 ORM 框架，再通过 Glob 已有文件动态确定包路径
- **MyBatis-Plus** — Entity 用 `@TableName` + `@TableId`，Mapper 继承 `BaseMapper<Entity>`，无需 XML
- **MyBatis** — Entity 纯 POJO，Mapper 接口声明 CRUD + 同名 XML 包含 `resultMap`/`sql` 片段
- **JPA/Hibernate** — Entity 用 `@Entity` + `@Table` + `@Getter`（不暴露 setter），Repository 继承 `JpaRepository` + `JpaSpecificationExecutor`
- **统一规范** — 审计字段齐全、`LocalDateTime` 不用 `Date`、逻辑删除用 `UPDATE SET is_delete = 1`、禁止 `SELECT *`

详细模板见 `skills/gen-java-entity/SKILL.md`。

### Skill: code-reviewer

Java 代码审查。对 git diff 变更进行 7 维审查（分层架构、JPA/DB、异常处理、安全、代码质量、测试、日志），输出 CRITICAL/WARNING/INFO 三级报告。

详细规则见 `skills/code-reviewer/SKILL.md`。

### Skill: implement-from-design

按设计文档编码。遵循分层架构和编码规范，自底向上实现：枚举/常量 → DTO → Entity → Mapper → Service → Controller → 测试。

详细流程见 `skills/implement-from-design/SKILL.md`。

### Skill: fix

系统化缺陷修复。TDD 驱动：定位根因 → 复现测试(RED) → 最小修复(GREEN) → 验证 + code-reviewer 审查 → 修复报告。

详细流程见 `skills/fix/SKILL.md`。

### Skill: cmd-db-ops（命令入口）

自动触发命令 Skill。用户说"建表""写 SQL""查数据""生成 Entity""SQL 优化"时，自动委托给 `my-ext:db-ops` Agent 执行数据库操作。

### Skill: cmd-cc-ext-dev（命令入口）

自动触发命令 Skill。用户说"写个 Skill""创建 Agent""配置 MCP""加个 Hook"时，自动委托给 `my-ext:cc-ext-dev` Agent 执行扩展开发。

### Skill: cmd-feature-dev（命令入口）

自动触发命令 Skill。用户说"开发功能""实现需求""按设计编码"并提供了设计文档时，自动委托给 `my-ext:feature-dev` Agent 执行编码→审查→修复流水线。

### Skill: cmd-superpowers（命令入口）

自动触发命令 Skill。用户说"帮我设计""做个方案""需求分析""技术方案"时，自动委托给 `my-ext:superpowers-planner` Agent 执行头脑风暴→设计规范→实施计划。

详细流程见 `skills/fix/SKILL.md`。

### Skill: add-javadoc

为 Service 接口和实现类补充 JavaDoc 文档注释。自动扫描未注释方法，生成符合项目风格的中文 JavaDoc（`@param`、`@return`、`@throws`）。

详细模板见 `skills/add-javadoc/SKILL.md`。

### Skill: write-a-skill

创建结构良好、渐进式披露的 Agent Skill。引导用户收集需求、编写 YAML frontmatter + 模板/规则正文。

详细流程见 `skills/write-a-skill/SKILL.md`。

## 架构概览

```
用户自然语言输入
  ↓ 自动匹配 description 关键词
cmd-* Skill（命令入口层）          ← 自动触发，无等待
  ↓ Agent(subagent_type: "...")
Agent（编排层）                    ← 独立进程，探查 + 决策
  ↓ Skill(...) / 直接执行
gen-* / fix / review Skill（执行层） ← 模板渲染，规则执行
```

- **命令层**（`cmd-*`）：4 个薄 Skill，只做触发匹配和委托
- **编排层**（Agent）：4 个 Agent，探查项目上下文 + 选择工作流
- **执行层**（gen-* / fix / review 等）：8 个 Skill，具体模板和规则

## 注意事项

- 本插件中的 Agent 和 Skill 相互独立。Agent 通过工具列表中的 `Skill` 工具可以调用项目内已安装的 skill
- **命令模式**：`cmd-*` Skill 是 Agent 的自动触发入口。Skill 拥有丰富的 description 关键词用于 `/` 搜索和自动匹配，触发后将用户需求委托给对应 Agent 执行。Agent 无法自动触发，必须通过 `/` 显式调用或 Skill 委托
- `plugin.json` 中的 `name` 字段即安装后的插件标识，变更需同步调整引用
