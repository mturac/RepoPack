import test from "node:test";
import assert from "node:assert/strict";
import { compareBundles } from "../dist/index.js";

function bundle(hash, paths) {
  return {
    schemaVersion: "1",
    createdAt: "deterministic",
    repository: { head: "abc", dirty: false },
    task: { hash: "task", terms: ["billing"] },
    budget: { limitTokens: 100, usedTokens: 20 },
    files: paths.map((path) => ({ path, content: path, contentHash: path, score: 1, scoreEvidence: [], estimatedTokens: 1, volatility: "stable", role: "source", truncated: false })),
    omitted: [], findings: [], dependencies: [], bundleHash: hash
  };
}

test("compareBundles reports selected-file drift", () => {
  const result = compareBundles(bundle("sha256:a", ["a.ts", "b.ts"]), bundle("sha256:b", ["b.ts", "c.ts"]));
  assert.deepEqual(result.addedFiles, ["c.ts"]);
  assert.deepEqual(result.removedFiles, ["a.ts"]);
  assert.equal(result.changed, true);
});
