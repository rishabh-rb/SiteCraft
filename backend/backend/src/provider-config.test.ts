
import test from "node:test";
import assert from "node:assert/strict";
import { createProvider } from "@sitecraft/ml";

test("uses local provider when no provider API key is configured", () => {
  const provider = createProvider({
    PLANNER_MODEL: "planner-model",
    UI_MODEL: "ui-model",
    CONTENT_MODEL: "content-model",
    CODE_MODEL: "code-model",
    QA_MODEL: "qa-model",
  });

  assert.equal(
    provider.config.provider,
    "local",
    "Provider should default to local"
  );

  assert.equal(
    provider.config.configured,
    false,
    "Local provider should not be marked as externally configured"
  );

  assert.equal(
    provider.config.agentModels.planner,
    "planner-model",
    "Planner model override should be preserved"
  );

  assert.equal(
    provider.config.agentModels.ui,
    "ui-model",
    "UI model override should be preserved"
  );

  assert.equal(
    provider.config.agentModels.content,
    "content-model",
    "Content model override should be preserved"
  );

  assert.equal(
    provider.config.agentModels.code,
    "code-model",
    "Code model override should be preserved"
  );

  assert.equal(
    provider.config.agentModels.qa,
    "qa-model",
    "QA model override should be preserved"
  );
});

test("uses Gemini when Gemini is the only configured provider", () => {
  const provider = createProvider({
    GEMINI_API_KEY: "gemini-key",
    AI_MODEL: "gemini-3.6-flash",
  });

  assert.equal(
    provider.config.provider,
    "gemini",
    "Gemini should be selected"
  );

  assert.equal(
    provider.config.configured,
    true,
    "Gemini provider should be configured"
  );

  assert.equal(
    provider.config.model,
    "gemini-3.6-flash",
    "Gemini model should match AI_MODEL"
  );
});

test("uses OpenAI when OpenAI is the only configured provider", () => {
  const provider = createProvider({
    OPENAI_API_KEY: "openai-key",
    AI_MODEL: "gpt-4o",
  });

  assert.equal(
    provider.config.provider,
    "openai",
    "OpenAI should be selected"
  );

  assert.equal(
    provider.config.configured,
    true,
    "OpenAI provider should be configured"
  );

  assert.equal(
    provider.config.model,
    "gpt-4o",
    "OpenAI model should match AI_MODEL"
  );
});

test("uses NVIDIA when NVIDIA is the only configured provider", () => {
  const provider = createProvider({
    NVIDIA_API_KEY: "nvidia-key",
    NVIDIA_BASE_URL:
      "https://integrate.api.nvidia.com/v1",
    NVIDIA_MODEL:
      "qwen/qwen3-coder-480b-a35b-instruct",
  });

  assert.equal(
    provider.config.provider,
    "nvidia",
    "NVIDIA should be selected"
  );

  assert.equal(
    provider.config.configured,
    true,
    "NVIDIA provider should be configured"
  );

  assert.equal(
    provider.config.model,
    "qwen/qwen3-coder-480b-a35b-instruct",
    "NVIDIA model should match NVIDIA_MODEL"
  );
});

test("uses BYNARA when BYNARA is the only configured provider", () => {
  const provider = createProvider({
    BYNARA_API_KEY: "bynara-key",
    BYNARA_BASE_URL:
      "https://router.bynara.id/v1",
    BYNARA_MODEL: "agnes-2.0-flash",
  });

  assert.equal(
    provider.config.provider,
    "bynara",
    "BYNARA should be selected"
  );

  assert.equal(
    provider.config.configured,
    true,
    "BYNARA provider should be configured"
  );

  assert.equal(
    provider.config.model,
    "agnes-2.0-flash",
    "BYNARA model should match BYNARA_MODEL"
  );
});

test("Gemini has highest priority over OpenAI, NVIDIA, and BYNARA", () => {
  const provider = createProvider({
    GEMINI_API_KEY: "gemini-key",
    OPENAI_API_KEY: "openai-key",
    NVIDIA_API_KEY: "nvidia-key",
    BYNARA_API_KEY: "bynara-key",

    AI_MODEL: "gemini-model",
    NVIDIA_MODEL: "nvidia-model",
    BYNARA_MODEL: "bynara-model",
  });

  assert.equal(
    provider.config.provider,
    "gemini",
    "Gemini should have the highest provider priority"
  );

  assert.equal(
    provider.config.configured,
    true,
    "Selected provider should be configured"
  );

  assert.equal(
    provider.config.model,
    "gemini-model",
    "Gemini model should be selected"
  );
});

test("OpenAI has priority over NVIDIA and BYNARA", () => {
  const provider = createProvider({
    OPENAI_API_KEY: "openai-key",
    NVIDIA_API_KEY: "nvidia-key",
    BYNARA_API_KEY: "bynara-key",

    AI_MODEL: "gpt-test-model",
    NVIDIA_MODEL: "nvidia-model",
    BYNARA_MODEL: "bynara-model",
  });

  assert.equal(
    provider.config.provider,
    "openai",
    "OpenAI should be selected over NVIDIA and BYNARA"
  );

  assert.equal(
    provider.config.configured,
    true,
    "OpenAI should be configured"
  );

  assert.equal(
    provider.config.model,
    "gpt-test-model",
    "OpenAI model should be selected"
  );
});

test("NVIDIA has priority over BYNARA", () => {
  const provider = createProvider({
    NVIDIA_API_KEY: "nvidia-key",
    BYNARA_API_KEY: "bynara-key",

    NVIDIA_BASE_URL:
      "https://integrate.api.nvidia.com/v1",

    NVIDIA_MODEL: "nvidia-test-model",
    BYNARA_MODEL: "bynara-test-model",
  });

  assert.equal(
    provider.config.provider,
    "nvidia",
    "NVIDIA should be selected over BYNARA"
  );

  assert.equal(
    provider.config.configured,
    true,
    "NVIDIA should be configured"
  );

  assert.equal(
    provider.config.model,
    "nvidia-test-model",
    "NVIDIA model should be selected"
  );
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

  assert.equal(
    provider.config.provider,
    "nvidia",
    "NVIDIA should be selected"
  );

  assert.equal(
    provider.config.model,
    "default-nvidia-model",
    "Default NVIDIA model should be preserved"
  );

  assert.equal(
    provider.config.agentModels.planner,
    "planner-specialized",
    "Planner override should be preserved"
  );

  assert.equal(
    provider.config.agentModels.ui,
    "ui-specialized",
    "UI override should be preserved"
  );

  assert.equal(
    provider.config.agentModels.content,
    "content-specialized",
    "Content override should be preserved"
  );

  assert.equal(
    provider.config.agentModels.code,
    "code-specialized",
    "Code override should be preserved"
  );

  assert.equal(
    provider.config.agentModels.qa,
    "qa-specialized",
    "QA override should be preserved"
  );
});

test("agent model overrides do not change provider selection", () => {
  const provider = createProvider({
    PLANNER_MODEL: "planner-model",
    UI_MODEL: "ui-model",
    CONTENT_MODEL: "content-model",
    CODE_MODEL: "code-model",
    QA_MODEL: "qa-model",
  });

  assert.equal(
    provider.config.provider,
    "local",
    "Agent models alone should not activate an external provider"
  );

  assert.equal(
    provider.config.configured,
    false,
    "Provider should remain unconfigured"
  );
});

test("preserves custom NVIDIA base URL", () => {
  const provider = createProvider({
    NVIDIA_API_KEY: "nvidia-key",
    NVIDIA_BASE_URL:
      "https://custom-nvidia.example.com/v1",
    NVIDIA_MODEL: "custom-nvidia-model",
  });

  assert.equal(
    provider.config.provider,
    "nvidia",
    "NVIDIA should be selected"
  );

  assert.equal(
    provider.config.model,
    "custom-nvidia-model",
    "Custom NVIDIA model should be preserved"
  );

  assert.equal(
    provider.config.baseUrl,
    "https://custom-nvidia.example.com/v1",
    "Custom NVIDIA base URL should be preserved"
  );
});

test("preserves custom BYNARA base URL", () => {
  const provider = createProvider({
    BYNARA_API_KEY: "bynara-key",
    BYNARA_BASE_URL:
      "https://custom-bynara.example.com/v1",
    BYNARA_MODEL: "custom-bynara-model",
  });

  assert.equal(
    provider.config.provider,
    "bynara",
    "BYNARA should be selected"
  );

  assert.equal(
    provider.config.model,
    "custom-bynara-model",
    "Custom BYNARA model should be preserved"
  );

  assert.equal(
    provider.config.baseUrl,
    "https://custom-bynara.example.com/v1",
    "Custom BYNARA base URL should be preserved"
  );
});

test("provider configurations are isolated from each other", () => {
  const geminiProvider = createProvider({
    GEMINI_API_KEY: "gemini-key",
    AI_MODEL: "gemini-model",
  });

  const openaiProvider = createProvider({
    OPENAI_API_KEY: "openai-key",
    AI_MODEL: "openai-model",
  });

  const nvidiaProvider = createProvider({
    NVIDIA_API_KEY: "nvidia-key",
    NVIDIA_MODEL: "nvidia-model",
  });

  const bynaraProvider = createProvider({
    BYNARA_API_KEY: "bynara-key",
    BYNARA_MODEL: "bynara-model",
  });

  const localProvider = createProvider({});

  assert.equal(
    geminiProvider.config.provider,
    "gemini"
  );

  assert.equal(
    geminiProvider.config.model,
    "gemini-model"
  );

  assert.equal(
    openaiProvider.config.provider,
    "openai"
  );

  assert.equal(
    openaiProvider.config.model,
    "openai-model"
  );

  assert.equal(
    nvidiaProvider.config.provider,
    "nvidia"
  );

  assert.equal(
    nvidiaProvider.config.model,
    "nvidia-model"
  );

  assert.equal(
    bynaraProvider.config.provider,
    "bynara"
  );

  assert.equal(
    bynaraProvider.config.model,
    "bynara-model"
  );

  assert.equal(
    localProvider.config.provider,
    "local"
  );

  assert.equal(
    localProvider.config.configured,
    false
  );
});

test("empty API keys do not activate external providers", () => {
  const provider = createProvider({
    GEMINI_API_KEY: "",
    OPENAI_API_KEY: "",
    NVIDIA_API_KEY: "",
    BYNARA_API_KEY: "",
  });

  assert.equal(
    provider.config.provider,
    "local",
    "Empty API keys should fall back to local"
  );

  assert.equal(
    provider.config.configured,
    false,
    "Local provider should not be externally configured"
  );
});

test("Gemini remains selected when lower-priority providers are also configured", () => {
  const provider = createProvider({
    GEMINI_API_KEY: "gemini-key",
    OPENAI_API_KEY: "openai-key",
    NVIDIA_API_KEY: "nvidia-key",
    BYNARA_API_KEY: "bynara-key",

    AI_MODEL: "gemini-primary",
    NVIDIA_MODEL: "nvidia-secondary",
    BYNARA_MODEL: "bynara-secondary",

    PLANNER_MODEL: "planner-model",
    UI_MODEL: "ui-model",
  });

  assert.equal(
    provider.config.provider,
    "gemini"
  );

  assert.equal(
    provider.config.model,
    "gemini-primary"
  );

  assert.equal(
    provider.config.agentModels.planner,
    "planner-model"
  );

  assert.equal(
    provider.config.agentModels.ui,
    "ui-model"
  );
});

test("OpenAI remains selected when NVIDIA and BYNARA are also configured", () => {
  const provider = createProvider({
    OPENAI_API_KEY: "openai-key",
    NVIDIA_API_KEY: "nvidia-key",
    BYNARA_API_KEY: "bynara-key",

    AI_MODEL: "openai-primary",
    NVIDIA_MODEL: "nvidia-secondary",
    BYNARA_MODEL: "bynara-secondary",
  });

  assert.equal(
    provider.config.provider,
    "openai"
  );

  assert.equal(
    provider.config.model,
    "openai-primary"
  );
});

test("NVIDIA remains selected when BYNARA is also configured", () => {
  const provider = createProvider({
    NVIDIA_API_KEY: "nvidia-key",
    BYNARA_API_KEY: "bynara-key",

    NVIDIA_MODEL: "nvidia-primary",
    BYNARA_MODEL: "bynara-secondary",
  });

  assert.equal(
    provider.config.provider,
    "nvidia"
  );

  assert.equal(
    provider.config.model,
    "nvidia-primary"
  );
});
