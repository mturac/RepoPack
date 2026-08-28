import test from "node:test";
import assert from "node:assert/strict";
import { detectSecretRisk } from "../dist/index.js";

test("detectSecretRisk omits secret filenames without returning secret content", () => {
  const finding = detectSecretRisk(".env.production", "API_KEY=super-secret-value");
  assert.equal(finding?.code, "RP201_SECRET_PATH");
  assert.equal(JSON.stringify(finding).includes("super-secret-value"), false);
});

test("detectSecretRisk recognizes private keys and provider tokens", () => {
  assert.equal(detectSecretRisk("notes.txt", "-----BEGIN PRIVATE KEY-----")?.code, "RP202_SECRET_CONTENT");
  assert.equal(detectSecretRisk("notes.txt", "ghp_abcdefghijklmnopqrstuvwxyz123456")?.code, "RP202_SECRET_CONTENT");
});
