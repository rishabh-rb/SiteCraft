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
      : `Expected valid input but received validation error: ${result.error.message}`,
  );
}

function expectInvalid(
  schema: typeof promptSchema | typeof createProjectSchema,
  input: unknown,
) {
  const result = schema.safeParse(input);

  assert.equal(
    result.success,
    false,
    "Expected validation to fail but it succeeded",
  );
}

/* =========================================================
   Prompt Validation - Valid Inputs
========================================================= */

test("accepts a valid prompt", () => {
  expectValid(promptSchema, {
    prompt: "Create a modern cafe website with a menu and contact page",
  });
});

test("accepts a detailed website prompt", () => {
  expectValid(promptSchema, {
    prompt:
      "Create a responsive SaaS landing page with pricing cards, testimonials, navigation, hero section and a contact form",
  });
});

test("accepts a prompt containing punctuation", () => {
  expectValid(promptSchema, {
    prompt:
      "Create a portfolio website: hero section, projects, skills, contact form, and footer.",
  });
});

test("accepts a prompt containing numbers", () => {
  expectValid(promptSchema, {
    prompt:
      "Create a website with 5 sections, 3 pricing cards, and 10 testimonials.",
  });
});

test("accepts a long descriptive prompt", () => {
  expectValid(promptSchema, {
    prompt:
      "Create a professional and responsive e-commerce website for a fashion brand with a navigation bar, hero section, product categories, product cards, search functionality, filters, shopping cart, wishlist, customer testimonials, newsletter subscription, contact section, footer, mobile responsive layout, modern typography, and a clean premium visual design.",
  });
});

/* =========================================================
   Prompt Validation - Empty / Missing Inputs
========================================================= */

test("rejects an empty prompt", () => {
  expectInvalid(promptSchema, { prompt: "" });
});

test("rejects a missing prompt", () => {
  expectInvalid(promptSchema, {});
});

test("rejects an undefined prompt", () => {
  expectInvalid(promptSchema, { prompt: undefined });
});

test("rejects a null prompt", () => {
  expectInvalid(promptSchema, { prompt: null });
});

test("rejects a whitespace-only prompt", () => {
  expectInvalid(promptSchema, { prompt: "   " });
});

test("rejects a tab-only prompt", () => {
  expectInvalid(promptSchema, { prompt: "\t\t" });
});

test("rejects a newline-only prompt", () => {
  expectInvalid(promptSchema, { prompt: "\n\n" });
});

/* =========================================================
   Prompt Validation - Invalid Types
========================================================= */

test("rejects a numeric prompt", () => {
  expectInvalid(promptSchema, { prompt: 123 });
});

test("rejects a boolean prompt", () => {
  expectInvalid(promptSchema, { prompt: true });
});

test("rejects an array prompt", () => {
  expectInvalid(promptSchema, { prompt: ["Create a website"] });
});

test("rejects an object prompt", () => {
  expectInvalid(promptSchema, {
    prompt: { text: "Create a website" },
  });
});

test("rejects a bigint prompt", () => {
  expectInvalid(promptSchema, { prompt: BigInt(123) });
});

test("rejects null prompt input", () => {
  expectInvalid(promptSchema, null);
});

test("rejects array as complete prompt input", () => {
  expectInvalid(promptSchema, []);
});

test("rejects string as complete prompt input", () => {
  expectInvalid(promptSchema, "Create a website");
});

/* =========================================================
   Project Creation - Valid Inputs
========================================================= */

test("accepts valid project creation input", () => {
  expectValid(createProjectSchema, {
    name: "Cafe",
    initialPrompt: "Create a cafe website with a menu",
  });
});

test("accepts a detailed project", () => {
  expectValid(createProjectSchema, {
    name: "Food Delivery Platform",
    initialPrompt:
      "Create a modern food delivery website with restaurant cards, search, categories, cart, checkout and responsive design",
  });
});

test("accepts a project with punctuation in the name", () => {
  expectValid(createProjectSchema, {
    name: "Ananshi's Portfolio",
    initialPrompt:
      "Create a personal portfolio website with projects, skills and contact information",
  });
});

test("accepts a project name containing numbers", () => {
  expectValid(createProjectSchema, {
    name: "Project 2026",
    initialPrompt:
      "Create a modern project management website with dashboard and task tracking",
  });
});

test("accepts a long project description", () => {
  expectValid(createProjectSchema, {
    name: "AI Powered Certificate Verification Platform",
    initialPrompt:
      "Create a professional web application for verifying certificates using OCR, machine learning based authenticity analysis, certificate details, verification results, responsive dashboard, clean navigation, user-friendly interface, and detailed result pages.",
  });
});

/* =========================================================
   Project Creation - Missing Inputs
========================================================= */

test("rejects a missing project name", () => {
  expectInvalid(createProjectSchema, {
    initialPrompt: "Create a cafe website with a menu",
  });
});

test("rejects a missing initial prompt", () => {
  expectInvalid(createProjectSchema, { name: "Cafe" });
});

test("rejects an empty project name", () => {
  expectInvalid(createProjectSchema, {
    name: "",
    initialPrompt: "Create a cafe website with a menu",
  });
});

test("rejects an empty initial prompt", () => {
  expectInvalid(createProjectSchema, {
    name: "Cafe",
    initialPrompt: "",
  });
});

test("rejects a project with both fields empty", () => {
  expectInvalid(createProjectSchema, {
    name: "",
    initialPrompt: "",
  });
});

test("rejects whitespace-only project name", () => {
  expectInvalid(createProjectSchema, {
    name: "   ",
    initialPrompt: "Create a cafe website with a menu",
  });
});

test("rejects whitespace-only initial prompt", () => {
  expectInvalid(createProjectSchema, {
    name: "Cafe",
    initialPrompt: "   ",
  });
});

test("rejects undefined project name", () => {
  expectInvalid(createProjectSchema, {
    name: undefined,
    initialPrompt: "Create a cafe website",
  });
});

test("rejects undefined initial prompt", () => {
  expectInvalid(createProjectSchema, {
    name: "Cafe",
    initialPrompt: undefined,
  });
});

test("rejects null project name", () => {
  expectInvalid(createProjectSchema, {
    name: null,
    initialPrompt: "Create a cafe website",
  });
});

test("rejects null initial prompt", () => {
  expectInvalid(createProjectSchema, {
    name: "Cafe",
    initialPrompt: null,
  });
});

/* =========================================================
   Project Creation - Invalid Types
========================================================= */

test("rejects non-string project name", () => {
  expectInvalid(createProjectSchema, {
    name: 123,
    initialPrompt: "Create a cafe website",
  });
});

test("rejects non-string initial prompt", () => {
  expectInvalid(createProjectSchema, {
    name: "Cafe",
    initialPrompt: 123,
  });
});

test("rejects boolean project name", () => {
  expectInvalid(createProjectSchema, {
    name: true,
    initialPrompt: "Create a cafe website",
  });
});

test("rejects boolean initial prompt", () => {
  expectInvalid(createProjectSchema, {
    name: "Cafe",
    initialPrompt: false,
  });
});

test("rejects array project name", () => {
  expectInvalid(createProjectSchema, {
    name: ["Cafe"],
    initialPrompt: "Create a cafe website",
  });
});

test("rejects array initial prompt", () => {
  expectInvalid(createProjectSchema, {
    name: "Cafe",
    initialPrompt: ["Create a website"],
  });
});

test("rejects object project name", () => {
  expectInvalid(createProjectSchema, {
    name: { value: "Cafe" },
    initialPrompt: "Create a cafe website",
  });
});

test("rejects object initial prompt", () => {
  expectInvalid(createProjectSchema, {
    name: "Cafe",
    initialPrompt: { value: "Create a cafe website" },
  });
});

/* =========================================================
   Complete Invalid Objects
========================================================= */

test("rejects null project input", () => {
  expectInvalid(createProjectSchema, null);
});

test("rejects an empty object", () => {
  expectInvalid(createProjectSchema, {});
});

test("rejects an array as project input", () => {
  expectInvalid(createProjectSchema, []);
});

test("rejects a string as project input", () => {
  expectInvalid(createProjectSchema, "Cafe");
});

test("rejects a number as project input", () => {
  expectInvalid(createProjectSchema, 123);
});

test("rejects a boolean as project input", () => {
  expectInvalid(createProjectSchema, true);
});

/* =========================================================
   Cross-Field Validation
========================================================= */

test("rejects when project name is valid but prompt is invalid", () => {
  expectInvalid(createProjectSchema, {
    name: "Cafe",
    initialPrompt: "",
  });
});

test("rejects when prompt is valid but project name is invalid", () => {
  expectInvalid(createProjectSchema, {
    name: "",
    initialPrompt: "Create a modern cafe website with a menu",
  });
});

test("rejects when both values have wrong types", () => {
  expectInvalid(createProjectSchema, {
    name: 123,
    initialPrompt: false,
  });
});

/* =========================================================
   Extra Fields
========================================================= */

test("handles an extra field without breaking validation", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    initialPrompt: "Create a cafe website",
    extraField: "test",
  });

  assert.equal(result.success, true);
});

test("handles an extra prompt field without breaking validation", () => {
  const result = promptSchema.safeParse({
    prompt: "Create a cafe website",
    extraField: "test",
  });

  assert.equal(result.success, true);
});

/* =========================================================
   Validation Result Structure
========================================================= */

test("returns structured validation errors for invalid prompt", () => {
  const result = promptSchema.safeParse({
    prompt: "",
  });

  assert.equal(result.success, false);

  if (!result.success) {
    assert.ok(Array.isArray(result.error.issues));
    assert.ok(result.error.issues.length > 0);
  }
});

test("returns structured validation errors for invalid project", () => {
  const result = createProjectSchema.safeParse({
    name: "",
    initialPrompt: "",
  });

  assert.equal(result.success, false);

  if (!result.success) {
    assert.ok(Array.isArray(result.error.issues));
    assert.ok(result.error.issues.length > 0);
  }
});

/* =========================================================
   Schema Stability
========================================================= */

test("prompt schema does not mutate valid input unexpectedly", () => {
  const input = {
    prompt: "Create a modern portfolio website",
  };

  const original = { ...input };
  const result = promptSchema.safeParse(input);

  assert.equal(result.success, true);
  assert.deepEqual(input, original);
});

test("project schema does not mutate valid input unexpectedly", () => {
  const input = {
    name: "Portfolio",
    initialPrompt:
      "Create a modern portfolio website with projects and contact page",
  };

  const original = { ...input };
  const result = createProjectSchema.safeParse(input);

  assert.equal(result.success, true);
  assert.deepEqual(input, original);
});