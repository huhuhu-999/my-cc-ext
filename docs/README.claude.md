# 在 Claude Code 中使用 my-ext

## 安装插件

在 Claude Code 对话中执行：

```text
/plugin marketplace add https://github.com/huhuhu-999/my-cc-ext.git
/plugin install my-ext@my-cc-ext
```

在终端启用插件：

```bash
claude plugins enable my-ext
```

## 使用

在目标项目中启动 Claude Code，根据任务描述使用插件提供的 Agent 和 Skill，例如：

```text
使用 feature-dev，根据需求文档推进功能开发。
使用 code-review 审查当前改动，只报告问题。
使用 db-ops，根据表结构生成 Entity 和 Mapper。
使用 add-javadoc，为 Service 补充文档注释。
```

Agent 正文维护在仓库 `agents/`，共享技能维护在 `skills/`。完整能力列表见 [仓库 README](../readme.md#能力概览)。

需要知识库规范的任务，应在当前平台适用的项目或用户指令中声明「知识库根：」及实际路径，也可在任务中明确提供；知识库不随插件分发。

## 知识库项目识别

插件带一个 `UserPromptSubmit` Hook：每次提交输入时，按当前工作目录匹配知识库项目注册表，命中则把项目标识注入上下文，提醒先加载规范；未声明知识库根时静默跳过，不影响其他使用方式。

- 知识库根解析顺序：环境变量 `KB_ROOT` → 当前平台用户级指令文件中的「知识库根：」声明
- 项目匹配依据：`projects/index.md` 项目注册表的「代码目录」列，取路径范围最具体的匹配项
- 命中后注入一行提醒，内容含项目标识（例如「当前工作目录属于知识库项目 [paic]」）
- 定义位置：`hooks/hooks.json`；脚本 `hooks/kb-project-detect.ps1`，需要 PowerShell 7 及以上

缺少 PowerShell 7 的环境不会执行该 Hook，其余能力不受影响。

## 卸载插件

在 Claude Code 对话中执行：

```text
/plugin uninstall my-ext@my-cc-ext
```

## 本地开发安装

在插件源码仓库根目录的终端执行：

```bash
claude plugins install .
claude plugins enable my-ext
```

插件入口为 `.claude-plugin/plugin.json`，市场入口为 `.claude-plugin/marketplace.json`。Claude Code 使用源码中的原生 Agent 和共享 Skill，无需执行 Codex 的打包流程。

仓库开发规则见 [CLAUDE.md](../CLAUDE.md) 与 [AGENTS.md](../AGENTS.md)。
