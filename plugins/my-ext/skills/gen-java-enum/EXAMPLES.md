# gen-java-enum 示例入口

本文件保留为兼容引导页，不维护独立枚举模板或规则。

先调用 `kb-loader` 解析当前 KB 根、项目与加载清单，读取最终根下的 `backend/java/index.md` 后实际读取 `backend/java/enum-standard.md`：标准模板见「正确示例」，依赖适配见「例外」，交付核对见「验证」。不要把此路径相对插件目录解析，也不要用旧示例代替实际加载。

KB 不可用时遵循 `kb-loader` 分支及 [SKILL.md](SKILL.md) 的加载边界；依赖 KB 特定模板的生成须暂停，不能声称遵循未读取的规范。
