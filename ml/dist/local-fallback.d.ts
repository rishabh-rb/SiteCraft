import type { CodeBundle, ContentBundle, DesignSystem, WebsitePlan } from "./types.js";
export declare function createLocalPlan(prompt: string): WebsitePlan;
export declare function createLocalDesign(plan: WebsitePlan): DesignSystem;
export declare function createLocalContent(plan: WebsitePlan, prompt: string): ContentBundle;
export declare function createLocalCode(plan: WebsitePlan, design: DesignSystem, content: ContentBundle): CodeBundle;
