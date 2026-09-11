import test from "node:test";
import assert from "node:assert/strict";
import { createProvider } from "@sitecraft/ml";

test("selects per-agent models and reports missing provider", () => {
  const provider = createProvider({
    PLANNER_MODEL: "planner-model",
    UI_MODEL: "ui-model",
    CONTENT_MODEL: "content-model",
    CODE_MODEL: "code-model",
    QA_MODEL: "qa-model"
  });

  assert.equal(provider.config.provider, "local");
  assert.equal(provider.config.configured, false);
  assert.equal(provider.config.agentModels.planner, "planner-model");
  assert.equal(provider.config.agentModels.ui, "ui-model");
  assert.equal(provider.config.agentModels.content, "content-model");
  assert.equal(provider.config.agentModels.code, "code-model");
  assert.equal(provider.config.agentModels.qa, "qa-model");
});

test("prefers Gemini when configured", () => {
  const provider = createProvider({
    GEMINI_API_KEY: "gemini-key",
    AI_MODEL: "gemini-3.6-flash"
  });

  assert.equal(provider.config.provider, "gemini");
  assert.equal(provider.config.configured, true);
  assert.equal(provider.config.model, "gemini-3.6-flash");
});

test("prefers OpenAI when Gemini is not configured", () => {
  const provider = createProvider({
    OPENAI_API_KEY: "openai-key",
    AI_MODEL: "gpt-4o"
  });

  assert.equal(provider.config.provider, "openai");
  assert.equal(provider.config.configured, true);
  assert.equal(provider.config.model, "gpt-4o");
});

test("prefers NVIDIA when configured without Gemini/OpenAI", () => {
  const provider = createProvider({
    NVIDIA_API_KEY: "nvidia-key",
    NVIDIA_BASE_URL: "https://integrate.api.nvidia.com/v1",
    NVIDIA_MODEL: "qwen/qwen3-coder-480b-a35b-instruct"
  });

  assert.equal(provider.config.provider, "nvidia");
  assert.equal(provider.config.configured, true);
  assert.equal(provider.config.model, "qwen/qwen3-coder-480b-a35b-instruct");
});

test("prefers BYNARA when configured without other providers", () => {
  const provider = createProvider({
    BYNARA_API_KEY: "bynara-key",
    BYNARA_BASE_URL: "https://router.bynara.id/v1",
    BYNARA_MODEL: "agnes-2.0-flash"
  });

  assert.equal(provider.config.provider, "bynara");
  assert.equal(provider.config.configured, true);
  assert.equal(provider.config.model, "agnes-2.0-flash");
});