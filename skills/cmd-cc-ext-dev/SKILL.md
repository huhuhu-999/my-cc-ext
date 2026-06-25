---
name: cmd-cc-ext-dev
description: Claude Code 扩展开发命令。当用户需要开发 Claude Code 扩展时使用——创建 Skill、编写 Agent、配置 Plugin 插件、集成 MCP Server、添加 Hook 钩子、设计 Workflow 工作流、绑定 Keybinding 快捷键、修改 settings.json、extension 开发。
---

# Claude Code 扩展开发命令

将用户的扩展开发需求委托给 `cc-ext-dev` Agent 执行。该 Agent 覆盖 Claude Code 全部扩展机制：

- **Skill** — YAML frontmatter + 模板/规则正文，description 决定触发时机
- **Agent** — 工具选择、权限模式、工作流设计
- **Plugin** — plugin.json 元数据，本地安装与调试
- **Hook** — 7 种事件类型（PreToolUse、PostToolUse、Stop 等）
- **MCP Server** — stdio / SSE / Streamable HTTP 三种传输方式
- **Workflow** — agent / parallel / pipeline / phase API 编排
- **Keybinding** — 自定义快捷键绑定

该 Agent 会先探查目标仓库的现有扩展结构，确保新增内容风格一致。

## 执行方式

使用 `Agent` 工具启动：

```
Agent(
  subagent_type: "my-ext:cc-ext-dev",
  description: "<一句话简述任务>",
  prompt: "<用户原始需求，完整传递>"
)
```

将用户的完整原始需求作为 `prompt` 传入，不要自行裁剪或改写。
