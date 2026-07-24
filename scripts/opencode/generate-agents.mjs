import { createHash, randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AGENT_MAPPINGS, COMMON_REPLACEMENTS, PERMISSION_BASELINE } from "./agent-mappings.mjs";

function normalize(source) {
  return source.replaceAll("\r\n", "\n");
}

function parseClaudeAgent(source, file) {
  const normalized = normalize(source);
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${file}: invalid Claude agent frontmatter`);
  const frontmatterLines = match[1].split("\n");
  const name = match[1].match(/^name:\s*(.+)$/m)?.[1].trim();
  const descriptionFields = [...match[1].matchAll(/^description:(.*)$/gm)];
  const description = descriptionFields[0]?.[1].trim();
  const descriptionIndex = frontmatterLines.findIndex((line) => line.startsWith("description:"));
  let hasDescriptionContinuation = false;
  for (const line of frontmatterLines.slice(descriptionIndex + 1)) {
    if (line && !/^\s/.test(line)) break;
    if (/^\s+\S/.test(line)) {
      hasDescriptionContinuation = true;
      break;
    }
  }
  if (!name) throw new Error(`${file}: missing name`);
  if (descriptionFields.length !== 1 || !description || /^[>|][+-]?$/.test(description) || hasDescriptionContinuation) {
    throw new Error(`${file}: source must have one nonempty single-line description`);
  }
  return { name, description, body: match[2].trim() };
}

function replaceAllLiteral(source, replacements) {
  return replacements.reduce((value, [from, to]) => value.replaceAll(from, to), source);
}

function stripTrailingWhitespace(source) {
  return source.replace(/[ \t]+$/gm, "");
}

export function generateAgent(source, mapping) {
  const parsed = parseClaudeAgent(source, mapping.source);
  const digest = createHash("sha256").update(normalize(source)).digest("hex");
  const permission = {
    ...PERMISSION_BASELINE,
    bash: { ...PERMISSION_BASELINE.bash },
    task: Object.fromEntries([["*", "deny"], ...mapping.taskAllow.map((name) => [name, "allow"])]),
  };
  const body = stripTrailingWhitespace(
    replaceAllLiteral(parsed.body, [...COMMON_REPLACEMENTS, ...mapping.replacements]),
  );
  return [
    "---",
    `name: ${mapping.name}`,
    `description: ${JSON.stringify(parsed.description)}`,
    "mode: subagent",
    `permission: ${JSON.stringify(permission)}`,
    "---",
    `<!-- generated-from: ${mapping.source} -->`,
    `<!-- source-sha256: ${digest} -->`,
    "",
    body,
    "",
  ].join("\n");
}

export async function writeFileAtomically(output, content, operations = {}) {
  const write = operations.writeFile ?? writeFile;
  const move = operations.rename ?? rename;
  const remove = operations.rm ?? rm;
  const temporary = path.join(
    path.dirname(output),
    `.${path.basename(output)}.${process.pid}.${randomUUID()}.tmp`,
  );

  try {
    await write(temporary, content, { encoding: "utf8", flag: "wx" });
    await move(temporary, output);
  } catch (error) {
    await remove(temporary, { force: true }).catch((cleanupError) => {
      error.cleanupError = cleanupError;
    });
    throw error;
  }
}

export async function generateAll(root) {
  return Promise.all(AGENT_MAPPINGS.map(async (mapping) => ({
    mapping,
    content: generateAgent(await readFile(path.join(root, mapping.source), "utf8"), mapping),
  })));
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const check = process.argv.includes("--check");
  const generated = await generateAll(root);
  const drift = [];
  for (const item of generated) {
    const output = path.join(root, item.mapping.output);
    if (check) {
      const current = await readFile(output, "utf8").catch(() => "");
      if (normalize(current) !== item.content) drift.push(item.mapping.output);
    } else {
      await writeFileAtomically(output, item.content);
    }
  }
  if (drift.length) {
    for (const file of drift) console.error(`generated agent drift: ${file}`);
    process.exitCode = 1;
  } else {
    console.log(check ? "generated agents are current" : `generated ${generated.length} OpenCode agents`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

export { AGENT_MAPPINGS, PERMISSION_BASELINE };
