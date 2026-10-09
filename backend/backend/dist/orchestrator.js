
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

/* =========================================================
   Constants
========================================================= */

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

/* =========================================================
   Shared Helpers
========================================================= */

type AnyRecord = Record<string, any>;

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

  if (!prompt.trim()) {
    throw new Error("Prompt cannot be empty.");
  }

  if (prompt.trim().length > MAX_PROMPT_LENGTH) {
    throw new Error(
      `Prompt cannot exceed ${MAX_PROMPT_LENGTH} characters.`
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
  fallback = ""
): string {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
}

/* =========================================================
   Quality Assurance
========================================================= */

function qaSite(site: any) {
  const issues: Array<{
    severity: "error" | "warning";
    message: string;
  }> = [];

  const pages = Array.isArray(site.plan?.pages)
    ? site.plan.pages
    : [];

  const html =
    typeof site.html === "string" ? site.html : "";

  const files = Array.isArray(site.files)
    ? site.files
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
      message: "Preview markup is missing a main landmark or body element.",
    });
  }

  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
    issues.push({
      severity: "error",
      message: "The preview is missing a responsive viewport meta tag.",
    });
  }

  if (
    /<img\b/i.test(html) &&
    !/<img\b[^>]*\balt\s*=/i.test(html)
  ) {
    issues.push({
      severity: "warning",
      message: "Generated images should include meaningful alt text.",
    });
  }

  if (!files.some((file: any) => file.path === "README.md")) {
    issues.push({
      severity: "warning",
      message: "Export package README.md is missing.",
    });
  }

  if (!files.some((file: any) => file.path === "package.json")) {
    issues.push({
      severity: "warning",
      message: "Export package.json is missing.",
    });
  }

  const errorCount = issues.filter(
    (issue) => issue.severity === "error"
  ).length;

  const warningCount = issues.filter(
    (issue) => issue.severity === "warning"
  ).length;

  const score = Math.max(
    0,
    100 - errorCount * 25 - warningCount * 5
  );

  return {
    passed: errorCount === 0,
    score,
    issues,
  };
}

function buildSite(
  plan: any,
  design: any,
  content: any,
  code: any,
  assets: any[] = []
) {
  return {
    html: code.html,
    files: code.files,
    plan,
    design,
    content,
    assets:
      Array.isArray(code.assets) && code.assets.length > 0
        ? code.assets
        : assets,
  };
}

/* =========================================================
   Agent Execution
========================================================= */

async function runAgent(
  projectId: string,
  agent: string,
  userPrompt: string,
  input: unknown,
  outputFactory: () => Promise<any>
) {
  await addGeneration(projectId, {
    agent,
    userPrompt,
    input,
    status: "started",
  });

  try {
    const output = await outputFactory();

    await addGeneration(projectId, {
      agent,
      userPrompt,
      input,
      output,
      status: "completed",
    });

    return output;
  } catch (error) {
    const message = errorMessage(error);

    try {
      await addGeneration(projectId, {
        agent,
        userPrompt,
        input,
        error: message,
        status: "failed",
      });
    } catch (loggingError) {
      console.error(
        `Failed to record ${agent} agent error:`,
        errorMessage(loggingError)
      );
    }

    throw error;
  }
}

/* =========================================================
   Planner Agent
========================================================= */

async function planWebsite(prompt: string) {
  const provider = getProvider();

  if (!provider.config.configured) {
    return createLocalPlan(prompt);
  }

  try {
    const generated = await provider.generateJson(
      plannerPrompt(prompt),
      "planner"
    );

    const parsed = PlanSchema.safeParse(generated);

    if (!parsed.success) {
      throw new Error("Planner returned invalid data.");
    }

    return parsed.data;
  } catch (error) {
    console.warn(
      "Planner failed. Using the local planner instead:",
      errorMessage(error)
    );

    return createLocalPlan(prompt);
  }
}

/* =========================================================
   UI Designer Agent
========================================================= */

function flattenComponentNames(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(flattenComponentNames);
  }

  const record = value as AnyRecord;
  const names: string[] = [];

  for (const key of ["name", "type", "layout"]) {
    if (typeof record[key] === "string") {
      names.push(record[key]);
    }
  }

  for (const key of ["components", "children"]) {
    if (Array.isArray(record[key])) {
      names.push(
        ...record[key].flatMap(flattenComponentNames)
      );
    }
  }

  if (Array.isArray(record.elements)) {
    names.push(
      ...record.elements.filter(
        (item: unknown): item is string =>
          typeof item === "string"
      )
    );
  }

  return names;
}

function normalizeDesignSystem(
  raw: unknown,
  plan: any
) {
  if (!isRecord(raw)) {
    throw new Error("UI designer returned invalid data.");
  }

  const tokens = asRecord(raw.tokens);
  const radii = asRecord(tokens.radii);
  const shadows = asRecord(tokens.shadows);
  const layout = asRecord(raw.layout);

  const responsiveRules = Array.isArray(raw.responsiveRules)
    ? raw.responsiveRules
        .filter((rule: unknown) => typeof rule === "string")
        .map((rule: string) => rule.trim())
        .filter(Boolean)
    : DEFAULT_RESPONSIVE_RULES;

  const componentHierarchy =
    flattenComponentNames(raw.componentHierarchy);

  return {
    layout:
      typeof raw.layout === "string"
        ? raw.layout
        : layout.containerMaxWidth
          ? `Container max width ${String(
              layout.containerMaxWidth
            )} with responsive grid spacing.`
          : plan.siteDescription,

    componentHierarchy:
      componentHierarchy.length > 0
        ? [...new Set(componentHierarchy)]
        : [...DEFAULT_COMPONENTS],

    tokens: {
      radius: String(
        radii.lg ??
          radii.full ??
          tokens.radius ??
          "16px"
      ),

      spacing: String(
        asRecord(tokens.spacing).md ??
          tokens.spacing ??
          "1.5rem"
      ),

      shadow: String(
        shadows.elevated ??
          tokens.shadow ??
          "0 20px 50px rgba(0,0,0,.25)"
      ),
    },

    responsiveRules:
      responsiveRules.length > 0
        ? responsiveRules
        : [...DEFAULT_RESPONSIVE_RULES],
  };
}

async function designWebsite(
  plan: any,
  content: any,
  prompt: string
) {
  const provider = getProvider();

  if (!provider.config.configured) {
    return createLocalDesign(plan);
  }

  try {
    const generated = await provider.generateJson(
      uiPrompt(plan, content, prompt),
      "ui"
    );

    const normalized = normalizeDesignSystem(
      generated,
      plan
    );

    const parsed =
      DesignSystemSchema.safeParse(normalized);

    if (!parsed.success) {
      throw new Error("UI designer returned invalid data.");
    }

    return parsed.data;
  } catch (error) {
    console.warn(
      "UI designer failed. Using local design:",
      errorMessage(error)
    );

    return createLocalDesign(plan);
  }
}

/* =========================================================
   Content Agent
========================================================= */

function normalizeContentBundle(
  raw: unknown,
  plan: any
) {
  if (!isRecord(raw)) {
    throw new Error("Content agent returned invalid data.");
  }

  const localContent = createLocalContent(
    plan,
    plan.siteDescription
  );

  const sections = Array.isArray(raw.sections)
    ? raw.sections
        .filter(isRecord)
        .map((section: AnyRecord) => ({
          title: safeString(
            section.title ??
              section.name ??
              section.type,
            "Section"
          ),

          body: safeString(
            section.body ??
              section.content ??
              section.description
          ),

          items: Array.isArray(section.items)
            ? section.items
                .filter(
                  (item: unknown) =>
                    item !== null && item !== undefined
                )
                .map(String)
                .filter(Boolean)
            : undefined,
        }))
        .filter(
          (section: any) =>
            section.title && section.body
        )
    : [];

  const testimonials = Array.isArray(raw.testimonials)
    ? raw.testimonials
        .filter(isRecord)
        .map((item: AnyRecord) => ({
          quote: safeString(item.quote ?? item.text),
          name: safeString(item.name ?? item.author),
          role: safeString(item.role ?? item.title),
        }))
        .filter(
          (item: any) =>
            item.quote && item.name && item.role
        )
    : [];

  const faq = Array.isArray(raw.faq)
    ? raw.faq
        .filter(isRecord)
        .map((item: AnyRecord) => ({
          question: safeString(
            item.question ?? item.title
          ),
          answer: safeString(
            item.answer ?? item.content
          ),
        }))
        .filter(
          (item: any) =>
            item.question && item.answer
        )
    : [];

  const seo = asRecord(raw.seo);

  const normalized = {
    heroTitle: safeString(
      raw.heroTitle,
      plan.siteName
    ),

    heroSubtitle: safeString(
      raw.heroSubtitle,
      plan.siteDescription
    ),

    primaryCta: safeString(
      raw.primaryCta,
      "Get Started"
    ),

    secondaryCta: safeString(
      raw.secondaryCta,
      "Learn More"
    ),

    sections:
      sections.length > 0
        ? sections
        : localContent.sections,

    testimonials:
      testimonials.length > 0
        ? testimonials
        : localContent.testimonials,

    faq:
      faq.length > 0
        ? faq
        : localContent.faq,

    seo: {
      title: safeString(
        seo.title ?? seo.metaTitle,
        `${plan.siteName} — ${plan.siteDescription}`
      ),

      description: safeString(
        seo.description ?? seo.metaDescription,
        plan.siteDescription
      ),
    },
  };

  return normalized;
}

async function contentFor(
  plan: any,
  prompt: string
) {
  const provider = getProvider();

  if (!provider.config.configured) {
    return createLocalContent(plan, prompt);
  }

  try {
    const generated = await provider.generateJson(
      contentPrompt(plan, prompt),
      "content"
    );

    const normalized = normalizeContentBundle(
      generated,
      plan
    );

    const parsed =
      ContentBundleSchema.safeParse(normalized);

    if (!parsed.success) {
      throw new Error("Content agent returned invalid data.");
    }

    return parsed.data;
  } catch (error) {
    console.warn(
      "Content agent failed. Using local content:",
      errorMessage(error)
    );

    return createLocalContent(plan, prompt);
  }
}

/* =========================================================
   Code Generation Agent
========================================================= */

function inferLanguage(path: string): string {
  const lower = path.toLowerCase();

  if (lower.endsWith(".tsx")) return "tsx";
  if (lower.endsWith(".ts")) return "ts";
  if (lower.endsWith(".jsx")) return "jsx";
  if (lower.endsWith(".js")) return "js";
  if (lower.endsWith(".css")) return "css";
  if (lower.endsWith(".html")) return "html";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".md")) return "md";
  if (lower.endsWith(".svg")) return "svg";

  return "text";
}

function normalizeCodeBundle(
  raw: unknown,
  plan: any,
  design: any,
  content: any,
  assets: any[]
) {
  if (!isRecord(raw) && !Array.isArray(raw)) {
    throw new Error("Code generation returned invalid data.");
  }

  const localDefault = createLocalCode(
    plan,
    design,
    content,
    assets
  );

  const candidate = asRecord(raw);

  const html =
    typeof candidate.html === "string" &&
    candidate.html.trim()
      ? candidate.html
      : localDefault.html;

  const rawFiles = Array.isArray(raw)
    ? raw
    : Array.isArray(candidate.files)
      ? candidate.files
      : [];

  const files = rawFiles
    .filter(isRecord)
    .map((file: AnyRecord) => {
      const path = safeString(
        file.path ??
          file.filePath ??
          file.fileName ??
          file.name
      );

      return {
        path,
        language: safeString(
          file.language,
          inferLanguage(path)
        ),
        content: safeString(
          file.content ??
            file.code ??
            file.text
        ),
      };
    })
    .filter(
      (file: any) =>
        file.path &&
        file.content &&
        !file.path.startsWith("/") &&
        !file.path.split("/").includes("..") &&
        !file.path.includes("\\")
    );

  return {
    html,

    files:
      files.length > 0
        ? files
        : localDefault.files,

    assets: assets.map((asset: any) => ({
      kind: asset.kind,
      description: asset.description,
      url: asset.url,
    })),
  };
}

async function codeFor(
  plan: any,
  design: any,
  content: any,
  prompt: string,
  assets: any[]
) {
  const provider = getProvider();

  if (!provider.config.configured) {
    return createLocalCode(
      plan,
      design,
      content,
      assets
    );
  }

  try {
    const assetSummary = assets.map((asset: any) => ({
      kind: asset.kind,
      url: asset.url,
      alt: asset.alt,
    }));

    const enrichedPrompt =
      `${prompt}\nVisual assets available: ` +
      JSON.stringify(assetSummary);

    const generated = await provider.generateJson(
      codePrompt(
        plan,
        design,
        content,
        enrichedPrompt
      ),
      "code"
    );

    const normalized = normalizeCodeBundle(
      generated,
      plan,
      design,
      content,
      assets
    );

    const parsed =
      CodeBundleSchema.safeParse(normalized);

    if (!parsed.success) {
      throw new Error("Code generation returned invalid data.");
    }

    return parsed.data;
  } catch (error) {
    console.warn(
      "Code generation failed. Using local code:",
      errorMessage(error)
    );

    return createLocalCode(
      plan,
      design,
      content,
      assets
    );
  }
}

/* =========================================================
   QA Agent
========================================================= */

async function qaFor(
  site: any,
  prompt: string
) {
  const provider = getProvider();

  if (!provider.config.configured) {
    return qaSite(site);
  }

  try {
    const generated = await provider.generateJson(
      qaPrompt(site, prompt),
      "qa"
    );

    const parsed = QAResultSchema.safeParse(generated);

    if (!parsed.success) {
      throw new Error("QA agent returned invalid data.");
    }

    return parsed.data;
  } catch (error) {
    console.warn(
      "QA agent failed. Using local QA:",
      errorMessage(error)
    );

    return qaSite(site);
  }
}

/* =========================================================
   Generate Project
========================================================= */

export async function generateProject(
  projectId: string,
  prompt: string
) {
  validatePrompt(prompt);

  const project = await getProject(projectId);

  if (!project) {
    throw new Error("Project not found.");
  }

  await updateProject(projectId, {
    status: "generating",
  });

  try {
    await addMessage(
      projectId,
      "user",
      prompt.trim()
    );

    // 1. Planner
    const plan = await runAgent(
      projectId,
      "planner",
      prompt,
      { prompt },
      () => planWebsite(prompt)
    );

    // 2. Content
    const content = await runAgent(
      projectId,
      "content",
      prompt,
      { siteName: plan.siteName },
      () => contentFor(plan, prompt)
    );

    // 3. UI Designer
    const design = await runAgent(
      projectId,
      "ui-designer",
      prompt,
      { siteName: plan.siteName },
      () => designWebsite(plan, content, prompt)
    );

    // 4. Images
    const assets = await runAgent(
      projectId,
      "image",
      prompt,
      { siteName: plan.siteName },
      async () =>
        generateImages(
          prompt,
          plan,
          process.env.UNSPLASH_ACCESS_KEY
        )
    );

    // 5. Code Generation
    let code = await runAgent(
      projectId,
      "code",
      prompt,
      { siteName: plan.siteName },
      () =>
        codeFor(
          plan,
          design,
          content,
          prompt,
          assets
        )
    );

    let site = buildSite(
      plan,
      design,
      content,
      code,
      assets
    );

    // 6. Quality Assurance
    let qa = await runAgent(
      projectId,
      "qa",
      prompt,
      { files: code.files.map((file: any) => file.path) },
      () => qaFor(site, prompt)
    );

    // 7. Retry when QA finds errors
    let attempts = 1;

    while (
      !qa.passed &&
      attempts < MAX_QA_ATTEMPTS
    ) {
      attempts += 1;

      const issues = qa.issues
        .map((issue: any) => issue.message)
        .join("; ");

      const retryPrompt =
        `${prompt}\nFix these QA issues: ${issues}`;

      try {
        code = await runAgent(
          projectId,
          "code",
          retryPrompt,
          { retryAttempt: attempts },
          () =>
            codeFor(
              plan,
              design,
              content,
              retryPrompt,
              assets
            )
        );

        site = buildSite(
          plan,
          design,
          content,
          code,
          assets
        );

        qa = await runAgent(
          projectId,
          "qa",
          retryPrompt,
          { files: code.files.map((file: any) => file.path) },
          () => qaFor(site, retryPrompt)
        );
      } catch (error) {
        console.warn(
          "QA retry failed:",
          errorMessage(error)
        );
        break;
      }
    }

    const finalSite = {
      ...site,
      qa,
    };

    // 8. Save generated website
    await saveWebsite(projectId, {
      title: plan.siteName,
      description: plan.siteDescription,
      theme: plan.theme,
      colorPalette: plan.colorPalette,
      fontFamily: plan.fontFamily,
      structure: plan,
      generatedCode: finalSite,
    });

    const activeProvider = getProvider().config.provider;

    await addMessage(
      projectId,
      "assistant",
      `Successfully generated ${plan.siteName} with ${plan.pages.length} page(s). QA Score: ${qa.score}/100.`
    );

    return {
      website: finalSite,
      qa,
      provider: activeProvider,
    };
  } catch (error) {
    try {
      await updateProject(projectId, {
        status: "failed",
      });
    } catch (statusError) {
      console.error(
        "Could not update project failure status:",
        errorMessage(statusError)
      );
    }

    throw error;
  }
}

/* =========================================================
   Local Website Revision
========================================================= */

function reviseSite(
  site: any,
  prompt: string
) {
  const lower = prompt.toLowerCase();
  const nextPlan = structuredClone(site.plan);

  if (
    lower.includes("blue") ||
    lower.includes("navy")
  ) {
    nextPlan.colorPalette.primary = "#3b82f6";
  }

  if (
    lower.includes("green") ||
    lower.includes("emerald")
  ) {
    nextPlan.colorPalette.primary = "#10b981";
  }

  if (
    lower.includes("orange") ||
    lower.includes("amber")
  ) {
    nextPlan.colorPalette.primary = "#f97316";
  }

  if (
    lower.includes("purple") ||
    lower.includes("violet")
  ) {
    nextPlan.colorPalette.primary = "#8b5cf6";
  }

  if (lower.includes("dark")) {
    nextPlan.colorPalette.background = "#0a0d14";
    nextPlan.colorPalette.foreground = "#f8fafc";
  } else if (lower.includes("light")) {
    nextPlan.colorPalette.background = "#ffffff";
    nextPlan.colorPalette.foreground = "#0a0d14";
  }

  if (lower.includes("serif")) {
    nextPlan.fontFamily = "Georgia, serif";
  } else if (lower.includes("sans")) {
    nextPlan.fontFamily =
      "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";
  }

  const firstPage = nextPlan.pages?.[0];

  if (
    firstPage &&
    Array.isArray(firstPage.sections) &&
    lower.includes("pricing") &&
    !firstPage.sections.includes("pricing")
  ) {
    firstPage.sections.splice(
      Math.max(1, firstPage.sections.length - 1),
      0,
      "pricing"
    );
  }

  const content = {
    ...site.content,
  };

  if (
    lower.includes("hero") &&
    lower.includes("short") &&
    typeof content.heroTitle === "string"
  ) {
    content.heroTitle = content.heroTitle
      .split(/\s+/)
      .slice(0, 5)
      .join(" ");
  }

  const assets = Array.isArray(site.assets)
    ? site.assets
    : [];

  const code = createLocalCode(
    nextPlan,
    site.design,
    content,
    assets
  );

  return buildSite(
    nextPlan,
    site.design,
    content,
    code,
    assets
  );
}

/* =========================================================
   Revise Project
========================================================= */

export async function reviseProject(
  projectId: string,
  prompt: string
) {
  validatePrompt(prompt);

  const project = await getProject(projectId);
  const website = project?.websites?.[0];

  if (!website) {
    throw new Error(
      "Generate a website before revising it."
    );
  }

  const previous = website.generatedCode;

  if (!previous?.plan || !previous?.design || !previous?.content) {
    throw new Error(
      "The existing website data is incomplete and cannot be revised."
    );
  }

  await addMessage(
    projectId,
    "user",
    prompt.trim()
  );

  const provider = getProvider();

  let revised: any;

  if (provider.config.configured) {
    revised = await runAgent(
      projectId,
      "revision",
      prompt,
      { previousVersion: website.version },
      async () => {
        try {
          const generated = await provider.generateJson(
            revisionPrompt(previous, prompt),
            "code"
          );

          const normalized = normalizeCodeBundle(
            generated,
            previous.plan,
            previous.design,
            previous.content,
            previous.assets || []
          );

          const parsed =
            CodeBundleSchema.safeParse(normalized);

          if (parsed.success) {
            return buildSite(
              previous.plan,
              previous.design,
              previous.content,
              parsed.data,
              previous.assets || []
            );
          }
        } catch (error) {
          console.warn(
            "AI revision failed. Using local revision:",
            errorMessage(error)
          );
        }

        return reviseSite(previous, prompt);
      }
    );
  } else {
    revised = await runAgent(
      projectId,
      "revision",
      prompt,
      { previousVersion: website.version },
      async () => reviseSite(previous, prompt)
    );
  }

  const qa = await runAgent(
    projectId,
    "qa",
    prompt,
    { revision: true },
    () => qaFor(revised, prompt)
  );

  const finalSite = {
    ...revised,
    qa,
  };

  const nextVersion =
    (Number.isInteger(website.version) && website.version >= 1
      ? website.version
      : 1) + 1;

  await saveWebsite(projectId, {
    title: finalSite.plan.siteName,
    description: finalSite.plan.siteDescription,
    theme: finalSite.plan.theme,
    colorPalette: finalSite.plan.colorPalette,
    fontFamily: finalSite.plan.fontFamily,
    structure: finalSite.plan,
    generatedCode: finalSite,
    version: nextVersion,
  });

  await addMessage(
    projectId,
    "assistant",
    `Applied your modification. Website updated to version ${nextVersion}. QA Score: ${qa.score}/100.`
  );

  return {
    website: finalSite,
    qa,
  };
}
