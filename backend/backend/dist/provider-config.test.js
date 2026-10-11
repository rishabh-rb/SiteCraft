
import test from "node:test";
import assert from "node:assert/strict";

import { createProvider } from "@sitecraft/ml";

/* =========================================================
   Helpers
========================================================= */

type ProviderEnv = Parameters<typeof createProvider>[0];

function createTestProvider(
  env: ProviderEnv = {}
) {
  return createProvider(env);
}

/* =========================================================
   Local Provider
========================================================= */

test("uses local provider when no API key is configured", () => {
  const provider = createTestProvider({
    PLANNER_MODEL: "planner-model",
    UI_MODEL: "ui-model",
    CONTENT_MODEL: "content-model",
    CODE_MODEL: "code-model",
    QA_MODEL: "qa-model",
  });

  assert.equal(provider.config.provider, "local");
  assert.equal(provider.config.configured, false);
});

test("uses local provider when API keys are empty", () => {
  const provider = createTestProvider({
    GEMINI_API_KEY: "",
    OPENAI_API_KEY: "",
    NVIDIA_API_KEY: "",
    BYNARA_API_KEY: "",
  });

  assert.equal(provider.config.provider, "local");
  assert.equal(provider.config.configured, false);
});

/* =========================================================
   Agent Model Configuration
========================================================= */

test("selects the configured model for each agent", () => {
  const provider = createTestProvider({
    PLANNER_MODEL: "planner-model",
    UI_MODEL: "ui-model",
    CONTENT_MODEL: "content-model",
    CODE_MODEL: "code-model",
    QA_MODEL: "qa-model",
  });

  assert.equal(
    provider.config.agentModels.planner,
    "planner-model"
  );

  assert.equal(
    provider.config.agentModels.ui,
    "ui-model"
  );

  assert.equal(
    provider.config.agentModels.content,
    "content-model"
  );

  assert.equal(
    provider.config.agentModels.code,
    "code-model"
  );

  assert.equal(
    provider.config.agentModels.qa,
    "qa-model"
  );
});

/* =========================================================
   Gemini Provider
========================================================= */

test("selects Gemini when its API key is configured", () => {
  const provider = createTestProvider({
    GEMINI_API_KEY: "gemini-test-key",
    AI_MODEL: "gemini-3.6-flash",
  });

  assert.equal(provider.config.provider, "gemini");
  assert.equal(provider.config.configured, true);
  assert.equal(provider.config.model, "gemini-3.6-flash");
});

test("prefers Gemini over all other configured providers", () => {
  const provider = createTestProvider({
    GEMINI_API_KEY: "gemini-test-key",
    OPENAI_API_KEY: "openai-test-key",
    NVIDIA_API_KEY: "nvidia-test-key",
    BYNARA_API_KEY: "bynara-test-key",
  });

  assert.equal(provider.config.provider, "gemini");
  assert.equal(provider.config.configured, true);
});

/* =========================================================
   OpenAI Provider
========================================================= */

test("selects OpenAI when Gemini is not configured", () => {
  const provider = createTestProvider({
    OPENAI_API_KEY: "openai-test-key",
    AI_MODEL: "gpt-4o",
  });

  assert.equal(provider.config.provider, "openai");
  assert.equal(provider.config.configured, true);
  assert.equal(provider.config.model, "gpt-4o");
});

test("prefers OpenAI over NVIDIA when both are configured", () => {
  const provider = createTestProvider({
    OPENAI_API_KEY: "openai-test-key",
    NVIDIA_API_KEY: "nvidia-test-key",
  });

  assert.equal(provider.config.provider, "openai");
});

test("selects OpenAI over BYNARA when both are configured", () => {
  const provider = createTestProvider({
    OPENAI_API_KEY: "openai-test-key",
    BYNARA_API_KEY: "bynara-test-key",
  });

  assert.equal(provider.config.provider, "openai");
});

/* =========================================================
   NVIDIA Provider
========================================================= */

test("selects NVIDIA when only NVIDIA is configured", () => {
  const provider = createTestProvider({
    NVIDIA_API_KEY: "nvidia-test-key",
    NVIDIA_BASE_URL:
      "https://integrate.api.nvidia.com/v1",
    NVIDIA_MODEL:
      "qwen/qwen3-coder-480b-a35b-instruct",
  });

  assert.equal(provider.config.provider, "nvidia");
  assert.equal(provider.config.configured, true);

  assert.equal(
    provider.config.model,
    "qwen/qwen3-coder-480b-a35b-instruct"
  );
});

test("prefers NVIDIA over BYNARA when both are configured", () => {
  const provider = createTestProvider({
    NVIDIA_API_KEY: "nvidia-test-key",
    BYNARA_API_KEY: "bynara-test-key",
  });

  assert.equal(provider.config.provider, "nvidia");
});

/* =========================================================
   BYNARA Provider
========================================================= */

test("selects BYNARA when only BYNARA is configured", () => {
  const provider = createTestProvider({
    BYNARA_API_KEY: "bynara-test-key",
    BYNARA_BASE_URL: "https://router.bynara.id/v1",
    BYNARA_MODEL: "agnes-2.0-flash",
  });

  assert.equal(provider.config.provider, "bynara");
  assert.equal(provider.config.configured, true);
  assert.equal(provider.config.model, "agnes-2.0-flash");
});

/* =========================================================
   Provider Selection Priority
========================================================= */

test("uses Gemini over OpenAI, NVIDIA, and BYNARA", () => {
  const provider = createTestProvider({
    GEMINI_API_KEY: "gemini-test-key",
    OPENAI_API_KEY: "openai-test-key",
    NVIDIA_API_KEY: "nvidia-test-key",
    BYNARA_API_KEY: "bynara-test-key",
  });

  assert.equal(provider.config.provider, "gemini");
});

test("uses OpenAI over NVIDIA and BYNARA", () => {
  const provider = createTestProvider({
    OPENAI_API_KEY: "openai-test-key",
    NVIDIA_API_KEY: "nvidia-test-key",
    BYNARA_API_KEY: "bynara-test-key",
  });

  assert.equal(provider.config.provider, "openai");
});

test("uses NVIDIA over BYNARA", () => {
  const provider = createTestProvider({
    NVIDIA_API_KEY: "nvidia-test-key",
    BYNARA_API_KEY: "bynara-test-key",
  });

  assert.equal(provider.config.provider, "nvidia");
});

/* =========================================================
   Custom Model Configuration
========================================================= */

test("uses a custom Gemini model when provided", () => {
  const provider = createTestProvider({
    GEMINI_API_KEY: "gemini-test-key",
    AI_MODEL: "custom-gemini-model",
  });

  assert.equal(provider.config.provider, "gemini");
  assert.equal(
    provider.config.model,
    "custom-gemini-model"
  );
});

test("uses a custom OpenAI model when provided", () => {
  const provider = createTestProvider({
    OPENAI_API_KEY: "openai-test-key",
    AI_MODEL: "custom-openai-model",
  });

  assert.equal(provider.config.provider, "openai");
  assert.equal(
    provider.config.model,
    "custom-openai-model"
  );
});

test("uses a custom NVIDIA model when provided", () => {
  const provider = createTestProvider({
    NVIDIA_API_KEY: "nvidia-test-key",
    NVIDIA_MODEL: "custom-nvidia-model",
  });

  assert.equal(provider.config.provider, "nvidia");
  assert.equal(
    provider.config.model,
    "custom-nvidia-model"
  );
});

test("uses a custom BYNARA model when provided", () => {
  const provider = createTestProvider({
    BYNARA_API_KEY: "bynara-test-key",
    BYNARA_MODEL: "custom-bynara-model",
  });

  assert.equal(provider.config.provider, "bynara");
  assert.equal(
    provider.config.model,
    "custom-bynara-model"
  );
});

/* =========================================================
   Configuration Isolation
========================================================= */

test("does not modify the supplied environment object", () => {
  const env = {
    OPENAI_API_KEY: "openai-test-key",
    AI_MODEL: "gpt-4o",
  };

  const originalEnv = { ...env };

  createTestProvider(env);

  assert.deepEqual(env, originalEnv);
});

test("creates independent configurations for separate calls", () => {
  const geminiProvider = createTestProvider({
    GEMINI_API_KEY: "gemini-test-key",
  });

  const openaiProvider = createTestProvider({
    OPENAI_API_KEY: "openai-test-key",
  });

  assert.equal(geminiProvider.config.provider, "gemini");
  assert.equal(openaiProvider.config.provider, "openai");
});
