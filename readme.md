# my-ext

Java 开发全流程 Agent 和 Skill 工具集，支持 Claude Code、OpenCode 与 Codex。根 `skills/` 是各平台共享的唯一 Skill 内容源。

## 平台选择

| 平台 | 安装说明 |
|---|---|
| Claude Code | [Claude Code 使用说明](docs/README.claude.md) |
| OpenCode >=1.15.10 | [OpenCode 安装说明](docs/README.opencode.md) |
| Codex | [Codex 安装说明](docs/README.codex.md) |

## 能力概览

### Agents

| Agent | 说明 |
|------|------|
| `db-ops` | 数据库操作专家，负责 DDL、SQL、Entity、Mapper、Repository 和 SQL 审查 |
| `cc-ext-dev` | Claude Code 扩展开发专家，负责 Skill、Agent、Plugin、Hook、MCP Server 和 Workflow |
| `feature-dev` | 功能开发流水线，从已有 PRD 生成设计、计划、编码、审查和开发报告（审查环节委托 `code-review` Agent） |
| `superpowers-planner` | 设计和计划流水线，从原始需求生成设计规范和实施计划 |
| `fix` | 缺陷修复流水线，从 Bug 报告出发深度排查根因、复现、修复、审查并输出报告 |
| `code-review` | 只读深度审查执行者，独立追踪调用链；默认全维度，也可按指定的业务逻辑或代码风格维度执行，供 `code-reviewer` 分工复用 |

### Skills

| Skill | 说明 |
|------|------|
| `gen-pgsql-ddl` | 生成 PostgreSQL DDL，schema 需询问用户，授权角色取项目现有约定，无法确定时由用户确认 |
| `gen-java-entity` | 根据 DDL 或表结构生成 Entity、Mapper 或 Repository |
| `gen-java-enum` | 探测项目环境，按知识库唯一规范与模板生成 `code` / `msg` 枚举 |
| `gen-api-doc` | 从 Controller 代码生成前端对接用的接口文档（入参 / 出参 / 示例 / 错误码） |
| `design-doc-writer` | 提供设计规范（Spec）与实施计划（Plan）的标准骨架模板 |
| `kb-loader` | 编码 / 审查 / 生成代码前，按「项目标识 + 任务类型」解析知识库规范加载清单 |
| `implement-from-design` | 根据设计文档和实施计划完成 Java 编码 |
| `code-reviewer` | Java 变更审查入口：小改动内联，需要分工时由主会话组织业务逻辑与代码风格子代理审查，复核后统一汇总 |
| `fix` | 按 TDD 流程定位、复现和修复缺陷 |
| `build-fix` | 检测 Maven / Gradle 构建错误并逐步修复 |
| `tdd` | 执行 Red-Green-Refactor 风格 Java TDD 工作流 |
| `add-javadoc` | 按授权扫描或人工读取候选，按知识库 JavaDoc 规范补充 Service 注释 |
| `write-a-skill` | 辅助创建结构清晰、可复用的 Agent Skill |

## 规范与执行的分工

枚举模板、JavaDoc 详细写法和 Java 审查判据分别由已解析知识库的 `backend/java/enum-standard.md`、`backend/java/development-standard.md`「文档注释（Javadoc）」、`backend/java/code-review-checklist.md` 及其引用维护。知识库不随插件打包；先通过 `kb-loader` 解析根与任务清单，再实际读取正文。旧示例文件保留为加载指引，不提供第二套模板兜底。

插件保留触发、技术探查、加载、生成/取证动作、分维度编排、确认与权限门禁、验收和报告。知识库不可用时按 `kb-loader` 分支处理；依赖其特定模板或必须规范的步骤暂停，不能声称符合未读规范。

## 目录结构

```text
.claude-plugin/plugin.json
.codex-plugin/plugin.json
.opencode/
codex/agent-adapter.md
codex/marketplace.json
codex/skills/
agents/
skills/
AGENTS.md
CLAUDE.md
```

Codex 维护者参见 [开发与发布](docs/README.codex.md#开发与发布)，仓库开发规则见 [AGENTS.md](AGENTS.md)。
