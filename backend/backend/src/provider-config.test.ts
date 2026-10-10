
import test from "node:test";
import assert from "node:assert/strict";
import { createProvider } from "@sitecraft/ml";

const modelOverrides = {
  PLANNER_MODEL: "planner-model",
  UI_MODEL: "ui-model",
  CONTENT_MODEL: "content-model",
  CODE_MODEL: "code-model",
  QA_MODEL: "qa-model",
};

test("defaults to local when no API key is configured", () => {
  const provider = createProvider({
    ...modelOverrides,
  });

  assert.equal(provider.config.provider, "local");
  assert.equal(provider.config.configured, false);
  assert.deepEqual(provider.config.agentModels, modelOverrides);
});

test("selects Gemini when Gemini is configured", () => {
  const provider = createProvider({
    GEMINI_API_KEY: "gemini-key",
    AI_MODEL: "gemini-test-model",
  });

  assert.equal(provider.config.provider, "gemini");
  assert.equal(provider.config.configured, true);
  assert.equal(provider.config.model, "gemini-test-model");
});

test("selects OpenAI when OpenAI is configured", () => {
  const provider = createProvider({
    OPENAI_API_KEY: "openai-key",
    AI_MODEL: "gpt-test-model",
  });

  assert.equal(provider.config.provider, "openai");
  assert.equal(provider.config.configured, true);
  assert.equal(provider.config.model, "gpt-test-model");
});

test("selects NVIDIA when NVIDIA is configured", () => {
  const provider = createProvider({
    NVIDIA_API_KEY: "nvidia-key",
    NVIDIA_BASE_URL: "https://integrate.api.nvidia.com/v1",
    NVIDIA_MODEL: "nvidia-test-model",
  });

  assert.equal(provider.config.provider, "nvidia");
  assert.equal(provider.config.configured, true);
  assert.equal(provider.config.model, "nvidia-test-model");
  assert.equal(
    provider.config.baseUrl,
    "https://integrate.api.nvidia.com/v1"
  );
});

test("selects BYNARA when BYNARA is configured", () => {
  const provider = createProvider({
    BYNARA_API_KEY: "bynara-key",
    BYNARA_BASE_URL: "https://router.bynara.id/v1",
    BYNARA_MODEL: "bynara-test-model",
  });

  assert.equal(provider.config.provider, "bynara");
  assert.equal(provider.config.configured, true);
  assert.equal(provider.config.model, "bynara-test-model");
  assert.equal(
    provider.config.baseUrl,
    "https://router.bynara.id/v1"
  );
});

test("Gemini has priority over all other providers", () => {
  const provider = createProvider({
    GEMINI_API_KEY: "gemini-key",
    OPENAI_API_KEY: "openai-key",
    NVIDIA_API_KEY: "nvidia-key",
    BYNARA_API_KEY: "bynara-key",
    AI_MODEL: "gemini-primary",
  });

  assert.equal(provider.config.provider, "gemini");
  assert.equal(provider.config.model, "gemini-primary");
});

test("OpenAI has priority over NVIDIA and BYNARA", () => {
  const provider = createProvider({
    OPENAI_API_KEY: "openai-key",
    NVIDIA_API_KEY: "nvidia-key",
    BYNARA_API_KEY: "bynara-key",
    AI_MODEL: "openai-primary",
  });

  assert.equal(provider.config.provider, "openai");
  assert.equal(provider.config.model, "openai-primary");
});

test("NVIDIA has priority over BYNARA", () => {
  const provider = createProvider({
    NVIDIA_API_KEY: "nvidia-key",
    BYNARA_API_KEY: "bynara-key",
    NVIDIA_MODEL: "nvidia-primary",
    BYNARA_MODEL: "bynara-secondary",
  });

  assert.equal(provider.config.provider, "nvidia");
  assert.equal(provider.config.model, "nvidia-primary");
});

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
  assert.equal(provider.config.model, "default-nvidia-model");

  assert.deepEqual(provider.config.agentModels, {
    planner: "planner-specialized",
    ui: "ui-specialized",
    content: "content-specialized",
    code: "code-specialized",
    qa: "qa-specialized",
  });
});

test("agent model overrides alone do not activate an external provider", () => {
  const provider = createProvider({
    ...modelOverrides,
  });

  assert.equal(provider.config.provider, "local");
  assert.equal(provider.config.configured, false);
});

test("empty API keys fall back to the local provider", () => {
  const provider = createProvider({
    GEMINI_API_KEY: "",
    OPENAI_API_KEY: "",
    NVIDIA_API_KEY: "",
    BYNARA_API_KEY: "",
  });

  assert.equal(provider.config.provider, "local");
  assert.equal(provider.config.configured, false);
});

test("preserves a custom NVIDIA base URL", () => {
  const provider = createProvider({
    NVIDIA_API_KEY: "nvidia-key",
    NVIDIA_BASE_URL: "https://custom-nvidia.example.com/v1",
    NVIDIA_MODEL: "custom-nvidia-model",
  });

  assert.equal(provider.config.provider, "nvidia");
  assert.equal(provider.config.model, "custom-nvidia-model");
  assert.equal(
    provider.config.baseUrl,
    "https://custom-nvidia.example.com/v1"
  );
});

test("preserves a custom BYNARA base URL", () => {
  const provider = createProvider({
    BYNARA_API_KEY: "bynara-key",
    BYNARA_BASE_URL: "https://custom-bynara.example.com/v1",
    BYNARA_MODEL: "custom-bynara-model",
  });

  assert.equal(provider.config.provider, "bynara");
  assert.equal(provider.config.model, "custom-bynara-model");
  assert.equal(
    provider.config.baseUrl,
    "https://custom-bynara.example.com/v1"
  );
});

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
