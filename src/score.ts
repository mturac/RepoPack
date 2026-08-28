import type { DiscoveredFile, RepoPackConfig, ScoreEvidence } from "./types.js";
import { matchesAny } from "./glob.js";

const roleWeights = { manifest: 18, contract: 16, migration: 14, test: 12, documentation: 8, source: 10, config: 8, other: 0 } as const;

export function taskTerms(task: string): string[] {
  return [...new Set((task.toLowerCase().match(/[a-z0-9][a-z0-9_-]+/g) ?? []).map((term) => term.replaceAll("_", "-")).filter((term) => term.length >= 2))].sort();
}

export function scoreFile(file: DiscoveredFile, terms: string[], config: RepoPackConfig): { score: number; evidence: ScoreEvidence[] } {
  const evidence: ScoreEvidence[] = [];
  const pathLower = file.path.toLowerCase();
  const contentLower = file.content.toLowerCase();
  let score = 0;
  for (const term of terms) {
    const normalized = term.replaceAll("-", "");
    const pathNormalized = pathLower.replaceAll(/[-_]/g, "");
    if (pathLower.includes(term) || pathNormalized.includes(normalized)) { score += 12; evidence.push({ kind: "path-term", value: 12, detail: term }); }
    const matches = contentLower.split(term).length - 1;
    if (matches > 0) {
      const value = Math.min(matches, 8) * 2;
      score += value;
      evidence.push({ kind: "content-term", value, detail: `${term}:${Math.min(matches, 8)}` });
    }
  }
  const roleValue = roleWeights[file.role];
  if (roleValue > 0) { score += roleValue; evidence.push({ kind: "role", value: roleValue, detail: file.role }); }
  if (matchesAny(file.path, config.priorityPaths)) { score += 25; evidence.push({ kind: "priority", value: 25, detail: file.path }); }
  if (file.dirty || file.untracked) { score += 10; evidence.push({ kind: "volatile", value: 10, detail: file.untracked ? "untracked" : "dirty" }); }
  return { score, evidence };
}
