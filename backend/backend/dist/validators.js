
import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Project name must be at least 2 characters.")
    .max(80, "Project name cannot exceed 80 characters."),

  description: z
    .string()
    .trim()
    .max(240, "Description cannot exceed 240 characters.")
    .default(""),

  initialPrompt: z
    .string()
    .trim()
    .min(10, "Initial prompt must be at least 10 characters.")
    .max(2000, "Initial prompt cannot exceed 2000 characters."),
});

export const promptSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(2, "Prompt must be at least 2 characters.")
    .max(2000, "Prompt cannot exceed 2000 characters."),
});

// Types inferred from the schemas
export type CreateProjectInput = z.infer<
  typeof createProjectSchema
>;

export type PromptInput = z.infer<
  typeof promptSchema
>;

// Types for data before validation/defaults are applied
export type CreateProjectRequest = z.input<
  typeof createProjectSchema
>;

export type PromptRequest = z.input<
  typeof promptSchema
>;
