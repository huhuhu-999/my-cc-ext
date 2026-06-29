-- ----------------------------
-- lmp.<table_name> 新增字段
-- ----------------------------
ALTER TABLE lmp.<table_name> ADD COLUMN IF NOT EXISTS <column_name> <type> <constraint>;
COMMENT ON COLUMN lmp.<table_name>."<column_name>" IS '<注释>';

-- ----------------------------
-- lmp.<table_name> 修改列类型
-- ----------------------------
ALTER TABLE lmp.<table_name> ALTER COLUMN <column_name> TYPE <new_type>;
COMMENT ON COLUMN lmp.<table_name>."<column_name>" IS '<新注释>';

-- 注意：ALTER TABLE 不需要重复 GRANT，权限已在建表时授予。
