import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePasswordStrength, MIN_PASSWORD_LENGTH } from "./password.ts";

test("returns score 0 for empty password", () => {
  const result = evaluatePasswordStrength("");
  assert.strictEqual(result.score, 0);
  assert.strictEqual(result.label, "");
});

test("flags passwords shorter than 8 characters as Too short", () => {
  assert.strictEqual(MIN_PASSWORD_LENGTH, 8);
  const result = evaluatePasswordStrength("abc");
  assert.strictEqual(result.score, 1);
  assert.strictEqual(result.label, "Too short");
  assert.strictEqual(result.colorClass, "text-danger");
  assert.strictEqual(result.barClass, "bg-danger");
});

test("evaluates strength for simple 8-character password", () => {
  const result = evaluatePasswordStrength("abcdefgh");
  assert.strictEqual(result.score, 1);
  assert.strictEqual(result.label, "Weak");
});

test("evaluates strength for 8+ characters with mixed case/numbers", () => {
  const result = evaluatePasswordStrength("Abcdef12");
  assert.strictEqual(result.score, 2);
  assert.strictEqual(result.label, "Fair");
  assert.strictEqual(result.colorClass, "text-warning");
  assert.strictEqual(result.barClass, "bg-warning");
});

test("evaluates Good status with distinct text-good color", () => {
  const result = evaluatePasswordStrength("Abcdef1234#");
  assert.strictEqual(result.score, 3);
  assert.strictEqual(result.label, "Good");
  assert.strictEqual(result.colorClass, "text-good");
  assert.strictEqual(result.barClass, "bg-good");
});

test("evaluates strong passwords with high length and variety", () => {
  const result = evaluatePasswordStrength("Correct-Horse-Battery-99!");
  assert.strictEqual(result.score, 4);
  assert.strictEqual(result.label, "Strong");
  assert.strictEqual(result.colorClass, "text-success");
});
