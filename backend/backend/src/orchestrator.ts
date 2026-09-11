import { addGeneration, addMessage, getProject, saveWebsite, updateProject } from "./store.js";
import {
  createLocalCode,
  createLocalContent,
  createLocalDesign,
  createLocalPlan,
  createProvider,
  codePrompt,
  contentPrompt,
  plannerPrompt,
  qaPrompt,
  revisionPrompt,
  uiPrompt,
  generateImages,
  PlanSchema,
  CodeBundleSchema,
  DesignSystemSchema,
  ContentBundleSchema,
  QAResultSchema,
  type CodeBundle,
  type ContentBundle,
  type DesignSystem,
  type WebsitePlan,
  type ImageAsset,
  type GeneratedSitePayload,
  type QAResult
} from "@sitecraft/ml";

function getProvider() {
  return createProvider();
}

function qaSite(site: GeneratedSitePayload): QAResult {
  const issues: QAResult["issues"] = [];
  if (!site.plan.pages.length) issues.push({ severity: "error", message: "The website plan has no pages defined." });
  if (!site.html.includes("<main") && !site.html.includes("<body")) issues.push({ severity: "error", message: "Preview markup is missing a main landmark." });
  if (!site.html.includes("viewport")) issues.push({ severity: "error", message: "The preview is missing a responsive viewport meta tag." });
  if (!site.html.includes("alt=") && !site.html.includes("aria-label")) issues.push({ severity: "warning", message: "Generated imagery should include accessible alt text or labels." });
  if (!site.files.some((file) => file.path === "README.md")) issues.push({ severity: "warning", message: "Export package README.md is missing." });
  if (!site.files.some((file) => file.path === "package.json")) issues.push({ severity: "warning", message: "Export package.json is missing." });

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const score = Math.max(0, 100 - errorCount * 25 - warningCount * 5);

  return {
    passed: errorCount === 0,
    score,
    issues
  };
}

function buildSite(
  plan: WebsitePlan,
  design: DesignSystem,
  content: ContentBundle,
  code: CodeBundle,
  assets: ImageAsset[] = []
): GeneratedSitePayload {
  return {
    html: code.html,
    files: code.files,
    plan,
    design,
    content,
    assets: code.assets && code.assets.length > 0 ? code.assets : assets
  };
}

async function runAgent(
  projectId: string,
  agent: string,
  userPrompt: string,
  input: unknown,
  outputFactory: () => Promise<unknown>
): Promise<unknown> {
  await addGeneration(projectId, { agent, userPrompt, input, status: "started" });
  try {
    const output = await outputFactory();
    await addGeneration(projectId, { agent, userPrompt, input, output, status: "completed" });
    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent failed";
    await addGeneration(projectId, { agent, userPrompt, input, error: message, status: "failed" });
    throw error;
  }
}

async function planWebsite(prompt: string): Promise<WebsitePlan> {
  const provider = getProvider();
  if (!provider.config.configured) return createLocalPlan(prompt);
  try {
    const generated = await provider.generateJson<unknown>(plannerPrompt(prompt), "planner");
    const parsed = PlanSchema.safeParse(generated);
    if (parsed.success) return parsed.data;
    throw new Error("Planner returned invalid JSON schema");
  } catch (error) {
    console.warn("Planner agent failed or returned invalid JSON; falling back to local plan.", error);
    return createLocalPlan(prompt);
  }
}

async function designWebsite(plan: WebsitePlan, content: ContentBundle, prompt: string): Promise<DesignSystem> {
  const provider = getProvider();
  if (!provider.config.configured) return createLocalDesign(plan);
  try {
    const generated = await provider.generateJson<unknown>(uiPrompt(plan, content, prompt), "ui");
    const parsed = DesignSystemSchema.safeParse(normalizeDesignSystem(generated, plan));
    if (parsed.success) return parsed.data;
    throw new Error("UI designer returned invalid JSON schema");
  } catch (error) {
    console.warn("UI designer agent failed or returned invalid JSON; falling back to local design.", error);
    return createLocalDesign(plan);
  }
}

function flattenComponentNames(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((entry) => flattenComponentNames(entry));
  const record = value as Record<string, unknown>;
  const names: string[] = [];
  if (typeof record.name === "string") names.push(record.name);
  if (typeof record.type === "string") names.push(record.type);
  if (typeof record.layout === "string") names.push(record.layout);
  if (Array.isArray(record.components)) names.push(...record.components.flatMap((entry) => flattenComponentNames(entry)));
  if (Array.isArray(record.elements)) names.push(...record.elements.map((item) => String(item)));
  if (Array.isArray(record.children)) names.push(...record.children.flatMap((entry) => flattenComponentNames(entry)));
  return names;
}

function normalizeDesignSystem(raw: unknown, plan: WebsitePlan): DesignSystem {
  const candidate = raw as Record<string, unknown> | null;
  if (!candidate || typeof candidate !== "object") throw new Error("UI designer returned invalid JSON");
  const tokens = (candidate.tokens as Record<string, unknown> | undefined) ?? {};
  const layout = (candidate.layout as Record<string, unknown> | string | undefined) ?? {};
  const responsiveRules = Array.isArray(candidate.responsiveRules)
    ? candidate.responsiveRules.map((rule) => String(rule))
    : [
        "Full mobile responsiveness down to 360px viewport",
        "Flexible grid columns auto-adjusting for desktop, tablet, and mobile",
        "Accessible contrast ratios compliant with WCAG 2.1 AA"
      ];
  const componentHierarchy = flattenComponentNames(candidate.componentHierarchy);
  return {
    layout: typeof candidate.layout === "string"
      ? candidate.layout
      : typeof layout === "object" && layout && "containerMaxWidth" in layout
        ? `Container max width ${String((layout as Record<string, unknown>).containerMaxWidth)} with responsive grid spacing.`
        : plan.siteDescription,
    componentHierarchy: componentHierarchy.length ? componentHierarchy : ["Navbar", "Hero", "Features", "Pricing", "Testimonials", "FAQ", "ContactForm", "Footer"],
    tokens: {
      radius: String((tokens.radii as Record<string, unknown> | undefined)?.lg ?? (tokens.radii as Record<string, unknown> | undefined)?.full ?? tokens.radius ?? "16px"),
      spacing: String((tokens.spacing as Record<string, unknown> | undefined)?.md ?? tokens.spacing ?? "1.5rem"),
      shadow: String((tokens.shadows as Record<string, unknown> | undefined)?.elevated ?? tokens.shadow ?? "0 20px 50px rgba(0,0,0,.25)")
    },
    responsiveRules
  };
}

async function contentFor(plan: WebsitePlan, prompt: string): Promise<ContentBundle> {
  const provider = getProvider();
  if (!provider.config.configured) return createLocalContent(plan, prompt);
  try {
    const generated = await provider.generateJson<ContentBundle>(contentPrompt(plan, prompt), "content");
    const normalized = normalizeContentBundle(generated, plan);
    const parsed = ContentBundleSchema.safeParse(normalized);
    if (parsed.success) return parsed.data;
    throw new Error("Content agent returned invalid JSON schema");
  } catch (error) {
    console.warn("Content agent failed or returned invalid JSON; falling back to local content.", error);
    return createLocalContent(plan, prompt);
  }
}

function normalizeContentBundle(raw: unknown, plan: WebsitePlan): ContentBundle {
  const candidate = raw as Record<string, unknown> | null;
  if (!candidate || typeof candidate !== "object") throw new Error("Content agent returned invalid JSON");
  const sections = Array.isArray(candidate.sections)
    ? candidate.sections.map((section) => {
        const entry = section as Record<string, unknown>;
        return {
          title: String(entry.title ?? entry.name ?? entry.type ?? "Section"),
          body: String(entry.body ?? entry.content ?? entry.description ?? ""),
          items: Array.isArray(entry.items) ? entry.items.map((item) => String(item)).filter(Boolean) : undefined
        };
      }).filter((section) => section.title && section.body)
    : [];
  const testimonials = Array.isArray(candidate.testimonials)
    ? candidate.testimonials.map((testimonial) => {
        const entry = testimonial as Record<string, unknown>;
        return {
          quote: String(entry.quote ?? entry.text ?? ""),
          name: String(entry.name ?? entry.author ?? ""),
          role: String(entry.role ?? entry.title ?? "")
        };
      }).filter((testimonial) => testimonial.quote && testimonial.name && testimonial.role)
    : [];
  const faq = Array.isArray(candidate.faq)
    ? candidate.faq.map((item) => {
        const entry = item as Record<string, unknown>;
        return {
          question: String(entry.question ?? entry.title ?? ""),
          answer: String(entry.answer ?? entry.content ?? "")
        };
      }).filter((item) => item.question && item.answer)
    : [];
  const seoRaw = (candidate.seo as Record<string, unknown> | undefined) ?? {};
  return {
    heroTitle: String(candidate.heroTitle ?? plan.siteName),
    heroSubtitle: String(candidate.heroSubtitle ?? plan.siteDescription),
    primaryCta: String(candidate.primaryCta ?? "Get Started"),
    secondaryCta: String(candidate.secondaryCta ?? "Learn More"),
    sections: sections.length ? sections : createLocalContent(plan, plan.siteDescription).sections,
    testimonials: testimonials.length ? testimonials : createLocalContent(plan, plan.siteDescription).testimonials,
    faq: faq.length ? faq : createLocalContent(plan, plan.siteDescription).faq,
    seo: {
      title: String(seoRaw.title ?? seoRaw.metaTitle ?? `${plan.siteName} — ${plan.siteDescription}`),
      description: String(seoRaw.description ?? seoRaw.metaDescription ?? plan.siteDescription)
    }
  };
}

async function codeFor(plan: WebsitePlan, design: DesignSystem, content: ContentBundle, prompt: string, assets: ImageAsset[]): Promise<CodeBundle> {
  const provider = getProvider();
  if (!provider.config.configured) return createLocalCode(plan, design, content, assets);
  try {
    const enrichedPrompt = `${prompt}\nVisual Assets Available: ${JSON.stringify(assets.map(a => ({ kind: a.kind, url: a.url, alt: a.alt })))}`;
    const generated = await provider.generateJson<unknown>(codePrompt(plan, design, content, enrichedPrompt), "code");
    const parsed = CodeBundleSchema.safeParse(normalizeCodeBundle(generated, plan, assets));
    if (parsed.success) return parsed.data;
    throw new Error("Code generation returned invalid JSON schema");
  } catch (error) {
    console.warn("Code generation agent failed or returned invalid JSON; falling back to local code.", error);
    return createLocalCode(plan, design, content, assets);
  }
}

function inferLanguage(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".tsx") || lower.endsWith(".ts")) return lower.endsWith(".tsx") ? "tsx" : "ts";
  if (lower.endsWith(".jsx") || lower.endsWith(".js")) return lower.endsWith(".jsx") ? "jsx" : "js";
  if (lower.endsWith(".css")) return "css";
  if (lower.endsWith(".html")) return "html";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".md")) return "md";
  if (lower.endsWith(".svg")) return "svg";
  return "text";
}

function normalizeCodeBundle(raw: unknown, plan: WebsitePlan, assets: ImageAsset[]): CodeBundle {
  const candidate = raw as Record<string, unknown> | unknown[] | null;
  if (!candidate) throw new Error("Code generation returned invalid JSON");
  const localDefault = createLocalCode(plan, createLocalDesign(plan), createLocalContent(plan, plan.siteDescription), assets);
  const html = typeof candidate === "object" && !Array.isArray(candidate) && typeof candidate.html === "string"
    ? candidate.html
    : localDefault.html;
  const rawFiles = Array.isArray(candidate)
    ? candidate
    : Array.isArray((candidate as Record<string, unknown>).files)
      ? (candidate as Record<string, unknown>).files as unknown[]
      : [];
  const files = rawFiles.map((file) => {
    const entry = file as Record<string, unknown>;
    const path = String(entry.path ?? entry.filePath ?? entry.fileName ?? entry.name ?? "generated-file.txt");
    return {
      path,
      language: String(entry.language ?? inferLanguage(path)),
      content: String(entry.content ?? entry.code ?? entry.text ?? "")
    };
  }).filter((file) => file.path && file.content);

  return {
    html,
    files: files.length ? files : localDefault.files,
    assets: assets.map((a) => ({ kind: a.kind, description: a.description, url: a.url }))
  };
}

async function qaFor(site: GeneratedSitePayload, prompt: string): Promise<QAResult> {
  const provider = getProvider();
  if (!provider.config.configured) return qaSite(site);
  try {
    const generated = await provider.generateJson<unknown>(qaPrompt(site, prompt), "qa");
    const parsed = QAResultSchema.safeParse(generated);
    if (parsed.success) return parsed.data;
    throw new Error("QA agent returned invalid JSON schema");
  } catch (error) {
    console.warn("QA agent failed or returned invalid JSON; falling back to local QA.", error);
    return qaSite(site);
  }
}

export async function generateProject(
  projectId: string,
  prompt: string
): Promise<{ website: GeneratedSitePayload; qa: QAResult; provider: string }> {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");
  await updateProject(projectId, { status: "generating" });
  await addMessage(projectId, "user", prompt);

  try {
    // 1. Planner Agent
    const plan = await runAgent(projectId, "planner", prompt, { prompt }, () => planWebsite(prompt)) as WebsitePlan;

    // 2. Content Agent
    const content = await runAgent(projectId, "content", prompt, plan, () => contentFor(plan, prompt)) as ContentBundle;

    // 3. UI Designer Agent
    const design = await runAgent(projectId, "ui-designer", prompt, { plan, content }, () => designWebsite(plan, content, prompt)) as DesignSystem;

    // 4. Image Agent (queries Unsplash API with prompt and plan)
    const assets = await runAgent(projectId, "image", prompt, { plan, prompt }, async () => {
      return generateImages(prompt, plan, process.env.UNSPLASH_ACCESS_KEY);
    }) as ImageAsset[];

    // 5. Code Generation Agent
    let code = await runAgent(projectId, "code", prompt, { plan, design, content, assets }, () => codeFor(plan, design, content, prompt, assets)) as CodeBundle;
    let site = buildSite(plan, design, content, code, assets);
    let qa = await runAgent(projectId, "qa", prompt, { files: code.files.map((f) => f.path) }, () => qaFor(site, prompt)) as QAResult;

    // Orchestrator retry loop for quality assurance
    let attempts = 1;
    while (!qa.passed && attempts < 3) {
      attempts += 1;
      const retryPrompt = `${prompt}. Note: Previous attempt had QA issues: ${qa.issues.map((i) => i.message).join("; ")}. Please resolve them.`;
      try {
        code = await runAgent(projectId, "code", retryPrompt, { plan, design, content, retryAttempt: attempts }, () => codeFor(plan, design, content, retryPrompt, assets)) as CodeBundle;
        site = buildSite(plan, design, content, code, assets);
        qa = await runAgent(projectId, "qa", retryPrompt, { files: code.files.map((f) => f.path) }, () => qaFor(site, retryPrompt)) as QAResult;
      } catch {
        break;
      }
    }

    const finalSite = { ...site, qa };
    await saveWebsite(projectId, {
      title: plan.siteName,
      description: plan.siteDescription,
      theme: plan.theme,
      colorPalette: plan.colorPalette,
      fontFamily: plan.fontFamily,
      structure: plan,
      generatedCode: finalSite
    });

    const activeProvider = getProvider().config.provider;
    await addMessage(projectId, "assistant", `Successfully generated ${plan.siteName} with ${plan.pages.length} page(s). QA Score: ${qa.score}/100.`);
    return { website: finalSite, qa, provider: activeProvider };
  } catch (error) {
    await updateProject(projectId, { status: "failed" });
    throw error;
  }
}

function reviseSite(site: GeneratedSitePayload, prompt: string): GeneratedSitePayload {
  const lower = prompt.toLowerCase();
  const nextPlan = structuredClone(site.plan);

  if (lower.includes("blue") || lower.includes("navy")) nextPlan.colorPalette.primary = "#3b82f6";
  if (lower.includes("green") || lower.includes("emerald")) nextPlan.colorPalette.primary = "#10b981";
  if (lower.includes("orange") || lower.includes("amber")) nextPlan.colorPalette.primary = "#f97316";
  if (lower.includes("purple") || lower.includes("violet")) nextPlan.colorPalette.primary = "#8b5cf6";
  if (lower.includes("dark")) {
    nextPlan.colorPalette.background = "#0a0d14";
    nextPlan.colorPalette.foreground = "#f8fafc";
  }
  if (lower.includes("light")) {
    nextPlan.colorPalette.background = "#ffffff";
    nextPlan.colorPalette.foreground = "#0a0d14";
  }
  if (lower.includes("serif")) nextPlan.fontFamily = "Georgia, serif";
  if (lower.includes("sans")) nextPlan.fontFamily = "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";

  if (lower.includes("pricing") && !nextPlan.pages[0].sections.includes("pricing")) {
    nextPlan.pages[0].sections.splice(Math.max(1, nextPlan.pages[0].sections.length - 1), 0, "pricing");
  }

  const content = { ...site.content };
  if (lower.includes("hero") && lower.includes("short")) {
    content.heroTitle = content.heroTitle.split(" ").slice(0, 5).join(" ");
  }

  const assets = (site.assets as ImageAsset[]) || [];
  const code = createLocalCode(nextPlan, site.design, content, assets);
  return buildSite(nextPlan, site.design, content, code, assets);
}

export async function reviseProject(projectId: string, prompt: string): Promise<{ website: GeneratedSitePayload; qa: QAResult }> {
  const project = await getProject(projectId);
  if (!project?.websites[0]) throw new Error("Generate a website before revising it");
  await addMessage(projectId, "user", prompt);
  const previous = project.websites[0].generatedCode;
  const provider = getProvider();

  const revised = provider.config.configured
    ? await runAgent(projectId, "revision", prompt, { previousVersion: project.websites[0].version }, async () => {
        try {
          const generated = await provider.generateJson<unknown>(revisionPrompt(previous, prompt), "code");
          const parsed = CodeBundleSchema.safeParse(generated);
          if (parsed.success) {
            return buildSite(previous.plan, previous.design, previous.content, parsed.data, (previous.assets as ImageAsset[]) || []);
          }
        } catch {
          // fallback to incremental local modification
        }
        return reviseSite(previous, prompt);
      }) as GeneratedSitePayload
    : await runAgent(projectId, "revision", prompt, { previousVersion: project.websites[0].version }, async () => reviseSite(previous, prompt)) as GeneratedSitePayload;

  const qa = provider.config.configured ? await qaFor(revised, prompt) : qaSite(revised);
  const finalSite = { ...revised, qa };

  await saveWebsite(projectId, {
    title: finalSite.plan.siteName,
    description: finalSite.plan.siteDescription,
    theme: finalSite.plan.theme,
    colorPalette: finalSite.plan.colorPalette,
    fontFamily: finalSite.plan.fontFamily,
    structure: finalSite.plan,
    generatedCode: finalSite,
    version: project.websites[0].version + 1
  });

  await addMessage(projectId, "assistant", `Applied your modification "${prompt}". The website is now updated to version ${project.websites[0].version + 1}.`);
  return { website: finalSite, qa };
}
