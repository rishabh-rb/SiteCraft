import test from "node:test";
import assert from "node:assert/strict";
import { createProjectSchema, promptSchema } from "./validators.js";

test("rejects prompts that are too short", () => {
  assert.equal(promptSchema.safeParse({ prompt: "hi" }).success, true);
  assert.equal(promptSchema.safeParse({ prompt: "" }).success, false);
});

test("validates project creation input", () => {
  assert.equal(createProjectSchema.safeParse({ name: "Cafe", initialPrompt: "Create a cafe website with a menu" }).success, true);
  assert.equal(createProjectSchema.safeParse({ name: "", initialPrompt: "short" }).success, false);
});
