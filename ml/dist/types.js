"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QAResultSchema = exports.CodeBundleSchema = exports.ContentBundleSchema = exports.DesignSystemSchema = exports.PlanSchema = exports.PageSchema = void 0;
const zod_1 = require("zod");
exports.PageSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(80),
    slug: zod_1.z.string().min(1).max(120),
    pageType: zod_1.z.string().min(1).max(80),
    sections: zod_1.z.array(zod_1.z.string().min(1).max(80)).max(20),
});
exports.PlanSchema = zod_1.z.object({
    siteName: zod_1.z.string().min(1).max(120),
    siteDescription: zod_1.z.string().min(1).max(500),
    pages: zod_1.z.array(exports.PageSchema).min(1).max(12),
    theme: zod_1.z.string().min(1).max(80),
    colorPalette: zod_1.z.object({
        primary: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/),
        secondary: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/),
        background: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/),
        foreground: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/),
    }),
    fontFamily: zod_1.z.string().min(1).max(80),
    features: zod_1.z.array(zod_1.z.string().max(80)).max(20),
});
exports.DesignSystemSchema = zod_1.z.object({
    layout: zod_1.z.string().min(1).max(500),
    componentHierarchy: zod_1.z.array(zod_1.z.string().min(1).max(80)).min(1).max(20),
    tokens: zod_1.z.object({
        radius: zod_1.z.string().min(1).max(40),
        spacing: zod_1.z.string().min(1).max(40),
        shadow: zod_1.z.string().min(1).max(120),
    }),
    responsiveRules: zod_1.z.array(zod_1.z.string().min(1).max(120)).min(1).max(20),
});
exports.ContentBundleSchema = zod_1.z.object({
    heroTitle: zod_1.z.string().min(1).max(160),
    heroSubtitle: zod_1.z.string().min(1).max(260),
    primaryCta: zod_1.z.string().min(1).max(40),
    secondaryCta: zod_1.z.string().min(1).max(40),
    sections: zod_1.z.array(zod_1.z.object({
        title: zod_1.z.string().min(1).max(120),
        body: zod_1.z.string().min(1).max(500),
        items: zod_1.z.array(zod_1.z.string().min(1).max(80)).max(8).optional(),
    })).min(1).max(8),
    testimonials: zod_1.z.array(zod_1.z.object({
        quote: zod_1.z.string().min(1).max(200),
        name: zod_1.z.string().min(1).max(80),
        role: zod_1.z.string().min(1).max(80),
    })).max(6),
    faq: zod_1.z.array(zod_1.z.object({
        question: zod_1.z.string().min(1).max(120),
        answer: zod_1.z.string().min(1).max(300),
    })).max(8),
    seo: zod_1.z.object({ title: zod_1.z.string().min(1).max(160), description: zod_1.z.string().min(1).max(260) }),
});
exports.CodeBundleSchema = zod_1.z.object({
    html: zod_1.z.string().min(1),
    files: zod_1.z.array(zod_1.z.object({
        path: zod_1.z.string().min(1).max(200),
        language: zod_1.z.string().min(1).max(40),
        content: zod_1.z.string().min(1),
    })).min(1).max(40),
    assets: zod_1.z.array(zod_1.z.object({
        kind: zod_1.z.string().min(1).max(40),
        description: zod_1.z.string().min(1).max(200),
        url: zod_1.z.string().url().optional(),
    })).max(20),
});
exports.QAResultSchema = zod_1.z.object({
    passed: zod_1.z.boolean(),
    score: zod_1.z.number().min(0).max(100),
    issues: zod_1.z.array(zod_1.z.object({
        severity: zod_1.z.enum(["error", "warning", "info"]),
        message: zod_1.z.string(),
    })),
});
