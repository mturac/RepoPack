import { RepoPackError } from "./errors.js";
import type { RepoPackBundle, RepoPackConfig } from "./types.js";

const configKeys = new Set(["version", "budgetTokens", "maxFileBytes", "maxFileTokens", "include", "exclude", "priorityPaths", "forbiddenPaths", "includeUntracked"]);

function stringArray(value: unknown, name: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new RepoPackError("RP_CONFIG", `${name} must be an array of non-empty strings.`);
  }
  return [...value];
}

export function parseConfig(value: unknown): RepoPackConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RepoPackError("RP_CONFIG", "Config must be an object.");
  const raw = value as Record<string, unknown>;
  for (const key of Object.keys(raw)) if (!configKeys.has(key)) throw new RepoPackError("RP_CONFIG", `Unknown key: ${key}`);
  if (raw.version !== 1) throw new RepoPackError("RP_CONFIG", "version must be 1.");
  for (const key of ["budgetTokens", "maxFileBytes", "maxFileTokens"] as const) {
    const item = raw[key];
    if (item !== undefined && (!Number.isInteger(item) || (item as number) < 1)) throw new RepoPackError("RP_CONFIG", `${key} must be a positive integer.`);
  }
  if (raw.includeUntracked !== undefined && typeof raw.includeUntracked !== "boolean") throw new RepoPackError("RP_CONFIG", "includeUntracked must be boolean.");
  return {
    version: 1,
    ...(raw.budgetTokens === undefined ? {} : { budgetTokens: raw.budgetTokens as number }),
    ...(raw.maxFileBytes === undefined ? {} : { maxFileBytes: raw.maxFileBytes as number }),
    ...(raw.maxFileTokens === undefined ? {} : { maxFileTokens: raw.maxFileTokens as number }),
    ...(raw.includeUntracked === undefined ? {} : { includeUntracked: raw.includeUntracked as boolean }),
    ...(stringArray(raw.include, "include") === undefined ? {} : { include: stringArray(raw.include, "include")! }),
    ...(stringArray(raw.exclude, "exclude") === undefined ? {} : { exclude: stringArray(raw.exclude, "exclude")! }),
    ...(stringArray(raw.priorityPaths, "priorityPaths") === undefined ? {} : { priorityPaths: stringArray(raw.priorityPaths, "priorityPaths")! }),
    ...(stringArray(raw.forbiddenPaths, "forbiddenPaths") === undefined ? {} : { forbiddenPaths: stringArray(raw.forbiddenPaths, "forbiddenPaths")! })
  };
}

export function assertBundle(value: unknown): asserts value is RepoPackBundle {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RepoPackError("RP_BUNDLE", "Bundle must be an object.");
  const raw = value as Record<string, unknown>;
  if (raw.schemaVersion !== "1") throw new RepoPackError("RP_BUNDLE", "Unsupported bundle schemaVersion.");
  if (typeof raw.bundleHash !== "string" || !raw.bundleHash.startsWith("sha256:")) throw new RepoPackError("RP_BUNDLE", "bundleHash is required.");
  if (!Array.isArray(raw.files)) throw new RepoPackError("RP_BUNDLE", "files must be an array.");
}
