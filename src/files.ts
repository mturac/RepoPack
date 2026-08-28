import { lstat, readFile, readdir } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { RepoPackError } from "./errors.js";
import { matchesAny } from "./glob.js";
import { classifyRole } from "./roles.js";
import { detectSecretRisk } from "./secrets.js";
import type { DiscoveredFile, OmittedFile, RepoPackConfig, RepositorySnapshot, SafetyFinding } from "./types.js";

const defaultExcluded = [".git/**", "node_modules/**", "dist/**", "build/**", "coverage/**", ".next/**", "target/**", "vendor/**", ".venv/**", "__pycache__/**", ".repopack/**"];

function runGit(root: string, args: string[]): string | undefined {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  return result.status === 0 ? result.stdout : undefined;
}

function cleanPath(root: string, absolute: string): string {
  const rel = relative(root, absolute).split(sep).join("/");
  if (rel.startsWith("../") || rel === "..") throw new RepoPackError("RP_PATH", "Discovered path escaped repository root.");
  return rel.replace(/^\.\//, "");
}

async function walk(root: string, current = root): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(current, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const absolute = join(current, entry.name);
    const path = cleanPath(root, absolute);
    if (matchesAny(path, defaultExcluded)) continue;
    if (entry.isSymbolicLink()) { out.push(`${path}\0symlink`); continue; }
    if (entry.isDirectory()) out.push(...await walk(root, absolute));
    else if (entry.isFile()) out.push(path);
  }
  return out;
}

function gitFileList(root: string): { paths: string[]; tracked: Set<string>; dirty: Set<string>; untracked: Set<string>; head?: string; branch?: string; commitTime?: string } | undefined {
  if (runGit(root, ["rev-parse", "--is-inside-work-tree"])?.trim() !== "true") return undefined;
  const trackedRaw = runGit(root, ["ls-files", "-z"]);
  const allRaw = runGit(root, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]);
  if (trackedRaw === undefined || allRaw === undefined) return undefined;
  const tracked = new Set(trackedRaw.split("\0").filter(Boolean));
  const paths = allRaw.split("\0").filter(Boolean).sort();
  const dirty = new Set<string>();
  const untracked = new Set<string>();
  const statusRaw = runGit(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]) ?? "";
  const records = statusRaw.split("\0").filter(Boolean);
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]!;
    const status = record.slice(0, 2);
    const path = record.slice(3).replaceAll("\\", "/");
    if (status === "??") untracked.add(path); else dirty.add(path);
    if (status.includes("R") || status.includes("C")) index += 1;
  }
  return {
    paths,
    tracked,
    dirty,
    untracked,
    ...(runGit(root, ["rev-parse", "HEAD"])?.trim() ? { head: runGit(root, ["rev-parse", "HEAD"])!.trim() } : {}),
    ...(runGit(root, ["branch", "--show-current"])?.trim() ? { branch: runGit(root, ["branch", "--show-current"])!.trim() } : {}),
    ...(runGit(root, ["show", "-s", "--format=%cI", "HEAD"])?.trim() ? { commitTime: runGit(root, ["show", "-s", "--format=%cI", "HEAD"])!.trim() } : {})
  };
}

function isBinary(buffer: Buffer): boolean {
  if (buffer.includes(0)) return true;
  const text = buffer.toString("utf8");
  const replacements = [...text].filter((char) => char === "�").length;
  return text.length > 0 && replacements / text.length > 0.01;
}

export async function discoverRepository(repoPath: string, config: RepoPackConfig): Promise<RepositorySnapshot> {
  const root = resolve(repoPath);
  const stat = await lstat(root).catch(() => undefined);
  if (!stat?.isDirectory()) throw new RepoPackError("RP_REPO", `Repository path is not a directory: ${repoPath}`);
  const git = gitFileList(root);
  const rawPaths = git?.paths ?? await walk(root);
  const files: DiscoveredFile[] = [];
  const omitted: OmittedFile[] = [];
  const findings: SafetyFinding[] = [];
  const maxFileBytes = config.maxFileBytes ?? 256_000;
  for (const rawPath of rawPaths) {
    const [path, marker] = rawPath.split("\0");
    if (!path) continue;
    if (marker === "symlink") { omitted.push({ path, reason: "symlink" }); continue; }
    if (matchesAny(path, defaultExcluded) || matchesAny(path, config.exclude) || matchesAny(path, config.forbiddenPaths) || (config.include && !matchesAny(path, config.include))) {
      omitted.push({ path, reason: "ignored" }); continue;
    }
    const untracked = git?.untracked.has(path) ?? false;
    if (untracked && config.includeUntracked === false) { omitted.push({ path, reason: "ignored", detail: "untracked-disabled" }); continue; }
    const absolutePath = join(root, path);
    const fileStat = await lstat(absolutePath).catch(() => undefined);
    if (!fileStat?.isFile()) { omitted.push({ path, reason: fileStat?.isSymbolicLink() ? "symlink" : "unreadable" }); continue; }
    if (fileStat.size > maxFileBytes) { omitted.push({ path, reason: "oversized", detail: String(fileStat.size) }); continue; }
    const buffer = await readFile(absolutePath).catch(() => undefined) as Buffer | undefined;
    if (!buffer) { omitted.push({ path, reason: "unreadable" }); continue; }
    if (isBinary(buffer)) { omitted.push({ path, reason: "binary" }); continue; }
    const content = buffer.toString("utf8").replaceAll("\r\n", "\n");
    const risk = detectSecretRisk(path, content);
    if (risk) {
      omitted.push({ path, reason: "secret", detail: risk.category });
      findings.push({ ...risk, path });
      continue;
    }
    files.push({
      path,
      absolutePath,
      content,
      size: fileStat.size,
      tracked: git?.tracked.has(path) ?? false,
      dirty: git?.dirty.has(path) ?? false,
      untracked,
      role: classifyRole(path)
    });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  omitted.sort((a, b) => a.path.localeCompare(b.path) || a.reason.localeCompare(b.reason));
  findings.sort((a, b) => (a.path ?? "").localeCompare(b.path ?? "") || a.code.localeCompare(b.code));
  return {
    root,
    name: basename(root),
    git: Boolean(git),
    ...(git?.head ? { head: git.head } : {}),
    ...(git?.branch ? { branch: git.branch } : {}),
    ...(git?.commitTime ? { commitTime: git.commitTime } : {}),
    dirty: Boolean(git && (git.dirty.size > 0 || git.untracked.size > 0)),
    files,
    omitted,
    findings
  };
}
