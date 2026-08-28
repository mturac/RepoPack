import { hashCanonical, sha256 } from "./canonical.js";
import { discoverRepository } from "./files.js";
import { extractDependencies } from "./imports.js";
import { taskTerms, scoreFile } from "./score.js";
import { parseConfig } from "./validation.js";
import { RepoPackError } from "./errors.js";
import type { BuildContextOptions, BundleFile, DiscoveredFile, RepoPackBundle, RepoPackConfig, ScoreEvidence } from "./types.js";

function estimateTokens(content: string): number { return Math.max(1, Math.ceil(content.length / 4)); }

function relevantExcerpt(content: string, terms: string[], maxTokens: number): { content: string; truncated: boolean } {
  const maxChars = maxTokens * 4;
  if (content.length <= maxChars) return { content, truncated: false };
  const lower = content.toLowerCase();
  const positions = terms.flatMap((term) => {
    const out: number[] = [];
    let index = lower.indexOf(term);
    while (index >= 0 && out.length < 8) { out.push(index); index = lower.indexOf(term, index + term.length); }
    return out;
  }).sort((a, b) => a - b);
  const chunks: string[] = [];
  let remaining = maxChars;
  const add = (start: number, end: number) => {
    if (remaining <= 0) return;
    const value = content.slice(Math.max(0, start), Math.min(content.length, end));
    const slice = value.slice(0, remaining);
    if (slice && !chunks.includes(slice)) { chunks.push(slice); remaining -= slice.length; }
  };
  add(0, Math.min(content.length, Math.floor(maxChars * 0.35)));
  for (const position of positions) add(position - 500, position + 1200);
  if (remaining > 0) add(Math.max(0, content.length - remaining), content.length);
  return { content: chunks.join("\n\n/* … RepoPack excerpt boundary … */\n\n"), truncated: true };
}

function normalizeConfig(options: BuildContextOptions): RepoPackConfig {
  const base = options.config ? parseConfig(options.config) : { version: 1 as const };
  return { ...base, ...(options.budgetTokens === undefined ? {} : { budgetTokens: options.budgetTokens }) };
}

export async function buildContextBundle(options: BuildContextOptions): Promise<RepoPackBundle> {
  if (!options.task?.trim()) throw new RepoPackError("RP_TASK", "task must be a non-empty string.");
  const config = normalizeConfig(options);
  const limitTokens = config.budgetTokens ?? 60_000;
  if (!Number.isInteger(limitTokens) || limitTokens < 1) throw new RepoPackError("RP_BUDGET", "budgetTokens must be a positive integer.");
  const snapshot = await discoverRepository(options.repoPath, config);
  const terms = taskTerms(options.task);
  const dependencies = extractDependencies(snapshot.files);
  const scored = snapshot.files.map((file) => {
    const base = scoreFile(file, terms, config);
    const incomingRelevant = dependencies.filter((edge) => edge.target === file.path).some((edge) => {
      const source = snapshot.files.find((candidate) => candidate.path === edge.source);
      return source ? scoreFile(source, terms, config).score >= 20 : false;
    });
    const evidence: ScoreEvidence[] = [...base.evidence];
    let score = base.score;
    if (incomingRelevant) { score += 6; evidence.push({ kind: "dependency", value: 6, detail: "referenced-by-relevant-file" }); }
    return { file, score, evidence };
  }).sort((left, right) => right.score - left.score || left.file.path.localeCompare(right.file.path));

  const selected: BundleFile[] = [];
  const omitted = [...snapshot.omitted];
  let usedTokens = 0;
  let omittedForBudget = 0;
  const maxFileTokens = config.maxFileTokens ?? 6_000;
  for (const item of scored) {
    const remaining = limitTokens - usedTokens;
    if (remaining < 8) { omitted.push({ path: item.file.path, reason: "budget" }); omittedForBudget += 1; continue; }
    const fileCap = Math.min(maxFileTokens, remaining);
    const excerpt = relevantExcerpt(item.file.content, terms, fileCap);
    let estimatedTokens = estimateTokens(excerpt.content);
    if (estimatedTokens > remaining) {
      const shortened = relevantExcerpt(excerpt.content, terms, remaining);
      excerpt.content = shortened.content;
      excerpt.truncated = true;
      estimatedTokens = estimateTokens(excerpt.content);
    }
    if (estimatedTokens > remaining || excerpt.content.length === 0) { omitted.push({ path: item.file.path, reason: "budget" }); omittedForBudget += 1; continue; }
    selected.push({
      path: item.file.path,
      role: item.file.role,
      volatility: item.file.dirty || item.file.untracked ? "volatile" : "stable",
      content: excerpt.content,
      contentHash: `sha256:${sha256(item.file.content)}`,
      estimatedTokens,
      score: item.score,
      scoreEvidence: item.evidence,
      truncated: excerpt.truncated
    });
    usedTokens += estimatedTokens;
  }
  selected.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  omitted.sort((a, b) => a.path.localeCompare(b.path) || a.reason.localeCompare(b.reason));
  const withoutHash = {
    schemaVersion: "1" as const,
    createdAt: snapshot.commitTime ?? "unknown",
    repository: {
      name: snapshot.name,
      ...(snapshot.head ? { head: snapshot.head } : {}),
      ...(snapshot.branch ? { branch: snapshot.branch } : {}),
      dirty: snapshot.dirty,
      git: snapshot.git,
      discoveredFiles: snapshot.files.length + snapshot.omitted.length
    },
    task: { text: options.task.trim(), hash: `sha256:${sha256(options.task.trim())}`, terms },
    budget: { limitTokens, usedTokens, omittedForBudget },
    files: selected,
    omitted,
    findings: snapshot.findings,
    dependencies: dependencies.filter((edge) => selected.some((file) => file.path === edge.source) && selected.some((file) => file.path === edge.target))
  };
  return { ...withoutHash, bundleHash: hashCanonical(withoutHash) };
}
