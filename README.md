# RepoPack

<p align="center">
  <img src="docs/assets/repopack-hero.png" alt="RepoPack — deterministic task-specific repository context for coding agents" width="100%" />
</p>

[![CI](https://github.com/mturac/RepoPack/actions/workflows/ci.yml/badge.svg)](https://github.com/mturac/RepoPack/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-339933.svg)](package.json)
[![Zero runtime dependencies](https://img.shields.io/badge/runtime%20dependencies-0-0b8f6a.svg)](package.json)

**RepoPack builds the smallest useful, evidence-backed repository context bundle for a coding task — without uploading source code, leaking secrets, or asking an LLM to guess what matters.**

Coding agents often waste their first turns scanning the same repository, reading unrelated files, and carrying far more context than the task needs. RepoPack turns a repository and a concrete objective into a deterministic context packet with:

- Git-aware file discovery;
- secret and binary filtering;
- task-term, role, priority, volatility, and dependency scoring;
- stable and volatile context classification;
- explicit token-budget accounting;
- repository-relative source excerpts;
- machine-readable selection evidence;
- a canonical SHA-256 bundle hash.

```text
repository + task
       ↓
Git-aware discovery
       ↓
secret / binary / noise filter
       ↓
evidence-backed relevance scoring
       ↓
budget allocator + excerpts
       ↓
JSON bundle + Markdown handoff + stable hash
```

RepoPack is local-first, deterministic, and dependency-free at runtime. It makes zero network calls and performs no model inference.

## Quick start

Requirements: Node.js 22+ and Git.

```bash
git clone https://github.com/mturac/RepoPack.git
cd RepoPack
npm ci --ignore-scripts
npm run build
```

Build a context bundle for a task:

```bash
node bin/repopack.mjs build . \
  --task "add subscription billing with Stripe webhooks" \
  --budget 60000 \
  --out .repopack/billing.json \
  --markdown-out .repopack/billing.md
```

Inspect the bundle:

```bash
node bin/repopack.mjs inspect .repopack/billing.json
```

Compare two context decisions in CI:

```bash
node bin/repopack.mjs compare before.json after.json --fail-on-change
```

## What the output contains

```json
{
  "schemaVersion": "1",
  "repository": {
    "name": "checkout-service",
    "head": "b7b6e15…",
    "dirty": false,
    "git": true,
    "discoveredFiles": 184
  },
  "task": {
    "text": "add subscription billing with Stripe webhooks",
    "hash": "sha256:…",
    "terms": ["add", "billing", "stripe", "subscription", "webhooks"]
  },
  "budget": {
    "limitTokens": 60000,
    "usedTokens": 51842,
    "omittedForBudget": 12
  },
  "files": [
    {
      "path": "src/billing/webhook.ts",
      "role": "source",
      "volatility": "stable",
      "score": 42,
      "scoreEvidence": [
        { "kind": "path-term", "value": 12, "detail": "billing" },
        { "kind": "role", "value": 10, "detail": "source" }
      ]
    }
  ],
  "bundleHash": "sha256:…"
}
```

The bundle includes selected text excerpts so a coding agent can work from the artifact directly. Every included file carries evidence for why it was selected. Every omitted file carries a machine-readable reason.

## CLI

```text
repopack build <repo> --task <text>
  [--budget <estimated-tokens>]
  [--config <repopack.config.json>]
  [--out <bundle.json>]
  [--markdown-out <report.md>]

repopack inspect <bundle.json> [--json]
repopack compare <before.json> <after.json> [--json] [--fail-on-change]
repopack --version
repopack --help
```

| Exit | Meaning |
|---:|---|
| `0` | Command succeeded |
| `1` | Invalid input, unsafe configuration, or operational failure |
| `2` | `compare --fail-on-change` detected bundle drift |

## Configuration

```json
{
  "version": 1,
  "budgetTokens": 60000,
  "maxFileBytes": 256000,
  "maxFileTokens": 6000,
  "include": ["src/**", "test/**", "package.json", "README.md"],
  "exclude": ["src/generated/**"],
  "priorityPaths": ["src/billing/**", "contracts/**"],
  "forbiddenPaths": ["fixtures/private/**"],
  "includeUntracked": true
}
```

Glob matching is deterministic and intentionally small. Configuration is strict: unknown keys and invalid budgets fail closed.

## Safety model

RepoPack does not treat a hash as permission to expose private data.

It omits likely secrets before scoring or excerpting, including:

- `.env` and credential files;
- private keys and certificates;
- common cloud/provider tokens;
- password, secret, and token assignments;
- binary and oversized files;
- symlinks and unreadable paths.

Findings include only a detector category and repository-relative path. The matched secret value is never returned. Generated bundles may still contain sensitive business code, so review artifacts before sharing them outside the repository's trust boundary.

## Determinism and provenance

For the same repository state, task, and configuration, RepoPack produces the same ordering, score evidence, excerpts, and bundle hash. In Git repositories, the commit time is used instead of wall-clock time so artifacts remain reproducible.

Dirty and untracked files are marked `volatile`; committed files are marked `stable`. This helps downstream agent harnesses keep durable context separate from fast-changing task state.

## Library API

```ts
import {
  buildContextBundle,
  compareBundles,
  renderBundleMarkdown,
  type RepoPackBundle
} from "@mturac/repopack";

const bundle: RepoPackBundle = await buildContextBundle({
  repoPath: process.cwd(),
  task: "add subscription billing",
  budgetTokens: 60000
});

console.log(bundle.files.map((file) => file.path));
console.log(bundle.bundleHash);
```

## What RepoPack does not do

- send repository content to a hosted service;
- invoke an LLM or embedding API;
- edit files or execute project code;
- prove that every requirement-relevant file was selected;
- replace architecture knowledge, tests, or product verification;
- encrypt included source content;
- make a coding agent correct by itself.

RepoPack prepares context. InferShape diagnoses the session that used it. PatchLens reviews the resulting change. VibeProof proves the product actually runs.

## Development

```bash
npm ci --ignore-scripts
npm run verify
```

Verification performs strict TypeScript compilation, CLI syntax checks, public API type-contract compilation, deterministic unit/integration/privacy/CLI tests, JSON Schema checks, PNG verification, and a real npm tarball consumer installation.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and the [design specification](docs/superpowers/specs/2026-08-28-repopack-design.md).

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
