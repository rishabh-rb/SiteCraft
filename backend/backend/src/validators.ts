
import { z } from "zod";

/* =========================================================
   Validation Constants
========================================================= */

const PROJECT_NAME_MIN_LENGTH = 2;
const PROJECT_NAME_MAX_LENGTH = 80;

const DESCRIPTION_MAX_LENGTH = 240;

const PROMPT_MIN_LENGTH = 2;
const INITIAL_PROMPT_MIN_LENGTH = 10;
const PROMPT_MAX_LENGTH = 2_000;

const FRAMEWORK_MIN_LENGTH = 1;

/* =========================================================
   Validation Messages
========================================================= */

const MESSAGES = {
  projectName: {
    type: "Project name must be a string",
    min: `Project name must be at least ${PROJECT_NAME_MIN_LENGTH} characters`,
    max: `Project name must not exceed ${PROJECT_NAME_MAX_LENGTH} characters`,
  },

  description: {
    type: "Description must be a string",
    max: `Description must not exceed ${DESCRIPTION_MAX_LENGTH} characters`,
  },

  initialPrompt: {
    type: "Initial prompt must be a string",
    min: `Initial prompt must be at least ${INITIAL_PROMPT_MIN_LENGTH} characters`,
    max: `Initial prompt must not exceed ${PROMPT_MAX_LENGTH} characters`,
  },

  prompt: {
    type: "Prompt must be a string",
    min: `Prompt must be at least ${PROMPT_MIN_LENGTH} characters`,
    max: `Prompt must not exceed ${PROMPT_MAX_LENGTH} characters`,
  },

  framework: {
    type: "Framework must be a string",
    min: "Framework cannot be empty",
  },
} as const;

/* =========================================================
   Reusable String Schemas
========================================================= */

const projectNameSchema = z
  .string({
    message: MESSAGES.projectName.type,
  })
  .trim()
  .min(PROJECT_NAME_MIN_LENGTH, {
    message: MESSAGES.projectName.min,
  })
  .max(PROJECT_NAME_MAX_LENGTH, {
    message: MESSAGES.projectName.max,
  });

const descriptionSchema = z
  .string({
    message: MESSAGES.description.type,
  })
  .trim()
  .max(DESCRIPTION_MAX_LENGTH, {
    message: MESSAGES.description.max,
  });

const initialPromptSchema = z
  .string({
    message: MESSAGES.initialPrompt.type,
  })
  .trim()
  .min(INITIAL_PROMPT_MIN_LENGTH, {
    message: MESSAGES.initialPrompt.min,
  })
  .max(PROMPT_MAX_LENGTH, {
    message: MESSAGES.initialPrompt.max,
  });

const frameworkSchema = z
  .string({
    message: MESSAGES.framework.type,
  })
  .trim()
  .min(FRAMEWORK_MIN_LENGTH, {
    message: MESSAGES.framework.min,
  });

const promptValueSchema = z
  .string({
    message: MESSAGES.prompt.type,
  })
  .trim()
  .min(PROMPT_MIN_LENGTH, {
    message: MESSAGES.prompt.min,
  })
  .max(PROMPT_MAX_LENGTH, {
    message: MESSAGES.prompt.max,
  });

/* =========================================================
   Project Creation Schema
========================================================= */

export const createProjectSchema = z.object({
  name: projectNameSchema,

  description: descriptionSchema.default(""),

  initialPrompt: initialPromptSchema,

  framework: frameworkSchema.optional(),
});

/* =========================================================
   Prompt Schema
========================================================= */

export const promptSchema = z.object({
  prompt: promptValueSchema,
});

/* =========================================================
   Inferred Types
========================================================= */

export type CreateProjectInput = z.infer<
  typeof createProjectSchema
>;

export type PromptInput = z.infer<
  typeof promptSchema
>;

/* =========================================================
   Validation Helpers
========================================================= */

export function isValidProjectInput(
  input: unknown,
): input is CreateProjectInput {
  return createProjectSchema.safeParse(input).success;
}

export function isValidPromptInput(
  input: unknown,
): input is PromptInput {
  return promptSchema.safeParse(input).success;
}
