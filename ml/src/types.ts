import { z } from "zod";

export const PageSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(120),
  pageType: z.string().min(1).max(80),
  sections: z.array(z.string().min(1).max(80)).max(20),
});

export const PlanSchema = z.object({
  siteName: z.string().min(1).max(120),
  siteDescription: z.string().min(1).max(500),
  pages: z.array(PageSchema).min(1).max(12),
  theme: z.string().min(1).max(80),
  colorPalette: z.object({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    foreground: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  fontFamily: z.string().min(1).max(80),
  features: z.array(z.string().max(80)).max(20),
});

export type WebsitePlan = z.infer<typeof PlanSchema>;

export interface DesignSystem {
  layout: string;
  componentHierarchy: string[];
  tokens: { radius: string; spacing: string; shadow: string };
  responsiveRules: string[];
}

export const DesignSystemSchema = z.object({
  layout: z.string().min(1).max(500),
  componentHierarchy: z.array(z.string().min(1).max(80)).min(1).max(20),
  tokens: z.object({
    radius: z.string().min(1).max(40),
    spacing: z.string().min(1).max(40),
    shadow: z.string().min(1).max(120),
  }),
  responsiveRules: z.array(z.string().min(1).max(120)).min(1).max(20),
});

export interface ContentBundle {
  heroTitle: string;
  heroSubtitle: string;
  primaryCta: string;
  secondaryCta: string;
  sections: Array<{ title: string; body: string; items?: string[] }>;
  testimonials: Array<{ quote: string; name: string; role: string }>;
  faq: Array<{ question: string; answer: string }>;
  seo: { title: string; description: string };
}

export const ContentBundleSchema = z.object({
  heroTitle: z.string().min(1).max(160),
  heroSubtitle: z.string().min(1).max(260),
  primaryCta: z.string().min(1).max(40),
  secondaryCta: z.string().min(1).max(40),
  sections: z.array(z.object({
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(500),
    items: z.array(z.string().min(1).max(80)).max(8).optional(),
  })).min(1).max(8),
  testimonials: z.array(z.object({
    quote: z.string().min(1).max(200),
    name: z.string().min(1).max(80),
    role: z.string().min(1).max(80),
  })).max(6),
  faq: z.array(z.object({
    question: z.string().min(1).max(120),
    answer: z.string().min(1).max(300),
  })).max(8),
  seo: z.object({ title: z.string().min(1).max(160), description: z.string().min(1).max(260) }),
});

export interface GeneratedFile {
  path: string;
  language: string;
  content: string;
}

export interface CodeBundle {
  html: string;
  files: GeneratedFile[];
  assets: Array<{ kind: string; description: string; url?: string }>;
}

export const CodeBundleSchema = z.object({
  html: z.string().min(1),
  files: z.array(z.object({
    path: z.string().min(1).max(200),
    language: z.string().min(1).max(40),
    content: z.string().min(1),
  })).min(1).max(40),
  assets: z.array(z.object({
    kind: z.string().min(1).max(40),
    description: z.string().min(1).max(200),
    url: z.string().url().optional(),
  })).max(20),
});

export interface GeneratedSitePayload {
  html: string;
  files: GeneratedFile[];
  plan: WebsitePlan;
  design: DesignSystem;
  content: ContentBundle;
  assets: Array<{ kind: string; description: string; url?: string }>;
}

export const QAResultSchema = z.object({
  passed: z.boolean(),
  score: z.number().min(0).max(100),
  issues: z.array(z.object({
    severity: z.enum(["error", "warning", "info"]),
    message: z.string(),
  })),
});

export type QAResult = z.infer<typeof QAResultSchema>;

export interface ProviderConfig {
  provider: "bynara" | "nvidia" | "gemini" | "openai" | "local";
  model: string;
  temperature: number;
  maxTokens: number;
  agentModels: {
    planner: string;
    ui: string;
    content: string;
    code: string;
    qa: string;
  };
  configured: boolean;
  message?: string;
}
