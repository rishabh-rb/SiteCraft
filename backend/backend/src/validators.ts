
import { z } from "zod";

/* =========================================================
   Constants
========================================================= */

const PROJECT_NAME_MIN_LENGTH = 2;
const PROJECT_NAME_MAX_LENGTH = 80;

const DESCRIPTION_MAX_LENGTH = 240;

const PROMPT_MIN_LENGTH = 2;
const INITIAL_PROMPT_MIN_LENGTH = 10;
const PROMPT_MAX_LENGTH = 2_000;

/* =========================================================
   Project Creation Schema
========================================================= */

export const createProjectSchema = z.object({
  name: z
    .string({
      message: "Project name must be a string",
    })
    .trim()
    .min(PROJECT_NAME_MIN_LENGTH, {
      message: `Project name must be at least ${PROJECT_NAME_MIN_LENGTH} characters`,
    })
    .max(PROJECT_NAME_MAX_LENGTH, {
      message: `Project name must not exceed ${PROJECT_NAME_MAX_LENGTH} characters`,
    }),

  description: z
    .string({
      message: "Description must be a string",
    })
    .trim()
    .max(DESCRIPTION_MAX_LENGTH, {
      message: `Description must not exceed ${DESCRIPTION_MAX_LENGTH} characters`,
    })
    .default(""),

  initialPrompt: z
    .string({
      message: "Initial prompt must be a string",
    })
    .trim()
    .min(INITIAL_PROMPT_MIN_LENGTH, {
      message: `Initial prompt must be at least ${INITIAL_PROMPT_MIN_LENGTH} characters`,
    })
    .max(PROMPT_MAX_LENGTH, {
      message: `Initial prompt must not exceed ${PROMPT_MAX_LENGTH} characters`,
    }),

  framework: z
    .string({
      message: "Framework must be a string",
    })
    .trim()
    .min(1, {
      message: "Framework cannot be empty",
    })
    .optional(),
});

/* =========================================================
   Prompt Schema
========================================================= */

export const promptSchema = z.object({
  prompt: z
    .string({
      message: "Prompt must be a string",
    })
    .trim()
    .min(PROMPT_MIN_LENGTH, {
      message: `Prompt must be at least ${PROMPT_MIN_LENGTH} characters`,
    })
    .max(PROMPT_MAX_LENGTH, {
      message: `Prompt must not exceed ${PROMPT_MAX_LENGTH} characters`,
    }),
});

/* =========================================================
   Types
========================================================= */

export type CreateProjectInput = z.infer<
  typeof createProjectSchema
>;

export type PromptInput = z.infer<typeof promptSchema>;
