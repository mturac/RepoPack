import type { SecretRisk } from "./types.js";

const secretPathPatterns: Array<[RegExp, string]> = [
  [/(^|\/)\.env(?:\.|$)/i, "environment-file"],
  [/(^|\/)(?:id_rsa|id_ed25519|authorized_keys|known_hosts)$/i, "ssh-material"],
  [/\.(?:pem|p12|pfx|key|keystore)$/i, "key-material"],
  [/(^|\/)(?:credentials?|secrets?|service[-_]?account)(?:\.|\/|$)/i, "credential-file"]
];

const secretContentPatterns: Array<[RegExp, string]> = [
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private-key"],
  [/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/, "github-token"],
  [/\bAKIA[0-9A-Z]{16}\b/, "aws-access-key"],
  [/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/, "api-token"],
  [/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/, "slack-token"],
  [/(?:secret|token|password|api[_-]?key)\s*[:=]\s*["']?(?!example|placeholder|changeme|test)[A-Za-z0-9_\-\/.+=]{12,}/i, "assigned-secret"]
];

export function detectSecretRisk(path: string, content: string): SecretRisk | undefined {
  for (const [pattern, category] of secretPathPatterns) if (pattern.test(path)) return { code: "RP201_SECRET_PATH", category };
  for (const [pattern, category] of secretContentPatterns) if (pattern.test(content)) return { code: "RP202_SECRET_CONTENT", category };
  return undefined;
}
