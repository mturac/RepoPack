import test from "node:test";
import assert from "node:assert/strict";
import { buildContextBundle } from "../dist/index.js";
import { makeRepo } from "./helpers.mjs";

const baseFiles = {
  "package.json": '{"name":"shop","scripts":{"test":"node --test"}}',
  "README.md": "# Shop\nA small storefront.",
  "src/billing/checkout.ts": "import { charge } from './stripe.js';\nexport const checkout = () => charge();",
  "src/billing/stripe.ts": "export const charge = () => 'charged';",
  "src/catalog/list.ts": "export const list = () => ['item'];",
  "test/billing/checkout.test.ts": "import { checkout } from '../../src/billing/checkout.js';",
  ".env": "STRIPE_SECRET_KEY=sk_live_should_never_leave"
};

test("buildContextBundle selects task-relevant files and omits secrets", async () => {
  const repo = await makeRepo(baseFiles);
  const bundle = await buildContextBundle({ repoPath: repo, task: "add Stripe billing checkout", budgetTokens: 1200 });
  const paths = bundle.files.map((file) => file.path);
  assert.equal(paths.includes("src/billing/checkout.ts"), true);
  assert.equal(paths.includes("src/billing/stripe.ts"), true);
  assert.equal(paths.includes(".env"), false);
  assert.equal(bundle.omitted.some((entry) => entry.path === ".env" && entry.reason === "secret"), true);
  assert.equal(JSON.stringify(bundle).includes("sk_live_should_never_leave"), false);
});

test("buildContextBundle is deterministic and budget-bound", async () => {
  const repo = await makeRepo(baseFiles);
  const first = await buildContextBundle({ repoPath: repo, task: "billing checkout", budgetTokens: 350 });
  const second = await buildContextBundle({ repoPath: repo, task: "billing checkout", budgetTokens: 350 });
  assert.equal(first.bundleHash, second.bundleHash);
  assert.deepEqual(first.files, second.files);
  assert.ok(first.budget.usedTokens <= first.budget.limitTokens);
});

test("buildContextBundle classifies dirty and untracked files as volatile", async () => {
  const repo = await makeRepo(baseFiles, {
    dirty: { "src/billing/checkout.ts": "export const checkout = () => 'dirty';" },
    untracked: { "src/billing/webhook.ts": "export const webhook = true;" }
  });
  const bundle = await buildContextBundle({ repoPath: repo, task: "billing webhook checkout", budgetTokens: 1200 });
  const checkout = bundle.files.find((file) => file.path === "src/billing/checkout.ts");
  const webhook = bundle.files.find((file) => file.path === "src/billing/webhook.ts");
  assert.equal(checkout?.volatility, "volatile");
  assert.equal(webhook?.volatility, "volatile");
});
