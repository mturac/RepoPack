import test from "node:test";
import assert from "node:assert/strict";
import { canonicalStringify, hashCanonical, parseConfig } from "../dist/index.js";

test("canonicalStringify sorts nested object keys without reordering arrays", () => {
  assert.equal(canonicalStringify({ z: 1, a: { y: 2, x: 3 }, list: [{ b: 2, a: 1 }] }), '{"a":{"x":3,"y":2},"list":[{"a":1,"b":2}],"z":1}');
});

test("hashCanonical is stable across object insertion order", () => {
  assert.equal(hashCanonical({ b: 2, a: 1 }), hashCanonical({ a: 1, b: 2 }));
});

test("parseConfig rejects unknown keys and unsafe budgets", () => {
  assert.throws(() => parseConfig({ version: 1, surprise: true }), /unknown key/i);
  assert.throws(() => parseConfig({ version: 1, budgetTokens: 0 }), /budgetTokens/i);
});
