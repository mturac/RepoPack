# RepoPack example

From the repository root:

```bash
npm run build
node bin/repopack.mjs build . \
  --task "Improve credential redaction without changing public bundle schemas" \
  --out .repopack/example
```

Inspect `.repopack/example/manifest.json` for the machine contract and `.repopack/example/context.md` for the context packet.

The example intentionally analyzes RepoPack itself so it can be executed without downloading another repository.
