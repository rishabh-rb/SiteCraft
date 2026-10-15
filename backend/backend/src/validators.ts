
import test from "node:test";
import assert from "node:assert/strict";

import {
  createProjectSchema,
  promptSchema,
  isValidProjectInput,
  isValidPromptInput,
} from "./validators.js";

/* =========================================================
   Helpers
========================================================= */

const validProject = {
  name: "Cafe",
  initialPrompt: "Create a cafe website with a menu",
};

const validPrompt = {
  prompt: "Create a modern cafe website",
};

/* =========================================================
   Framework Validation
========================================================= */

test("accepts project without framework", () => {
  const result = createProjectSchema.safeParse(validProject);

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.framework, undefined);
  }
});

test("accepts a valid framework", () => {
  const result = createProjectSchema.safeParse({
    ...validProject,
    framework: "React",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.framework, "React");
  }
});

test("trims whitespace from framework", () => {
  const result = createProjectSchema.safeParse({
    ...validProject,
    framework: "  React  ",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.framework, "React");
  }
});

test("rejects an empty framework", () => {
  const result = createProjectSchema.safeParse({
    ...validProject,
    framework: "",
  });

  assert.equal(result.success, false);
});

test("rejects a whitespace-only framework", () => {
  const result = createProjectSchema.safeParse({
    ...validProject,
    framework: "   ",
  });

  assert.equal(result.success, false);
});

test("rejects a non-string framework", () => {
  const result = createProjectSchema.safeParse({
    ...validProject,
    framework: 123,
  });

  assert.equal(result.success, false);
});

/* =========================================================
   Project Name Validation
========================================================= */

test("accepts a project name with exactly 2 characters", () => {
  const result = createProjectSchema.safeParse({
    ...validProject,
    name: "AB",
  });

  assert.equal(result.success, true);
});

test("rejects a project name shorter than 2 characters", () => {
  const result = createProjectSchema.safeParse({
    ...validProject,
    name: "A",
  });

  assert.equal(result.success, false);
});

test("rejects an empty project name", () => {
  const result = createProjectSchema.safeParse({
    ...validProject,
    name: "",
  });

  assert.equal(result.success, false);
});

test("rejects a whitespace-only project name", () => {
  const result = createProjectSchema.safeParse({
    ...validProject,
    name: "   ",
  });

  assert.equal(result.success, false);
});

test("rejects a non-string project name", () => {
  const result = createProjectSchema.safeParse({
    ...validProject,
    name: 123,
  });

  assert.equal(result.success, false);
});

test("returns the custom error for an invalid project name type", () => {
  const result = createProjectSchema.safeParse({
    ...validProject,
    name: 123,
  });

  assert.equal(result.success, false);

  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        (issue) =>
          issue.message === "Project name must be a string",
      ),
    );
  }
});

test("returns the custom error for a short project name", () => {
  const result = createProjectSchema.safeParse({
    ...validProject,
    name: "A",
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

/* =========================================================
   Description Validation
========================================================= */

test("defaults a missing description to an empty string", () => {
  const result = createProjectSchema.safeParse(validProject);

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.description, "");
  }
});

test("accepts an empty description", () => {
  const result = createProjectSchema.safeParse({
    ...validProject,
    description: "",
  });

  assert.equal(result.success, true);
});

test("accepts a description with exactly 240 characters", () => {
  const result = createProjectSchema.safeParse({
    ...validProject,
    description: "d".repeat(240),
  });

  assert.equal(result.success, true);
});

test("rejects a description exceeding 240 characters", () => {
  const result = createProjectSchema.safeParse({
    ...validProject,
    description: "d".repeat(241),
  });

  assert.equal(result.success, false);
});

test("rejects a non-string description", () => {
  const result = createProjectSchema.safeParse({
    ...validProject,
    description: 123,
  });

  assert.equal(result.success, false);
});

/* =========================================================
   Initial Prompt Validation
========================================================= */

test("accepts an initial prompt with exactly 10 characters", () => {
  const result = createProjectSchema.safeParse({
    ...validProject,
    initialPrompt: "1234567890",
  });

  assert.equal(result.success, true);
});

test("rejects an initial prompt shorter than 10 characters", () => {
  const result = createProjectSchema.safeParse({
    ...validProject,
    initialPrompt: "Short",
  });

  assert.equal(result.success, false);
});

test("returns the custom error for a short initial prompt", () => {
  const result = createProjectSchema.safeParse({
    ...validProject,
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

test("rejects a missing initial prompt", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
  });

  assert.equal(result.success, false);
});

test("rejects a non-string initial prompt", () => {
  const result = createProjectSchema.safeParse({
    ...validProject,
    initialPrompt: 123,
  });

  assert.equal(result.success, false);
});

/* =========================================================
   Prompt Validation
========================================================= */

test("accepts a valid prompt", () => {
  const result = promptSchema.safeParse(validPrompt);

  assert.equal(result.success, true);
});

test("accepts a prompt with exactly 2 characters", () => {
  const result = promptSchema.safeParse({
    prompt: "Hi",
  });

  assert.equal(result.success, true);
});

test("rejects a prompt shorter than 2 characters", () => {
  const result = promptSchema.safeParse({
    prompt: "A",
  });

  assert.equal(result.success, false);
});

test("returns the custom error for a short prompt", () => {
  const result = promptSchema.safeParse({
    prompt: "A",
  });

  assert.equal(result.success, false);

  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        (issue) =>
          issue.message ===
          "Prompt must be at least 2 characters",
      ),
    );
  }
});

test("rejects an empty prompt", () => {
  const result = promptSchema.safeParse({
    prompt: "",
  });

  assert.equal(result.success, false);
});

test("rejects a whitespace-only prompt", () => {
  const result = promptSchema.safeParse({
    prompt: "   ",
  });

  assert.equal(result.success, false);
});

test("rejects a non-string prompt", () => {
  const result = promptSchema.safeParse({
    prompt: 123,
  });

  assert.equal(result.success, false);
});

test("rejects a missing prompt", () => {
  const result = promptSchema.safeParse({});
  
  assert.equal(result.success, false);
});

/* =========================================================
   Project Type Guard Tests
========================================================= */

test("isValidProjectInput accepts valid project input", () => {
  assert.equal(isValidProjectInput(validProject), true);
});

test("isValidProjectInput rejects an empty project name", () => {
  assert.equal(
    isValidProjectInput({
      ...validProject,
      name: "",
    }),
    false,
  );
});

test("isValidProjectInput rejects a short initial prompt", () => {
  assert.equal(
    isValidProjectInput({
      ...validProject,
      initialPrompt: "Short",
    }),
    false,
  );
});

/* =========================================================
   Prompt Type Guard Tests
========================================================= */

test("isValidPromptInput accepts valid prompt input", () => {
  assert.equal(isValidPromptInput(validPrompt), true);
});

test("isValidPromptInput rejects an empty prompt", () => {
  assert.equal(
    isValidPromptInput({
      prompt: "",
    }),
    false,
  );
});

test("isValidPromptInput rejects a one-character prompt", () => {
  assert.equal(
    isValidPromptInput({
      prompt: "A",
    }),
    false,
  );
});

/* =========================================================
   Invalid Input Type Guard Tests
========================================================= */

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

test("type guards reject objects with missing required fields", () => {
  assert.equal(isValidProjectInput({}), false);
  assert.equal(isValidPromptInput({}), false);
});

test("type guards reject arrays", () => {
  assert.equal(isValidProjectInput([]), false);
  assert.equal(isValidPromptInput([]), false);
});
