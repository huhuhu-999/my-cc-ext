import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { assertProject, createHookFixture, repositoryRoot, runHook } from "../helpers/kb-hook.mjs";

test("Codex explicitly selects its own runnable prompt hook", async (t) => {
  const manifest = JSON.parse(await readFile(path.join(repositoryRoot, ".codex-plugin/plugin.json"), "utf8"));
  assert.equal(manifest.hooks, "./codex/hooks.json");
  const config = JSON.parse(await readFile(path.join(repositoryRoot, manifest.hooks), "utf8"));
  assert.deepEqual(Object.keys(config.hooks), ["UserPromptSubmit"]);
  const [group] = config.hooks.UserPromptSubmit;
  const [hook] = group.hooks;
  assert.equal(hook.type, "command");
  assert.equal(hook.args, undefined, "arguments belong in the command string");
  assert.ok(!hook.command.includes("CLAUDE_PLUGIN_ROOT"));
  const fixture = await createHookFixture(t);
  await writeFile(path.join(fixture.cwd, "AGENTS.md"), `知识库根：\`${fixture.kb}\``);
  assertProject(runHook({ cwd: fixture.cwd, command: hook.command }), "fixture");
});

test("prompt hook isolates project instruction sources for Codex and Claude", async (t) => {
  const fixture = await createHookFixture(t);
  await writeFile(path.join(fixture.cwd, "AGENTS.md"), `知识库根：\`${fixture.kb}\``);
  assertProject(runHook({ cwd: fixture.cwd, platform: "codex" }), "fixture");
  assert.equal(runHook({ cwd: fixture.cwd, platform: "claude" }), null);
  await writeFile(path.join(fixture.cwd, "CLAUDE.md"), `知识库根：\`${fixture.kb}\``);
  await writeFile(path.join(fixture.cwd, "AGENTS.md"), "No knowledge base configured.");
  assertProject(runHook({ cwd: fixture.cwd, platform: "claude" }), "fixture");
  assert.equal(runHook({ cwd: fixture.cwd, platform: "codex" }), null);
});

test("Codex finds ancestor instructions and honors the nearest override and explicit environment", async (t) => {
  const fixture = await createHookFixture(t);
  const nested = path.join(fixture.cwd, "src");
  await mkdir(nested);
  await writeFile(path.join(fixture.cwd, "AGENTS.md"), `知识库根：\`${fixture.kb}\``);
  assertProject(runHook({ cwd: nested }), "fixture");
  await writeFile(path.join(nested, "AGENTS.override.md"), `知识库根：\`${path.join(fixture.root, "absent")}\``);
  assert.equal(runHook({ cwd: nested }), null);
  assertProject(runHook({ cwd: nested, kb: fixture.kb }), "fixture");
});

test("registry matching uses directory boundaries and selects the most specific multi-path entry", async (t) => {
  const fixture = await createHookFixture(t);
  const nested = path.join(fixture.cwd, "src");
  await fixture.registry([
    ["parent", fixture.cwd],
    ["nested", `${path.join(fixture.root, "other")}；${nested}`],
  ]);
  assertProject(runHook({ ...fixture, input: JSON.stringify({ cwd: path.join(nested, "child") }) }), "nested");
  assertProject(runHook({ ...fixture, input: JSON.stringify({ cwd: fixture.cwd }) }), "parent");
  assert.equal(runHook({ ...fixture, input: JSON.stringify({ cwd: `${fixture.cwd}-other` }) }), null);
});

test("registry supports Windows and POSIX paths with their own case semantics", async (t) => {
  const fixture = await createHookFixture(t);
  await fixture.registry([["windows", "C:\\Work\\Project"], ["posix", "/work/Project"]]);
  assertProject(runHook({ ...fixture, input: JSON.stringify({ cwd: "c:/work/project/src" }) }), "windows");
  assertProject(runHook({ ...fixture, input: JSON.stringify({ cwd: "/work/Project/src" }) }), "posix");
  assert.equal(runHook({ ...fixture, input: JSON.stringify({ cwd: "/work/project/src" }) }), null);
});

test("missing registry and malformed event input are non-blocking and silent", async (t) => {
  const fixture = await createHookFixture(t);
  assert.equal(runHook({ ...fixture, kb: path.join(fixture.root, "absent") }), null);
  assert.equal(runHook({ ...fixture, input: "not-json" }), null);
  assert.equal(runHook({ ...fixture, input: JSON.stringify({ cwd: 42 }) }), null);
});
