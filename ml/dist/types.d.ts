import { z } from "zod";
export declare const PageSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
    pageType: z.ZodString;
    sections: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    slug: string;
    pageType: string;
    sections: string[];
}, {
    name: string;
    slug: string;
    pageType: string;
    sections: string[];
}>;
export declare const PlanSchema: z.ZodObject<{
    siteName: z.ZodString;
    siteDescription: z.ZodString;
    pages: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        slug: z.ZodString;
        pageType: z.ZodString;
        sections: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        slug: string;
        pageType: string;
        sections: string[];
    }, {
        name: string;
        slug: string;
        pageType: string;
        sections: string[];
    }>, "many">;
    theme: z.ZodString;
    colorPalette: z.ZodObject<{
        primary: z.ZodString;
        secondary: z.ZodString;
        background: z.ZodString;
        foreground: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        primary: string;
        secondary: string;
        background: string;
        foreground: string;
    }, {
        primary: string;
        secondary: string;
        background: string;
        foreground: string;
    }>;
    fontFamily: z.ZodString;
    features: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    siteName: string;
    siteDescription: string;
    pages: {
        name: string;
        slug: string;
        pageType: string;
        sections: string[];
    }[];
    theme: string;
    colorPalette: {
        primary: string;
        secondary: string;
        background: string;
        foreground: string;
    };
    fontFamily: string;
    features: string[];
}, {
    siteName: string;
    siteDescription: string;
    pages: {
        name: string;
        slug: string;
        pageType: string;
        sections: string[];
    }[];
    theme: string;
    colorPalette: {
        primary: string;
        secondary: string;
        background: string;
        foreground: string;
    };
    fontFamily: string;
    features: string[];
}>;
export type WebsitePlan = z.infer<typeof PlanSchema>;
export interface DesignSystem {
    layout: string;
    componentHierarchy: string[];
    tokens: {
        radius: string;
        spacing: string;
        shadow: string;
    };
    responsiveRules: string[];
}
export declare const DesignSystemSchema: z.ZodObject<{
    layout: z.ZodString;
    componentHierarchy: z.ZodArray<z.ZodString, "many">;
    tokens: z.ZodObject<{
        radius: z.ZodString;
        spacing: z.ZodString;
        shadow: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        radius: string;
        spacing: string;
        shadow: string;
    }, {
        radius: string;
        spacing: string;
        shadow: string;
    }>;
    responsiveRules: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    layout: string;
    componentHierarchy: string[];
    tokens: {
        radius: string;
        spacing: string;
        shadow: string;
    };
    responsiveRules: string[];
}, {
    layout: string;
    componentHierarchy: string[];
    tokens: {
        radius: string;
        spacing: string;
        shadow: string;
    };
    responsiveRules: string[];
}>;
export interface ContentBundle {
    heroTitle: string;
    heroSubtitle: string;
    primaryCta: string;
    secondaryCta: string;
    sections: Array<{
        title: string;
        body: string;
        items?: string[];
    }>;
    testimonials: Array<{
        quote: string;
        name: string;
        role: string;
    }>;
    faq: Array<{
        question: string;
        answer: string;
    }>;
    seo: {
        title: string;
        description: string;
    };
}
export declare const ContentBundleSchema: z.ZodObject<{
    heroTitle: z.ZodString;
    heroSubtitle: z.ZodString;
    primaryCta: z.ZodString;
    secondaryCta: z.ZodString;
    sections: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        body: z.ZodString;
        items: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        body: string;
        items?: string[] | undefined;
    }, {
        title: string;
        body: string;
        items?: string[] | undefined;
    }>, "many">;
    testimonials: z.ZodArray<z.ZodObject<{
        quote: z.ZodString;
        name: z.ZodString;
        role: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        quote: string;
        role: string;
    }, {
        name: string;
        quote: string;
        role: string;
    }>, "many">;
    faq: z.ZodArray<z.ZodObject<{
        question: z.ZodString;
        answer: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        question: string;
        answer: string;
    }, {
        question: string;
        answer: string;
    }>, "many">;
    seo: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
    }, {
        title: string;
        description: string;
    }>;
}, "strip", z.ZodTypeAny, {
    sections: {
        title: string;
        body: string;
        items?: string[] | undefined;
    }[];
    heroTitle: string;
    heroSubtitle: string;
    primaryCta: string;
    secondaryCta: string;
    testimonials: {
        name: string;
        quote: string;
        role: string;
    }[];
    faq: {
        question: string;
        answer: string;
    }[];
    seo: {
        title: string;
        description: string;
    };
}, {
    sections: {
        title: string;
        body: string;
        items?: string[] | undefined;
    }[];
    heroTitle: string;
    heroSubtitle: string;
    primaryCta: string;
    secondaryCta: string;
    testimonials: {
        name: string;
        quote: string;
        role: string;
    }[];
    faq: {
        question: string;
        answer: string;
    }[];
    seo: {
        title: string;
        description: string;
    };
}>;
export interface GeneratedFile {
    path: string;
    language: string;
    content: string;
}
export interface CodeBundle {
    html: string;
    files: GeneratedFile[];
    assets: Array<{
        kind: string;
        description: string;
        url?: string;
    }>;
}
export declare const CodeBundleSchema: z.ZodObject<{
    html: z.ZodString;
    files: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        language: z.ZodString;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        path: string;
        language: string;
        content: string;
    }, {
        path: string;
        language: string;
        content: string;
    }>, "many">;
    assets: z.ZodArray<z.ZodObject<{
        kind: z.ZodString;
        description: z.ZodString;
        url: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        kind: string;
        url?: string | undefined;
    }, {
        description: string;
        kind: string;
        url?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    html: string;
    files: {
        path: string;
        language: string;
        content: string;
    }[];
    assets: {
        description: string;
        kind: string;
        url?: string | undefined;
    }[];
}, {
    html: string;
    files: {
        path: string;
        language: string;
        content: string;
    }[];
    assets: {
        description: string;
        kind: string;
        url?: string | undefined;
    }[];
}>;
export interface GeneratedSitePayload {
    html: string;
    files: GeneratedFile[];
    plan: WebsitePlan;
    design: DesignSystem;
    content: ContentBundle;
    assets: Array<{
        kind: string;
        description: string;
        url?: string;
    }>;
}
export declare const QAResultSchema: z.ZodObject<{
    passed: z.ZodBoolean;
    score: z.ZodNumber;
    issues: z.ZodArray<z.ZodObject<{
        severity: z.ZodEnum<["error", "warning", "info"]>;
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        message: string;
        severity: "error" | "warning" | "info";
    }, {
        message: string;
        severity: "error" | "warning" | "info";
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    issues: {
        message: string;
        severity: "error" | "warning" | "info";
    }[];
    passed: boolean;
    score: number;
}, {
    issues: {
        message: string;
        severity: "error" | "warning" | "info";
    }[];
    passed: boolean;
    score: number;
}>;
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
