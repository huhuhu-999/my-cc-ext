# REFERENCE — 完整规则

## 生成前确认

| 项 | 规则 |
|----|------|
| schema | 必须询问用户目标 schema；SQL 中统一使用用户确认后的 schema |
| 操作模式 | 默认仅创建；删除并重建必须由用户明确确认目标环境和表名 |
| DML 授权角色 | 优先读取项目已有 DDL/配置；无法确定时询问用户；不需要授权时省略 |
| QRY 授权角色 | 优先读取项目已有 DDL/配置；无法确定时询问用户；不需要授权时省略 |
| 输出文件名 | `tmp/<yyyyMMdd>_<业务>_init.sql`，业务名使用 snake_case |

## 列定义

| 规则 | 说明 |
|------|------|
| 主键 | `id bigserial`，无 DEFAULT |
| 唯一标识列 | `varchar(200) NOT NULL` |
| 短码/类型列 | `varchar(100) NOT NULL`（如 system_id、report_type） |
| 格式化时间列 | `varchar(20) NOT NULL`（如 fill_time，格式 yyyy-MM，非 timestamp） |
| 普通文本 | `varchar(200)` 或 `varchar(500)`，`DEFAULT NULL` |
| 固定值列 | `varchar(50) DEFAULT '<固定值>'`（如 unit DEFAULT '人民币'） |
| 长文本 | `text DEFAULT NULL`（如 JSON、内容字段） |
| 外键关联列 | `varchar(200) DEFAULT NULL`（如 integrate_record_id，COMMENT 注明关联表.列） |
| 时间戳 | `timestamp(6) DEFAULT now()` |
| 审计字段 | `created_date` → `created_by` → `updated_date` → `updated_by` → `is_delete` 固定顺序 |
| 删除标记 | `int2 DEFAULT 0` |
| 对齐 | 列名、类型、约束三列对齐（列名最长 28 字符 + 2 空格后接类型） |

## COMMENT

- 每列必须有 `COMMENT ON COLUMN <schema_name>.<table_name>."<column>" IS '...'`
- 审计字段使用固定注释文案：
  - `created_by` — `'创建人'`
  - `created_date` — `'创建时间'`
  - `updated_date` — `'更新时间'`
  - `updated_by` — `'更新人'`
  - `is_delete` — `'是否删除(0-否;1-是)'`
- 枚举/类型列在注释中标注可选值：`'报表类型(operator_balance_sheet/operator_profit_statement/operator_cash_flow)'`
- 外键关联列在注释中注明关联关系：`'关联 lmp_operator_import_record.data_number'`
- `COMMENT ON TABLE` 一行描述表用途

## GRANT

授权角色必须来自项目现有约定或用户确认，不得使用与当前项目无关的硬编码默认值：

| 角色 | 表权限 | SEQUENCE 权限 |
|------|--------|---------------|
| `<dml_role>` | SELECT, UPDATE, DELETE, INSERT | SELECT, UPDATE |
| `<qry_role>` | SELECT | SELECT |

> ALTER TABLE 不需要重复 GRANT，权限已在建表时授予。

## 文件

- 存放路径：`tmp/` 目录
- 默认脚本从 `CREATE TABLE` 开始，不包含任何删除语句
- 仅在用户明确确认“删除并重建”后加入 `DROP TABLE IF EXISTS`，并在脚本头部记录目标环境和确认信息
- 文件名：`<yyyyMMdd>_<业务>_init.sql`

## 参考

- 建表和改表写法见 [EXAMPLES.md](EXAMPLES.md)
- 可复用骨架见 `template/create-table.sql` 和 `template/alter-table.sql`
