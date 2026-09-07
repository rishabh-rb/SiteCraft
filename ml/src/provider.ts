import type { ProviderConfig } from "./types.js";

export interface JsonProvider {
  config: ProviderConfig;
  generateJson<T>(prompt: string, schemaName: string): Promise<T | null>;
}

type AgentName = "planner" | "ui" | "content" | "code" | "qa";

const agentModelEnvKeys: Record<AgentName, keyof NodeJS.ProcessEnv> = {
  planner: "PLANNER_MODEL",
  ui: "UI_MODEL",
  content: "CONTENT_MODEL",
  code: "CODE_MODEL",
  qa: "QA_MODEL",
};

const defaultNvidiaBaseUrl = "https://integrate.api.nvidia.com/v1";
const defaultNvidiaModel = "qwen/qwen3-coder-480b-a35b-instruct";
const defaultBynaraBaseUrl = "https://router.bynara.id/v1";
const defaultBynaraModel = "agnes-2.0-flash";
const defaultBynaraApiKey = process.env.NODE_ENV === "development" ? "sk-nry-GTLLjfedbjhnJE6zcyWwJGM6vnjJ-DZOjGFBg06KiUg" : undefined;
const requestTimeoutMs = 60_000;

export class ProviderError extends Error {
  code:
    | "INVALID_API_KEY"
    | "RATE_LIMIT"
    | "TIMEOUT"
    | "MODEL_UNAVAILABLE"
    | "MALFORMED_RESPONSE"
    | "API_FAILURE";
  status?: number;
  provider: "bynara" | "nvidia" | "gemini" | "openai" | "local";
  model: string;

  constructor(
    code:
      | "INVALID_API_KEY"
      | "RATE_LIMIT"
      | "TIMEOUT"
      | "MODEL_UNAVAILABLE"
      | "MALFORMED_RESPONSE"
      | "API_FAILURE",
    message: string,
    status: number | undefined,
    provider: "bynara" | "nvidia" | "gemini" | "openai" | "local",
    model: string,
    cause?: unknown,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.provider = provider;
    this.model = model;
    this.name = "ProviderError";
    if (cause !== undefined) {
      this.cause = cause as Error;
    }
  }
}

function extractJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = (fenced ?? text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function modelEnvKeyFor(schemaName: string): string {
  const envKey = agentModelEnvKeys[schemaName as AgentName];
  return typeof envKey === "string" ? envKey : "NVIDIA_MODEL";
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isModelUnavailableMessage(message: string): boolean {
  return /model.*(not found|not available|unavailable|does not exist|invalid|unsupported)/i.test(message) || /unknown model/i.test(message);
}

function parseResponseText(responseText: string): unknown | null {
  if (!responseText.trim()) return null;
  try {
    return JSON.parse(responseText);
  } catch {
    return null;
  }
}

function errorMessageFromResponse(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  const error = record.error as Record<string, unknown> | undefined;
  const message =
    typeof error?.message === "string"
      ? error.message
      : typeof record.message === "string"
      ? record.message
      : undefined;
  return message?.trim() || fallback;
}

function apiFailure(providerName: string, model: string, error: unknown): ProviderError {
  const message = error instanceof Error ? error.message : String(error);
  if (/fetch failed/i.test(message) || /network/i.test(message)) {
    return new ProviderError(
      "API_FAILURE",
      `${providerName} request failed due to a network error.`,
      undefined,
      providerName.toLowerCase() as "nvidia" | "gemini" | "openai" | "local",
      model,
      error,
    );
  }
  return new ProviderError("API_FAILURE", `${providerName} request failed.`, undefined, providerName.toLowerCase() as "bynara" | "nvidia" | "gemini" | "openai" | "local", model, error);
}

interface ProviderCallArgs {
  apiKey: string;
  baseUrl: string;
  model: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
  schemaName: string;
}

async function callNvidiaChatCompletions<T>(args: ProviderCallArgs): Promise<T | null> {
  type NimsResponse = { choices?: Array<{ message?: { content?: string } }> } | null;
  const endpoint = new URL("chat/completions", args.baseUrl.endsWith("/") ? args.baseUrl : `${args.baseUrl}/`);
  const configEnv = modelEnvKeyFor(args.schemaName);
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${args.apiKey}`,
        },
        body: JSON.stringify({
          model: args.model,
          temperature: args.temperature,
          max_tokens: args.maxTokens,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: args.prompt }],
        }),
        signal: controller.signal,
      });
      const responseText = await response.text();
      const payload = parseResponseText(responseText) as NimsResponse;
      if (!response.ok) {
        const errorMessage = errorMessageFromResponse(payload, responseText || `Request failed with ${response.status}`);
        if (response.status === 401 || response.status === 403) {
          throw new ProviderError("INVALID_API_KEY", "NVIDIA API key is not authorized. Check NVIDIA_API_KEY in .env.", response.status, "nvidia", args.model);
        }
        if (response.status === 429) {
          if (attempt < 4) {
            const retryAfterSeconds = Number(response.headers.get("retry-after") ?? 0);
            await sleep(Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 1000 * 2 ** attempt);
            continue;
          }
          throw new ProviderError("RATE_LIMIT", `NVIDIA rate limit reached for model "${args.model}". Retry later or reduce request volume.`, response.status, "nvidia", args.model);
        }
        if (response.status === 404 || isModelUnavailableMessage(errorMessage)) {
          throw new ProviderError(
            "MODEL_UNAVAILABLE",
            `NVIDIA model "${args.model}" is not available. ${errorMessage} Update ${configEnv} or NVIDIA_MODEL in .env to a supported NVIDIA model.`,
            response.status,
            "nvidia",
            args.model,
          );
        }
        if (response.status === 503 && isModelUnavailableMessage(errorMessage)) {
          throw new ProviderError(
            "MODEL_UNAVAILABLE",
            `NVIDIA model "${args.model}" is not available. ${errorMessage} Update ${configEnv} or NVIDIA_MODEL in .env to a supported NVIDIA model.`,
            response.status,
            "nvidia",
            args.model,
          );
        }
        if ([500, 502, 503, 504].includes(response.status) && attempt < 4) {
          await sleep(1000 * 2 ** attempt);
          continue;
        }
        throw new ProviderError("API_FAILURE", `NVIDIA request failed (${response.status}). ${errorMessage}`, response.status, "nvidia", args.model);
      }

      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new ProviderError("MALFORMED_RESPONSE", "NVIDIA returned a malformed response without message content.", response.status, "nvidia", args.model);
      }
      const parsed = extractJson(content);
      if (parsed === null) {
        throw new ProviderError("MALFORMED_RESPONSE", "NVIDIA returned malformed JSON.", response.status, "nvidia", args.model);
      }
      return parsed as T | null;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (isAbortError(error)) {
        throw new ProviderError("TIMEOUT", `NVIDIA request timed out after ${Math.round(requestTimeoutMs / 1000)} seconds.`, undefined, "nvidia", args.model, error);
      }
      lastError = error;
      if (attempt < 4) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      throw apiFailure("NVIDIA", args.model, error);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw apiFailure("NVIDIA", args.model, lastError ?? new Error("Unknown NVIDIA error"));
}

async function callBynaraRouter<T>(args: ProviderCallArgs): Promise<T | null> {
  type BynaraResponse = { choices?: Array<{ message?: { content?: string } }> } | null;
  const endpoint = new URL("chat/completions", args.baseUrl.endsWith("/") ? args.baseUrl : `${args.baseUrl}/`);
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${args.apiKey}`
        },
        body: JSON.stringify({
          model: args.model,
          messages: [{ role: "user", content: args.prompt }],
          temperature: args.temperature,
          max_output_tokens: args.maxTokens
        }),
        signal: controller.signal
      });
      const responseText = await response.text();
      const payload = parseResponseText(responseText) as BynaraResponse;
      if (!response.ok) {
        const errorMessage = errorMessageFromResponse(payload, responseText || `Request failed with ${response.status}`);
        if (response.status === 401 || response.status === 403) {
          throw new ProviderError("INVALID_API_KEY", "Bynara API key is not authorized. Check BYNARA_API_KEY in .env.", response.status, "bynara", args.model);
        }
        if (response.status === 429) {
          if (attempt < 4) {
            const retryAfterSeconds = Number(response.headers.get("retry-after") ?? 0);
            await sleep(Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 1000 * 2 ** attempt);
            continue;
          }
          throw new ProviderError("RATE_LIMIT", `Bynara rate limit reached for model "${args.model}". Retry later or reduce request volume.`, response.status, "bynara", args.model);
        }
        if ([500, 502, 503, 504].includes(response.status) && attempt < 4) {
          await sleep(1000 * 2 ** attempt);
          continue;
        }
        throw new ProviderError("API_FAILURE", `Bynara request failed (${response.status}). ${errorMessage}`, response.status, "bynara", args.model);
      }

      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new ProviderError("MALFORMED_RESPONSE", "Bynara returned a malformed response without message content.", response.status, "bynara", args.model);
      }
      const parsed = extractJson(content);
      if (parsed === null) {
        throw new ProviderError("MALFORMED_RESPONSE", "Bynara returned malformed JSON.", response.status, "bynara", args.model);
      }
      return parsed as T | null;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (isAbortError(error)) {
        throw new ProviderError("TIMEOUT", `Bynara request timed out after ${Math.round(requestTimeoutMs / 1000)} seconds.`, undefined, "bynara", args.model, error);
      }
      lastError = error;
      if (attempt < 4) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      throw apiFailure("Bynara", args.model, error);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw apiFailure("Bynara", args.model, lastError ?? new Error("Unknown Bynara error"));
}

async function callGemini<T>(args: ProviderCallArgs): Promise<T | null> {
  type GeminiResponse = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> } | null;
  const configEnv = modelEnvKeyFor(args.schemaName);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent?key=${args.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: args.prompt }] }],
          generationConfig: { temperature: args.temperature, maxOutputTokens: args.maxTokens, responseMimeType: "application/json" },
        }),
        signal: controller.signal,
      });
      const responseText = await response.text();
      const payload = parseResponseText(responseText) as GeminiResponse;
      if (!response.ok) {
        const errorMessage = errorMessageFromResponse(payload, responseText || `Request failed with ${response.status}`);
        if (response.status === 401 || response.status === 403) {
          throw new ProviderError("INVALID_API_KEY", "Gemini API key is not authorized. Check GEMINI_API_KEY in .env.", response.status, "gemini", args.model);
        }
        if (response.status === 404 || isModelUnavailableMessage(errorMessage)) {
          throw new ProviderError(
            "MODEL_UNAVAILABLE",
            `Gemini model "${args.model}" is not available. ${errorMessage} Update ${configEnv} or AI_MODEL in .env to a supported Gemini model.`,
            response.status,
            "gemini",
            args.model,
          );
        }
        if (isRetryableStatus(response.status) && attempt < 4) {
          await sleep(1000 * 2 ** attempt);
          continue;
        }
        if (response.status === 429) {
          throw new ProviderError("RATE_LIMIT", "Gemini API rate limit reached. Retry later or lower request volume.", response.status, "gemini", args.model);
        }
        throw new ProviderError("API_FAILURE", `Gemini request failed (${response.status}). ${errorMessage}`, response.status, "gemini", args.model);
      }
      const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part?.text ?? "").join("")
        || (payload as any)?.choices?.[0]?.message?.content
        || "";
      const parsed = extractJson(text);
      if (parsed === null) {
        throw new ProviderError("MALFORMED_RESPONSE", "Gemini returned malformed JSON.", response.status, "gemini", args.model);
      }
      return parsed as T | null;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (isAbortError(error)) {
        throw new ProviderError("TIMEOUT", `Gemini request timed out after ${Math.round(requestTimeoutMs / 1000)} seconds.`, undefined, "gemini", args.model, error);
      }
      if (attempt < 4) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      throw apiFailure("Gemini", args.model, error);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw apiFailure("Gemini", args.model, new Error("Unknown Gemini error"));
}

async function callOpenAI<T>(args: ProviderCallArgs): Promise<T | null> {
  type OpenAIResponse = { choices?: Array<{ message?: { content?: string } }> } | null;
  const configEnv = modelEnvKeyFor(args.schemaName);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${args.apiKey}` },
        body: JSON.stringify({
          model: args.model,
          temperature: args.temperature,
          max_tokens: args.maxTokens,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: args.prompt }],
        }),
        signal: controller.signal,
      });
      const responseText = await response.text();
      const payload = parseResponseText(responseText) as OpenAIResponse;
      if (!response.ok) {
        const errorMessage = errorMessageFromResponse(payload, responseText || `Request failed with ${response.status}`);
        if (response.status === 401 || response.status === 403) {
          throw new ProviderError("INVALID_API_KEY", "OpenAI API key is not authorized. Check OPENAI_API_KEY in .env.", response.status, "openai", args.model);
        }
        if (response.status === 404 || isModelUnavailableMessage(errorMessage)) {
          throw new ProviderError(
            "MODEL_UNAVAILABLE",
            `OpenAI model "${args.model}" is not available. ${errorMessage} Update ${configEnv} or AI_MODEL in .env to a supported OpenAI model.`,
            response.status,
            "openai",
            args.model,
          );
        }
        if (isRetryableStatus(response.status) && attempt < 4) {
          await sleep(1000 * 2 ** attempt);
          continue;
        }
        if (response.status === 429) {
          throw new ProviderError("RATE_LIMIT", "OpenAI rate limit reached. Retry later or lower request volume.", response.status, "openai", args.model);
        }
        throw new ProviderError("API_FAILURE", `OpenAI request failed (${response.status}). ${errorMessage}`, response.status, "openai", args.model);
      }
      const content = payload?.choices?.[0]?.message?.content;
      const parsed = extractJson(typeof content === "string" ? content : "");
      if (parsed === null) {
        throw new ProviderError("MALFORMED_RESPONSE", "OpenAI returned malformed JSON.", response.status, "openai", args.model);
      }
      return parsed as T | null;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (isAbortError(error)) {
        throw new ProviderError("TIMEOUT", `OpenAI request timed out after ${Math.round(requestTimeoutMs / 1000)} seconds.`, undefined, "openai", args.model, error);
      }
      if (attempt < 4) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      throw apiFailure("OpenAI", args.model, error);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw apiFailure("OpenAI", args.model, new Error("Unknown OpenAI error"));
}

export function createProvider(env: NodeJS.ProcessEnv = process.env): JsonProvider {
  const temperature = Number(env.AI_TEMPERATURE ?? 0.7);
  const maxTokens = Number(env.AI_MAX_TOKENS ?? 4096);
  const geminiKey = trimEnv(env.GEMINI_API_KEY);
  const openAiKey = trimEnv(env.OPENAI_API_KEY);
  const nvidiaKey = trimEnv(env.NVIDIA_API_KEY);
  const bynaraKey = trimEnv(env.BYNARA_API_KEY);

  const defaultGeminiModel = trimEnv(env.AI_MODEL) || "gemini-3.6-flash";
  const defaultOpenAiModel = trimEnv(env.AI_MODEL) || "gpt-4o";
  const defaultNvidiaModel = trimEnv(env.NVIDIA_MODEL) || "qwen/qwen3-coder-480b-a35b-instruct";
  const defaultBynaraModel = trimEnv(env.BYNARA_MODEL) || "agnes-2.0-flash";

  const configured = Boolean(geminiKey || openAiKey || nvidiaKey || bynaraKey);
  const activeDefaultModel = geminiKey
    ? defaultGeminiModel
    : openAiKey
    ? defaultOpenAiModel
    : bynaraKey
    ? defaultBynaraModel
    : defaultNvidiaModel;

  const agentModels = Object.fromEntries(
    Object.entries(agentModelEnvKeys).map(([agent, envKey]) => [agent, trimEnv(env[envKey]) || activeDefaultModel]),
  ) as Record<AgentName, string>;

  const config: ProviderConfig = geminiKey
    ? { provider: "gemini", model: agentModels.planner, temperature, maxTokens, agentModels, configured }
    : openAiKey
    ? { provider: "openai", model: agentModels.planner, temperature, maxTokens, agentModels, configured }
    : nvidiaKey
    ? { provider: "nvidia", model: agentModels.planner, temperature, maxTokens, agentModels, configured }
    : bynaraKey
    ? { provider: "bynara", model: agentModels.planner, temperature, maxTokens, agentModels, configured }
    : {
        provider: "local",
        model: "local-fallback",
        temperature,
        maxTokens,
        agentModels,
        configured,
        message: "AI provider is not configured. Add BYNARA_API_KEY or NVIDIA_API_KEY to .env. GEMINI_API_KEY and OPENAI_API_KEY remain optional for future providers.",
      };

  function modelFor(schemaName: string): string {
    return config.agentModels[schemaName as AgentName] || config.model;
  }

  return {
    config,
    async generateJson<T>(prompt: string, schemaName: string): Promise<T | null> {
      const selectedModel = modelFor(schemaName);
      if (geminiKey) {
        return callGemini({ apiKey: geminiKey, baseUrl: defaultNvidiaBaseUrl, model: selectedModel, prompt, temperature, maxTokens, schemaName });
      }
      if (openAiKey) {
        return callOpenAI({ apiKey: openAiKey, baseUrl: defaultNvidiaBaseUrl, model: selectedModel, prompt, temperature, maxTokens, schemaName });
      }
      if (nvidiaKey) {
        const nvidiaBaseUrl = trimEnv(env.NVIDIA_BASE_URL) || defaultNvidiaBaseUrl;
        return callNvidiaChatCompletions({ apiKey: nvidiaKey, baseUrl: nvidiaBaseUrl, model: selectedModel, prompt, temperature, maxTokens, schemaName });
      }
      if (bynaraKey) {
        const bynaraBaseUrl = trimEnv(env.BYNARA_BASE_URL) || defaultBynaraBaseUrl;
        return callBynaraRouter({ apiKey: bynaraKey, baseUrl: bynaraBaseUrl, model: selectedModel, prompt, temperature, maxTokens, schemaName });
      }
      return null;
    },
  };
}
