import type { FileRole } from "./types.js";

export function classifyRole(path: string): FileRole {
  const lower = path.toLowerCase();
  const base = lower.split("/").at(-1) ?? lower;
  if (/^(?:package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|cargo\.toml|go\.mod|pyproject\.toml|requirements.*\.txt|composer\.json)$/.test(base)) return "manifest";
  if (/(?:^|\/)(?:schema|schemas|contracts?|openapi|asyncapi)(?:\/|\.|$)/.test(lower)) return "contract";
  if (/(?:^|\/)(?:migrations?|prisma)(?:\/|\.|$)/.test(lower)) return "migration";
  if (/(?:^|\/)(?:test|tests|spec|specs|__tests__)(?:\/|\.|$)|\.(?:test|spec)\.[^.]+$/.test(lower)) return "test";
  if (/^(?:readme|contributing|security|changelog|license|notice)(?:\.|$)/.test(base) || lower.startsWith("docs/")) return "documentation";
  if (/^(?:tsconfig.*\.json|eslint.*|prettier.*|vite\.config\.|next\.config\.|dockerfile|compose.*\.ya?ml|\.github\/)/.test(lower)) return "config";
  if (/\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|cs|php|rb|swift|vue|svelte)$/.test(lower)) return "source";
  return "other";
}
