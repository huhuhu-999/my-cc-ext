# EXAMPLES — 文档骨架、单接口模板与完整示例

> 每个接口固定四块：**入参表 → 出参表 → 示例（请求 + 成功 + 失败） → 错误码表**；嵌套对象与 `List<Xxx>` 元素另起小表，编号按 Controller 端点出现顺序。规则与落盘约定见 [SKILL.md](SKILL.md)。

## 一、文档头部（文首元信息）

````markdown
# 物品放行 - 接口文档

> 状态：draft
> 当前版本：v1.0
> 最近更新：2026-10-09
> 对应后端：`com.paic.pare.lmp.app.app.controller.WxminiReleaseController`
> 请求前缀：`/wmini/wxrelease`（`/wmini` 为上下文路径）
> 请求头：`accessToken: Bearer <token>`（全部接口均需登录，无免登录接口）
> ⚠ 编号口径：本文件按**页面顺序**编号 §1~§11；与 design 的「接口 1~11」功能顺序不同，**文内引用一律用路径**。

**版本历史**

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| **v1.0** | 2026-09-21 | 建立版本记录机制；`authSubmit` 认证单被驳回后重新提交改为**生成新单号**。 |
| **v1.1** | 2026-09-21 | `GET /wxrelease/authInfo` 出参新增 `buildingId`、`blockId` 等；`projectName` 改名 `buildingName`。 |

---

## 1. 提交企业租户认证
…
````

要点：请求前缀由 context-path + 类级映射拼出；请求头写清鉴权方式与是否免登录；版本历史只写「变了什么」。无外部编号歧义时，「编号口径」一行可省。

## 二、单接口模板

````markdown
## N. 接口中文名

**POST** `/wmini/xxx/apply`

> 一句话说明（可选；多条业务规则可写成多行 blockquote）

### 入参

| 字段 | 类型 | 必填 | 说明 |
| --- | --- |:---:| --- |
| `name` | String | 是 | 申请人姓名 |
| `goodsList` | List&lt;GoodsItem&gt; | 是 | 物品明细，见下方「元素结构」 |

**`goodsList` 元素结构**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- |:---:| --- |
| `goodsName` | String | 是 | 物品名称 |

> 入参字段多时，用 `#### 位置与企业` / `#### 申请内容` 这样的小节按业务域拆成多张表

### 出参

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `flowNo` | String | 申请单号 |
| `id` | String | 主键（Long，超 15 位输出字符串） |

### 示例

**请求**

```json
{ "name": "张三", "goodsList": [ { "goodsName": "电脑" } ] }
```

**成功响应**

```json
{ "code": "SUC0001", "message": "", "object": { "flowNo": "FX20260920-A7K2Q9", "id": "123" } }
```

**失败响应**

```json
{ "code": "LMP2001", "message": "物品明细不能为空", "object": "" }
```

### 错误码

| 错误码 | 文案 | 触发条件 |
| --- | --- | --- |
| `LMP2001` | 物品明细不能为空 | `goodsList` 为空 |
| `401` | 请先登录 | 未携带或无法解析 accessToken |
| `402` | 登录已失效，请重新登陆 | token 过期 |

> ⚠️ 成功码 `SUC0001` 不代表一定有数据，前端需判断 `object.flowNo` 是否为空。
````

## 三、完整示例

### 例 1：带分组的提交接口（含空数组出参说明）

````markdown
## 4. 查询租赁位置与租期

**GET** `/wxrelease/rentUnitInfo`

> 按「项目 + 企业」返回该企业的**全部租赁位置与租期**；同一合同下可能有多个单元，故返回**列表**。

### 入参

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| `buildingId` | Long | 是 | 项目id |
| `tenantId` | Long | 是 | 企业id |

### 出参

`object` 为**数组**，元素结构如下：

| 字段 | 类型 | 说明 |
|------|------|------|
| `blockId` | Long | 楼栋id |
| `blockName` | String | 楼栋名称 |
| `floorNo` | String | 楼层编号 |
| `unitNo` | String | 单元编号 |
| `leaseStartDate` | String | 租期开始日期 |

### 示例

**请求**

```
GET /wxrelease/rentUnitInfo?buildingId=1&tenantId=10086
```

**成功响应**

```json
{
  "code": "SUC0001",
  "message": "",
  "object": [
    { "blockId": 2, "blockName": "A座", "floorNo": "28F", "unitNo": "2806", "leaseStartDate": "2026-01-01" }
  ]
}
```

**无匹配数据**

```json
{ "code": "SUC0001", "message": "", "object": [] }
```

> 查不到记录时返回**空数组**（非 `null`），且 **`code` 仍为 `SUC0001`** —— 需判数组是否为空。

| 错误码 | 文案 | 触发条件 |
|--------|------|---------|
| `401` | 请先登录 | 未携带 token |
| `402` | 登录已失效，请重新登陆 | token 过期 |
````

### 例 2：带有条件必填与多文案错误码的提交接口

````markdown
## 4. 提交放行申请（新增 / 修改 / 重新申请共用）

**POST** `/wxrelease/applySubmit`

> **新增、修改、重新申请共用同一接口**，由请求参数 `flowNo` 区分：
> - 新增：**不传** `flowNo`
> - 修改：传 `flowNo`，且源单状态为「已通过」→ 服务端作废源单
> - 重新申请：传 `flowNo`，且源单状态为「已拒绝」/「已取消」→ 不动源单；其余状态拒绝（`LMP2001`）

### 入参

#### 位置与企业

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| `buildingId` | Long | 是 | 项目id |
| `tenantName` | String | 是 | 企业名称，最大 200 字，默认带出认证企业 |

#### 申请内容

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| `ownerType` | String | 是 | 物品所有权：`INTERNAL` / `EXTERNAL` / `CONSTRUCTOR` |
| `contractorName` | String | 条件 | **`ownerType = CONSTRUCTOR` 时必填**，最大 200 字 |
| `goodsList` | List&lt;Object&gt; | 是 | 物品明细，**至少 1 条**，见下方「元素结构」 |

**`goodsList` 元素结构**

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| `goodsName` | String | 是 | 物品名称，最大 100 字 |
| `fileKeyList` | List&lt;附件项&gt; | 否 | 本条物品的附件，**最多 10 个**（附件项结构见附录 B） |

#### 修改 / 重新申请专用

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| `flowNo` | String | 否 | **源申请单号**；修改/重新申请时传，新增时不传 |

### 出参

| 字段 | 类型 | 说明 |
|------|------|------|
| `object` | String | **申请单号**，可用于 `GET /wxrelease/applyDetail` / `POST /wxrelease/applyCancel` |

### 示例

**请求 — 新增申请**

```json
{
  "buildingId": 1,
  "ownerType": "INTERNAL",
  "goodsList": [ { "goodsName": "办公桌椅" } ],
  "flowNo": ""
}
```

**成功响应**

```json
{ "code": "SUC0001", "message": "", "object": "FX20260920-A7K2Q9" }
```

**失败响应**

```json
{ "code": "LMP2001", "message": "物品进出日期最长可选择3天" }
```

### 错误码

| 错误码 | 文案 | 触发条件 |
|--------|------|---------|
| `LMP2001` | 请填写施工单位名称 | `ownerType = CONSTRUCTOR` 但 `contractorName` 为空 |
| `LMP2001` | 物品进出日期最长可选择3天 | 日期跨度超过 3 个自然日 |
| `LMP2001` | 请选择货梯放行方式 | `liftMode` 缺失或取值非 `SINGLE` / `LONG` |
| `LMP2002` | 所选货梯时间段已失效，请重新选择 | 所选时段已停用或被重新切分 |
| `401` | 请先登录 | 未携带 token |
| `402` | 登录已失效，请重新登陆 | token 过期 |
````

### 例 3：非统一响应体包裹的接口

````markdown
## 8. 生成通行二维码图片

**GET** `/wxrelease/qrcodeRelease`

> 后端生成微信小程序码图片，供门岗扫码进入核销页。

**入参**

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| `flowNo` | String | 是 | 申请单号 |

**出参**：`String` —— 小程序码图片的 **Base64 文本**（**非 `JsonResult` 包裹**；失败时返回统一错误响应体）

### 示例

**请求**

```
GET /wxrelease/qrcodeRelease?flowNo=FX20260920-A7K2Q9
```

**成功响应** —— 直接返回图片 Base64 文本（**不是 JSON**）

```
iVBORw0KGgoAAAANSUhEUgAAAUAAAADwCAYAAABxLb1rAAAgAElEQVR4nO3dd3hUVfrA8e...
```

> 前端拼成 data URI（`data:image/png;base64,{返回文本}`）交给 `<image>` 渲染，**无需再解码 JSON**。

**失败响应** —— 走统一响应体

```json
{ "code": "LMP2001", "message": "该申请当前无有效通行二维码", "object": "" }
```

**错误码**

| 码值 | 文案 | 触发条件 |
|------|------|---------|
| `LMP2001` | 该申请当前无有效通行二维码 | 申请状态非「已通过」/「已放行」 |
````
