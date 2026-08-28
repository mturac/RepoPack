import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

export async function makeRepo(files, { dirty = {}, untracked = {} } = {}) {
  const root = await mkdtemp(join(tmpdir(), "repopack-test-"));
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    await mkdir(join(full, ".."), { recursive: true });
    await writeFile(full, content, "utf8");
  }
  run(root, "git", ["init", "-b", "main"]);
  run(root, "git", ["config", "user.email", "tests@example.com"]);
  run(root, "git", ["config", "user.name", "RepoPack Tests"]);
  run(root, "git", ["add", "."]);
  run(root, "git", ["commit", "-m", "fixture"]);
  for (const [path, content] of Object.entries(dirty)) await writeFile(join(root, path), content, "utf8");
  for (const [path, content] of Object.entries(untracked)) {
    const full = join(root, path);
    await mkdir(join(full, ".."), { recursive: true });
    await writeFile(full, content, "utf8");
  }
  return root;
}

export function run(cwd, command, args) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}
