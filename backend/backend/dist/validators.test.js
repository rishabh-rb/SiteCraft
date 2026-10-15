
import test from "node:test";
import assert from "node:assert/strict";

import {
  createProjectSchema,
  promptSchema,
} from "./validators.js";

/* =========================
   PROMPT VALIDATION
========================= */

test("accepts valid prompts and trims whitespace", () => {
  const result = promptSchema.safeParse({
    prompt: "  Build a cafe website  ",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.prompt, "Build a cafe website");
  }
});

test("rejects prompts shorter than 2 characters after trimming", () => {
  for (const prompt of ["", " ", "h", "  h  "]) {
    assert.equal(
      promptSchema.safeParse({ prompt }).success,
      false,
      `Expected prompt "${prompt}" to be rejected`,
    );
  }
});

test("accepts prompts at the minimum length", () => {
  assert.equal(
    promptSchema.safeParse({ prompt: "hi" }).success,
    true,
  );
});

test("accepts prompts at the maximum length", () => {
  assert.equal(
    promptSchema.safeParse({
      prompt: "a".repeat(2000),
    }).success,
    true,
  );
});

test("rejects prompts exceeding 2000 characters", () => {
  assert.equal(
    promptSchema.safeParse({
      prompt: "a".repeat(2001),
    }).success,
    false,
  );
});

test("rejects missing or non-string prompts", () => {
  for (const input of [
    {},
    { prompt: undefined },
    { prompt: null },
    { prompt: 123 },
    { prompt: true },
    { prompt: [] },
    { prompt: {} },
  ]) {
    assert.equal(
      promptSchema.safeParse(input).success,
      false,
      `Expected ${JSON.stringify(input)} to be rejected`,
    );
  }
});

test("rejects unexpected prompt fields", () => {
  assert.equal(
    promptSchema.safeParse({
      prompt: "Build a website",
      extra: true,
    }).success,
    false,
  );
});

/* =========================
   PROJECT CREATION
========================= */

test("creates a project with the default description", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    initialPrompt: "Create a cafe website with a menu",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.name, "Cafe");
    assert.equal(result.data.description, "");
    assert.equal(
      result.data.initialPrompt,
      "Create a cafe website with a menu",
    );
  }
});

test("trims project name, description, and initial prompt", () => {
  const result = createProjectSchema.safeParse({
    name: "  Cafe  ",
    description: "  A cafe website  ",
    initialPrompt: "  Create a cafe website  ",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.name, "Cafe");
    assert.equal(result.data.description, "A cafe website");
    assert.equal(result.data.initialPrompt, "Create a cafe website");
  }
});

test("accepts an explicitly empty description", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    description: "",
    initialPrompt: "Create a cafe website",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.description, "");
  }
});

test("rejects non-string project fields", () => {
  const validProject = {
    name: "Cafe",
    initialPrompt: "Create a cafe website",
  };

  for (const name of [null, 123, true, []]) {
    assert.equal(
      createProjectSchema.safeParse({
        ...validProject,
        name,
      }).success,
      false,
    );
  }

  for (const description of [null, 123, true, []]) {
    assert.equal(
      createProjectSchema.safeParse({
        ...validProject,
        description,
      }).success,
      false,
    );
  }

  for (const initialPrompt of [null, 123, true, []]) {
    assert.equal(
      createProjectSchema.safeParse({
        ...validProject,
        initialPrompt,
      }).success,
      false,
    );
  }
});

/* =========================
   PROJECT NAME BOUNDARIES
========================= */

test("validates project name length boundaries", () => {
  const base = {
    initialPrompt: "Create a cafe website",
  };

  for (const name of ["", "A", "A".repeat(81)]) {
    assert.equal(
      createProjectSchema.safeParse({
        ...base,
        name,
      }).success,
      false,
      `Expected project name of length ${name.length} to be rejected`,
    );
  }

  for (const name of ["AB", "A".repeat(80)]) {
    assert.equal(
      createProjectSchema.safeParse({
        ...base,
        name,
      }).success,
      true,
      `Expected project name of length ${name.length} to be accepted`,
    );
  }
});

test("rejects whitespace-only project names", () => {
  for (const name of [" ", "   ", "\t\n"]) {
    assert.equal(
      createProjectSchema.safeParse({
        name,
        initialPrompt: "Create a cafe website",
      }).success,
      false,
    );
  }
});

/* =========================
   INITIAL PROMPT BOUNDARIES
========================= */

test("validates initial prompt length boundaries", () => {
  const base = {
    name: "Cafe",
  };

  for (const initialPrompt of [
    "",
    "short",
    "a".repeat(9),
    " ".repeat(10),
  ]) {
    assert.equal(
      createProjectSchema.safeParse({
        ...base,
        initialPrompt,
      }).success,
      false,
      `Expected initial prompt of length ${initialPrompt.length} to be rejected`,
    );
  }

  for (const initialPrompt of [
    "a".repeat(10),
    "a".repeat(2000),
  ]) {
    assert.equal(
      createProjectSchema.safeParse({
        ...base,
        initialPrompt,
      }).success,
      true,
      `Expected initial prompt of length ${initialPrompt.length} to be accepted`,
    );
  }

  assert.equal(
    createProjectSchema.safeParse({
      ...base,
      initialPrompt: "a".repeat(2001),
    }).success,
    false,
  );
});

/* =========================
   DESCRIPTION BOUNDARIES
========================= */

test("validates description length boundaries", () => {
  const base = {
    name: "Cafe",
    initialPrompt: "Create a cafe website",
  };

  for (const description of ["", "a".repeat(240)]) {
    assert.equal(
      createProjectSchema.safeParse({
        ...base,
        description,
      }).success,
      true,
    );
  }

  assert.equal(
    createProjectSchema.safeParse({
      ...base,
      description: "a".repeat(241),
    }).success,
    false,
  );
});

test("trims whitespace around descriptions", () => {
  const result = createProjectSchema.safeParse({
    name: "Cafe",
    description: "   Cafe website   ",
    initialPrompt: "Create a cafe website",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.description, "Cafe website");
  }
});

/* =========================
   REQUIRED FIELDS
========================= */

test("rejects missing required project fields", () => {
  assert.equal(
    createProjectSchema.safeParse({}).success,
    false,
  );

  assert.equal(
    createProjectSchema.safeParse({
      name: "Cafe",
    }).success,
    false,
  );

  assert.equal(
    createProjectSchema.safeParse({
      initialPrompt: "Create a cafe website",
    }).success,
    false,
  );
});

test("rejects whitespace-only initial prompts", () => {
  for (const initialPrompt of [" ", "   ", "\t\n"]) {
    assert.equal(
      createProjectSchema.safeParse({
        name: "Cafe",
        initialPrompt,
      }).success,
      false,
    );
  }
});

/* =========================
   STRICT OBJECT VALIDATION
========================= */

test("rejects unexpected project fields", () => {
  assert.equal(
    createProjectSchema.safeParse({
      name: "Cafe",
      initialPrompt: "Create a cafe website",
      extra: true,
    }).success,
    false,
  );
});

test("rejects unexpected fields even when valid fields are present", () => {
  assert.equal(
    createProjectSchema.safeParse({
      name: "Cafe",
      description: "",
      initialPrompt: "Create a cafe website",
      userId: "123",
    }).success,
    false,
  );
});
