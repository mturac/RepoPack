import { buildContextBundle, compareBundles, type RepoPackBundle, type RepoPackConfig } from "@mturac/repopack";

const config: RepoPackConfig = { version: 1, budgetTokens: 1000 };
const bundle: Promise<RepoPackBundle> = buildContextBundle({ repoPath: ".", task: "billing", config });
void bundle;
void compareBundles;
