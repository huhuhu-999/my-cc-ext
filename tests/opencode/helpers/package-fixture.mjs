import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");

export async function createPackageFixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), "my-ext-opencode-"));
  const cleanup = () => rm(root, { recursive: true, force: true });
  t.after(cleanup);

  try {
    await mkdir(path.join(root, ".opencode", "plugins"), { recursive: true });
    await cp(path.join(repositoryRoot, ".opencode", "plugins", "my-ext.js"), path.join(root, ".opencode", "plugins", "my-ext.js"));
    await cp(path.join(repositoryRoot, ".opencode", "agents"), path.join(root, ".opencode", "agents"), { recursive: true });
    await cp(path.join(repositoryRoot, ".opencode", "bootstrap.md"), path.join(root, ".opencode", "bootstrap.md"));
    await mkdir(path.join(root, "skills"));
    await writeFile(path.join(root, "package.json"), '{"type":"module"}\n');
    return root;
  } catch (error) {
    await cleanup();
    throw error;
  }
}

export async function importPlugin(root) {
  const url = pathToFileURL(path.join(root, ".opencode", "plugins", "my-ext.js"));
  url.searchParams.set("fixture", `${Date.now()}-${Math.random()}`);
  return import(url.href);
}
