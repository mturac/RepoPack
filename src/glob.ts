function escape(value: string): string { return value.replace(/[.+^${}()|[\]\\]/g, "\\$&"); }

export function globToRegExp(pattern: string): RegExp {
  const normalized = pattern.replaceAll("\\", "/").replace(/^\.\//, "");
  let out = "^";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index]!;
    if (char === "*") {
      if (normalized[index + 1] === "*") { index += 1; out += ".*"; }
      else out += "[^/]*";
    } else if (char === "?") out += "[^/]";
    else out += escape(char);
  }
  return new RegExp(`${out}$`);
}

export function matchesAny(path: string, patterns: readonly string[] | undefined): boolean {
  return Boolean(patterns?.some((pattern) => globToRegExp(pattern).test(path)));
}
