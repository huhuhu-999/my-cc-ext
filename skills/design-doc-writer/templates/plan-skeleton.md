# 实施计划（Plan）模板

> 用法：superpowers-planner 编写 `doc/features/<feature-name>/<yyyy-MM-dd>-<sub-feature>-plan.md` 前，必须先用 Read 读取本文件，按以下模板输出任务与波次。

## 计划文档头部

```markdown
# <功能名称> 实施计划

> **设计文档**: doc/features/<feature-name>/<yyyy-MM-dd>-<sub-feature>-design.md
> **目标**: <一句话>
> **架构**: <2-3 句话>
> **技术栈**: <按 CLAUDE.md 实际探测结果>

---
```

## 文件结构映射

在定义任务之前，明确每个文件：

```markdown
创建：
  <api-module>/src/main/java/.../XxxRequest.java    — 请求 DTO
  <api-module>/src/main/java/.../XxxResponse.java   — 响应 DTO
  ...

修改：
  <app-module>/src/main/java/.../XxxController.java:80-120  — 新增接口方法
  ...

测试：
  <test-module>/src/test/java/.../XxxServiceTest.java
  ...
```

## 任务粒度模板

每个任务是一个动作（2-5 分钟），格式：

````markdown
### 任务 N：<任务名>

**文件：**
- 创建：`exact/path/to/NewFile.java`
- 修改：`exact/path/to/Existing.java:80-120`
- 测试：`exact/path/to/Test.java`

- [ ] **步骤 1：编写失败测试**

```java
package com.xxx.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TemplateValidationServiceTest {

    private final TemplateValidationService service = new TemplateValidationService();

    @Test
    void shouldReturnErrorWhenTemplateMismatch() {
        TemplateValidationResult result = service.validate("invalid_template.xlsx", "OPERATOR_IMPORT");

        assertThat(result.isMatched()).isFalse();
        assertThat(result.getCheckMsg()).contains("模板不符合");
    }
}
```

- [ ] **步骤 2：运行测试验证失败**

```bash
mvn -pl pare-lmp-integrate-component -am test -Dtest=XxxServiceTest#shouldReturnErrorWhenTemplateMismatch
```
预期：FAIL

- [ ] **步骤 3：编写最小实现**

```java
package com.xxx.service;

public class TemplateValidationService {

    public TemplateValidationResult validate(final String fileName, final String expectedTemplateCode) {
        if (!"operator_import_template.xlsx".equals(fileName) || !"OPERATOR_IMPORT".equals(expectedTemplateCode)) {
            return new TemplateValidationResult(false, "模板不符合");
        }
        return new TemplateValidationResult(true, "模板校验通过");
    }
}
```

```java
package com.xxx.service;

public class TemplateValidationResult {

    private final boolean matched;
    private final String checkMsg;

    public TemplateValidationResult(final boolean matched, final String checkMsg) {
        this.matched = matched;
        this.checkMsg = checkMsg;
    }

    public boolean isMatched() {
        return matched;
    }

    public String getCheckMsg() {
        return checkMsg;
    }
}
```

- [ ] **步骤 4：运行测试验证通过**

```bash
mvn -pl pare-lmp-integrate-component -am test -Dtest=XxxServiceTest#shouldReturnErrorWhenTemplateMismatch
```
预期：PASS

- [ ] **步骤 5：提交**

```bash
git add src/test/.../XxxServiceTest.java src/main/.../XxxServiceImpl.java
git commit -m "feat(xxx): add template validation"
```
````

## 并行执行波次模板

```markdown
## 执行波次

### Wave 1 (Foundation) — 并行
├── Task 1: DDL 和实体
├── Task 2: 枚举和常量
└── Task 3: DTO 定义

### Wave 2 (Persistence + Logic) — 依赖 Wave 1
├── Task 4: Mapper 实现 (depends: 1)
├── Task 5: Excel 解析 (depends: 3)
└── Task 6: 业务写入 (depends: 1,4)

### Wave 3 (API + Integration) — 依赖 Wave 2
├── Task 7: Controller 接口 (depends: 3,5,6)
└── Task 8: 集成测试 (depends: 5,6,7)

### Wave FINAL — 审查
├── F1: 计划合规审计
├── F2: 代码质量审查
├── F3: 端到端 QA
└── F4: 范围一致性检查
```
