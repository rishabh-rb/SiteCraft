import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).default(""),
  initialPrompt: z.string().trim().min(10).max(2_000),
  framework: z.string().optional(),
});

export const promptSchema = z.object({ prompt: z.string().trim().min(2).max(2_000) });
