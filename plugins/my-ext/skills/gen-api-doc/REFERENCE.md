# REFERENCE — 读代码链路细则、表格写法与类型映射

> 主流程、硬规则、坑位与落盘约定见 [SKILL.md](SKILL.md)。

## 读代码链路细则

按 **Controller → Request DTO → Response DTO → Service 实现 → 全局配置** 顺序读取，任何一环缺失都会让文档失真。

### 1. Controller：端点与路径

- **路径**：类级 `@RequestMapping`（注意常带 context-path 之外的公共前缀）与方法级 `@GetMapping` / `@PostMapping` / `@PutMapping` / `@DeleteMapping` 的 value 拼接
- **HTTP 方法**：GET / POST / PUT / DELETE
- **每个参数的来源注解**：`@RequestParam`（query / 表单）、`@RequestBody`（JSON 体）、`@PathVariable`（路径占位）、`@RequestHeader`（请求头）
  - `@RequestHeader` 与框架注入的参数（`@CurrentUser` 等，如从 token 解出的 openId）**不写进入参表**；鉴权头在文首「请求头」统一声明
- **返回类型**：读出泛型，如 `JsonResult<XxxResponse>`、`JsonResult<List<XxxResponse>>`；若返回裸类型（非 `JsonResult`），按「非统一响应体接口」处理
- **端点顺序**：按类中方法声明的**先后顺序**编号 1、2、3…；同一 Controller 内不要按键值字典序或章节重排

### 2. Request DTO

- 逐字段读 `@Schema(description = "...")` 作为说明；无注解时读字段名与注释
- 读校验注解判断约束：`@NotNull` / `@NotBlank` / `@NotEmpty` → 必填；`@Size` / `@Pattern` → 长度与格式
- 嵌套对象与 `List<Xxx>` 元素要展开，单独成表；字段多时按业务域用 `#### 分组名` 拆成多张表
- **注意**：若 Controller 参数上未启用 `@Valid`，DTO 的校验注解可能不生效（校验在 Service 手写）——此时以 Service 里的实际校验为准，并在文档中标注

### 3. Response DTO

- 逐字段读 `@Schema`；**特别注意嵌套静态类**（如 `FileUploadResponse.AttachmentUrlMeta`）与 `List<XxxResponse>` 的**元素结构**，各起一张小表，并标注所属字段
- 枚举型字段：读取对应枚举类，把完整取值集合写进「说明」列
- `object` 直接是数组时，表前注明「`object` 为数组，元素结构如下」
- 无业务数据（操作类接口）时，出参写「无业务数据 —— 成功时 `object` 为空串 `""`。」

### 4. Service 实现：错误码与文案

- 检索 `setPlaceHolder("...")`、`businessError("...")`、`new BusinessException(...)`、抛出的 `ApiException(...)` 等位置，提取**真实错误码与文案**
- 错误码表的数据**只能来自代码**；文案模板含 `%s` 时保持原样，并注明触发条件（来自哪个分支）
- **同一错误码可对应多条文案**（如统一用 `LMP2001`）：逐条拆行列出，不要合并成一行
- 平台级失败（未登录、鉴权失效）单独列出，与业务错误码区分

### 5. 全局配置

- **context-path**（如本项目 `/wmini`）→ 拼进完整路径与文首「请求前缀」
- **消息转换器的序列化行为**（见 SKILL.md「坑位提醒」）→ 影响出参写法与示例

## 表格写法细则

| 项 | 规则 |
| --- | --- |
| 字段名 | 用反引号：`` `buildingId` `` |
| 类型 | **不加**反引号：`Long`、`String`、`Boolean` |
| 泛型 | 单元格内把尖括号转义为实体：`List&lt;String&gt;`、`List&lt;附件项&gt;`（直接写 `List<String>` 会被当作 HTML 标签吃掉）；正文非表格处可写 `List<Xxx>` |
| 必需列 | 用居中 `:---:`；取值 `是` / `否` / `条件`，「条件」把依赖写进说明列 |
| 元素 / 取值小表 | 用粗体行 **`` `字段` 元素结构 ``** 或 **`` `字段` 取值 ``** 引出；入参的业务域分组用 `#### 分组名` |
| 未知说明 | 写 `—`，不臆造 |

## 类型写法（Java → 文档写法）

| Java 类型 | 文档写法 | 备注 |
| --- | --- | --- |
| `Long` / `long` | `Long` | 十进制字符串长度 > 15 时输出为字符串，标注提醒 |
| `Integer` / `int` | `Integer` | |
| `String` | `String` | |
| `Boolean` / `boolean` | `Boolean` | |
| `BigDecimal` | `Number` | 金额类注明单位与精度 |
| `LocalDate` | `String` | 格式 `yyyy-MM-dd`（如 `2026-01-01`） |
| `LocalDateTime` | `String` | 格式 `yyyy-MM-dd HH:mm:ss`（如 `2026-09-18 11:30:00`） |
| `LocalTime` | `String` | 格式 `HH:mm` / `HH:mm:ss`（如 `09:15`），纯时刻字段 |
| `List<Xxx>` | `List&lt;Xxx&gt;` | 元素结构另起小表 |
| 复杂对象 | `Object` | 附结构小表 |
