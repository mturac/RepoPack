export type FileRole = "manifest" | "contract" | "migration" | "test" | "documentation" | "source" | "config" | "other";
export type Volatility = "stable" | "volatile";

export interface RepoPackConfig {
  version: 1;
  budgetTokens?: number;
  maxFileBytes?: number;
  maxFileTokens?: number;
  include?: string[];
  exclude?: string[];
  priorityPaths?: string[];
  forbiddenPaths?: string[];
  includeUntracked?: boolean;
}

export interface BuildContextOptions {
  repoPath: string;
  task: string;
  budgetTokens?: number;
  config?: RepoPackConfig;
}

export interface ScoreEvidence {
  kind: "path-term" | "content-term" | "role" | "priority" | "volatile" | "dependency";
  value: number;
  detail: string;
}

export interface BundleFile {
  path: string;
  role: FileRole;
  volatility: Volatility;
  content: string;
  contentHash: string;
  estimatedTokens: number;
  score: number;
  scoreEvidence: ScoreEvidence[];
  truncated: boolean;
}

export interface OmittedFile {
  path: string;
  reason: "secret" | "binary" | "oversized" | "ignored" | "budget" | "unreadable" | "symlink";
  detail?: string;
}

export interface SafetyFinding {
  code: "RP201_SECRET_PATH" | "RP202_SECRET_CONTENT";
  category: string;
  path?: string;
}

export interface DependencyEdge {
  source: string;
  target: string;
  kind: "import" | "require";
}

export interface RepoPackBundle {
  schemaVersion: "1";
  createdAt: string;
  repository: {
    name: string;
    head?: string;
    branch?: string;
    dirty: boolean;
    git: boolean;
    discoveredFiles: number;
  };
  task: { text: string; hash: string; terms: string[] };
  budget: { limitTokens: number; usedTokens: number; omittedForBudget: number };
  files: BundleFile[];
  omitted: OmittedFile[];
  findings: SafetyFinding[];
  dependencies: DependencyEdge[];
  bundleHash: string;
}

export interface BundleComparison {
  changed: boolean;
  beforeHash: string;
  afterHash: string;
  addedFiles: string[];
  removedFiles: string[];
  contentChangedFiles: string[];
  budgetDeltaTokens: number;
}

export interface SecretRisk {
  code: "RP201_SECRET_PATH" | "RP202_SECRET_CONTENT";
  category: string;
}

export interface DiscoveredFile {
  path: string;
  absolutePath: string;
  content: string;
  size: number;
  tracked: boolean;
  dirty: boolean;
  untracked: boolean;
  role: FileRole;
}

export interface RepositorySnapshot {
  root: string;
  name: string;
  git: boolean;
  head?: string;
  branch?: string;
  commitTime?: string;
  dirty: boolean;
  files: DiscoveredFile[];
  omitted: OmittedFile[];
  findings: SafetyFinding[];
}
