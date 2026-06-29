---
name: gen-pgsql-ddl
description: 在交付设计的时候，需要生成 PostgreSQL DDL 时使用。自动适配 schema、表名、字段列表，输出完整建表+注释+授权语句。
---

# PostgreSQL 建表 DDL 生成

## 文件结构

```
gen-pgsql-ddl/
├── SKILL.md           # 本文件（快速参考）
├── REFERENCE.md       # 列定义、COMMENT、GRANT 完整规则
├── EXAMPLES.md        # 实际 DDL 范例
└── template/          # SQL 模板（可直接复制）
    ├── create-table.sql
    └── alter-table.sql
```

## 快速开始

1. 收集用户的列定义（列名、类型、是否必填、注释）
2. 从 `template/` 复制对应模板
3. 按 REFERENCE.md 中的列定义规则替换 `<占位符>`
4. 输出到 `tmp/` 目录

## 核心规则

### 列定义速查

| 列类型 | DDL 写法 | 示例列名 |
|--------|----------|----------|
| 主键 | `id bigserial` | `id` |
| 短码/类型列 | `varchar(100) NOT NULL` | `system_id`, `report_type` |
| 唯一标识列 | `varchar(200) NOT NULL` | `building_no` |
| 格式化时间列 | `varchar(20) NOT NULL` | `fill_time`（格式 yyyy-MM） |
| 普通文本 | `varchar(200)` / `varchar(500)` `DEFAULT NULL` | `building_name` |
| 固定值列 | `varchar(50) DEFAULT '<固定值>'` | `unit DEFAULT '人民币'` |
| 长文本/JSON | `text DEFAULT NULL` | `attachment_list` |
| 外键关联列 | `varchar(200) DEFAULT NULL` | `integrate_record_id` |
| 时间戳 | `timestamp(6) DEFAULT now()` | `created_date` |
| 删除标记 | `int2 DEFAULT 0` | `is_delete` |

审计字段固定顺序：`created_date` → `created_by` → `updated_date` → `updated_by` → `is_delete`

### 格式

- 列名 snake_case，最长 28 字符，列名/类型/约束三列对齐
- 每列必须有 `COMMENT ON COLUMN`
- `COMMENT ON TABLE` 一行描述表用途

### 权限

- `r_pabemlmpdata_dml`：SELECT, UPDATE, DELETE, INSERT + SEQUENCE
- `r_pabemlmpdata_qry`：SELECT + SEQUENCE

### 文件

- 存放路径 `tmp/`，文件名 `operator_<业务>_init.sql`
- 建表脚本以 `DROP TABLE IF EXISTS` 开头
- ALTER TABLE 不需要重复 GRANT

> 完整规则见 [REFERENCE.md](REFERENCE.md)，实际范例见 [EXAMPLES.md](EXAMPLES.md)
