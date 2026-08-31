---
name: design-doc-writer
description: 提供设计规范(Spec)与实施计划(Plan)的标准骨架模板。当需要编写设计文档、实施计划，或 superpowers-planner 需要获取 Spec/Plan 骨架时使用。
---

# 设计文档骨架模板

提供本插件标准的设计文档骨架模板，供 `superpowers-planner` 等代理编写 Spec/Plan 时使用。模板文件通过本 skill 的目录解析加载（相对路径解析到本 skill 目录）。

## 模板文件（必须读取模板内容）

- **Spec 骨架**：`templates/spec-skeleton.md` —— 设计规范必须章节（11 章 + 文档头 + 版本历史）
- **Plan 模板**：`templates/plan-skeleton.md` —— 实施计划的文档头 / 文件结构映射 / 任务粒度 / 执行波次

## 用法

1. 读取上述模板文件
2. 按骨架输出完整章节；某章节不适用时显式说明"不适用/无需"，不得省略整个骨架
