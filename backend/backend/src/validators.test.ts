
import test from "node:test";
import assert from "node:assert/strict";

import {
  createProjectSchema,
  promptSchema,
} from "./validators.js";

/* =========================================================
   Prompt Validation
========================================================= */

test("accepts a valid prompt", () => {
  const result = promptSchema.safeParse({
    prompt: "Create a modern cafe website with a menu and contact page",
  });

  assert.equal(result.success, true);
});

test("rejects an empty prompt", () => {
  const result = promptSchema.safeParse({
    prompt: "",
  });

  assert.equal(result.success, false);
});

test("rejects a missing prompt", () => {
  const result = promptSchema.safeParse({});

  assert.equal(result.success, false);
});

test("rejects a prompt that is too short", () => {
  const result = promptSchema.safeParse({
    prompt: "hi",
  });

  assert.equal(result.success, false);
});

test("rejects a whitespace-only prompt", () => {
  const result = promptSchema.safeParse({
    prompt: "   ",
  });

  assert.equal(result.success, false);
});

test("accepts a detailed website prompt", () => {
  const result = promptSchema.safeParse({
    prompt:
      "Create a responsive SaaS landing page with pricing cards, testimonials, navigation, hero section and a contact form",
  });

  assert.equal(result.success, true);
});

/* =========================================================
   Project Creation Validation
========================================================= */

test("accepts valid project creation input", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    initialPrompt: "Create a cafe website with a menu",
  });

  assert.equal(result.success, true);
});

test("rejects an empty project name", () => {
  const result = createProjectSchema.safeParse({
    name: "",
    initialPrompt: "Create a cafe website with a menu",
  });

  assert.equal(result.success, false);
});

test("rejects a missing project name", () => {
  const result = createProjectSchema.safeParse({
    initialPrompt: "Create a cafe website with a menu",
  });

  assert.equal(result.success, false);
});

test("rejects a missing initial prompt", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
  });

  assert.equal(result.success, false);
});

test("rejects an empty initial prompt", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    initialPrompt: "",
  });

  assert.equal(result.success, false);
});

test("rejects a project with both fields empty", () => {
  const result = createProjectSchema.safeParse({
    name: "",
    initialPrompt: "",
  });

  assert.equal(result.success, false);
});

test("rejects whitespace-only project name", () => {
  const result = createProjectSchema.safeParse({
    name: "   ",
    initialPrompt: "Create a cafe website with a menu",
  });

  assert.equal(result.success, false);
});

test("rejects whitespace-only initial prompt", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    initialPrompt: "   ",
  });

  assert.equal(result.success, false);
});

test("accepts a detailed project", () => {
  const result = createProjectSchema.safeParse({
    name: "Food Delivery Platform",
    initialPrompt:
      "Create a modern food delivery website with restaurant cards, search, categories, cart, checkout and responsive design",
  });

  assert.equal(result.success, true);
});

/* =========================================================
   Invalid Input Types
========================================================= */

test("rejects non-string prompt", () => {
  const result = promptSchema.safeParse({
    prompt: 123,
  });

  assert.equal(result.success, false);
});

test("rejects non-string project name", () => {
  const result = createProjectSchema.safeParse({
    name: 123,
    initialPrompt: "Create a cafe website",
  });

  assert.equal(result.success, false);
});

test("rejects non-string initial prompt", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    initialPrompt: 123,
  });

  assert.equal(result.success, false);
});

/* =========================================================
   Complete Invalid Objects
========================================================= */

test("rejects null project input", () => {
  const result = createProjectSchema.safeParse(null);

  assert.equal(result.success, false);
});

test("rejects null prompt input", () => {
  const result = promptSchema.safeParse(null);

  assert.equal(result.success, false);
});
