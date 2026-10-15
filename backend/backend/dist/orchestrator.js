
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
] as const;

const DEFAULT_RESPONSIVE_RULES = [
  "Support mobile viewports down to 360px",
  "Use responsive layouts for mobile, tablet, and desktop",
  "Use accessible colors, labels, and semantic HTML",
] as const;

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
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return "An unexpected generation error occurred.";
}

function validatePrompt(prompt: string): string {
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

  return trimmed;
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
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();

  return trimmed || fallback;
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

// =====================================================
// Local Quality Assurance
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

  // -----------------------------------------------
  // 1. Validate the website plan
  // -----------------------------------------------

  if (pages.length === 0) {
    issues.push({
      severity: "error",
      message: "The website plan has no pages defined.",
    });
  }

  // -----------------------------------------------
  // 2. Validate the HTML document
  // -----------------------------------------------

  if (!html.trim()) {
    issues.push({
      severity: "error",
      message: "The generated HTML is empty.",
    });
  } else {
    if (!/<html(?:\s|>)/i.test(html)) {
      issues.push({
        severity: "error",
        message: "The HTML document is missing the html element.",
      });
    }

    if (!/<head(?:\s|>)/i.test(html)) {
      issues.push({
        severity: "error",
        message: "The HTML document is missing the head element.",
      });
    }

    if (!/<body(?:\s|>)/i.test(html)) {
      issues.push({
        severity: "error",
        message: "The HTML document is missing the body element.",
      });
    }

    if (!/<main(?:\s|>)/i.test(html)) {
      issues.push({
        severity: "warning",
        message: "The HTML document is missing a main landmark.",
      });
    }

    if (!/<title(?:\s|>)/i.test(html)) {
      issues.push({
        severity: "warning",
        message: "The HTML document is missing a title element.",
      });
    }

    if (!/<meta\b[^>]*\bname\s*=\s*["']viewport["']/i.test(html)) {
      issues.push({
        severity: "error",
        message: "The responsive viewport meta tag is missing.",
      });
    }

    if (!/<html\b[^>]*\blang\s*=/i.test(html)) {
      issues.push({
        severity: "warning",
        message: "The HTML document is missing a language attribute.",
      });
    }

    // ---------------------------------------------
    // 3. Validate image accessibility
    // ---------------------------------------------

    const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];

    for (let index = 0; index < imageTags.length; index++) {
      const imageTag = imageTags[index];

      const altMatch = imageTag.match(
        /\balt\s*=\s*(["'])(.*?)\1/i,
      );

      if (!altMatch || !altMatch[2].trim()) {
        issues.push({
          severity: "warning",
          message: `Image ${index + 1} is missing meaningful alt text.`,
        });
      }
    }

    // ---------------------------------------------
    // 4. Check for a basic responsive stylesheet
    // ---------------------------------------------

    const hasResponsiveStyles =
      /@media\b/i.test(html) ||
      /<meta\b[^>]*\bname\s*=\s*["']viewport["']/i.test(html);

    if (!hasResponsiveStyles) {
      issues.push({
        severity: "warning",
        message: "No responsive layout indicators were found.",
      });
    }

    // ---------------------------------------------
    // 5. Check for basic form accessibility
    // ---------------------------------------------

    const inputTags = html.match(
      /<(?:input|select|textarea)\b[^>]*>/gi,
    ) ?? [];

    for (let index = 0; index < inputTags.length; index++) {
      const inputTag = inputTags[index];

      const isHiddenInput =
        /\btype\s*=\s*["']hidden["']/i.test(inputTag);

      if (isHiddenInput) {
        continue;
      }

      const hasAccessibleName =
        /\baria-label\s*=/i.test(inputTag) ||
        /\baria-labelledby\s*=/i.test(inputTag) ||
        /\bid\s*=\s*["'][^"']+["']/i.test(inputTag);

      if (!hasAccessibleName) {
        issues.push({
          severity: "warning",
          message: `Form control ${index + 1} may be missing an accessible name.`,
        });
      }
    }
  }

  // -----------------------------------------------
  // 6. Validate exported files
  // -----------------------------------------------

  const filePaths = files
    .map((file: unknown) => asRecord(file).path)
    .filter((path): path is string => typeof path === "string");

  const hasReadme = filePaths.includes("README.md");

  if (!hasReadme) {
    issues.push({
      severity: "warning",
      message: "Export package README.md is missing.",
    });
  }

  const hasPackageJson = filePaths.includes("package.json");

  if (!hasPackageJson) {
    issues.push({
      severity: "warning",
      message: "Export package.json is missing.",
    });
  }

  const hasIndexHtml = filePaths.includes("index.html");

  if (!hasIndexHtml) {
    issues.push({
      severity: "warning",
      message: "Export package index.html is missing.",
    });
  }

  // -----------------------------------------------
  // 7. Calculate QA score
  // -----------------------------------------------

  const errorCount = issues.filter(
    (issue) => issue.severity === "error",
  ).length;

  const warningCount = issues.filter(
    (issue) => issue.severity === "warning",
  ).length;

  const score = Math.max(
    0,
    Math.min(
      100,
      100 - errorCount * 25 - warningCount * 5,
    ),
  );

  return {
    passed: errorCount === 0,
    score,
    issues,
  };
}
