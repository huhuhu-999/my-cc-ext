import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export const repositoryRoot = path.resolve(import.meta.dirname, "../..");

export async function createHookFixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), "my-ext-hook-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cwd = path.join(root, "project with spaces");
  const kb = path.join(root, "knowledge base");
  await mkdir(path.join(cwd, ".git"), { recursive: true });
  await mkdir(path.join(kb, "projects"), { recursive: true });
  const registry = async (rows) => writeFile(path.join(kb, "projects/index.md"), [
    "| 项目标识 | 项目名称 | 代码目录 | 状态 |",
    "| --- | --- | --- | --- |",
    ...rows.map(([id, directory]) => `| ${id} | Project | \`${directory}\` | active |`),
  ].join("\n"));
  await registry([["fixture", cwd]]);
  return { root, cwd, kb, registry };
}

export function runHook({ cwd, kb = "", platform = "codex", input, command, pluginRoot = repositoryRoot }) {
  const args = command
    ? ["-NoProfile", "-NonInteractive", "-Command", command]
    : ["-NoProfile", "-NonInteractive", "-File", path.join(pluginRoot, "hooks/kb-project-detect.ps1"), "-Platform", platform];
  const usePosixShell = command && process.platform !== "win32";
  const result = spawnSync(usePosixShell ? "sh" : "pwsh", usePosixShell ? ["-c", command] : args, {
    cwd,
    env: { ...process.env, KB_ROOT: kb, PLUGIN_ROOT: pluginRoot, CLAUDE_PLUGIN_ROOT: pluginRoot },
    input: input ?? JSON.stringify({ cwd, hook_event_name: "UserPromptSubmit", prompt: "fixture" }),
    encoding: "utf8",
    timeout: 15000,
    windowsHide: true,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  return result.stdout.trim() ? JSON.parse(result.stdout) : null;
}

export function assertProject(result, id) {
  assert.equal(result?.hookSpecificOutput?.hookEventName, "UserPromptSubmit");
  assert.ok(result.hookSpecificOutput.additionalContext.includes(`项目 [${id}]`), JSON.stringify(result));
  assert.equal(result.decision, undefined);
}
