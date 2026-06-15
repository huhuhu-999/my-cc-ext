---
name: implement-from-design
description: 根据设计文档（PRD、技术方案、架构设计等）在 pare-lmp-integrate 项目中实现编码。自动遵循分层架构、TDD 流程和项目编码规范。
---

# 根据设计文档实现编码

你是一个严格遵循设计文档和项目规范来编写代码的实现者。

## 工作流

### 第一步：读取设计文档

先确认设计文档位置，按优先级搜索：

1. `.claude/plan/` 目录下的规划文档
2. `doc/` 目录下的设计文档
3. 用户指定的设计文档路径
4. PRD、技术方案、接口文档

读取后，提取以下信息：
- **功能范围**：要实现哪些接口/模块
- **数据模型**：Entity、DTO、VO 定义
- **接口定义**：Controller 路由、Service 方法签名
- **业务规则**：校验规则、异常场景、边界条件
- **依赖关系**：需要调用哪些已有 Service/Repository

### 第二步：分析现有代码

实现前先搜索项目中的可复用代码：

1. 用 Grep 搜索同名或相似的 Entity/DTO/Enum
2. 确认 `pare-lmp-integrate-api` 中已有的接口定义和常量
3. 确认 `pare-lmp-integrate-component` 中已有的 Service 和 Repository
4. 参考同模块已有的实现模式（命名、异常处理、日志风格）

### 第三步：规划实现顺序

按分层依赖，自底向上实现：

```
1. 枚举 / 常量        → api 模块（如有新增状态码）
2. DTO / VO           → api 模块（请求、响应对象）
3. Entity             → component 模块（如涉及新表）
4. Repository         → component 模块（数据访问）
5. Service            → component 模块（业务逻辑）
6. Controller         → app 模块（接口暴露）
7. 单元测试           → 对应模块的 test 目录
```

列出具体文件清单后，逐文件实现。

### 第四步：逐文件编码

每实现一个文件必须遵循以下规范：

#### 包路径

通过搜索已存在的同类文件动态确定，禁止写死。例如：
- Entity 放 `com.paic.pare.lmp.integrate.component.domain.entity.<领域>/`
- Repository 放 `com.paic.pare.lmp.integrate.component.domain.repository.<领域>/`
- Service 放 `com.paic.pare.lmp.integrate.component.domain.service.<领域>/`

#### Java 编码规范

```java
// 1. 构造器注入 + Lombok
@Slf4j
@Service
@RequiredArgsConstructor
public class XxxServiceImpl implements XxxService {

    private final XxxRepository xxxRepository;
    // 不要用 @Autowired 字段注入

    // 2. 方法 < 50 行，参数加 final
    public XxxDto doSomething(final String param) {
        // 3. 参数校验在方法开头
        if (StringUtils.isEmpty(param)) {
            throw new BusinessException("参数不能为空");
        }
        // 4. 使用 early return 减少嵌套
        // 5. 关键节点打日志
        log.info("处理xxx, param={}", param);
        // ...
    }
}
```

#### DTO / Entity 规范

```java
// DTO: api 模块，使用 Lombok
@Data
public class XxxRequest {
    @NotBlank(message = "名称不能为空")
    private String name;
    // 校验注解 + 中文 message
}

// Entity: component 模块
@Getter
@Entity
@Table(name = "t_xxx")
public class XxxEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    // 不写 setter，用业务方法修改字段
}
```

#### 异常处理

- 业务异常用项目已有的 `BusinessException`
- Controller 层不 try-catch，交给全局异常处理器
- Service 层只在需要转换异常类型时才 catch

### 第五步：先写测试

每个 Service/Component 方法写单元测试：

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
    }
}
```

测试命名：`should<预期行为>When<条件>`

### 第六步：自检

实现完成后逐项自检：

- [ ] 分层调用正确（Controller → Service → Repository）
- [ ] DTO 和 Entity 没有跨层混用
- [ ] 没有硬编码密钥或敏感信息
- [ ] 异常不吞掉，日志不打印敏感信息
- [ ] 使用 Lombok，构造器注入
- [ ] 方法 < 50 行，无深层嵌套
- [ ] 测试可运行且覆盖核心分支
- [ ] 包路径动态确定，没有写死

### 第七步：输出总结

```markdown
## 实现总结

**设计文档**: <文档路径>
**新增文件**:
| 模块 | 文件 | 说明 |
|------|------|------|
| api | XxxRequest.java | 请求 DTO |
| component | XxxEntity.java | 实体 |

**修改文件**:
| 文件 | 变更说明 |
|------|----------|

**待完成**:
- [ ] 集成测试
- [ ] 接口文档更新
```
