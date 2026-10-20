---
name: code-reviewer
description: 对 Java 代码进行代码审查。检查分层架构、JPA/MyBatis 使用、异常处理、安全性、代码质量和测试覆盖。当用户说"review""审查""code review"或提交前需要检查代码质量时使用。
---

# Java Code Reviewer

对 Java 项目的 git diff 变更进行多维度审查。在当前会话内联执行。

## Phase 1 — GATHER（收集变更 + 探测技术栈）

### 1.1 获取变更

```bash
git diff --name-only HEAD
git diff --stat HEAD
git rev-parse --abbrev-ref HEAD
```

如果 `git diff HEAD` 为空，检查 staged：

```bash
git diff --cached --name-only
```

如仍为空，终止并输出："没有待审查的变更。"

### 1.2 探测技术栈

审查前必须了解项目上下文，避免用不匹配的约定误报：

1. 用文件读取工具读取根目录和相关模块的 `AGENTS.md`，若存在平台专用规则文件则继续读取。
2. 递归搜索 `**/pom.xml`、`**/build.gradle`、`**/build.gradle.kts`，排除构建输出目录。
3. 在所有构建文件中搜索 `lombok`、`mybatis-plus`、`mybatis-spring`、`spring-boot-starter-data-jpa`。
4. 根据变更文件所属模块分别判定技术栈，不能只读取仓库根目录构建文件。

> **核心原则**：项目规则 > 依赖探测 > 通用规则。审查结论应与项目实际技术栈一致。

### 1.3 加载项目审查规约（KB，必做）

**本技能自带的维度只是通用兜底，项目的明文规约才是判据来源**——不加载 KB 就开审，会漏掉项目自己的必查项（如注释规约、SQL 写法、失败可观测等）。

1. 从工程/用户级指令文件取知识库根（KB 根）——`CLAUDE.md`/`AGENTS.md`（平台专用文件与跨平台公共规则）；取不到就**问用户**，不要猜路径。
2. 经 KB 根 `index.md` 的「任务路由」逐级加载；项目标识先经 `projects/index.md` 定位，再读该项目的 `index.md`。
3. **必载**：`backend/java/code-review-checklist.md`（该文件自述「代码审查必载」）、`backend/java/method-naming.md`、`backend/java/mybatis-plus-mapper-naming.md`（命名判据）；再按技术栈补载对应规范（如 `backend/java/development-standard.md`、数据库/ORM 规范）。
4. 补载 KB 根路由中「Git 与代码评审」一行指向的 `common/git/index.md`，以及恒适用的 `preferences/index.md`（个人偏好兜底）。
5. **优先级**：KB 明文规约 > 本技能的通用维度；项目规约 > 通用规范。**新代码违背明文规范至少 WARNING，不得因仓库存在历史先例而降级为 INFO 或忽略**。
6. 报告开头列出本次实际加载了哪些规约文件；**未能加载时必须在报告开头标注**，不得只凭通用规则下结论。清单里列出的文档必须真正读取，不能只列进清单不读。

---

## Phase 2 — REVIEW（逐文件审查）

### 2.1 分层架构（CRITICAL）

搜索所有模块的 `**/src/main/**/*Controller.java`，再检查 `Mapper` / `Repository` 引用；只报告本次 diff 涉及的文件和调用链。

- Controller/Resource 层不应直接访问 DAO/Repository/Mapper，必须经过 Service
- DTO/VO 不应出现在数据访问层中（不要用 DTO 直接做持久化）
- Entity/Model 不应直接暴露到 Controller 层，应使用 DTO/VO 转换
- API/接口模块只放接口定义和传输对象，不放业务实现
- 避免循环依赖：Service 之间单向依赖，必要时抽公共逻辑到独立模块

### 2.2 ORM / 数据库（CRITICAL）

搜索所有模块的 `**/src/main/**/*.xml`，再搜索 `${`；结合参数来源和白名单校验判断是否存在注入风险。

**通用规则：**
- SQL 参数必须使用参数化查询或 ORM 提供的绑定方式，禁止字符串拼接用户输入
- 批量操作必须分页或分批（`IN` 子句口径见 KB `backend/java/development-standard.md`「数据库访问」），防止 OOM
- 注意 N+1 查询：关联查询优先使用 JOIN / fetch / 批量加载，避免循环内查库

**JPA/Hibernate（如项目使用）：**
- Entity 类必须标注 `@Entity` 和 `@Table`
- 主键使用 `@Id` + `@GeneratedValue`
- `@OneToMany`/`@ManyToOne` 默认 `FetchType.LAZY`，按需用 `JOIN FETCH` 或 `@EntityGraph`
- 避免在 `@PostLoad` 等生命周期方法中执行复杂逻辑

**MyBatis/MyBatis-Plus（如项目使用）：**
- Mapper XML 中禁止 `${}` 拼接用户输入值（仅可用于动态表名/列名且必须白名单校验）
- 批量操作使用 `<foreach>` 分页或分批处理
- 注意 MyBatis-Plus `LambdaQueryWrapper` 优于字符串字段名
- **Service 层批量操作方法调用前必须校验入参集合非 `null` 且非空（`size > 0`）**——含框架自带方法（`saveBatch` / `saveOrUpdateBatch` / `updateBatchById` / `removeByIds` / `removeBatchByIds` 等）与自定义批量方法；空集合时先返回、不做写入。判空用项目工具类（`CollUtils.isEmpty` / `CollectionUtils.isEmpty` / `CollUtil.isEmpty`，按项目规范选），**判空即覆盖 `null` 与空集合两种情况，不要写 `list == null || list.size() == 0` 这类冗余双写**。缺失该校验 → 至少 WARNING；若因为空集合被静默吞掉而**整批业务数据未落库且任务仍报成功**，按影响面判 CRITICAL（与 2.3「失败可观测」、KB `backend/java/code-review-checklist.md` 第 3 项同源：剔除/未落库必须留痕，不能静默成功）

### 2.3 异常处理（CRITICAL）

在所有模块的 `**/src/main/**/*.java` 中搜索 `catch`，读取相邻代码确认是否为空块。不要仅依赖单行正则作结论。

- 不允许空 catch 块 — 至少记录日志或添加注释说明忽略原因
- 不允许 `printStackTrace()`，必须使用日志框架记录
- 业务异常应使用项目定义的业务异常类（而非裸 `RuntimeException`），包含错误码和可读消息
- Controller 层应有统一的异常处理机制（`@ControllerAdvice` / `ExceptionHandler`）
- 资源释放使用 try-with-resources 或 finally 块，避免连接泄漏

### 2.4 安全性（HIGH）

在所有模块的 Java 和配置文件中搜索 `password`、`secret`、`token`、`apikey`、`api_key`，读取命中上下文，区分真实凭据、变量名和示例占位符。

- 不允许硬编码密钥、Token、密码、连接串（应从配置/环境变量/密钥管理服务获取）
- 外部输入（请求参数、文件上传、Header）必须校验（`@Valid`/`@Validated`、参数断言）
- 日志中不得打印敏感信息（密码、手机号、身份证号、银行卡号、Token）
- 敏感数据在内存中使用 `char[]` 而非 `String`（可选，按项目安全等级）
- SQL WHERE 条件中的动态列名/排序字段必须做白名单校验

### 2.5 代码质量（HIGH）

- 方法/类/嵌套/参数体量按 KB「代码风格」的默认值核对（方法 ≤ 50 行、类 ≤ 800 行、嵌套 ≤ 4 层、参数 ≤ 5 个；项目规范可覆盖）
- 使用 early return / guard clause 减少嵌套
- 消除魔法数字和魔法字符串，使用命名常量或枚举
- 变量按需不可变（`final` 或不可变类）；**项目既有代码未使用 `final` 时不作为问题**
- 集合/数组返回空集合而非 `null`（`Collections.emptyList()`）
- `Optional` 用法见 KB「集合与空值」：只用返回值表示「可能为空」，不用作参数或字段

**Lombok（如项目使用）：**
- Entity/DTO 使用 `@Getter`/`@Setter`/`@Data`，不手写 getter/setter
- 日志使用 `@Slf4j`，不手写 Logger 声明
- 依赖注入使用 `@Autowired` 注解注入（字段注入），与项目既有写法一致；不要凭"构造器注入更优"要求改造既有风格

**无 Lombok（如项目不使用）：**
- 使用 IDE 生成或手写 getter/setter，保持一致性
- 日志声明：`private static final Logger log = LoggerFactory.getLogger(Xxx.class);`
- 依赖注入使用 `@Autowired` 注解注入（字段注入），与项目既有写法一致


### 2.6 测试（MEDIUM）

- 新增 Service/Component 的 public 方法应有对应单元测试
- 测试命名清晰描述行为：`shouldXxxWhenYyy` 或 `testXxxGivenYyy`
- 一个测试方法只验证一个行为，避免多个 `assert` 无关联
- 测试不依赖外部环境（数据库、网络、文件系统），使用 Mock/Stub
- 测试应包含边界条件（null、空集合、异常输入）

### 2.7 日志（MEDIUM）

- 关键分支记录日志：参数校验失败、异常捕获、远程调用、业务状态变更
- 日志级别正确：
  - `error`：需要人工介入的异常
  - `warn`：可自动恢复的异常、降级逻辑
  - `info`：业务关键节点（订单状态变更、任务完成）
  - `debug`：方法入参/出参、调试细节
- 日志信息包含足够上下文（如订单 ID、用户 ID），但不过量
- 日志细则以 KB 为准：方法进出**成对**、参数段 `key={}`、异常放**最后一个参数位**、禁止纯句子日志（详见 `backend/java/logging-standard.md`；项目规则优先）

### 2.8 注释（MEDIUM）—— 通俗易懂

审查新增/修改代码的注释**读起来是否直白、简洁**。**只评注释本身好不好读，不与设计文档做一致性比对**（文档归文档、代码归代码）。判据以**项目既有同类文件的注释密度**为准：先读同目录/同类既有文件，新代码的注释量不应明显超过它。

- **类注释一句话说清「这个类是干什么的」**，方法注释一两行。出现大段契约清单（`<ul><li>`）、调用链路（`A#x → B#y`）、返回结构逐字段说明，一律判为过繁——这些属于设计文档，代码里复述只会让人读不下去
- **`@param` / `@return` 必须写「口径」，不是复述参数名**：**公开与受保护方法必须有** `@param`/`@return`/`@throws`（项目 `backend/java/development-standard.md`「文档注释（Javadoc）」明文）——只写一个名词的复述（`@param detail 明细`、`@return 影响行数`）**等于没写**，要写清口径/约束/边界，如 `@param rioaNos RIOA 编号列表，为空则不限定编号`。**缺 `@param` 或只复述参数名 → 至少 WARNING**。
- **私有方法**：无分支、无循环的单行转发可只写一句话；含分支、解析、落库等非平凡逻辑的**必须**写 `@param`。
- **不复述代码**：`// 设置 taskId` 这类与代码同义的行内注释删掉；只留「为什么这么做」和「边界/坑在哪」
- **Map 入参逐 key 注释**：构建 Map 形式的请求/入参（`map.put("key", value)`，尤其对接外部系统、智能体的请求体）时，**每个 key 必须有行内注释说明业务含义**，带单位或示例值更佳（如 `// 采集数据，如 120条`）；空手 `put("key", value)` 连排时评审与排错都无从判断语义、也易与接口文档字段错配；缺 key 注释 → 至少 WARNING
- **注释必须自包含**：不得写「示例见 X」「详见文档 Y」「见 §x.y」这类指向文档/路径的引用——注释与文档是两条维护线，路径会失效、章节会重排，读代码的人拿不到答案；该说明的信息就写在注释里。
- **不堆术语**：用业务大白话写。`契约就位`、`就地贴附`、`本方法按逻辑节点拆私有方法`、`依据 §x.y` 这类只有写文档的人才懂的话，判为不通俗
- **不写正确的废话**：`/** 处理逻辑 */`、`// TODO 后续优化` 等于没写；待实现/待确认的地方必须留可检索的 `TODO(用户实现)` / `TODO(待确认)`，缺失则单独指出
- **不重复**：Javadoc 与行内注释别表达同一件事，二者留一
- **XML（Mapper 等）里不写注释**：`<!-- -->` 一律不加，SQL 的「为什么 / 口径 / 边界」写在 Mapper 接口方法的 Javadoc 里，不写在 XML。存量 XML 已有注释属历史先例，**不作为新代码豁免**（新增 `<!--` 即判违规）
- 反例（过长 + 复述 + 术语堆砌）：

  ```java
  /**
   * 报告生成输入策略（契约就位；buildMessage/parseResponse 实现由用户补充）。
   * <p>契约：</p>
   * <ul>
   *   <li>调用方：既有链路 AbstractAgentManager#doHandleTask → AgentService#inputContext（不改）。</li>
   *   <li>buildMessage：入参 uniqueKey 即底座 dataNumber，年月范围编码其中；返回 Map 消息体，结构待用户补充。</li>
   * </ul>
   */
  ```

  正例：

  ```java
  /** 报告生成输入策略：组 Agent 消息体、解析 Agent 返参（实现待补充）。 */
  ```

  方法级正例（口径写进 `@param`，而不是复述参数名）：

  ```java
  /**
   * 查询待回填的记录。
   *
   * @param rioaNos RIOA 编号列表，为空则不限定编号
   * @return 待回填记录
   */
  ```

- 定级：**违背项目明文注释规约的，至少 WARNING**（如 KB `backend/java/development-standard.md`「文档注释（Javadoc）」与 `backend/java/code-review-checklist.md` 第 2 条：无信息量复述、版本号/流程痕迹、注释与实现或 SQL 口径矛盾、wrapper 与底层重复注释等）；仅「写得略冗余但未违背明文规约」→ INFO。注释密度是否超标，以项目既有同类文件为准。

---

### 2.9 命名（HIGH）

命名不只是大小写风格，须对照 KB 三份命名规范逐方法核对新增/修改的代码：

- **公开方法**：动词落在 `backend/java/development-standard.md`「方法命名」的集合内（get / list / page / create / update / delete / validate / is / has）；`recreate`、`parse`、`format` 等表外动词视为违规；方法名表达业务动作，不泄漏 SQL 语义（Service 侧不得叫 `selectXxxList`）。
- **私有辅助方法**：对照 `backend/java/method-naming.md` 前缀表（build / resolve / load / fill / validate / is / match / select / list / save / insert / handle / try / read / cache）；`validate*` 与 `is*`/`has*` 不得互替，`build*` 与 `fill*` 不得混用。
- **Mapper**：对照 `backend/java/mybatis-plus-mapper-naming.md`（select / insert / update / delete 前缀、返回类型后缀、多参数 `@Param`；删除/更新返回值按调用方需要，`int` 或 `void`）。
- **既有方法**按「既有代码不追溯」标注 ⚠️，但**不得**因此忽略新代码的同类违规。
- 结论中单列命名核对结果：核了哪些方法、依据哪条规则、哪些属既有不追溯。

## Phase 3 — REPORT（输出报告）

```markdown
## Code Review 报告

**分支**: <branch>
**变更文件数**: <N>

### CRITICAL（必须修复，BLOCK 合入）

| # | 文件:行号 | 问题 | 建议修复 |
|---|-----------|------|----------|
| 1 | Xxx.java:42 | ... | ... |

### WARNING（应该修复）

| # | 文件:行号 | 问题 | 建议修复 |
|---|-----------|------|----------|

### INFO（建议改进）

| # | 文件:行号 | 问题 | 建议修复 |
|---|-----------|------|----------|

### 总体评价

[PASS / PASS WITH WARNINGS / FAIL]

**总结**: <一句话概括>
```

---

## 边界条件

| 场景 | 处理方式 |
|------|----------|
| `git diff` 为空（无未提交变更） | 检查 `git diff --cached`；如也为空则终止 |
| `AGENTS.md` 不存在 | 继续检查平台专用规则；两者都不存在时仅依赖依赖探测和通用规则，并在报告开头标注“未检测到项目规则” |
| 变更文件 > 50 个 | 仅审查 `.java` 文件；跳过配置文件除非有安全关注 |
| 变更仅包含 `pom.xml` / `build.gradle` | 检查依赖来源、版本锁定和仓库配置；只有项目已有漏洞扫描器且实际执行后，才能报告已知漏洞 |
| 同时存在 Lombok 和非 Lombok 文件 | 按文件分别判定：有 `@Slf4j` 的用 Lombok 标准，没有的用非 Lombok 标准 |
| ORM 混合使用（JPA + MyBatis 同项目） | 两个 ORM 的规则都适用，在报告中标注每个文件使用的 ORM |
| 检测到 Kotlin 文件混在 Java 项目中 | 仅审查 Java 文件；提及存在 Kotlin 文件但说明不在审查范围 |
| 代码库没有测试目录 `src/test` | 测试维度标注 N/A 而非 FAIL |
| 变更包含生成代码（`target/`、`build/`、`generated/`） | 排除这些文件的审查，在报告中注明 |

---

## 注意事项

- 只审查本次 `git diff` 中变更的代码，不审查未改动的文件
- 如果一个文件没有变更则跳过
- 发现 CRITICAL 问题时明确标注 **BLOCK**，建议修复后再合入
- 审查结论应与项目实际技术栈一致 — 探测到的框架和约定优先于通用规则
- 优先复用项目中已有的枚举、常量、工具类和业务异常，不重复造轮子
- 审查前必须按 1.3 加载 KB 规约；未加载成功时在报告开头标注，不得凭空按通用规则下结论
- 如果变更涉及多个模块，按模块分组输出审查结论
- 注释检查只看「写得通不通俗易懂、与同类文件比是否过繁」，**不与设计文档做一致性比对**
