"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateProject = generateProject;
exports.reviseProject = reviseProject;
const store_js_1 = require("./store.js");
const ml_1 = require("@sitecraft/ml");
function getProvider() {
    return (0, ml_1.createProvider)();
}
function qaSite(site) {
    const issues = [];
    if (!site.plan.pages.length)
        issues.push({ severity: "error", message: "The website plan has no pages defined." });
    if (!site.html.includes("<main") && !site.html.includes("<body"))
        issues.push({ severity: "error", message: "Preview markup is missing a main landmark." });
    if (!site.html.includes("viewport"))
        issues.push({ severity: "error", message: "The preview is missing a responsive viewport meta tag." });
    if (!site.html.includes("alt=") && !site.html.includes("aria-label"))
        issues.push({ severity: "warning", message: "Generated imagery should include accessible alt text or labels." });
    if (!site.files.some((file) => file.path === "README.md"))
        issues.push({ severity: "warning", message: "Export package README.md is missing." });
    if (!site.files.some((file) => file.path === "package.json"))
        issues.push({ severity: "warning", message: "Export package.json is missing." });
    const errorCount = issues.filter((issue) => issue.severity === "error").length;
    const warningCount = issues.filter((issue) => issue.severity === "warning").length;
    const score = Math.max(0, 100 - errorCount * 25 - warningCount * 5);
    return {
        passed: errorCount === 0,
        score,
        issues
    };
}
function buildSite(plan, design, content, code, assets = []) {
    return {
        html: code.html,
        files: code.files,
        plan,
        design,
        content,
        assets: code.assets && code.assets.length > 0 ? code.assets : assets
    };
}
async function runAgent(projectId, agent, userPrompt, input, outputFactory) {
    await (0, store_js_1.addGeneration)(projectId, { agent, userPrompt, input, status: "started" });
    try {
        const output = await outputFactory();
        await (0, store_js_1.addGeneration)(projectId, { agent, userPrompt, input, output, status: "completed" });
        return output;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Agent failed";
        await (0, store_js_1.addGeneration)(projectId, { agent, userPrompt, input, error: message, status: "failed" });
        throw error;
    }
}
async function planWebsite(prompt) {
    const provider = getProvider();
    if (!provider.config.configured)
        return (0, ml_1.createLocalPlan)(prompt);
    try {
        const generated = await provider.generateJson((0, ml_1.plannerPrompt)(prompt), "planner");
        const parsed = ml_1.PlanSchema.safeParse(generated);
        if (parsed.success)
            return parsed.data;
        throw new Error("Planner returned invalid JSON schema");
    }
    catch (error) {
        console.warn("Planner agent failed or returned invalid JSON; falling back to local plan.", error);
        return (0, ml_1.createLocalPlan)(prompt);
    }
}
async function designWebsite(plan, content, prompt) {
    const provider = getProvider();
    if (!provider.config.configured)
        return (0, ml_1.createLocalDesign)(plan);
    try {
        const generated = await provider.generateJson((0, ml_1.uiPrompt)(plan, content, prompt), "ui");
        const parsed = ml_1.DesignSystemSchema.safeParse(normalizeDesignSystem(generated, plan));
        if (parsed.success)
            return parsed.data;
        throw new Error("UI designer returned invalid JSON schema");
    }
    catch (error) {
        console.warn("UI designer agent failed or returned invalid JSON; falling back to local design.", error);
        return (0, ml_1.createLocalDesign)(plan);
    }
}
function flattenComponentNames(value) {
    if (!value || typeof value !== "object")
        return [];
    if (Array.isArray(value))
        return value.flatMap((entry) => flattenComponentNames(entry));
    const record = value;
    const names = [];
    if (typeof record.name === "string")
        names.push(record.name);
    if (typeof record.type === "string")
        names.push(record.type);
    if (typeof record.layout === "string")
        names.push(record.layout);
    if (Array.isArray(record.components))
        names.push(...record.components.flatMap((entry) => flattenComponentNames(entry)));
    if (Array.isArray(record.elements))
        names.push(...record.elements.map((item) => String(item)));
    if (Array.isArray(record.children))
        names.push(...record.children.flatMap((entry) => flattenComponentNames(entry)));
    return names;
}
function normalizeDesignSystem(raw, plan) {
    const candidate = raw;
    if (!candidate || typeof candidate !== "object")
        throw new Error("UI designer returned invalid JSON");
    const tokens = candidate.tokens ?? {};
    const layout = candidate.layout ?? {};
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
                ? `Container max width ${String(layout.containerMaxWidth)} with responsive grid spacing.`
                : plan.siteDescription,
        componentHierarchy: componentHierarchy.length ? componentHierarchy : ["Navbar", "Hero", "Features", "Pricing", "Testimonials", "FAQ", "ContactForm", "Footer"],
        tokens: {
            radius: String(tokens.radii?.lg ?? tokens.radii?.full ?? tokens.radius ?? "16px"),
            spacing: String(tokens.spacing?.md ?? tokens.spacing ?? "1.5rem"),
            shadow: String(tokens.shadows?.elevated ?? tokens.shadow ?? "0 20px 50px rgba(0,0,0,.25)")
        },
        responsiveRules
    };
}
async function contentFor(plan, prompt) {
    const provider = getProvider();
    if (!provider.config.configured)
        return (0, ml_1.createLocalContent)(plan, prompt);
    try {
        const generated = await provider.generateJson((0, ml_1.contentPrompt)(plan, prompt), "content");
        const normalized = normalizeContentBundle(generated, plan);
        const parsed = ml_1.ContentBundleSchema.safeParse(normalized);
        if (parsed.success)
            return parsed.data;
        throw new Error("Content agent returned invalid JSON schema");
    }
    catch (error) {
        console.warn("Content agent failed or returned invalid JSON; falling back to local content.", error);
        return (0, ml_1.createLocalContent)(plan, prompt);
    }
}
function normalizeContentBundle(raw, plan) {
    const candidate = raw;
    if (!candidate || typeof candidate !== "object")
        throw new Error("Content agent returned invalid JSON");
    const sections = Array.isArray(candidate.sections)
        ? candidate.sections.map((section) => {
            const entry = section;
            return {
                title: String(entry.title ?? entry.name ?? entry.type ?? "Section"),
                body: String(entry.body ?? entry.content ?? entry.description ?? ""),
                items: Array.isArray(entry.items) ? entry.items.map((item) => String(item)).filter(Boolean) : undefined
            };
        }).filter((section) => section.title && section.body)
        : [];
    const testimonials = Array.isArray(candidate.testimonials)
        ? candidate.testimonials.map((testimonial) => {
            const entry = testimonial;
            return {
                quote: String(entry.quote ?? entry.text ?? ""),
                name: String(entry.name ?? entry.author ?? ""),
                role: String(entry.role ?? entry.title ?? "")
            };
        }).filter((testimonial) => testimonial.quote && testimonial.name && testimonial.role)
        : [];
    const faq = Array.isArray(candidate.faq)
        ? candidate.faq.map((item) => {
            const entry = item;
            return {
                question: String(entry.question ?? entry.title ?? ""),
                answer: String(entry.answer ?? entry.content ?? "")
            };
        }).filter((item) => item.question && item.answer)
        : [];
    const seoRaw = candidate.seo ?? {};
    return {
        heroTitle: String(candidate.heroTitle ?? plan.siteName),
        heroSubtitle: String(candidate.heroSubtitle ?? plan.siteDescription),
        primaryCta: String(candidate.primaryCta ?? "Get Started"),
        secondaryCta: String(candidate.secondaryCta ?? "Learn More"),
        sections: sections.length ? sections : (0, ml_1.createLocalContent)(plan, plan.siteDescription).sections,
        testimonials: testimonials.length ? testimonials : (0, ml_1.createLocalContent)(plan, plan.siteDescription).testimonials,
        faq: faq.length ? faq : (0, ml_1.createLocalContent)(plan, plan.siteDescription).faq,
        seo: {
            title: String(seoRaw.title ?? seoRaw.metaTitle ?? `${plan.siteName} — ${plan.siteDescription}`),
            description: String(seoRaw.description ?? seoRaw.metaDescription ?? plan.siteDescription)
        }
    };
}
async function codeFor(plan, design, content, prompt, assets) {
    const provider = getProvider();
    if (!provider.config.configured)
        return (0, ml_1.createLocalCode)(plan, design, content, assets);
    try {
        const enrichedPrompt = `${prompt}\nVisual Assets Available: ${JSON.stringify(assets.map(a => ({ kind: a.kind, url: a.url, alt: a.alt })))}`;
        const generated = await provider.generateJson((0, ml_1.codePrompt)(plan, design, content, enrichedPrompt), "code");
        const parsed = ml_1.CodeBundleSchema.safeParse(normalizeCodeBundle(generated, plan, assets));
        if (parsed.success)
            return parsed.data;
        throw new Error("Code generation returned invalid JSON schema");
    }
    catch (error) {
        console.warn("Code generation agent failed or returned invalid JSON; falling back to local code.", error);
        return (0, ml_1.createLocalCode)(plan, design, content, assets);
    }
}
function inferLanguage(path) {
    const lower = path.toLowerCase();
    if (lower.endsWith(".tsx") || lower.endsWith(".ts"))
        return lower.endsWith(".tsx") ? "tsx" : "ts";
    if (lower.endsWith(".jsx") || lower.endsWith(".js"))
        return lower.endsWith(".jsx") ? "jsx" : "js";
    if (lower.endsWith(".css"))
        return "css";
    if (lower.endsWith(".html"))
        return "html";
    if (lower.endsWith(".json"))
        return "json";
    if (lower.endsWith(".md"))
        return "md";
    if (lower.endsWith(".svg"))
        return "svg";
    return "text";
}
function normalizeCodeBundle(raw, plan, assets) {
    const candidate = raw;
    if (!candidate)
        throw new Error("Code generation returned invalid JSON");
    const localDefault = (0, ml_1.createLocalCode)(plan, (0, ml_1.createLocalDesign)(plan), (0, ml_1.createLocalContent)(plan, plan.siteDescription), assets);
    const html = typeof candidate === "object" && !Array.isArray(candidate) && typeof candidate.html === "string"
        ? candidate.html
        : localDefault.html;
    const rawFiles = Array.isArray(candidate)
        ? candidate
        : Array.isArray(candidate.files)
            ? candidate.files
            : [];
    const files = rawFiles.map((file) => {
        const entry = file;
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
async function qaFor(site, prompt) {
    const provider = getProvider();
    if (!provider.config.configured)
        return qaSite(site);
    try {
        const generated = await provider.generateJson((0, ml_1.qaPrompt)(site, prompt), "qa");
        const parsed = ml_1.QAResultSchema.safeParse(generated);
        if (parsed.success)
            return parsed.data;
        throw new Error("QA agent returned invalid JSON schema");
    }
    catch (error) {
        console.warn("QA agent failed or returned invalid JSON; falling back to local QA.", error);
        return qaSite(site);
    }
}
async function generateProject(projectId, prompt) {
    const project = await (0, store_js_1.getProject)(projectId);
    if (!project)
        throw new Error("Project not found");
    await (0, store_js_1.updateProject)(projectId, { status: "generating" });
    await (0, store_js_1.addMessage)(projectId, "user", prompt);
    try {
        // 1. Planner Agent
        const plan = await runAgent(projectId, "planner", prompt, { prompt }, () => planWebsite(prompt));
        // 2. Content Agent
        const content = await runAgent(projectId, "content", prompt, plan, () => contentFor(plan, prompt));
        // 3. UI Designer Agent
        const design = await runAgent(projectId, "ui-designer", prompt, { plan, content }, () => designWebsite(plan, content, prompt));
        // 4. Image Agent (queries Unsplash API with prompt and plan)
        const assets = await runAgent(projectId, "image", prompt, { plan, prompt }, async () => {
            return (0, ml_1.generateImages)(prompt, plan, process.env.UNSPLASH_ACCESS_KEY);
        });
        // 5. Code Generation Agent
        let code = await runAgent(projectId, "code", prompt, { plan, design, content, assets }, () => codeFor(plan, design, content, prompt, assets));
        let site = buildSite(plan, design, content, code, assets);
        let qa = await runAgent(projectId, "qa", prompt, { files: code.files.map((f) => f.path) }, () => qaFor(site, prompt));
        // Orchestrator retry loop for quality assurance
        let attempts = 1;
        while (!qa.passed && attempts < 3) {
            attempts += 1;
            const retryPrompt = `${prompt}. Note: Previous attempt had QA issues: ${qa.issues.map((i) => i.message).join("; ")}. Please resolve them.`;
            try {
                code = await runAgent(projectId, "code", retryPrompt, { plan, design, content, retryAttempt: attempts }, () => codeFor(plan, design, content, retryPrompt, assets));
                site = buildSite(plan, design, content, code, assets);
                qa = await runAgent(projectId, "qa", retryPrompt, { files: code.files.map((f) => f.path) }, () => qaFor(site, retryPrompt));
            }
            catch {
                break;
            }
        }
        const finalSite = { ...site, qa };
        await (0, store_js_1.saveWebsite)(projectId, {
            title: plan.siteName,
            description: plan.siteDescription,
            theme: plan.theme,
            colorPalette: plan.colorPalette,
            fontFamily: plan.fontFamily,
            structure: plan,
            generatedCode: finalSite
        });
        const activeProvider = getProvider().config.provider;
        await (0, store_js_1.addMessage)(projectId, "assistant", `Successfully generated ${plan.siteName} with ${plan.pages.length} page(s). QA Score: ${qa.score}/100.`);
        return { website: finalSite, qa, provider: activeProvider };
    }
    catch (error) {
        await (0, store_js_1.updateProject)(projectId, { status: "failed" });
        throw error;
    }
}
function reviseSite(site, prompt) {
    const lower = prompt.toLowerCase();
    const nextPlan = structuredClone(site.plan);
    if (lower.includes("blue") || lower.includes("navy"))
        nextPlan.colorPalette.primary = "#3b82f6";
    if (lower.includes("green") || lower.includes("emerald"))
        nextPlan.colorPalette.primary = "#10b981";
    if (lower.includes("orange") || lower.includes("amber"))
        nextPlan.colorPalette.primary = "#f97316";
    if (lower.includes("purple") || lower.includes("violet"))
        nextPlan.colorPalette.primary = "#8b5cf6";
    if (lower.includes("dark")) {
        nextPlan.colorPalette.background = "#0a0d14";
        nextPlan.colorPalette.foreground = "#f8fafc";
    }
    if (lower.includes("light")) {
        nextPlan.colorPalette.background = "#ffffff";
        nextPlan.colorPalette.foreground = "#0a0d14";
    }
    if (lower.includes("serif"))
        nextPlan.fontFamily = "Georgia, serif";
    if (lower.includes("sans"))
        nextPlan.fontFamily = "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";
    if (lower.includes("pricing") && !nextPlan.pages[0].sections.includes("pricing")) {
        nextPlan.pages[0].sections.splice(Math.max(1, nextPlan.pages[0].sections.length - 1), 0, "pricing");
    }
    const content = { ...site.content };
    if (lower.includes("hero") && lower.includes("short")) {
        content.heroTitle = content.heroTitle.split(" ").slice(0, 5).join(" ");
    }
    const assets = site.assets || [];
    const code = (0, ml_1.createLocalCode)(nextPlan, site.design, content, assets);
    return buildSite(nextPlan, site.design, content, code, assets);
}
async function reviseProject(projectId, prompt) {
    const project = await (0, store_js_1.getProject)(projectId);
    if (!project?.websites[0])
        throw new Error("Generate a website before revising it");
    await (0, store_js_1.addMessage)(projectId, "user", prompt);
    const previous = project.websites[0].generatedCode;
    const provider = getProvider();
    const revised = provider.config.configured
        ? await runAgent(projectId, "revision", prompt, { previousVersion: project.websites[0].version }, async () => {
            try {
                const generated = await provider.generateJson((0, ml_1.revisionPrompt)(previous, prompt), "code");
                const parsed = ml_1.CodeBundleSchema.safeParse(generated);
                if (parsed.success) {
                    return buildSite(previous.plan, previous.design, previous.content, parsed.data, previous.assets || []);
                }
            }
            catch {
                // fallback to incremental local modification
            }
            return reviseSite(previous, prompt);
        })
        : await runAgent(projectId, "revision", prompt, { previousVersion: project.websites[0].version }, async () => reviseSite(previous, prompt));
    const qa = provider.config.configured ? await qaFor(revised, prompt) : qaSite(revised);
    const finalSite = { ...revised, qa };
    await (0, store_js_1.saveWebsite)(projectId, {
        title: finalSite.plan.siteName,
        description: finalSite.plan.siteDescription,
        theme: finalSite.plan.theme,
        colorPalette: finalSite.plan.colorPalette,
        fontFamily: finalSite.plan.fontFamily,
        structure: finalSite.plan,
        generatedCode: finalSite,
        version: project.websites[0].version + 1
    });
    await (0, store_js_1.addMessage)(projectId, "assistant", `Applied your modification "${prompt}". The website is now updated to version ${project.websites[0].version + 1}.`);
    return { website: finalSite, qa };
}
