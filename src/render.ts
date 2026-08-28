import type { BundleComparison, RepoPackBundle } from "./types.js";

export function renderBundleMarkdown(bundle: RepoPackBundle): string {
  const lines = [
    "# RepoPack Context Bundle",
    "",
    `- Bundle: \`${bundle.bundleHash}\``,
    `- Repository: \`${bundle.repository.name}\`${bundle.repository.head ? ` @ \`${bundle.repository.head.slice(0, 12)}\`` : ""}`,
    `- Task: ${bundle.task.text}`,
    `- Budget: ${bundle.budget.usedTokens.toLocaleString()} / ${bundle.budget.limitTokens.toLocaleString()} estimated tokens`,
    `- Files included: ${bundle.files.length}`,
    `- Safety findings: ${bundle.findings.length}`,
    "",
    "## Selected files",
    "",
    "| Score | Role | State | Tokens | Path |",
    "|---:|---|---|---:|---|",
    ...bundle.files.map((file) => `| ${file.score} | ${file.role} | ${file.volatility} | ${file.estimatedTokens} | \`${file.path}\` |`),
    "",
    "## Selection evidence",
    "",
    ...bundle.files.map((file) => `### ${file.path}\n\n${file.scoreEvidence.map((item) => `- ${item.kind}: +${item.value} (${item.detail})`).join("\n") || "- baseline only"}`),
    "",
    "## Omitted files",
    "",
    bundle.omitted.length ? bundle.omitted.map((item) => `- \`${item.path}\`: ${item.reason}${item.detail ? ` (${item.detail})` : ""}`).join("\n") : "None.",
    "",
    "## Safety",
    "",
    bundle.findings.length ? bundle.findings.map((item) => `- ${item.code} \`${item.path ?? "<unknown>"}\` (${item.category})`).join("\n") : "No secret-risk finding was emitted.",
    "",
    "> RepoPack is a deterministic context compiler. Inclusion does not prove requirement completeness or semantic correctness.",
    ""
  ];
  return lines.join("\n");
}

export function renderComparison(comparison: BundleComparison): string {
  return [
    `RepoPack comparison: ${comparison.changed ? "CHANGED" : "UNCHANGED"}`,
    `Before: ${comparison.beforeHash}`,
    `After:  ${comparison.afterHash}`,
    `Added: ${comparison.addedFiles.join(", ") || "none"}`,
    `Removed: ${comparison.removedFiles.join(", ") || "none"}`,
    `Content changed: ${comparison.contentChangedFiles.join(", ") || "none"}`,
    `Budget delta: ${comparison.budgetDeltaTokens}`
  ].join("\n");
}
