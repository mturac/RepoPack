import { posix } from "node:path";
import type { DependencyEdge, DiscoveredFile } from "./types.js";

const importPatterns: Array<[RegExp, "import" | "require"]> = [
  [/(?:import|export)\s+(?:[^"']+?\s+from\s+)?["']([^"']+)["']/g, "import"],
  [/require\(\s*["']([^"']+)["']\s*\)/g, "require"],
  [/import\(\s*["']([^"']+)["']\s*\)/g, "import"]
];

function resolveTarget(source: string, specifier: string, known: Set<string>): string | undefined {
  if (!specifier.startsWith(".")) return undefined;
  const base = posix.normalize(posix.join(posix.dirname(source), specifier));
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}.mjs`, `${base}.cjs`, posix.join(base, "index.ts"), posix.join(base, "index.js")];
  return candidates.find((candidate) => known.has(candidate));
}

export function extractDependencies(files: DiscoveredFile[]): DependencyEdge[] {
  const known = new Set(files.map((file) => file.path));
  const edges: DependencyEdge[] = [];
  for (const file of files) {
    for (const [pattern, kind] of importPatterns) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(file.content)) !== null) {
        const target = match[1] ? resolveTarget(file.path, match[1], known) : undefined;
        if (target) edges.push({ source: file.path, target, kind });
      }
    }
  }
  return edges.sort((a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target) || a.kind.localeCompare(b.kind));
}
