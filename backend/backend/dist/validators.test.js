
import test from "node:test";
import assert from "node:assert/strict";
import { createProjectSchema, promptSchema } from "./validators.js";

test("rejects prompts that are too short", () => {
  assert.equal(
    promptSchema.safeParse({ prompt: "h" }).success,
    false
  );

  assert.equal(
    promptSchema.safeParse({ prompt: "hi" }).success,
    true
  );

  assert.equal(
    promptSchema.safeParse({ prompt: "" }).success,
    false
  );
});

test("rejects prompts that exceed 2000 characters", () => {
  assert.equal(
    promptSchema.safeParse({ prompt: "a".repeat(2001) }).success,
    false
  );

  assert.equal(
    promptSchema.safeParse({ prompt: "a".repeat(2000) }).success,
    true
  );
});

test("validates project creation input", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    initialPrompt: "Create a cafe website with a menu",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.description, "");
  }
});

test("rejects invalid project names", () => {
  assert.equal(
    createProjectSchema.safeParse({
      name: "",
      initialPrompt: "Create a cafe website",
    }).success,
    false
  );

  assert.equal(
    createProjectSchema.safeParse({
      name: "A",
      initialPrompt: "Create a cafe website",
    }).success,
    false
  );

  assert.equal(
    createProjectSchema.safeParse({
      name: "A".repeat(81),
      initialPrompt: "Create a cafe website",
    }).success,
    false
  );
});

test("rejects initial prompts shorter than 10 characters", () => {
  assert.equal(
    createProjectSchema.safeParse({
      name: "Cafe",
      initialPrompt: "short",
    }).success,
    false
  );
});

test("trims whitespace before validation", () => {
  assert.equal(
    promptSchema.safeParse({ prompt: "   " }).success,
    false
  );

  assert.equal(
    createProjectSchema.safeParse({
      name: "  Cafe  ",
      initialPrompt: "  Create a cafe website  ",
    }).success,
    true
  );
});
