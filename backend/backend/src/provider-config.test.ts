import test from "node:test";
import assert from "node:assert/strict";
import { createProvider } from "@sitecraft/ml";

test("uses local provider when no API key is configured", () => {
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

test("falls back to OpenAI when Gemini is not configured", () => {
const provider = createProvider({
OPENAI_API_KEY: "openai-key",
AI_MODEL: "gpt-4o",
});

assert.equal(
provider.config.provider,
"openai",
"OpenAI should be selected when Gemini is unavailable"
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

test("uses NVIDIA when Gemini and OpenAI are not configured", () => {
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

test("uses BYNARA when no higher-priority provider is configured", () => {
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

test("Gemini has priority over OpenAI, NVIDIA, and BYNARA", () => {
const provider = createProvider({
GEMINI_API_KEY: "gemini-key",
OPENAI_API_KEY: "openai-key",
NVIDIA_API_KEY: "nvidia-key",
BYNARA_API_KEY: "bynara-key",

```
AI_MODEL: "gemini-model",
NVIDIA_MODEL: "nvidia-model",
BYNARA_MODEL: "bynara-model",
```

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

```
AI_MODEL: "gpt-test-model",
NVIDIA_MODEL: "nvidia-model",
BYNARA_MODEL: "bynara-model",
```

});

assert.equal(
provider.config.provider,
"openai",
"OpenAI should be selected over NVIDIA and BYNARA"
);

assert.equal(
provider.config.configured,
true,
"OpenAI provider should be configured"
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

```
NVIDIA_BASE_URL:
  "https://integrate.api.nvidia.com/v1",

NVIDIA_MODEL: "nvidia-test-model",
BYNARA_MODEL: "bynara-test-model",
```

});

assert.equal(
provider.config.provider,
"nvidia",
"NVIDIA should be selected over BYNARA"
);

assert.equal(
provider.config.configured,
true,
"NVIDIA provider should be configured"
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

```
PLANNER_MODEL: "planner-specialized",
UI_MODEL: "ui-specialized",
CONTENT_MODEL: "content-specialized",
CODE_MODEL: "code-specialized",
QA_MODEL: "qa-specialized",
```

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
"planner-specialized"
);

assert.equal(
provider.config.agentModels.ui,
"ui-specialized"
);

assert.equal(
provider.config.agentModels.content,
"content-specialized"
);

assert.equal(
provider.config.agentModels.code,
"code-specialized"
);

assert.equal(
provider.config.agentModels.qa,
"qa-specialized"
);
});

test("does not let provider selection change when only agent models are supplied", () => {
const provider = createProvider({
PLANNER_MODEL: "planner-model",
UI_MODEL: "ui-model",
CONTENT_MODEL: "content-model",
CODE_MODEL: "code-model",
QA_MODEL: "qa-model",
});

assert.equal(
provider.config.provider,
"local"
);

assert.equal(
provider.config.configured,
false
);
});

test("provider configurations are isolated from each other", () => {
const geminiProvider = createProvider({
GEMINI_API_KEY: "gemini-key",
AI_MODEL: "gemini-model",
});

const nvidiaProvider = createProvider({
NVIDIA_API_KEY: "nvidia-key",
NVIDIA_MODEL: "nvidia-model",
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
nvidiaProvider.config.provider,
"nvidia"
);

assert.equal(
nvidiaProvider.config.model,
"nvidia-model"
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
