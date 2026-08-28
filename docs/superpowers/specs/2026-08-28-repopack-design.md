# RepoPack Design

## Purpose

RepoPack builds a deterministic, task-specific repository context bundle for coding agents. It reduces repeated repository exploration without hiding provenance, exceeding a declared context budget, or leaking secrets.

## User outcome

A developer provides a repository and a concrete task. RepoPack returns the smallest useful, evidence-backed context packet containing relevant files, dependency hints, repository state, omitted-file reasons, and a stable bundle hash.

## Product boundaries

RepoPack is local-first and performs no network calls. It does not invoke an LLM, edit repository files, execute project code, install dependencies, or claim semantic completeness. It may execute read-only Git commands.

## Inputs

- repository path;
- required task text;
- approximate token budget;
- optional JSON configuration;
- optional output paths.

## File discovery

Git repositories use `git ls-files --cached --others --exclude-standard`. Non-Git directories use a bounded recursive walk. `.git`, dependency caches, build output, binary files, oversized files, ignored paths, and secret-bearing files are omitted.

## Selection model

Selection is deterministic. A file receives evidence-backed score components for:

- task-term matches in its repository-relative path;
- task-term matches in text content;
- architectural role such as manifest, contract, migration, test, documentation, or source;
- configured priority path;
- dirty or untracked status;
- dependency relation to an already relevant file.

The bundle records every score component. Files are selected in stable score/path order until the declared budget is exhausted.

## Safety model

RepoPack never writes prompt or repository content to a network service. Absolute host paths are removed. Filename and content secret detectors fail closed by omitting suspicious files and recording only a finding code, path, and detector category. Raw secret matches are never returned.

## Artifacts

- JSON bundle with schema version, repository identity, task hash, selection evidence, included content, omitted reasons, dependency hints, budget accounting, and SHA-256 bundle hash;
- Markdown report suitable for humans and coding-agent handoff;
- deterministic bundle comparison.

## CLI

- `repopack build <repo> --task <text>`
- `repopack inspect <bundle.json>`
- `repopack compare <before.json> <after.json>`

Quality-gate differences exit `2`; invalid input and operational failures exit `1`; success exits `0`.

## Technology

TypeScript 5.8, ESM, Node.js 22+, zero runtime dependencies, Apache-2.0.

## Verification

Strict TypeScript build, public API contract compilation, deterministic unit/integration/CLI/privacy tests, JSON Schema checks, PNG asset verification, and a real npm tarball consumer smoke test.
