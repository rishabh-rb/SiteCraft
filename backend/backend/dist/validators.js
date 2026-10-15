
import { z } from "zod";

/* =========================
   Validation Constants
========================= */

const LIMITS = {
  projectName: {
    min: 2,
    max: 80,
  },
  description: {
    max: 240,
  },
  prompt: {
    min: 2,
    initialMin: 10,
    max: 2000,
  },
} as const;

/* =========================
   Validation Messages
========================= */

const MESSAGES = {
  projectNameMin: `Project name must be at least ${LIMITS.projectName.min} characters.`,
  projectNameMax: `Project name cannot exceed ${LIMITS.projectName.max} characters.`,
  descriptionMax: `Description cannot exceed ${LIMITS.description.max} characters.`,
  promptMin: `Prompt must be at least ${LIMITS.prompt.min} characters.`,
  initialPromptMin: `Initial prompt must be at least ${LIMITS.prompt.initialMin} characters.`,
  promptMax: `Prompt cannot exceed ${LIMITS.prompt.max} characters.`,
} as const;

/* =========================
   Reusable Schemas
========================= */

const projectNameSchema = z
  .string()
  .trim()
  .min(LIMITS.projectName.min, MESSAGES.projectNameMin)
  .max(LIMITS.projectName.max, MESSAGES.projectNameMax);

const descriptionSchema = z
  .string()
  .trim()
  .max(LIMITS.description.max, MESSAGES.descriptionMax)
  .default("");

const initialPromptSchema = z
  .string()
  .trim()
  .min(LIMITS.prompt.initialMin, MESSAGES.initialPromptMin)
  .max(LIMITS.prompt.max, MESSAGES.promptMax);

const promptTextSchema = z
  .string()
  .trim()
  .min(LIMITS.prompt.min, MESSAGES.promptMin)
  .max(LIMITS.prompt.max, MESSAGES.promptMax);

/* =========================
   Request Schemas
========================= */

export const createProjectSchema = z
  .object({
    name: projectNameSchema,
    description: descriptionSchema,
    initialPrompt: initialPromptSchema,
  })
  .strict();

export const promptSchema = z
  .object({
    prompt: promptTextSchema,
  })
  .strict();

/* =========================
   Inferred Types
========================= */

export type CreateProjectInput = z.infer<
  typeof createProjectSchema
>;

export type PromptInput = z.infer<
  typeof promptSchema
>;

export type CreateProjectRequest = z.input<
  typeof createProjectSchema
>;

export type PromptRequest = z.input<
  typeof promptSchema
>;
