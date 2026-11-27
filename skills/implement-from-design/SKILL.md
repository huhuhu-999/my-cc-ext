---
name: implement-from-design
description: 根据设计文档（PRD、技术方案、架构设计等）实现 Java 编码。自动适配项目技术栈，遵循分层架构、TDD 流程和项目编码规范。当用户提供设计文档并要求开发功能、或说"开发这个功能""实现这个需求""按设计编码"时使用。
---

# 根据设计文档实现编码

你是一个严格遵循设计文档和项目规范来编写代码的实现者。

**边界**：已有有效且获用户批准的 plan 时，直接读取并实现，不要求重新走完整 feature-dev 流水线。简单字段/参数小改可按明确范围直接处理，不因关键词自动创建 Spec/Plan/状态文件；缺少必要业务取值、口径或单位时先确认。需要完整规划的复杂需求再交 feature-dev，实施中发现批准范围或设计需变更时暂停确认。

## 验证授权与审查门禁（最高优先级）

- 只有用户明确调用 TDD、明确要求 RED/GREEN 或立即测试时，才可在授权范围内先执行测试；普通 `implement-from-design` 调用不自动获得该例外。
- 测试、编译和覆盖率命令执行前均须核对本次明确授权；宿主支持时后台执行并等待完成通知，再读取实际结果。计划中出现命令、Skill 被自动匹配或用户批准实现，均不等于命令执行授权；未授权时只列命令并标注「未执行」。
- 当前任务必须先确认 RED 才能继续时，未获 RED 授权则保持对应实现项 `pending`，不得继续生产实现，也不得声称完成 TDD 或把该项标为 `done`。
- 不适用显式 TDD 例外的普通业务代码修改，固定顺序为「改代码 → 提示用户运行 code-reviewer 并完成修复 → 编译/测试」。下文任何波次、回归或验证描述都不得越过该顺序。

## 前置步骤：项目技术栈探测

实现前必须先了解项目上下文，按以下顺序获取信息：

### 1. 阅读项目规则

> **知识库规范**：动手前先调用 `kb-loader` 技能获取加载清单并按其读取；KB 明文规约优先于本技能中的示例与默认口径。

首先读取项目根目录下的 `AGENTS.md`；若当前平台还有专用规则文件，再读取该文件作为补充。从项目规则中获取：
- 项目定位、模块结构和分层约定
- ORM 框架（JPA/Hibernate / MyBatis / MyBatis-Plus / JdbcTemplate）
- DI 容器（Spring Boot / Guice / Quarkus / 无 DI）
- 包路径命名规范
- 编码约定（命名风格、异常类、日志框架）

### 2. 探测 Lombok

检查项目是否使用 Lombok，按优先级：

1. 检查 `pom.xml` 或 `build.gradle` 中是否有 `lombok` 依赖
2. 检查项目中是否存在 `@Slf4j`、`@Data`、`@Getter` 等 Lombok 注解的实际使用

Lombok 使用状态影响：getter/setter 生成方式、日志声明方式（依赖注入统一 `@Autowired` 注解注入，不随 Lombok 变化）。

### 3. 补充探测

项目规则未覆盖的信息通过文件系统探测：

- **构建工具**：`pom.xml` → Maven，`build.gradle` → Gradle
- **ORM 框架**：依赖中查找 JPA/Hibernate、MyBatis/MyBatis-Plus、JdbcTemplate 等
- **DI 容器**：依赖中查找 Spring、Guice、Quarkus 等
- **分层结构**：通过目录结构推断模块划分和包路径

> **核心原则**：项目规则 > 依赖探测 > 通用规则。实现应与项目实际技术栈一致，不要引入项目未使用的框架或约定。
> **产出语言**：同步更新或产出的文档、注释一律使用简体中文（代码注释、README、DDL 注释等）；代码标识符、命令、路径字符串保持原文。

---

## 工作流

### 第一步：读取设计文档

先确认设计文档位置，按优先级搜索：

1. 交接方（feature-dev / superpowers-planner）传入的 `plan_file` / `design_file` 完整路径，或用户显式指定的文档路径（完整路径已含 `<yyyy-MM>/`，优先直接使用）
2. `doc/features/<yyyy-MM>/<feature-name>/` 功能月目录中的设计文档和实施计划（`feature-dev` 输出；在 `doc/features/` 顶层各 `<yyyy-MM>/` 下定位 `<feature-name>` 功能目录，忽略同夹 `archive/`，`<yyyy-MM-dd>` 仅用于候选定位）
3. `doc/plan/` 目录下的实施计划
4. `doc/design/` 目录下的设计文档
5. `doc/` 或 `docs/` 目录下的设计文档
6. `doc/superpowers/specs/` 目录下的 Spec（`superpowers-planner` 输出）
7. `specs/`、`design/` 目录下的规格说明

只有交接方或用户显式传入**已批准且仍有效**的 plan 时才可据其直接实现。未显式传入已批准 plan 时，列出候选路径，让用户选择本次目标并确认批准状态；日期仅用于定位候选，不得因 `<yyyy-MM-dd>` 最新就自动实现草稿。批准状态不明时暂停，不读取后开始编码。

读取后，提取以下信息：
- **功能范围**：要实现哪些接口/模块
- **数据模型**：Entity/Domain、DTO、VO 定义
- **接口定义**：Controller 路由、Service 方法签名
- **业务规则**：校验规则、异常场景、边界条件
- **依赖关系**：需要调用哪些已有 Service/Repository/Mapper

### 第二步：分析现有代码

实现前先搜索项目中的可复用代码：

1. 搜索同名或相似的 Entity/DTO/Enum，避免重复定义
2. 确认项目中已有的接口定义、常量和枚举
3. 确认已有的 Service 和 Repository/Mapper，避免重复逻辑
4. 参考同模块已有的实现模式（命名风格、异常处理、日志写法、分页方式）

### 第三步：规划实现顺序

按分层依赖，自底向上实现。根据项目 ORM 框架调整：

**JPA/Hibernate 项目：**
```
1. 枚举 / 常量        → 接口/常量模块
2. DTO / VO           → 接口/传输对象模块
3. Entity             → 领域/数据访问模块
4. Repository         → 领域/数据访问模块
5. Service            → 业务逻辑模块
6. Controller         → Web/API 模块
7. 单元测试           → 在对应业务实现前创建并确认 RED
```

**MyBatis/MyBatis-Plus 项目：**
```
1. 枚举 / 常量        → 接口/常量模块
2. DTO / VO           → 接口/传输对象模块
3. Entity/Model       → 领域/数据访问模块
4. Mapper             → 领域/数据访问模块（接口 + XML）
5. Service            → 业务逻辑模块
6. Controller         → Web/API 模块
7. 单元测试           → 在对应业务实现前创建并确认 RED
```

列出具体文件清单。如涉及修改已有文件，需特别标注。建议将文件清单呈现给用户确认后再开始编码。

**业务逻辑归属（MUST）**：操作特定表的业务逻辑（如关系同步、状态变更、批量写入）应放在该表对应的 Service 中，不得混在其他业务 Service 中作为私有方法实现。例如：同步 `lmp_spend_cost_user` 表的逻辑应归属 `LmpSpendCostUserService`，而非 `FspendCostManagerServiceImpl` 的私有方法。调用方通过注入目标 Service 完成业务编排，保持事务边界一致。

### 第四步：按 TDD 波次实现

以下 RED/GREEN 顺序仅适用于用户已明确选择 TDD、RED/GREEN 或立即测试的波次；实际运行命令仍须单独获得明确授权并后台执行。普通流程不得据此自动先测试；计划必须先确认 RED 才能继续而未获授权时，保持对应实现项 `pending` 并暂停，不编写该项生产代码。

基础类型和持久化契约就绪后，获授权的显式 TDD 波次中，每个业务行为按以下顺序执行，禁止先完成生产实现再补测试：

1. 编写能够表达预期行为的测试
2. 运行目标测试并确认因预期行为尚未实现而失败（RED），不能把编译错误或环境错误当作 RED
3. 编写使测试通过的最小生产代码（GREEN）
4. 在测试保持通过的前提下重构
5. 完成当前波次后统一编译和运行相关测试

**编译纪律（最高优先级）**：仅在当前门禁允许且已获命令授权后执行，禁止逐文件编译。按分层波次批量写完所有文件后，统一编译验证。规则：

- 每完成一层（如所有 DTO、所有 Entity、所有 Mapper）才编译 1 次
- 编译失败时，分析所有错误，集中批量修复后再编译，不得改一个文件编译一次来试探
- 绝对禁止写完一个 Java 文件就立即 `mvn compile` 的行为
- **文档同步**：编码中发现实际实现与设计文档/实施计划不一致时（类名、方法签名、字段类型、业务逻辑等调整），必须同步更新对应的 `*-design.md` 和 `*-plan.md`。代码即文档，文档即代码，两者始终保持一致

每实现一个文件必须遵循项目规范。生成代码前先读取当前项目的 `AGENTS.md` 和平台专用规则，再搜索同模块现有代码确认行宽、链式调用、注解和格式习惯。以下为模板示例，实际编码时以项目规则和现有代码风格为准。

#### 包路径确定

通过搜索已存在的同类文件动态确定，禁止写死。方法：
1. 使用文件模式搜索同类文件（如 `**/service/**Impl.java`）
2. 从中提取包路径前缀
3. 新增文件放到与已有文件同级的对应子包中

#### 依赖注入——Lombok 项目（`@Autowired` 注解注入）

```java
@Slf4j
@Service
public class XxxServiceImpl implements XxxService {

    @Autowired
    private XxxRepository xxxRepository;

    // 方法 < 50 行；参数是否 final 随项目既有风格，不强制
    public XxxDto doSomething(final String param) {
        // 参数校验在方法开头
        if (param == null || param.isBlank()) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "参数不能为空");
        }
        // 使用 early return 减少嵌套
        // 关键节点打日志
        log.info("处理xxx, param={}", param);
        // ...
    }
}
```

#### 依赖注入——无 Lombok 项目（同样用 `@Autowired`）

```java
@Service
public class XxxServiceImpl implements XxxService {

    private static final Logger log = LoggerFactory.getLogger(XxxServiceImpl.class);

    @Autowired
    private XxxRepository xxxRepository;

    public XxxDto doSomething(final String param) {
        if (param == null || param.isBlank()) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "参数不能为空");
        }
        log.info("处理xxx, param={}", param);
        // ...
    }
}
```

> 依赖注入统一用 `@Autowired` 注解注入（字段注入），与项目既有写法一致；**不要**改造成构造器注入 + `@RequiredArgsConstructor` / `final` 字段——除非项目规范明确要求。

#### DTO 规范

```java
// DTO: 接口/传输对象模块
@Data  // 使用 Lombok 时；无 Lombok 则手写或 IDE 生成 getter/setter
public class XxxRequest {
    @NotBlank(message = "名称不能为空")
    private String name;
}
```

#### Entity / Mapper 规范

Entity 和 Mapper 的生成模板统一委托给 `gen-java-entity` skill，该 skill 已覆盖：

- **MyBatis-Plus**：`@TableName` + `@TableId` + `BaseMapper<Entity>` + `ServiceImpl<M, E>`
- **MyBatis**：纯 POJO + Mapper 接口 + 同名 XML（`resultMap`/`<sql>`/CRUD）
- **JPA/Hibernate**：`@Entity` + `@Getter` + `JpaRepository` + `JpaSpecificationExecutor`

需要生成 Entity/Mapper 时，先通过文件模式搜索探测项目 ORM 框架和包路径，然后按 `gen-java-entity` 的模板生成。核心规范摘要：

- Entity 序列化：仅当确实进入序列化场景（缓存值、RPC 传输体、会话属性）时才实现 `Serializable`；仅用于本地 MyBatis/MyBatis-Plus 增删改查的实体不实现。基类未实现时子类不得单方面添加。
- 审计字段齐全：`createdDate`, `createdBy`, `updatedDate`, `updatedBy`, `isDelete`
- 时间字段用 `LocalDateTime`，不用 `Date`
- MyBatis-Plus Entity 用 `@Data`，JPA Entity 用 `@Getter`（不暴露 setter）
- 逻辑删除用 `UPDATE SET is_delete = 1`，XML 禁止 `SELECT *`

**禁止多余防御性校验**：上游已保证的前提（如方法返回值非空、集合已初始化、必填字段已校验），下游不得重复判空、重复 trim、重复范围检查。多余校验会掩盖真实 bug，让调用方误以为"已处理异常"而实际只是静默跳过。判断依据是入参来源和上游契约，不是"保险起见"。

#### 异常处理

- 业务异常使用项目定义的业务异常类（如 `BusinessException`），附带错误码和可读消息
- Controller 层不 try-catch，交给全局异常处理器（`@ControllerAdvice` / `@ExceptionHandler`）
- Service 层只在需要转换异常类型时才 catch（如将 `DataAccessException` 转为 `BusinessException`）
- 资源操作必须使用 try-with-resources 确保释放

### 第五步：核对测试场景与回归范围

以下模板在第四步各业务波次开始时使用。本步骤只检查场景是否完整并确定模块回归范围，不得把缺失测试留到生产代码完成后再补。显式 TDD 例外按第四步在授权范围内执行；普通流程此处不运行编译或测试，须先完成第六步审查与修复，再按该步门禁回归。

每个 Service/Component 的 public 方法写单元测试。根据项目测试框架选择：

**Spring Boot + Mockito（最常见）：**
```java
@ExtendWith(MockitoExtension.class)
class XxxServiceImplTest {

    @Mock
    private XxxRepository xxxRepository;
    @InjectMocks
    private XxxServiceImpl xxxService;

    @Test
    void shouldReturnDtoWhenParamValid() {
        // Arrange
        // Act
        // Assert
    }

    @Test
    void shouldThrowExceptionWhenParamEmpty() {
        // Arrange
        // Act & Assert
        assertThrows(BusinessException.class, () -> xxxService.doSomething(""));
    }
}
```

**集成测试（需要 Spring 上下文时）：**
```java
@SpringBootTest
class XxxServiceImplIT {

    @MockBean
    private XxxRepository xxxRepository;
    @Autowired
    private XxxServiceImpl xxxService;
    // ...
}
```

- 测试命名：`should<预期行为>When<条件>`
- 一个测试方法只验证一个行为
- 覆盖正常路径 + 异常路径 + 边界条件

### 第六步：code-reviewer 审查与后续验证门禁

实现完成后，普通业务代码修改先提示用户运行 `code-reviewer` 对本次变更进行正式审查并完成问题修复；未完成该门禁时不得继续编译或测试。用户另行明确授权本流程执行审查时，也应按相同顺序完成：

1. 运行 `git diff` 获取变更（只读）
2. 提示用户运行 `code-reviewer` skill；取得审查结果后核对本次变更覆盖情况
3. 如存在 **CRITICAL** 问题，修复后重新审查
4. 如存在 **WARNING**，逐项评估后修复
5. 审查和修复完成后，普通流程才可申请编译/测试授权；显式 TDD 例外中的前置 RED/GREEN 不受此顺序限制，后续回归仍须明确授权并后台执行、等待完成通知
6. 审查后的任何代码修复都会使此前验证失效，必须在授权后重跑相关测试并记录最新真实结果；未运行、失败或受阻不得声称验证通过或标为验证性 `done`

所有验证按实际结果记录；未运行或受阻时明确标注，不写成 PASS。审查通过只表示 review 门禁完成，不等同于测试通过；输出总结前核对审查后代码变化已完成相应重验，未执行则如实列出。

### 第七步：自检

审查通过后，逐项自检：

- [ ] 分层调用正确（Controller → Service → Repository/Mapper）
- [ ] DTO 和 Entity 没有跨层混用
- [ ] 没有硬编码密钥、Token、密码或敏感信息
- [ ] 异常不吞掉（空 catch），日志不打印敏感信息
- [ ] 参数风格随项目既有写法（不强制 `final`）；返回值不返回 null（返空集合）
- [ ] 方法 < 50 行，嵌套层次 ≤ 4
- [ ] 包路径动态确定，没有写死
- [ ] 测试可运行且覆盖核心分支和边界条件
- [ ] 代码风格与项目已有代码一致

### 第八步：输出总结

```markdown
## 实现总结

**设计文档**: <文档路径>
**技术栈**: <框架>/<ORM>/<DI>，Lombok: <是/否>

### 新增文件

| 模块 | 文件 | 说明 |
|------|------|------|
| api | XxxRequest.java | 请求 DTO |
| component | XxxEntity.java | 实体 |

### 修改文件

| 文件 | 变更说明 |
|------|----------|

### 实现要点

- 遵循分层架构，Controller → Service → Repository
- 异常使用项目业务异常类，Controller 统一异常处理
- 依赖注入用 `@Autowired` 注解注入（字段注入），不改造既有风格

### code-reviewer 结果

[粘贴审查结论摘要，或标注"无 CRITICAL / WARNING，全部通过"]

### 验证结果

- 最新编译/测试：<实际命令、退出码、结果与统计；未授权或未执行时明确标注>
- 审查后重验：<无代码变化 / 已重验及结果 / 未执行或失败及影响；不得以 review 通过代替>

### 待完成

- [ ] 集成测试
- [ ] 接口文档更新
```
