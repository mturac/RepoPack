import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildContextBundle } from "./build.js";
import { compareBundles } from "./compare.js";
import { RepoPackError } from "./errors.js";
import { writeAtomic } from "./io.js";
import { renderBundleMarkdown, renderComparison } from "./render.js";
import { assertBundle, parseConfig } from "./validation.js";
import type { RepoPackBundle, RepoPackConfig } from "./types.js";

const VERSION = "0.1.0";
const HELP = `RepoPack ${VERSION}\n\nUsage:\n  repopack build <repo> --task <text> [--budget <tokens>] [--config <file>] [--out <bundle.json>] [--markdown-out <report.md>]\n  repopack inspect <bundle.json> [--json]\n  repopack compare <before.json> <after.json> [--json] [--fail-on-change]\n  repopack --version\n  repopack --help\n`;

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new RepoPackError("RP_CLI", `${name} requires a value.`);
  return value;
}

function has(args: string[], name: string): boolean { return args.includes(name); }

async function readJson(path: string): Promise<unknown> { return JSON.parse(await readFile(resolve(path), "utf8")); }

async function build(args: string[]): Promise<number> {
  const repoPath = args[0] && !args[0].startsWith("--") ? args[0] : ".";
  const task = option(args, "--task");
  if (!task) throw new RepoPackError("RP_CLI", "build requires --task <text>.");
  const budgetRaw = option(args, "--budget");
  const budgetTokens = budgetRaw === undefined ? undefined : Number(budgetRaw);
  if (budgetRaw !== undefined && (!Number.isInteger(budgetTokens) || (budgetTokens ?? 0) < 1)) throw new RepoPackError("RP_CLI", "--budget must be a positive integer.");
  const configPath = option(args, "--config");
  const config = configPath ? parseConfig(await readJson(configPath)) : undefined;
  const bundle = await buildContextBundle({ repoPath, task, ...(budgetTokens === undefined ? {} : { budgetTokens }), ...(config === undefined ? {} : { config }) });
  const json = `${JSON.stringify(bundle, null, 2)}\n`;
  const out = option(args, "--out");
  if (out) await writeAtomic(resolve(out), json); else process.stdout.write(json);
  const markdownOut = option(args, "--markdown-out");
  if (markdownOut) await writeAtomic(resolve(markdownOut), renderBundleMarkdown(bundle));
  return 0;
}

async function inspect(args: string[]): Promise<number> {
  if (!args[0]) throw new RepoPackError("RP_CLI", "inspect requires a bundle path.");
  const value = await readJson(args[0]); assertBundle(value);
  if (has(args, "--json")) process.stdout.write(`${JSON.stringify({ bundleHash: value.bundleHash, files: value.files.length, usedTokens: value.budget.usedTokens, findings: value.findings.length }, null, 2)}\n`);
  else process.stdout.write(renderBundleMarkdown(value));
  return 0;
}

async function compare(args: string[]): Promise<number> {
  if (!args[0] || !args[1]) throw new RepoPackError("RP_CLI", "compare requires before and after bundle paths.");
  const before = await readJson(args[0]); const after = await readJson(args[1]);
  assertBundle(before); assertBundle(after);
  const result = compareBundles(before as RepoPackBundle, after as RepoPackBundle);
  process.stdout.write(has(args, "--json") ? `${JSON.stringify(result, null, 2)}\n` : `${renderComparison(result)}\n`);
  return has(args, "--fail-on-change") && result.changed ? 2 : 0;
}

export async function runCli(args: string[]): Promise<void> {
  try {
    if (args.length === 0 || has(args, "--help") || has(args, "-h")) { process.stdout.write(HELP); return; }
    if (has(args, "--version") || has(args, "-v")) { process.stdout.write(`${VERSION}\n`); return; }
    const [command, ...rest] = args;
    const code = command === "build" ? await build(rest) : command === "inspect" ? await inspect(rest) : command === "compare" ? await compare(rest) : (() => { throw new RepoPackError("RP_CLI", `Unknown command: ${command}`); })();
    process.exitCode = code;
  } catch (error) {
    const payload = error instanceof RepoPackError ? { error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } } : { error: { code: "RP_INTERNAL", message: error instanceof Error ? error.message : String(error) } };
    process.stderr.write(`${JSON.stringify(payload)}\n`);
    process.exitCode = 1;
  }
}
