import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const { version } = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function listDirectories(relativePath) {
  const entries = await readdir(path.join(root, relativePath), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

// Frontmatter 只使用标量与字符串列表两类字段，这里做最小解析，不引入 YAML 依赖。
function parseFrontmatter(source, file) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) throw new Error(`${file}: missing frontmatter block`);
  const fields = {};
  let list = null;
  for (const rawLine of match[1].split(/\r?\n/)) {
    const listItem = /^\s+-\s+(.+?)\s*$/.exec(rawLine);
    if (listItem && list) {
      list.push(listItem[1]);
      continue;
    }
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(rawLine);
    if (!kv) continue;
    const value = kv[2].trim();
    if (value === "") {
      list = [];
      fields[kv[1]] = list;
    } else {
      list = null;
      fields[kv[1]] = value;
    }
  }
  return fields;
}

test("Claude 插件清单字段完整且版本与 package.json 一致", async () => {
  const plugin = await readJson(".claude-plugin/plugin.json");
  for (const field of ["name", "version", "description"]) {
    assert.ok(
      typeof plugin[field] === "string" && plugin[field].trim(),
      `plugin.json needs a nonempty ${field}`,
    );
  }
  assert.equal(plugin.version, version, "plugin.json version must match package.json");

  const marketplace = await readJson(".claude-plugin/marketplace.json");
  const entry = (marketplace.plugins ?? []).find((item) => item.name === plugin.name);
  assert.ok(entry, `marketplace.json has no entry named ${plugin.name}`);
  assert.equal(entry.version, version, "marketplace entry version must match package.json");
});

test("每个 SKILL.md 的 name 与目录一致且 description 非空", async () => {
  const names = await listDirectories("skills");
  assert.ok(names.length > 0, "skills/ contains no skill directories");
  for (const name of names) {
    const file = `skills/${name}/SKILL.md`;
    const fields = parseFrontmatter(await readFile(path.join(root, file), "utf8"), file);
    assert.equal(fields.name, name, `${file}: name must equal its directory name`);
    assert.ok(
      typeof fields.description === "string" && fields.description.trim(),
      `${file}: description is required`,
    );
  }
});

test("每个 AGENT.md 的 frontmatter 合法（model / tools / permissionMode）", async () => {
  const allowedModes = new Set(["default", "acceptEdits", "bypassPermissions", "plan"]);
  const names = await listDirectories("agents");
  assert.ok(names.length > 0, "agents/ contains no agent directories");
  for (const name of names) {
    const file = `agents/${name}/AGENT.md`;
    const fields = parseFrontmatter(await readFile(path.join(root, file), "utf8"), file);
    assert.equal(fields.name, name, `${file}: name must equal its directory name`);
    assert.ok(
      typeof fields.description === "string" && fields.description.trim(),
      `${file}: description is required`,
    );
    assert.ok(
      Array.isArray(fields.tools) && fields.tools.length > 0,
      `${file}: tools must be a nonempty list`,
    );
    const model = fields.model;
    assert.ok(
      typeof model === "string" && (model === "inherit" || /^claude-[a-z0-9.-]+$/.test(model)),
      `${file}: model must be "inherit" or a claude-* id, got ${model}`,
    );
    assert.ok(
      allowedModes.has(fields.permissionMode),
      `${file}: permissionMode must be one of ${[...allowedModes].join(" | ")}`,
    );
  }
});

test("hooks.json 结构合法且引用的脚本文件存在", async () => {
  const hooks = await readJson("hooks/hooks.json");
  const events = hooks.hooks ?? {};
  const eventNames = Object.keys(events);
  assert.ok(eventNames.length > 0, "hooks.json defines no hook events");
  for (const event of eventNames) {
    for (const group of events[event]) {
      for (const hook of group.hooks ?? []) {
        assert.equal(hook.type, "command", `${event}: only command hooks are supported here`);
        const texts = [hook.command, ...(hook.args ?? [])].filter((value) => typeof value === "string");
        assert.ok(texts.length > 0, `${event}: hook needs a command`);
        for (const text of texts) {
          for (const match of text.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^\s"']+)/g)) {
            const target = path.join(root, match[1]);
            await access(target).catch(() => {
              assert.fail(`${event}: referenced file is missing: ${match[1]}`);
            });
          }
        }
      }
    }
  }
});
