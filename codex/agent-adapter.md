# Codex Agent 执行契约

本文件只定义平台映射。业务流程以调用方声明的
`agents/<name>/AGENT.md` 为唯一事实源。

## 加载顺序

1. 相对于当前 `SKILL.md` 所在目录解析执行契约和 Agent 源路径，不相对于用户项目
   的当前工作目录解析。
2. 完整读取 Agent 文件，解析 YAML frontmatter 和正文。
3. 忽略 `tools`、`model`、`permissionMode` 的 Claude Code 专属配置；保留
   `name`、`description` 和全部正文语义。
4. 完整遵循正文中的阶段门禁、用户确认、状态文件、安全边界和验证要求。
5. 不在适配 Skill 或其他平台文件中复制、概括或改写 Agent 正文。

Agent 源不存在或 frontmatter 无法解析时立即停止，报告缺失或格式错误的仓库相对
路径，不猜测工作流内容。

## 能力映射

按能力而不是具体工具名称执行。优先使用当前 Codex 宿主提供的原生能力。

| Agent 语义 | Codex 执行能力 |
| --- | --- |
| `Read` / `Glob` / `Grep` | 读取和搜索文件 |
| `Write` / `Edit` | 创建或编辑文件 |
| `Bash` | 执行当前环境的 shell 命令 |
| `Skill` | 加载并遵循同名 Skill |
| `Task` | 委派边界明确的子任务；不可用或不被当前规则允许时内联执行 |
| `TodoWrite` | 使用当前任务计划能力 |
| `AskUserQuestion` | 使用当前用户询问能力 |
| `WebFetch` / `WebSearch` | 使用当前官方文档或网络检索能力 |

Codex 支持且当前会话允许多代理协作时，可以把完整 Agent 工作流委派给一个边界明确
的子代理。委派时必须让子代理读取同一个 Agent 源和本执行契约。无法委派时，在当前
代理内执行同一工作流，不得跳过任何阶段或确认点。

## 宿主转换

- Codex 使用 `AGENTS.md` 作为持久项目指令入口；始终遵守当前宿主实际加载的项目
  指令，不要求目标仓库提供 `CLAUDE.md`。
- `Skill(...)` 表示加载同名 Skill，不要求保留 Claude Code 的调用语法。
- `Task(...)` 表示使用当前宿主的任务委派能力，不要求保留 Claude Code 参数名。
- `.claude/worktrees/` 等宿主专属目录改用当前宿主的隔离工作区能力或目标项目约定。
- 服务启动、文件权限、审批和后台任务均服从当前宿主策略，Agent 中的 Claude 权限
  模式不能扩大 Codex 会话权限。
- 当前 Codex 缺少 Agent 所需能力时，保留工作流门禁，说明缺失能力并请求用户选择
  可行替代，不静默省略步骤。

## 扩展开发

执行 `cc-ext-dev` 时，先确定用户要求适配的目标平台。目标不是 Claude Code 时，只
复用 Agent 中的仓库探查、职责边界、安全和验证原则；插件清单、安装命令、Hook、
MCP、权限和工具名称必须以目标平台当前官方文档为准，不能直接套用 Claude Code
结构。
