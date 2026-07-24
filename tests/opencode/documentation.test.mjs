import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");

test("OpenCode 中文文档使用固定 Git 引用并说明 npm 兜底风险", async () => {
  const source = await readFile(path.join(root, "docs", "README.opencode.md"), "utf8");
  assert.match(source, /my-cc-ext\.git#v1\.0\.10/);
  assert.match(source, /完整的? 40 位 commit/);
  assert.match(source, /Bun/);
  assert.match(source, /npm 兜底/);
  assert.doesNotMatch(source, /my-cc-ext\.git["']\s/);
});

test("OpenCode 中文文档覆盖注册、冲突和重复加载", async () => {
  const sources = await Promise.all([
    readFile(path.join(root, ".opencode", "INSTALL.md"), "utf8"),
    readFile(path.join(root, "docs", "README.opencode.md"), "utf8"),
  ]);
  const source = sources.join("\n");
  assert.match(source, /自动.*本地插件/s);
  assert.match(source, /不要再?.*(Git 包|npm 包).*plugin/s);
  assert.match(source, /skills\.paths/);
  assert.match(source, /config\.instructions/);
  assert.match(source, /config\.agent/);
  assert.match(source, /同名用户 Agent.*用户配置为准/s);
  assert.match(source, /不带前缀名称.*冲突/s);
});

test("完整 OpenCode 中文文档覆盖 Windows、升级和卸载", async () => {
  const source = await readFile(path.join(root, "docs", "README.opencode.md"), "utf8");
  assert.match(source, /Windows/);
  assert.match(source, /不需要符号链接/);
  assert.match(source, /^## 升级$/m);
  assert.match(source, /^## 卸载$/m);
});

test("main README links both platforms and preserves Claude commands and names", async () => {
  const source = await readFile(path.join(root, "readme.md"), "utf8");
  assert.match(source, /Claude Code.*OpenCode/s);
  assert.match(source, /docs\/README\.opencode\.md/);
  for (const command of [
    "/plugin marketplace add https://github.com/huhuhu-999/my-cc-ext.git",
    "/plugin install my-ext@my-cc-ext",
    "claude plugins enable my-ext",
    "/plugin uninstall my-ext@my-cc-ext",
    "claude plugins install .",
  ]) {
    assert.ok(source.includes(command), `README.md is missing ${command}`);
  }
  for (const name of ["db-ops", "cc-ext-dev", "feature-dev", "superpowers-planner"]) {
    assert.ok(source.includes(`| \`${name}\` |`), `README.md is missing ${name}`);
  }
});

test("main README gives agents an executable OpenCode user-level installation workflow", async () => {
  const source = await readFile(path.join(root, "readme.md"), "utf8");
  assert.match(source, /^## OpenCode 用户级自动安装$/m);
  assert.match(source, /Agent 应直接完成配置/);
  assert.match(source, /修改用户级配置前必须先获得用户授权/);
  assert.match(source, /%USERPROFILE%\\\.config\\opencode\\opencode\.json/);
  assert.match(source, /~\/\.config\/opencode\/opencode\.json/);
  assert.match(source, /`opencode\.json` 或 `opencode\.jsonc`/);
  assert.match(source, /my-cc-ext\.git#v1\.0\.10/);
  assert.match(source, /固定发布标签或完整 40 位 commit/);
  assert.match(source, /不得覆盖现有模型、MCP、权限、插件或其他用户配置/);
  assert.match(source, /相同条目已经存在，则保持文件不变/);
  assert.match(source, /不得退回默认分支或改用可变引用/);
  assert.match(source, /opencode debug config/);
  assert.match(source, /my-ext-feature-dev/);
  assert.match(source, /只撤销本次添加的插件条目，保留用户原有配置/);
});
