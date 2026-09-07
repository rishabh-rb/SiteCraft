import type { WebsitePlan } from "./types.js";
export interface ImageAsset {
    kind: string;
    description: string;
    alt: string;
    url: string;
}
export declare function generateImages(prompt: string, plan: WebsitePlan, accessKey?: string): Promise<ImageAsset[]>;
