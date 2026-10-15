
import test from "node:test";
import assert from "node:assert/strict";

import { createProvider } from "@sitecraft/ml";

/* =========================================================
   Types and Test Data
========================================================= */

type ProviderEnvironment = Record<string, string | undefined>;

const MODEL_OVERRIDES = {
  PLANNER_MODEL: "planner-model",
  UI_MODEL: "ui-model",
  CONTENT_MODEL: "content-model",
  CODE_MODEL: "code-model",
  QA_MODEL: "qa-model",
};

const EXPECTED_AGENT_MODELS = {
  planner: "planner-model",
  ui: "ui-model",
  content: "content-model",
  code: "code-model",
  qa: "qa-model",
};

const NVIDIA_BASE_URL =
  "https://integrate.api.nvidia.com/v1";

const BYNARA_BASE_URL =
  "https://router.bynara.id/v1";

/* =========================================================
   Reusable Helpers
========================================================= */

function createLocalProvider(
  env: ProviderEnvironment = {},
) {
  return createProvider(env);
}

function assertProvider(
  env: ProviderEnvironment,
  expected: {
    provider: string;
    configured: boolean;
    model?: string;
    baseUrl?: string;
  },
): void {
  const provider = createProvider(env);

  assert.equal(provider.config.provider, expected.provider);
  assert.equal(
    provider.config.configured,
    expected.configured,
  );

  if (expected.model !== undefined) {
    assert.equal(provider.config.model, expected.model);
  }

  if (expected.baseUrl !== undefined) {
    assert.equal(provider.config.baseUrl, expected.baseUrl);
  }
}

/* =========================================================
   Local Provider
========================================================= */

test("defaults to local when no API key is configured", () => {
  const provider = createLocalProvider(MODEL_OVERRIDES);

  assertProvider(MODEL_OVERRIDES, {
    provider: "local",
    configured: false,
  });

  assert.deepEqual(
    provider.config.agentModels,
    EXPECTED_AGENT_MODELS,
  );
});

test("agent model overrides alone do not activate an external provider", () => {
  const provider = createProvider({
    ...MODEL_OVERRIDES,
  });

  assert.equal(provider.config.provider, "local");
  assert.equal(provider.config.configured, false);
  assert.deepEqual(
    provider.config.agentModels,
    EXPECTED_AGENT_MODELS,
  );
});

test("empty API keys fall back to the local provider", () => {
  assertProvider(
    {
      GEMINI_API_KEY: "",
      OPENAI_API_KEY: "",
      NVIDIA_API_KEY: "",
      BYNARA_API_KEY: "",
    },
    {
      provider: "local",
      configured: false,
    },
  );
});

test("whitespace-only API keys do not activate an external provider", () => {
  assertProvider(
    {
      GEMINI_API_KEY: "   ",
      OPENAI_API_KEY: "",
      NVIDIA_API_KEY: "",
      BYNARA_API_KEY: "",
    },
    {
      provider: "local",
      configured: false,
    },
  );
});

/* =========================================================
   Gemini Provider
========================================================= */

test("selects Gemini when Gemini is configured", () => {
  assertProvider(
    {
      GEMINI_API_KEY: "gemini-key",
      AI_MODEL: "gemini-test-model",
    },
    {
      provider: "gemini",
      configured: true,
      model: "gemini-test-model",
    },
  );
});

test("Gemini has priority over all other providers", () => {
  assertProvider(
    {
      GEMINI_API_KEY: "gemini-key",
      OPENAI_API_KEY: "openai-key",
      NVIDIA_API_KEY: "nvidia-key",
      BYNARA_API_KEY: "bynara-key",
      AI_MODEL: "gemini-primary",
    },
    {
      provider: "gemini",
      configured: true,
      model: "gemini-primary",
    },
  );
});

/* =========================================================
   OpenAI Provider
========================================================= */

test("selects OpenAI when OpenAI is configured", () => {
  assertProvider(
    {
      OPENAI_API_KEY: "openai-key",
      AI_MODEL: "gpt-test-model",
    },
    {
      provider: "openai",
      configured: true,
      model: "gpt-test-model",
    },
  );
});

test("OpenAI has priority over NVIDIA and BYNARA", () => {
  assertProvider(
    {
      OPENAI_API_KEY: "openai-key",
      NVIDIA_API_KEY: "nvidia-key",
      BYNARA_API_KEY: "bynara-key",
      AI_MODEL: "openai-primary",
    },
    {
      provider: "openai",
      configured: true,
      model: "openai-primary",
    },
  );
});

/* =========================================================
   NVIDIA Provider
========================================================= */

test("selects NVIDIA when NVIDIA is configured", () => {
  assertProvider(
    {
      NVIDIA_API_KEY: "nvidia-key",
      NVIDIA_BASE_URL,
      NVIDIA_MODEL: "nvidia-test-model",
    },
    {
      provider: "nvidia",
      configured: true,
      model: "nvidia-test-model",
      baseUrl: NVIDIA_BASE_URL,
    },
  );
});

test("NVIDIA has priority over BYNARA", () => {
  assertProvider(
    {
      NVIDIA_API_KEY: "nvidia-key",
      BYNARA_API_KEY: "bynara-key",
      NVIDIA_MODEL: "nvidia-primary",
      BYNARA_MODEL: "bynara-secondary",
    },
    {
      provider: "nvidia",
      configured: true,
      model: "nvidia-primary",
    },
  );
});

test("preserves a custom NVIDIA base URL", () => {
  const customBaseUrl =
    "https://custom-nvidia.example.com/v1";

  assertProvider(
    {
      NVIDIA_API_KEY: "nvidia-key",
      NVIDIA_BASE_URL: customBaseUrl,
      NVIDIA_MODEL: "custom-nvidia-model",
    },
    {
      provider: "nvidia",
      configured: true,
      model: "custom-nvidia-model",
      baseUrl: customBaseUrl,
    },
  );
});

test("uses the default NVIDIA model when no override is supplied", () => {
  const provider = createProvider({
    NVIDIA_API_KEY: "nvidia-key",
  });

  assert.equal(provider.config.provider, "nvidia");
  assert.equal(provider.config.configured, true);
  assert.ok(
    typeof provider.config.model === "string" &&
      provider.config.model.length > 0,
    "Expected a default NVIDIA model",
  );
});

/* =========================================================
   BYNARA Provider
========================================================= */

test("selects BYNARA when BYNARA is configured", () => {
  assertProvider(
    {
      BYNARA_API_KEY: "bynara-key",
      BYNARA_BASE_URL,
      BYNARA_MODEL: "bynara-test-model",
    },
    {
      provider: "bynara",
      configured: true,
      model: "bynara-test-model",
      baseUrl: BYNARA_BASE_URL,
    },
  );
});

test("preserves a custom BYNARA base URL", () => {
  const customBaseUrl =
    "https://custom-bynara.example.com/v1";

  assertProvider(
    {
      BYNARA_API_KEY: "bynara-key",
      BYNARA_BASE_URL: customBaseUrl,
      BYNARA_MODEL: "custom-bynara-model",
    },
    {
      provider: "bynara",
      configured: true,
      model: "custom-bynara-model",
      baseUrl: customBaseUrl,
    },
  );
});

test("uses the default BYNARA model when no override is supplied", () => {
  const provider = createProvider({
    BYNARA_API_KEY: "bynara-key",
  });

  assert.equal(provider.config.provider, "bynara");
  assert.equal(provider.config.configured, true);
  assert.ok(
    typeof provider.config.model === "string" &&
      provider.config.model.length > 0,
    "Expected a default BYNARA model",
  );
});

/* =========================================================
   Per-Agent Model Overrides
========================================================= */

test("preserves all per-agent model overrides", () => {
  const provider = createProvider({
    NVIDIA_API_KEY: "nvidia-key",
    NVIDIA_MODEL: "default-nvidia-model",
    PLANNER_MODEL: "planner-specialized",
    UI_MODEL: "ui-specialized",
    CONTENT_MODEL: "content-specialized",
    CODE_MODEL: "code-specialized",
    QA_MODEL: "qa-specialized",
  });

  assert.equal(provider.config.provider, "nvidia");
  assert.equal(
    provider.config.model,
    "default-nvidia-model",
  );

  assert.deepEqual(provider.config.agentModels, {
    planner: "planner-specialized",
    ui: "ui-specialized",
    content: "content-specialized",
    code: "code-specialized",
    qa: "qa-specialized",
  });
});

test("uses default agent model configuration when overrides are absent", () => {
  const provider = createProvider({
    OPENAI_API_KEY: "openai-key",
    AI_MODEL: "default-model",
  });

  assert.equal(provider.config.provider, "openai");
  assert.equal(provider.config.model, "default-model");
  assert.ok(
    provider.config.agentModels,
    "Agent model configuration should exist",
  );
});

test("agent model overrides do not change the selected provider's default model", () => {
  const provider = createProvider({
    NVIDIA_API_KEY: "nvidia-key",
    NVIDIA_MODEL: "default-nvidia-model",
    PLANNER_MODEL: "planner-specialized",
    CODE_MODEL: "code-specialized",
  });

  assert.equal(provider.config.provider, "nvidia");
  assert.equal(
    provider.config.model,
    "default-nvidia-model",
  );
  assert.equal(
    provider.config.agentModels.planner,
    "planner-specialized",
  );
  assert.equal(
    provider.config.agentModels.code,
    "code-specialized",
  );
});

/* =========================================================
   Provider Independence
========================================================= */

test("provider configurations remain independent", () => {
  const gemini = createProvider({
    GEMINI_API_KEY: "gemini-key",
    AI_MODEL: "gemini-model",
  });

  const openai = createProvider({
    OPENAI_API_KEY: "openai-key",
    AI_MODEL: "openai-model",
  });

  const nvidia = createProvider({
    NVIDIA_API_KEY: "nvidia-key",
    NVIDIA_MODEL: "nvidia-model",
  });

  const bynara = createProvider({
    BYNARA_API_KEY: "bynara-key",
    BYNARA_MODEL: "bynara-model",
  });

  const local = createProvider({});

  assert.equal(gemini.config.provider, "gemini");
  assert.equal(gemini.config.model, "gemini-model");

  assert.equal(openai.config.provider, "openai");
  assert.equal(openai.config.model, "openai-model");

  assert.equal(nvidia.config.provider, "nvidia");
  assert.equal(nvidia.config.model, "nvidia-model");

  assert.equal(bynara.config.provider, "bynara");
  assert.equal(bynara.config.model, "bynara-model");

  assert.equal(local.config.provider, "local");
  assert.equal(local.config.configured, false);
});

test("creating another provider does not mutate an existing provider configuration", () => {
  const first = createProvider({
    NVIDIA_API_KEY: "nvidia-key",
    NVIDIA_MODEL: "first-model",
  });

  const originalConfig = {
    provider: first.config.provider,
    configured: first.config.configured,
    model: first.config.model,
    baseUrl: first.config.baseUrl,
    agentModels: { ...first.config.agentModels },
  };

  createProvider({
    GEMINI_API_KEY: "gemini-key",
    AI_MODEL: "second-model",
  });

  assert.equal(first.config.provider, originalConfig.provider);
  assert.equal(
    first.config.configured,
    originalConfig.configured,
  );
  assert.equal(first.config.model, originalConfig.model);
  assert.equal(first.config.baseUrl, originalConfig.baseUrl);
  assert.deepEqual(
    first.config.agentModels,
    originalConfig.agentModels,
  );
});
