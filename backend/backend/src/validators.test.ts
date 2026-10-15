
import test from "node:test";
import assert from "node:assert/strict";

import {
  createProjectSchema,
  promptSchema,
} from "./validators.js";

/* =========================================================
   Test Helpers
========================================================= */

function expectValid(
  schema: typeof promptSchema | typeof createProjectSchema,
  input: unknown,
) {
  const result = schema.safeParse(input);

  assert.equal(
    result.success,
    true,
    result.success
      ? undefined
      : `Validation failed: ${result.error.message}`,
  );

  return result;
}

function expectInvalid(
  schema: typeof promptSchema | typeof createProjectSchema,
  input: unknown,
) {
  const result = schema.safeParse(input);

  assert.equal(
    result.success,
    false,
    "Expected validation to fail",
  );

  if (!result.success) {
    assert.ok(result.error.issues.length > 0);
  }

  return result;
}

/* =========================================================
   Prompt Validation
========================================================= */

test("accepts a valid prompt", () => {
  expectValid(promptSchema, {
    prompt: "Create a modern cafe website",
  });
});

test("accepts prompt with punctuation and numbers", () => {
  expectValid(promptSchema, {
    prompt: "Create 5 sections, 3 cards, and a contact form!",
  });
});

test("accepts prompt with exactly 2 characters", () => {
  expectValid(promptSchema, {
    prompt: "Hi",
  });
});

test("accepts prompt with exactly 2000 characters", () => {
  expectValid(promptSchema, {
    prompt: "a".repeat(2000),
  });
});

test("trims whitespace from a valid prompt", () => {
  const result = promptSchema.safeParse({
    prompt: "  Create a cafe website  ",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.prompt, "Create a cafe website");
  }
});

test("rejects prompt shorter than 2 characters", () => {
  expectInvalid(promptSchema, {
    prompt: "a",
  });
});

test("rejects prompt longer than 2000 characters", () => {
  expectInvalid(promptSchema, {
    prompt: "a".repeat(2001),
  });
});

test("rejects empty and whitespace-only prompts", () => {
  for (const prompt of ["", " ", "   ", "\t", "\n"]) {
    expectInvalid(promptSchema, { prompt });
  }
});

test("rejects missing prompt", () => {
  expectInvalid(promptSchema, {});
});

test("rejects null prompt", () => {
  expectInvalid(promptSchema, { prompt: null });
});

test("rejects undefined prompt", () => {
  expectInvalid(promptSchema, { prompt: undefined });
});

test("rejects non-string prompt values", () => {
  const invalidValues: unknown[] = [
    123,
    true,
    false,
    [],
    ["Create a website"],
    {},
    { text: "Create a website" },
    null,
  ];

  for (const prompt of invalidValues) {
    expectInvalid(promptSchema, { prompt });
  }
});

test("rejects invalid complete prompt inputs", () => {
  const invalidInputs: unknown[] = [
    null,
    [],
    "Create a website",
    123,
    true,
  ];

  for (const input of invalidInputs) {
    expectInvalid(promptSchema, input);
  }
});

/* =========================================================
   Project Name Validation
========================================================= */

test("accepts a valid project name", () => {
  expectValid(createProjectSchema, {
    name: "Cafe",
    initialPrompt: "Create a cafe website with a menu",
  });
});

test("accepts project name with exactly 2 characters", () => {
  expectValid(createProjectSchema, {
    name: "AI",
    initialPrompt: "Create an artificial intelligence website",
  });
});

test("accepts project name with exactly 80 characters", () => {
  expectValid(createProjectSchema, {
    name: "P".repeat(80),
    initialPrompt: "Create a project website with a dashboard",
  });
});

test("trims whitespace from project name", () => {
  const result = createProjectSchema.safeParse({
    name: "  Portfolio  ",
    initialPrompt: "Create a personal portfolio website",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.name, "Portfolio");
  }
});

test("rejects project name shorter than 2 characters", () => {
  expectInvalid(createProjectSchema, {
    name: "A",
    initialPrompt: "Create a portfolio website",
  });
});

test("rejects project name longer than 80 characters", () => {
  expectInvalid(createProjectSchema, {
    name: "P".repeat(81),
    initialPrompt: "Create a portfolio website",
  });
});

test("rejects empty and whitespace-only project names", () => {
  for (const name of ["", " ", "   ", "\t"]) {
    expectInvalid(createProjectSchema, {
      name,
      initialPrompt: "Create a portfolio website",
    });
  }
});

test("rejects missing project name", () => {
  expectInvalid(createProjectSchema, {
    initialPrompt: "Create a portfolio website",
  });
});

test("rejects invalid project name types", () => {
  const invalidValues: unknown[] = [
    123,
    true,
    false,
    [],
    ["Cafe"],
    {},
    { value: "Cafe" },
    null,
  ];

  for (const name of invalidValues) {
    expectInvalid(createProjectSchema, {
      name,
      initialPrompt: "Create a cafe website",
    });
  }
});

/* =========================================================
   Initial Prompt Validation
========================================================= */

test("rejects missing initial prompt", () => {
  expectInvalid(createProjectSchema, {
    name: "Cafe",
  });
});

test("rejects empty initial prompt", () => {
  expectInvalid(createProjectSchema, {
    name: "Cafe",
    initialPrompt: "",
  });
});

test("rejects whitespace-only initial prompt", () => {
  expectInvalid(createProjectSchema, {
    name: "Cafe",
    initialPrompt: "   ",
  });
});

test("rejects initial prompt shorter than 10 characters", () => {
  expectInvalid(createProjectSchema, {
    name: "Cafe",
    initialPrompt: "Too short",
  });
});

test("accepts initial prompt with exactly 10 characters", () => {
  expectValid(createProjectSchema, {
    name: "Cafe",
    initialPrompt: "1234567890",
  });
});

test("accepts initial prompt with exactly 2000 characters", () => {
  expectValid(createProjectSchema, {
    name: "Cafe",
    initialPrompt: "a".repeat(2000),
  });
});

test("rejects initial prompt longer than 2000 characters", () => {
  expectInvalid(createProjectSchema, {
    name: "Cafe",
    initialPrompt: "a".repeat(2001),
  });
});

test("rejects invalid initial prompt types", () => {
  const invalidValues: unknown[] = [
    123,
    true,
    false,
    [],
    ["Create a website"],
    {},
    { text: "Create a website" },
    null,
  ];

  for (const initialPrompt of invalidValues) {
    expectInvalid(createProjectSchema, {
      name: "Cafe",
      initialPrompt,
    });
  }
});

/* =========================================================
   Description Validation
========================================================= */

test("uses an empty description by default", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    initialPrompt: "Create a cafe website with a menu",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.description, "");
  }
});

test("accepts an empty description", () => {
  expectValid(createProjectSchema, {
    name: "Cafe",
    description: "",
    initialPrompt: "Create a cafe website",
  });
});

test("accepts description with exactly 240 characters", () => {
  expectValid(createProjectSchema, {
    name: "Cafe",
    description: "d".repeat(240),
    initialPrompt: "Create a cafe website",
  });
});

test("rejects description longer than 240 characters", () => {
  expectInvalid(createProjectSchema, {
    name: "Cafe",
    description: "d".repeat(241),
    initialPrompt: "Create a cafe website",
  });
});

test("trims whitespace from description", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    description: "  A cafe website  ",
    initialPrompt: "Create a cafe website",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.description, "A cafe website");
  }
});

test("rejects non-string description", () => {
  expectInvalid(createProjectSchema, {
    name: "Cafe",
    description: 123,
    initialPrompt: "Create a cafe website",
  });
});

/* =========================================================
   Complete Input Validation
========================================================= */

test("rejects null project input", () => {
  expectInvalid(createProjectSchema, null);
});

test("rejects an empty project object", () => {
  expectInvalid(createProjectSchema, {});
});

test("rejects array as project input", () => {
  expectInvalid(createProjectSchema, []);
});

test("rejects string as project input", () => {
  expectInvalid(createProjectSchema, "Cafe");
});

test("rejects number as project input", () => {
  expectInvalid(createProjectSchema, 123);
});

test("rejects boolean as project input", () => {
  expectInvalid(createProjectSchema, true);
});

test("rejects project when both required fields are invalid", () => {
  expectInvalid(createProjectSchema, {
    name: "",
    initialPrompt: "",
  });
});

/* =========================================================
   Extra Fields
========================================================= */

test("strips unknown fields from project input", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    initialPrompt: "Create a cafe website",
    extraField: "unwanted",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal("extraField" in result.data, false);
  }
});

test("strips unknown fields from prompt input", () => {
  const result = promptSchema.safeParse({
    prompt: "Create a cafe website",
    extraField: "unwanted",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal("extraField" in result.data, false);
  }
});

/* =========================================================
   Validation Error Structure
========================================================= */

test("returns a validation issue for an invalid prompt", () => {
  const result = promptSchema.safeParse({
    prompt: "",
  });

  assert.equal(result.success, false);

  if (!result.success) {
    assert.ok(result.error.issues.length > 0);
    assert.ok(
      result.error.issues.some(
        (issue) => issue.path.includes("prompt"),
      ),
    );
  }
});

test("returns validation issues for invalid project fields", () => {
  const result = createProjectSchema.safeParse({
    name: "",
    initialPrompt: "",
  });

  assert.equal(result.success, false);

  if (!result.success) {
    assert.ok(result.error.issues.length > 0);

    const invalidFields = result.error.issues.map(
      (issue) => issue.path[0],
    );

    assert.ok(invalidFields.includes("name"));
    assert.ok(invalidFields.includes("initialPrompt"));
  }
});

/* =========================================================
   Input Stability
========================================================= */

test("does not mutate the original prompt input", () => {
  const input = {
    prompt: "  Create a portfolio website  ",
  };

  const original = { ...input };

  promptSchema.safeParse(input);

  assert.deepEqual(input, original);
});

test("does not mutate the original project input", () => {
  const input = {
    name: "  Portfolio  ",
    initialPrompt: "Create a portfolio website",
  };

  const original = { ...input };

  createProjectSchema.safeParse(input);

  assert.deepEqual(input, original);
});
