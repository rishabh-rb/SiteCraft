
import {
  addGeneration,
  addMessage,
  getProject,
  saveWebsite,
  updateProject,
} from "./store.js";

import {
  createProvider,
  createLocalPlan,
  createLocalDesign,
  createLocalContent,
  createLocalCode,
  generateImages,
  plannerPrompt,
  uiPrompt,
  contentPrompt,
  codePrompt,
  qaPrompt,
  revisionPrompt,
  PlanSchema,
  DesignSystemSchema,
  ContentBundleSchema,
  CodeBundleSchema,
  QAResultSchema,
} from "@sitecraft/ml";

// =====================================================
// Constants and Types
// =====================================================

const MAX_PROMPT_LENGTH = 2_000;
const MAX_QA_ATTEMPTS = 3;

const DEFAULT_COMPONENTS = [
  "Navbar",
  "Hero",
  "Features",
  "Pricing",
  "Testimonials",
  "FAQ",
  "ContactForm",
  "Footer",
];

const DEFAULT_RESPONSIVE_RULES = [
  "Support mobile viewports down to 360px",
  "Use responsive layouts for mobile, tablet, and desktop",
  "Use accessible colors, labels, and semantic HTML",
];

type AnyRecord = Record<string, unknown>;

type QAIssue = {
  severity: "error" | "warning";
  message: string;
};

type LocalQAResult = {
  passed: boolean;
  score: number;
  issues: QAIssue[];
};

type WebsiteFile = {
  path: string;
  language: string;
  content: string;
};

type WebsiteAsset = {
  kind: string;
  description: string;
  url: string;
  alt?: string;
};

type WebsitePlan = ReturnType<typeof createLocalPlan>;
type WebsiteDesign = ReturnType<typeof createLocalDesign>;
type WebsiteContent = ReturnType<typeof createLocalContent>;
type WebsiteCode = ReturnType<typeof createLocalCode>;

type WebsiteData = {
  html: string;
  files: WebsiteFile[];
  plan: WebsitePlan;
  design: WebsiteDesign;
  content: WebsiteContent;
  assets: WebsiteAsset[];
  qa?: unknown;
};

// =====================================================
// Shared Helpers
// =====================================================

function getProvider() {
  return createProvider();
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unexpected generation error occurred.";
}

function validatePrompt(prompt: string): void {
  if (typeof prompt !== "string") {
    throw new Error("Prompt must be a string.");
  }

  const trimmed = prompt.trim();

  if (!trimmed) {
    throw new Error("Prompt cannot be empty.");
  }

  if (trimmed.length > MAX_PROMPT_LENGTH) {
    throw new Error(
      `Prompt cannot exceed ${MAX_PROMPT_LENGTH} characters.`,
    );
  }
}

function isRecord(value: unknown): value is AnyRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function asRecord(value: unknown): AnyRecord {
  return isRecord(value) ? value : {};
}

function safeString(
  value: unknown,
  fallback = "",
): string {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
}

// =====================================================
// Improved Local Quality Assurance
// =====================================================

function qaSite(site: unknown): LocalQAResult {
  const issues: QAIssue[] = [];
  const record = asRecord(site);
  const plan = asRecord(record.plan);

  const pages = Array.isArray(plan.pages)
    ? plan.pages
    : [];

  const html =
    typeof record.html === "string"
      ? record.html
      : "";

  const files = Array.isArray(record.files)
    ? record.files
    : [];

  if (pages.length === 0) {
    issues.push({
      severity: "error",
      message: "The website plan has no pages defined.",
    });
  }

  if (
    !/<main(?:\s|>)/i.test(html) &&
    !/<body(?:\s|>)/i.test(html)
  ) {
    issues.push({
      severity: "error",
      message:
        "Preview markup is missing a main landmark or body element.",
    });
  }

  if (!/<meta\b[^>]*name=["']viewport["']/i.test(html)) {
    issues.push({
      severity: "error",
      message:
        "The preview is missing a responsive viewport meta tag.",
    });
  }

  // Check every image instead of checking only the first one.
  const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];

  for (const imageTag of imageTags) {
    const altMatch = imageTag.match(
      /\balt\s*=\s*(["'])(.*?)\1/i,
    );

    if (!altMatch || !altMatch[2].trim()) {
      issues.push({
        severity: "warning",
        message:
          "An image is missing meaningful alt text.",
      });
    }
  }

  const hasReadme = files.some(
    (file: unknown) =>
      asRecord(file).path === "README.md",
  );

  if (!hasReadme) {
    issues.push({
      severity: "warning",
      message: "Export package README.md is missing.",
    });
  }

  const hasPackageJson = files.some(
    (file: unknown) =>
      asRecord(file).path === "package.json",
  );

  if (!hasPackageJson) {
    issues.push({
      severity: "warning",
      message: "Export package.json is missing.",
    });
  }

  const errorCount = issues.filter(
    (issue) => issue.severity === "error",
  ).length;

  const warningCount = issues.filter(
    (issue) => issue.severity === "warning",
  ).length;

  const score = Math.max(
    0,
    100 - errorCount * 25 - warningCount * 5,
  );

  return {
    passed: errorCount === 0,
    score,
    issues,
  };
}
