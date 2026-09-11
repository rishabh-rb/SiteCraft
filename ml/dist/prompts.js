"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revisionPrompt = exports.qaPrompt = exports.codePrompt = exports.uiPrompt = exports.contentPrompt = exports.plannerPrompt = void 0;
const plannerPrompt = (userPrompt) => `
You are SiteCraft Planner Agent. Turn the user's website request into strict JSON only.
Return siteName, siteDescription, pages (name, slug, pageType, sections), theme, colorPalette
(primary, secondary, background, foreground as six-digit hex values), fontFamily, and features.
Keep the plan practical, accessible, responsive, and limited to at most 6 pages.
User request: ${userPrompt}
`;
exports.plannerPrompt = plannerPrompt;
const contentPrompt = (plan, userPrompt) => `
You are SiteCraft Content Agent. Return strict JSON for a concise, credible website content bundle.
Return only these keys: heroTitle, heroSubtitle, primaryCta, secondaryCta, sections, testimonials, faq, and seo.
Each section must use { title, body, items? }.
Each testimonial must use { quote, name, role }.
Each faq item must use { question, answer }.
The seo object must use { title, description }.
Do not add ids, types, or extra metadata. Do not invent regulated claims. Plan: ${JSON.stringify(plan)}. Original request: ${userPrompt}
`;
exports.contentPrompt = contentPrompt;
const uiPrompt = (plan, content, userPrompt) => `
You are SiteCraft UI Designer Agent. Return strict JSON only.
Design a clean, production-ready design system with layout, componentHierarchy, tokens, and responsiveRules.
Keep it practical and consistent with the website plan and content.
Plan: ${JSON.stringify(plan)}. Content: ${JSON.stringify(content)}. Original request: ${userPrompt}
`;
exports.uiPrompt = uiPrompt;
const codePrompt = (plan, design, content, userPrompt) => `
You are SiteCraft Code Generation Agent. Return strict JSON only.
Generate an immediately renderable, componentized React website with html, files, and assets.
The files array must include sensible React/TypeScript source files, a package.json, README.md, and .env.example.
Do not reference secrets or server-only values.
Plan: ${JSON.stringify(plan)}. Design: ${JSON.stringify(design)}. Content: ${JSON.stringify(content)}. Original request: ${userPrompt}
`;
exports.codePrompt = codePrompt;
const qaPrompt = (site, userPrompt) => `
You are SiteCraft QA Agent. Return strict JSON only matching the QA result shape.
Review the generated site for syntax, missing pages, responsive issues, accessibility, SEO, links, and alt text.
Site: ${JSON.stringify(site)}. Original request: ${userPrompt}
`;
exports.qaPrompt = qaPrompt;
const revisionPrompt = (site, userPrompt) => `
You are SiteCraft Revision Agent. Return strict JSON only.
Modify the existing generated website as narrowly as possible based on the user's request.
Preserve the current structure unless the change explicitly requires a new section or file.
Return the same shape as the Code Generation Agent with html, files, and assets.
Existing site: ${JSON.stringify(site)}. User request: ${userPrompt}
`;
exports.revisionPrompt = revisionPrompt;
