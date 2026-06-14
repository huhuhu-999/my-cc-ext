---
name: gen-pgsql-ddl
description: 在交付设计的时候，需要生成 PostgreSQL DDL 时使用。自动适配 schema、表名、字段列表，输出完整建表+注释+授权语句。
---

# PostgreSQL 建表 DDL 生成

## 适用场景

- 新增运营商导入中间表（`lmp_operator_*_mid`）
- 新增其他 `lmp.` schema 下的业务表
- 需要完整的 DDL + COMMENT + GRANT 语句

## 模板

字段列表按用户提供的列定义动态生成，禁止写死。

```sql
-- =============================================
-- <模块描述> - DDL
-- 创建时间: <yyyy-MM-dd>
-- =============================================

-- ----------------------------
-- 新建表 lmp.<table_name>
-- ----------------------------
DROP TABLE IF EXISTS lmp.<table_name>;
CREATE TABLE lmp.<table_name>
(
    id                          bigserial,
    <业务列定义，名称 snake_case，对齐>,
    import_record_data_number   varchar(36)   DEFAULT NULL,
    created_date                timestamp(6)  DEFAULT now(),
    created_by                  varchar(50)   DEFAULT 'system',
    updated_date                timestamp(6)  DEFAULT now(),
    updated_by                  varchar(50)   DEFAULT 'system',
    is_delete                   int2          DEFAULT 0,
    CONSTRAINT "<table_name>_pkey" PRIMARY KEY ("id")
);

COMMENT ON COLUMN lmp.<table_name>."id"                          IS '主键';
<COMMENT ON COLUMN ...每一列>;
COMMENT ON COLUMN lmp.<table_name>."import_record_data_number"   IS '关联导入记录dataNumber';
COMMENT ON COLUMN lmp.<table_name>."created_by"                  IS '创建人';
COMMENT ON COLUMN lmp.<table_name>."created_date"                IS '创建时间';
COMMENT ON COLUMN lmp.<table_name>."updated_date"                IS '更新时间';
COMMENT ON COLUMN lmp.<table_name>."updated_by"                  IS '更新人';
COMMENT ON COLUMN lmp.<table_name>."is_delete"                   IS '是否删除(0-否;1-是)';

COMMENT ON TABLE lmp.<table_name> IS '<表中文描述>';

-- r_pabemlmpdata_dml
GRANT SELECT, UPDATE, DELETE, INSERT ON lmp.<table_name> TO r_pabemlmpdata_dml;
GRANT SELECT, UPDATE ON SEQUENCE lmp.<table_name>_id_seq TO r_pabemlmpdata_dml;

-- r_pabemlmpdata_qry
GRANT SELECT ON lmp.<table_name> TO r_pabemlmpdata_qry;
GRANT SELECT ON SEQUENCE lmp.<table_name>_id_seq TO r_pabemlmpdata_qry;
```

## 规则

### 列定义

| 规则 | 说明 |
|------|------|
| 主键 | `id bigserial`，无 DEFAULT |
| 唯一标识列 | `varchar(200) NOT NULL` |
| 普通文本 | `varchar(200)` 或 `varchar(500)`，`DEFAULT NULL` |
| 长文本 | `text DEFAULT NULL`（如 JSON、内容字段） |
| 时间戳 | `timestamp(6) DEFAULT now()` |
| 审计字段 | `created_date` → `created_by` → `updated_date` → `updated_by` → `is_delete` 固定顺序 |
| 删除标记 | `int2 DEFAULT 0` |
| 对齐 | 列名、类型、约束三列对齐（列名最长 28 字符 + 2 空格后接类型） |

### COMMENT

- 每列必须有 `COMMENT ON COLUMN lmp.<table_name>."<column>" IS '...'`
- 审计字段使用固定注释文案
- `COMMENT ON TABLE` 一行描述表用途

### GRANT

- `r_pabemlmpdata_dml`：SELECT, UPDATE, DELETE, INSERT + SEQUENCE (SELECT, UPDATE)
- `r_pabemlmpdata_qry`：SELECT + SEQUENCE (SELECT)

### 文件

- 存放路径：`tmp/` 目录
- `DROP TABLE IF EXISTS` 开头（中间表允许重建）
- 文件名：`operator_<业务>_init.sql`

## 参考

- `tmp/operator_import_init.sql`
- `tmp/operator_cost_apply_init.sql`
- `tmp/operator_manage_flow_init.sql`
