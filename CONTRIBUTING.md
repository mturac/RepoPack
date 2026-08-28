# Contributing

1. Use Node.js 22 or newer.
2. Create a focused branch.
3. Add a failing test before behavior changes.
4. Keep the runtime dependency-free and offline.
5. Run `npm ci --ignore-scripts` and `npm run verify`.
6. Keep bundle output deterministic and never include raw secret matches.

Pull requests should describe the user outcome, exact verification evidence, and compatibility impact.
