import { assertBundle } from "./validation.js";
import type { BundleComparison, RepoPackBundle } from "./types.js";

export function compareBundles(before: RepoPackBundle, after: RepoPackBundle): BundleComparison {
  assertBundle(before); assertBundle(after);
  const beforeMap = new Map(before.files.map((file) => [file.path, file.contentHash]));
  const afterMap = new Map(after.files.map((file) => [file.path, file.contentHash]));
  const addedFiles = [...afterMap.keys()].filter((path) => !beforeMap.has(path)).sort();
  const removedFiles = [...beforeMap.keys()].filter((path) => !afterMap.has(path)).sort();
  const contentChangedFiles = [...afterMap.keys()].filter((path) => beforeMap.has(path) && beforeMap.get(path) !== afterMap.get(path)).sort();
  const budgetDeltaTokens = after.budget.usedTokens - before.budget.usedTokens;
  return { changed: before.bundleHash !== after.bundleHash, beforeHash: before.bundleHash, afterHash: after.bundleHash, addedFiles, removedFiles, contentChangedFiles, budgetDeltaTokens };
}
