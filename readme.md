# my-ext

Java 开发全流程 Agent 和 Skill 工具集，支持 Claude Code 与 OpenCode。根 `skills/` 是两端共享的唯一 Skill 内容源。

## 平台选择

| 平台 | 安装说明 |
|---|---|
| Claude Code | 保留下方 Marketplace 和本地插件安装流程 |
| OpenCode >=1.15.10 | [OpenCode 安装说明](docs/README.opencode.md) |

## OpenCode 用户级自动安装

当用户要求安装 my-ext 时，Agent 应直接完成配置，而不是只输出操作命令。先确认本机满足 OpenCode >=1.15.10、Node.js >=20.11；条件不满足时停止修改并说明缺失项。

修改用户级配置前必须先获得用户授权。获得授权后，Windows 使用 `%USERPROFILE%\.config\opencode\opencode.json`，Linux 和 macOS 使用 `~/.config/opencode/opencode.json`。如果目录中已经存在 `opencode.json` 或 `opencode.jsonc`，应读取现有文件并使用支持 JSON/JSONC 的结构化方式修改；如果两者都不存在，则创建 `opencode.json`。不得覆盖现有模型、MCP、权限、插件或其他用户配置。

目标配置是在 `plugin` 数组中加入下面这个固定版本包：

```json
"my-ext@git+https://github.com/huhuhu-999/my-cc-ext.git#v1.0.10"
```

如果 `plugin` 字段不存在，则创建数组；如果字段存在，则只追加缺失的条目；如果相同条目已经存在，则保持文件不变。必须使用包含 OpenCode 支持的固定发布标签或完整 40 位 commit。固定引用不存在或无法访问时，应报告失败，不得退回默认分支或改用可变引用。在 my-ext 源码仓库中，本地 `.opencode/plugins/my-ext.js` 已经会被自动加载，不得再加入远程包，否则会重复加载插件。

写入后重新读取配置，确认文件仍可解析且原有字段未丢失，再运行 `opencode debug config` 验证安装结果。解析后的配置必须包含指向插件包 `skills/` 的 `skills.paths`、指向 `.opencode/bootstrap.md` 的 `instructions`，以及 `my-ext-db-ops`、`my-ext-feature-dev`、`my-ext-fix`、`my-ext-superpowers-planner` 和 `my-ext-opencode-ext-dev` 这 5 个 Agent。任一检查失败时，只撤销本次添加的插件条目，保留用户原有配置，并报告具体错误。

验证通过后，告知用户重新启动 OpenCode。安装完成后可在对话中使用 `@my-ext-feature-dev`、`@my-ext-db-ops` 等名称调用 Agent；共享 Skill 会由模型根据任务自动加载。升级、卸载、Windows 注意事项和 npm 兜底方式见 [完整 OpenCode 安装说明](docs/README.opencode.md)。

## 能力概览

### Agents

| Agent | 说明 |
|------|------|
| `db-ops` | 数据库操作专家，负责 DDL、SQL、Entity、Mapper、Repository 和 SQL 审查 |
| `cc-ext-dev` | Claude Code 扩展开发专家，负责 Skill、Agent、Plugin、Hook、MCP Server 和 Workflow |
| `feature-dev` | 功能开发流水线，从已有 PRD 生成设计、计划、编码、审查和开发报告 |
| `superpowers-planner` | 设计和计划流水线，从原始需求生成设计规范和实施计划 |

### Skills

| Skill | 说明 |
|------|------|
| `gen-pgsql-ddl` | 生成 PostgreSQL DDL，schema 需询问用户，授权角色需确认并默认使用项目固定角色 |
| `gen-java-entity` | 根据 DDL 或表结构生成 Entity、Mapper 或 Repository |
| `gen-java-enum` | 生成 `code` / `msg` 风格 Java 枚举 |
| `implement-from-design` | 根据设计文档和实施计划完成 Java 编码 |
| `code-reviewer` | 对 Java git diff 进行分层架构、数据库、安全、异常、测试等维度审查 |
| `fix` | 按 TDD 流程定位、复现和修复缺陷 |
| `build-fix` | 检测 Maven / Gradle 构建错误并逐步修复 |
| `tdd` | 执行 Red-Green-Refactor 风格 Java TDD 工作流 |
| `add-javadoc` | 扫描并补充 Service 接口和实现类 JavaDoc |
| `write-a-skill` | 辅助创建结构清晰、可复用的 Agent Skill |

## Claude Code 安装插件

```bash
/plugin marketplace add https://github.com/huhuhu-999/my-cc-ext.git
/plugin install my-ext@my-cc-ext
claude plugins enable my-ext
```

## Claude Code 卸载插件

```bash
/plugin uninstall my-ext@my-cc-ext
```

## Claude Code 本地开发安装

在仓库根目录执行：

```bash
claude plugins install .
claude plugins enable my-ext
```

## 目录结构

```text
.claude-plugin/plugin.json
agents/
skills/
CLAUDE.md
```

更多说明见 `CLAUDE.md`。
