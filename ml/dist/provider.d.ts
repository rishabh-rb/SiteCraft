import type { ProviderConfig } from "./types.js";
export interface JsonProvider {
    config: ProviderConfig;
    generateJson<T>(prompt: string, schemaName: string): Promise<T | null>;
}
export declare class ProviderError extends Error {
    code: "INVALID_API_KEY" | "RATE_LIMIT" | "TIMEOUT" | "MODEL_UNAVAILABLE" | "MALFORMED_RESPONSE" | "API_FAILURE";
    status?: number;
    provider: "bynara" | "nvidia" | "gemini" | "openai" | "local";
    model: string;
    constructor(code: "INVALID_API_KEY" | "RATE_LIMIT" | "TIMEOUT" | "MODEL_UNAVAILABLE" | "MALFORMED_RESPONSE" | "API_FAILURE", message: string, status: number | undefined, provider: "bynara" | "nvidia" | "gemini" | "openai" | "local", model: string, cause?: unknown);
}
export declare function createProvider(env?: NodeJS.ProcessEnv): JsonProvider;
