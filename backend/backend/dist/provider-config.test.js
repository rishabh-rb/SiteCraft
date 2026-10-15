
import test from "node:test";
import assert from "node:assert/strict";

import { createProvider } from "@sitecraft/ml";

/* =========================================================
   Helpers
========================================================= */

type ProviderEnv = Parameters<typeof createProvider>[0];

function createTestProvider(env: ProviderEnv = {}) {
  return createProvider(env);
}

/* =========================================================
   Local Provider
========================================================= */

test("uses local provider when no API key is configured", () => {
  const provider = createTestProvider();

  assert.equal(provider.config.provider, "local");
  assert.equal(provider.config.configured, false);
});

test("uses local provider when all API keys are empty", () => {
  const provider = createTestProvider({
    GEMINI_API_KEY: "",
    OPENAI_API_KEY: "",
    NVIDIA_API_KEY: "",
    BYNARA_API_KEY: "",
  });

  assert.equal(provider.config.provider, "local");
  assert.equal(provider.config.configured, false);
});

test("uses local provider when only agent models are configured", () => {
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

/* =========================================================
   Agent Model Configuration
========================================================= */

test("uses the configured model for each agent", () => {
  const provider = createTestProvider({
    PLANNER_MODEL: "planner-model",
    UI_MODEL: "ui-model",
    CONTENT_MODEL: "content-model",
    CODE_MODEL: "code-model",
    QA_MODEL: "qa-model",
  });

  assert.deepEqual(provider.config.agentModels, {
    planner: "planner-model",
    ui: "ui-model",
    content: "content-model",
    code: "code-model",
    qa: "qa-model",
  });
});

/* =========================================================
   Provider Selection
========================================================= */

const providerPriorityTests = [
  {
    name: "Gemini",
    env: {
      GEMINI_API_KEY: "gemini-test-key",
      OPENAI_API_KEY: "openai-test-key",
      NVIDIA_API_KEY: "nvidia-test-key",
      BYNARA_API_KEY: "bynara-test-key",
    },
    expected: "gemini",
  },
  {
    name: "OpenAI",
    env: {
      OPENAI_API_KEY: "openai-test-key",
      NVIDIA_API_KEY: "nvidia-test-key",
      BYNARA_API_KEY: "bynara-test-key",
    },
    expected: "openai",
  },
  {
    name: "NVIDIA",
    env: {
      NVIDIA_API_KEY: "nvidia-test-key",
      BYNARA_API_KEY: "bynara-test-key",
    },
    expected: "nvidia",
  },
  {
    name: "BYNARA",
    env: {
      BYNARA_API_KEY: "bynara-test-key",
    },
    expected: "bynara",
  },
] as const;

for (const providerTest of providerPriorityTests) {
  test(`selects ${providerTest.name} according to provider priority`, () => {
    const provider = createTestProvider(providerTest.env);

    assert.equal(provider.config.provider, providerTest.expected);
    assert.equal(provider.config.configured, true);
  });
}

/* =========================================================
   Gemini Configuration
========================================================= */

test("uses a custom Gemini model", () => {
  const provider = createTestProvider({
    GEMINI_API_KEY: "gemini-test-key",
    AI_MODEL: "custom-gemini-model",
  });

  assert.equal(provider.config.provider, "gemini");
  assert.equal(provider.config.model, "custom-gemini-model");
  assert.equal(provider.config.configured, true);
});

/* =========================================================
   OpenAI Configuration
========================================================= */

test("uses a custom OpenAI model", () => {
  const provider = createTestProvider({
    OPENAI_API_KEY: "openai-test-key",
    AI_MODEL: "custom-openai-model",
  });

  assert.equal(provider.config.provider, "openai");
  assert.equal(provider.config.model, "custom-openai-model");
  assert.equal(provider.config.configured, true);
});

/* =========================================================
   NVIDIA Configuration
========================================================= */

test("uses a custom NVIDIA model", () => {
  const provider = createTestProvider({
    NVIDIA_API_KEY: "nvidia-test-key",
    NVIDIA_MODEL: "custom-nvidia-model",
  });

  assert.equal(provider.config.provider, "nvidia");
  assert.equal(provider.config.model, "custom-nvidia-model");
  assert.equal(provider.config.configured, true);
});

test("accepts a custom NVIDIA base URL", () => {
  const provider = createTestProvider({
    NVIDIA_API_KEY: "nvidia-test-key",
    NVIDIA_BASE_URL: "https://example.com/v1",
    NVIDIA_MODEL: "custom-nvidia-model",
  });

  assert.equal(provider.config.provider, "nvidia");
  assert.equal(provider.config.model, "custom-nvidia-model");
});

/* =========================================================
   BYNARA Configuration
========================================================= */

test("uses a custom BYNARA model", () => {
  const provider = createTestProvider({
    BYNARA_API_KEY: "bynara-test-key",
    BYNARA_MODEL: "custom-bynara-model",
  });

  assert.equal(provider.config.provider, "bynara");
  assert.equal(provider.config.model, "custom-bynara-model");
  assert.equal(provider.config.configured, true);
});

test("accepts a custom BYNARA base URL", () => {
  const provider = createTestProvider({
    BYNARA_API_KEY: "bynara-test-key",
    BYNARA_BASE_URL: "https://example.com/v1",
    BYNARA_MODEL: "custom-bynara-model",
  });

  assert.equal(provider.config.provider, "bynara");
  assert.equal(provider.config.model, "custom-bynara-model");
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

  assert.notEqual(
    geminiProvider.config.provider,
    openaiProvider.config.provider
  );
});

test("does not leak one provider's model into another configuration", () => {
  const nvidiaProvider = createTestProvider({
    NVIDIA_API_KEY: "nvidia-test-key",
    NVIDIA_MODEL: "custom-nvidia-model",
  });

  const bynaraProvider = createTestProvider({
    BYNARA_API_KEY: "bynara-test-key",
    BYNARA_MODEL: "custom-bynara-model",
  });

  assert.equal(nvidiaProvider.config.model, "custom-nvidia-model");
  assert.equal(bynaraProvider.config.model, "custom-bynara-model");
});

test("does not expose API keys in provider configuration", () => {
  const secret = "openai-test-secret";

  const provider = createTestProvider({
    OPENAI_API_KEY: secret,
    AI_MODEL: "gpt-4o",
  });

  assert.equal(provider.config.provider, "openai");
  assert.equal(
    JSON.stringify(provider.config).includes(secret),
    false
  );
});
