---
name: tdd
description: Java TDD 工作流。Red-Green-Refactor 三阶段，自动检测 Maven/Gradle 和测试框架，覆盖率检查。当用户说"tdd""测试驱动""先写测试""red-green-refactor""写单元测试再实现""加个测试"时使用。
---

# Java TDD Workflow

测试驱动开发流程。在当前会话内联执行整个 Red-Green-Refactor 循环。

## 授权与执行边界（最高优先级）

- 只有用户明确调用 TDD、明确要求 RED/GREEN 或立即测试时，才可在授权范围内适用「先测试、后审查」的例外；Skill 因关键词被自动匹配不等于用户作出上述明确选择，普通业务代码修改不自动获得例外。
- 所有测试、编译和覆盖率命令执行前均须核对本次明确授权；宿主支持时后台执行并等待完成通知，再读取实际结果。授权使用本 Skill 不等于授权执行其中每条命令；未授权时只列命令并标注「未执行」。
- 未获运行 RED 测试的明确授权时，不得声称已确认 RED 或已完成 TDD；需要 RED 才能继续时暂停，不继续编写生产实现。
- 不适用上述例外的普通业务代码修改，顺序为「改代码 → 提示用户运行 code-reviewer 并完成修复 → 编译/测试」，不得因加载本 Skill 而越过审查门禁。

## Phase 1 — DETECT（探测测试基础设施）

递归搜索所有模块的 `**/pom.xml`、`**/build.gradle`、`**/build.gradle.kts`、`**/src/test/**` 和 `**/*Test.java`。在构建文件中搜索 JUnit、TestNG、Mockito 和 JaCoCo。根据被测类所属模块选择对应构建文件，排除 `target/`、`build/` 和生成目录。

执行命令时，Windows 优先 `mvnw.cmd` / `gradlew.bat`，Unix-like 环境优先 `./mvnw` / `./gradlew`；没有 wrapper 时使用系统 `mvn` / `gradle`。

| 检测到 | 测试命令 | 覆盖率命令 |
|--------|----------|-----------|
| Maven + JUnit 5 | `<maven> test -Dtest=XxxTest -pl <module> -am` | `<maven> test jacoco:report -pl <module> -am` |
| Maven + JUnit 4 | `<maven> test -Dtest=XxxTest -pl <module> -am` | `<maven> test jacoco:report -pl <module> -am` |
| Gradle + JUnit 5 | `<gradle-wrapper> :<module>:test --tests "*XxxTest"` | `<gradle-wrapper> :<module>:test :<module>:jacocoTestReport` |
| 无测试框架 | 询问用户 | — |
| 无 JaCoCo | 覆盖率门禁降级为"测试全部通过即可" | — |

单模块 Maven 项目省略 `-pl <module> -am`；单模块 Gradle 项目省略 `:<module>:` 任务前缀。

### 1.1 加载项目知识库规范

首次编写测试前调用 `kb-loader` 技能获取加载清单并按其读取，任务类型按本次测试覆盖的开发或缺陷修复改动归类；不得延迟到 GREEN 阶段才加载。KB 明文规约优先于本技能中的示例与默认口径，同时读取当前项目的 `AGENTS.md` 和平台专用规则。

### 1.2 定位目标

递归搜索 `**/*Service.java` 和 `**/*ServiceImpl.java`，根据包名、接口实现关系以及用户指定目标确定被测类，不能默认取搜索结果前五个。

### 1.3 读取风格参考

读取 1-2 个已有测试文件，了解：
- 使用的测试框架和扩展（`@ExtendWith(MockitoExtension.class)` vs `@SpringBootTest`）
- 测试命名约定（`should*` / `test*` / `given*`）
- Mock 方式（`@Mock` + `@InjectMocks` / `Mockito.mock()`）
- Assert 库（AssertJ / Hamcrest / JUnit5 Assertions）

---

## Phase 2 — RED（编写失败测试）

### 编写原则

- 测试类放在 `<src/test>/<对应包路径>/` 下
- 测试方法命名：`should<预期行为>When<条件>`
- 每个测试方法只验证一个行为（一个 assert 对应一个场景）
- 覆盖 4 种场景：
  1. **正常路径** — 典型输入，预期成功
  2. **null / 空值** — `null`、空字符串、空集合
  3. **业务异常** — 违反业务规则的输入，预期抛异常
  4. **边界值** — 最大值、最小值、零、负数

### 模板

```java
@ExtendWith(MockitoExtension.class)
class XxxServiceImplTest {

    @Mock
    private XxxMapper xxxMapper;

    @InjectMocks
    private XxxServiceImpl xxxService;

    @Test
    void shouldReturnDtoWhenParamValid() {
        // Arrange
        // Act
        // Assert
    }

    @Test
    void shouldThrowExceptionWhenParamIsNull() {
        // Arrange
        // Act & Assert
        assertThrows(BusinessException.class, () -> xxxService.doSomething(null));
    }

    @Test
    void shouldThrowExceptionWhenBusinessRuleViolated() {
        // Arrange
        // Act & Assert
        assertThrows(BusinessException.class, () -> xxxService.doSomething("invalid"));
    }

    @Test
    void shouldHandleEdgeCaseWhenValueIsZero() {
        // Arrange
        // Act
        // Assert
    }
}
```

### 运行测试确认 RED

执行前核对本次 RED 授权；宿主支持时后台执行并等待完成通知。未授权只列下列命令并标注「未执行」，不得进入需要有效 RED 的生产实现。

```bash
# Maven
<maven> test -Dtest=<TestClassName> -pl <module> -am

# Gradle
<gradle-wrapper> :<module>:test --tests "*<TestClassName>"
```

预期：**FAIL**，且失败原因必须是目标行为尚未实现或断言不满足。编译错误、依赖下载失败、环境错误不能作为有效 RED；实际结果按退出码和测试报告填写，未执行不得填 FAIL 或 PASS。

---

## Phase 3 — GREEN（最小实现）

### 实现原则

- 只写让测试通过的最小代码，不做额外重构
- 涉及新 Entity/DTO 时，遵循 `gen-java-entity` 的包路径动态探测
- 依赖注入用 `@Autowired` 注解注入（字段注入）+ 项目业务异常类
- 优先复用已有枚举、常量、工具类
- 生成代码前先读取当前项目的 `AGENTS.md` 和平台专用规则，再检查同模块现有代码，确认行宽、链式调用、注解和格式习惯
- 遵循 Phase 1 已加载的 kb-loader 清单及项目规范，不重复加载已读文档

### 运行测试确认 GREEN

执行前核对本次 GREEN 授权；宿主支持时后台执行并等待完成通知，未授权只列命令并标注「未执行」。

```bash
<maven> test -Dtest=<TestClassName> -pl <module> -am
```

预期：**PASS** — 所有测试通过；实际结果按退出码和测试报告填写，未执行或失败不得写 PASS。

---

## Phase 4 — REFACTOR（重构）

### 重构清单

- [ ] 消除重复代码（DRY）
- [ ] 方法拆分（每个方法 ≤ 50 行）
- [ ] 消除魔法数字，提取命名常量
- [ ] Early return 减少嵌套（嵌套 ≤ 4 层）
- [ ] 变量声明为 `final`

### 重构后验证

重构会改变代码并使此前验证失效。执行前重新核对本次授权；宿主支持时后台执行并等待完成通知，未授权只列命令并标注「未执行」。

```bash
<maven> test -Dtest=<TestClassName> -pl <module> -am
```

预期：**PASS** — 重构后所有测试仍通过；实际结果按退出码和测试报告填写，未执行或失败不得写 PASS。

---

## Phase 5 — COVERAGE（覆盖率）

### 生成覆盖率报告

执行前核对本次覆盖率命令授权；宿主支持时后台执行并等待完成通知，未授权只列命令并标注「未执行」，不得编造覆盖率。

```bash
# Maven + JaCoCo
<maven> test jacoco:report -pl <module> -am

# Gradle + JaCoCo
<gradle-wrapper> :<module>:test :<module>:jacocoTestReport
```

### 覆盖率门禁

| 覆盖率 | 判定 | 行动 |
|--------|------|------|
| ≥ 80% line | PASS | 输出汇总报告 |
| < 80% line | 需补充 | 列出未覆盖的分支/方法，回到 Phase 2 补充测试 |
| 无 JaCoCo | SKIP | 仅按实际测试报告判断；未执行时标注未执行，不声称全部通过 |

---

## 输出报告

```markdown
## TDD 完成报告

**被测类**: <类全限定名>
**构建系统**: Maven / Gradle
**测试框架**: JUnit 5 / JUnit 4 + Mockito

### RED Phase
- 编写测试: <按实际测试方法逐项计数>
- 覆盖场景: <实际覆盖的正常路径 / null / 业务异常 / 边界值>
- 执行结果: <FAIL 且原因符合预期 / FAIL（环境或编译等原因） / PASS / BLOCKED / 未执行；附实际依据>

### GREEN Phase
- 新增/修改文件: <列表>
- 测试结果: <实际统计及 PASS / FAIL / BLOCKED / 未执行；未经执行不得填通过>

### REFACTOR Phase
- 重构项: <实际完成的消除重复 / 拆分方法 / 提取常量；无则注明无>
- 重构后测试: <实际统计及结果；代码变化后未重跑必须写未执行>

### 覆盖率
| 指标 | 数值 |
|------|------|
| Line Coverage | <实际百分比 / 未执行 / 无报告> |
| Branch Coverage | <实际百分比 / 未执行 / 无报告> |

**结论**: <PASS / FAIL / BLOCKED / 未执行 / BELOW 80%，按实际结果填写>
```

---

## 边界条件

| 场景 | 处理方式 |
|------|----------|
| 没有检测到测试框架 | 询问用户使用 JUnit 5 / JUnit 4 / TestNG / Spock |
| 没有测试目录 `src/test` | 按标准 Maven/Gradle 布局创建 `src/test/java/<package>` |
| 被测方法依赖未创建的 Mapper/Repository | 先定义最小可编译契约并 Mock；契约无法确定时停止并确认，不写 `TBD`、TODO 或待替换占位符 |
| 项目已有测试但命名/风格不统一 | 沿用被测类同模块已有测试的风格 |
| 需要 Spring 上下文 | 使用 `@SpringBootTest` + `@MockBean`，标注为集成测试而非单元测试 |
| 被测方法 > 50 行 | 建议先拆分为小方法再 TDD，拆分为多个 TDD 子任务 |
| 涉及文件上传/网络/消息队列 | Mock 外部依赖，测试只验证业务逻辑 |

---

## 注意事项

- 测试方法不依赖执行顺序（不该有 `@TestMethodOrder`）
- 测试数据在方法内构造，不依赖外部文件或数据库
- 不测试框架本身（如不验证 Spring DI 是否正确注入）
- 不测试 getter/setter/toString/hashCode（Lombok 生成的不需要测试）
- 被 `feature-dev` Agent 调用时，只执行当前计划任务的 TDD 循环，不启动完整流水线
