import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");

const requiredFiles = [
  "package.json",
  "readme.md",
  "AGENTS.md",
  ".opencode/plugins/my-ext.js",
  ".opencode/bootstrap.md",
  ".opencode/INSTALL.md",
  "docs/README.opencode.md",
  "skills/add-javadoc/scripts/scan_javadoc.py",
  "skills/add-javadoc/templates/javadoc-examples.md",
  "skills/gen-java-enum/EXAMPLES.md",
  "skills/gen-pgsql-ddl/EXAMPLES.md",
  "skills/gen-pgsql-ddl/REFERENCE.md",
  "skills/gen-pgsql-ddl/template/alter-table.sql",
  "skills/gen-pgsql-ddl/template/create-table.sql",
];

const skillNames = [
  "add-javadoc",
  "build-fix",
  "code-reviewer",
  "fix",
  "gen-java-entity",
  "gen-java-enum",
  "gen-pgsql-ddl",
  "implement-from-design",
  "tdd",
  "write-a-skill",
];

test("npm package contains production files and excludes caches, tests and development docs", () => {
  const result = spawnSync("npm", ["pack", "--json", "--dry-run"], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  assert.equal(result.status, 0, result.stderr);
  const pack = JSON.parse(result.stdout)[0];
  const files = pack.files.map((item) => item.path.replaceAll("\\", "/"));

  for (const file of [...requiredFiles, ...skillNames.map((name) => `skills/${name}/SKILL.md`)]) {
    assert.ok(files.includes(file), `package is missing ${file}`);
  }
  assert.deepEqual(
    files.filter((file) => file.startsWith(".opencode/agents/") && file.endsWith(".md")).sort(),
    [
      ".opencode/agents/my-ext-code-review.md",
      ".opencode/agents/my-ext-db-ops.md",
      ".opencode/agents/my-ext-feature-dev.md",
      ".opencode/agents/my-ext-fix.md",
      ".opencode/agents/my-ext-opencode-ext-dev.md",
      ".opencode/agents/my-ext-superpowers-planner.md",
    ],
  );

  const forbidden = files.filter((file) =>
    /(?:^|\/)(?:__pycache__|\.cache|cache)(?:\/|$)/i.test(file)
    || /\.pyc$/i.test(file)
    || /(?:^|\/)tests?(?:\/|$)/i.test(file)
    || /^docs\/superpowers(?:\/|$)/i.test(file)
    || /(?:^|\/)\.git(?:\/|$)/i.test(file)
    || /(?:^|\/)\.env(?:\.[^/]*)?$/i.test(file)
    || /\.(?:pem|key)$/i.test(file),
  );
  assert.deepEqual(forbidden, []);
  assert.equal(existsSync(path.join(root, pack.filename)), false, "npm pack --dry-run must not retain a tarball");
});
