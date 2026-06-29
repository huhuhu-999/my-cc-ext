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
