# JavaDoc 示例入口

本文件保留为兼容引导页，不维护独立的注释风格或 Java 模板。

先调用 `kb-loader` 解析当前 KB 根、项目与加载清单，读取最终根下的 `backend/java/index.md` 后实际读取 `backend/java/development-standard.md`「文档注释（Javadoc）」章节及适用项目规则。表达约定、必要示例与继承/私有方法例外均在该章节，不将本路径或旧版示例作为生成判据。

委派方须传入最终解析的规范路径和章节，执行者实际读取后再处理候选。KB 不可用时遵循 `kb-loader` 分支及 [SKILL.md](../SKILL.md) 的加载边界；依赖 KB 特定模板的补充须暂停，不能声称遵循未读取的规范。
