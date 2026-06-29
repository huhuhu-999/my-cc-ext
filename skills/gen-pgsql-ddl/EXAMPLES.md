# EXAMPLES — DDL 范例

## 示例 1：建表 + 改表组合

来自 `委外-物业三表数据同步记录` 需求。

### 新建表

```sql
-- =============================================
-- 委外-物业三表数据同步记录表 - DDL
-- 创建时间: 2026-06-25
-- =============================================

-- ----------------------------
-- 新建表 lmp.outsrc_property_data_sync
-- ----------------------------
DROP TABLE IF EXISTS lmp.outsrc_property_data_sync;
CREATE TABLE lmp.outsrc_property_data_sync
(
    id                   bigserial,
    system_id            varchar(100)  NOT NULL,
    building_no          varchar(100)  NOT NULL,
    building_name        varchar(200)  DEFAULT NULL,
    report_type          varchar(100)  NOT NULL,
    fill_time            varchar(20)   NOT NULL,
    unit                 varchar(50)   DEFAULT '人民币',
    attachment_list      text          DEFAULT NULL,
    integrate_record_id  varchar(200)  DEFAULT NULL,
    created_date         timestamp(6)  DEFAULT now(),
    created_by           varchar(50)   DEFAULT 'system',
    updated_date         timestamp(6)  DEFAULT now(),
    updated_by           varchar(50)   DEFAULT 'system',
    is_delete            int2          DEFAULT 0,
    CONSTRAINT "outsrc_property_data_sync_pkey" PRIMARY KEY ("id")
);

COMMENT ON COLUMN lmp.outsrc_property_data_sync."id"                  IS '主键';
COMMENT ON COLUMN lmp.outsrc_property_data_sync."system_id"           IS '运营商系统编码';
COMMENT ON COLUMN lmp.outsrc_property_data_sync."building_no"         IS '项目编号';
COMMENT ON COLUMN lmp.outsrc_property_data_sync."building_name"       IS '项目名称';
COMMENT ON COLUMN lmp.outsrc_property_data_sync."report_type"         IS '报表类型(operator_balance_sheet/operator_profit_statement/operator_cash_flow)';
COMMENT ON COLUMN lmp.outsrc_property_data_sync."fill_time"           IS '填报时间，格式yyyy-MM';
COMMENT ON COLUMN lmp.outsrc_property_data_sync."unit"                IS '单位，固定：人民币';
COMMENT ON COLUMN lmp.outsrc_property_data_sync."attachment_list"     IS '附件列表JSON';
COMMENT ON COLUMN lmp.outsrc_property_data_sync."integrate_record_id" IS '关联 lmp_operator_import_record.data_number';
COMMENT ON COLUMN lmp.outsrc_property_data_sync."created_by"          IS '创建人';
COMMENT ON COLUMN lmp.outsrc_property_data_sync."created_date"        IS '创建时间';
COMMENT ON COLUMN lmp.outsrc_property_data_sync."updated_date"        IS '更新时间';
COMMENT ON COLUMN lmp.outsrc_property_data_sync."updated_by"          IS '更新人';
COMMENT ON COLUMN lmp.outsrc_property_data_sync."is_delete"           IS '是否删除(0-否;1-是)';

COMMENT ON TABLE lmp.outsrc_property_data_sync IS '委外-物业三表数据同步记录';

-- r_pabemlmpdata_dml
GRANT SELECT, UPDATE, DELETE, INSERT ON lmp.outsrc_property_data_sync TO r_pabemlmpdata_dml;
GRANT SELECT, UPDATE ON SEQUENCE lmp.outsrc_property_data_sync_id_seq TO r_pabemlmpdata_dml;

-- r_pabemlmpdata_qry
GRANT SELECT ON lmp.outsrc_property_data_sync TO r_pabemlmpdata_qry;
GRANT SELECT ON SEQUENCE lmp.outsrc_property_data_sync_id_seq TO r_pabemlmpdata_qry;
```

### 已有表新增/修改字段

```sql
-- ----------------------------
-- lmp_operator_import_record 新增字段：存储多 fileKey
-- ----------------------------
ALTER TABLE lmp.lmp_operator_import_record ADD COLUMN IF NOT EXISTS file_keys text DEFAULT NULL;
COMMENT ON COLUMN lmp.lmp_operator_import_record."file_keys" IS '多文件Key的JSON数组';

ALTER TABLE lmp.lmp_operator_import_record ALTER COLUMN file_name TYPE text;
COMMENT ON COLUMN lmp.lmp_operator_import_record."file_name" IS '上传文件名称（多附件逗号拼接）';
```

### 列类型选型说明

| 列名 | 选型 | 理由 |
|------|------|------|
| `system_id` | `varchar(100) NOT NULL` | 运营商编码，短码必填 |
| `building_no` | `varchar(100) NOT NULL` | 项目编号，短码必填 |
| `report_type` | `varchar(100) NOT NULL` | 枚举类型列，COMMENT 标注可选值 |
| `fill_time` | `varchar(20) NOT NULL` | 格式化时间 yyyy-MM，非时间戳 |
| `unit` | `varchar(50) DEFAULT '人民币'` | 固定值列，有业务默认值 |
| `attachment_list` | `text DEFAULT NULL` | JSON 数组，长文本 |
| `integrate_record_id` | `varchar(200) DEFAULT NULL` | 外键关联，COMMENT 注明来源表.列 |
