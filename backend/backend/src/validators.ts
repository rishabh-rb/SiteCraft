
import test from "node:test";
import assert from "node:assert/strict";

import {
  createProjectSchema,
  promptSchema,
  isValidProjectInput,
  isValidPromptInput,
} from "./validators.js";

/* =========================================================
   Framework Validation
========================================================= */

test("accepts project without framework", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    initialPrompt: "Create a cafe website with a menu",
  });

  assert.equal(result.success, true);
});

test("accepts a valid framework", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    initialPrompt: "Create a cafe website with a menu",
    framework: "React",
  });

  assert.equal(result.success, true);
});

test("trims whitespace from framework", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    initialPrompt: "Create a cafe website with a menu",
    framework: "  React  ",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.framework, "React");
  }
});

test("rejects empty framework", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    initialPrompt: "Create a cafe website with a menu",
    framework: "",
  });

  assert.equal(result.success, false);
});

test("rejects whitespace-only framework", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    initialPrompt: "Create a cafe website with a menu",
    framework: "   ",
  });

  assert.equal(result.success, false);
});

test("rejects non-string framework", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    initialPrompt: "Create a cafe website with a menu",
    framework: 123,
  });

  assert.equal(result.success, false);
});

/* =========================================================
   Description Validation
========================================================= */

test("defaults missing description to an empty string", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    initialPrompt: "Create a cafe website with a menu",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.description, "");
  }
});

test("rejects description exceeding 240 characters", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    description: "d".repeat(241),
    initialPrompt: "Create a cafe website with a menu",
  });

  assert.equal(result.success, false);
});

test("rejects non-string description", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    description: 123,
    initialPrompt: "Create a cafe website with a menu",
  });

  assert.equal(result.success, false);
});

/* =========================================================
   Custom Error Messages
========================================================= */

test("returns custom error for invalid project name type", () => {
  const result = createProjectSchema.safeParse({
    name: 123,
    initialPrompt: "Create a cafe website with a menu",
  });

  assert.equal(result.success, false);

  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        (issue) => issue.message === "Project name must be a string",
      ),
    );
  }
});

test("returns custom error for short project name", () => {
  const result = createProjectSchema.safeParse({
    name: "A",
    initialPrompt: "Create a cafe website with a menu",
  });

  assert.equal(result.success, false);

  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        (issue) =>
          issue.message ===
          "Project name must be at least 2 characters",
      ),
    );
  }
});

test("returns custom error for short initial prompt", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    initialPrompt: "Short",
  });

  assert.equal(result.success, false);

  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        (issue) =>
          issue.message ===
          "Initial prompt must be at least 10 characters",
      ),
    );
  }
});

test("returns custom error for short prompt", () => {
  const result = promptSchema.safeParse({
    prompt: "A",
  });

  assert.equal(result.success, false);

  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        (issue) =>
          issue.message === "Prompt must be at least 2 characters",
      ),
    );
  }
});

/* =========================================================
   Type Guard Tests
========================================================= */

test("isValidProjectInput returns true for valid input", () => {
  assert.equal(
    isValidProjectInput({
      name: "Cafe",
      initialPrompt: "Create a cafe website with a menu",
    }),
    true,
  );
});

test("isValidProjectInput returns false for invalid input", () => {
  assert.equal(
    isValidProjectInput({
      name: "",
      initialPrompt: "Create a cafe website with a menu",
    }),
    false,
  );
});

test("isValidPromptInput returns true for valid input", () => {
  assert.equal(
    isValidPromptInput({
      prompt: "Create a modern cafe website",
    }),
    true,
  );
});

test("isValidPromptInput returns false for invalid input", () => {
  assert.equal(
    isValidPromptInput({
      prompt: "",
    }),
    false,
  );
});

test("type guards reject null and primitive inputs", () => {
  const invalidInputs: unknown[] = [
    null,
    undefined,
    "",
    123,
    true,
    [],
  ];

  for (const input of invalidInputs) {
    assert.equal(isValidProjectInput(input), false);
    assert.equal(isValidPromptInput(input), false);
  }
});
