import type { ContentBundle, DesignSystem, GeneratedFile, WebsitePlan } from "./types.js";
import type { ImageAsset } from "./image-agent.js";
export declare function renderHtml(plan: WebsitePlan, design: DesignSystem, content: ContentBundle, assets?: ImageAsset[]): string;
export declare function createFiles(plan: WebsitePlan, design: DesignSystem, content: ContentBundle, html: string, assets?: ImageAsset[]): GeneratedFile[];
