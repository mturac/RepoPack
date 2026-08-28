import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { makeRepo } from "./helpers.mjs";

test("CLI builds JSON and Markdown artifacts", async () => {
  const repo = await makeRepo({ "README.md": "# Demo", "src/billing.ts": "export const billing = true;" });
  const outDir = await mkdtemp(join(tmpdir(), "repopack-cli-"));
  const jsonOut = join(outDir, "bundle.json");
  const mdOut = join(outDir, "bundle.md");
  const result = spawnSync(process.execPath, ["bin/repopack.mjs", "build", repo, "--task", "billing", "--out", jsonOut, "--markdown-out", mdOut], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const bundle = JSON.parse(await readFile(jsonOut, "utf8"));
  assert.equal(bundle.files.some((file) => file.path === "src/billing.ts"), true);
  assert.match(await readFile(mdOut, "utf8"), /RepoPack Context Bundle/);
});
