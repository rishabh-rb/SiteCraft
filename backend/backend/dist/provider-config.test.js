"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const ml_1 = require("@sitecraft/ml");
(0, node_test_1.default)("selects per-agent models and reports missing provider", () => {
    const provider = (0, ml_1.createProvider)({
        PLANNER_MODEL: "planner-model",
        UI_MODEL: "ui-model",
        CONTENT_MODEL: "content-model",
        CODE_MODEL: "code-model",
        QA_MODEL: "qa-model"
    });
    strict_1.default.equal(provider.config.provider, "local");
    strict_1.default.equal(provider.config.configured, false);
    strict_1.default.equal(provider.config.agentModels.planner, "planner-model");
    strict_1.default.equal(provider.config.agentModels.ui, "ui-model");
    strict_1.default.equal(provider.config.agentModels.content, "content-model");
    strict_1.default.equal(provider.config.agentModels.code, "code-model");
    strict_1.default.equal(provider.config.agentModels.qa, "qa-model");
});
(0, node_test_1.default)("prefers Gemini when configured", () => {
    const provider = (0, ml_1.createProvider)({
        GEMINI_API_KEY: "gemini-key",
        AI_MODEL: "gemini-3.6-flash"
    });
    strict_1.default.equal(provider.config.provider, "gemini");
    strict_1.default.equal(provider.config.configured, true);
    strict_1.default.equal(provider.config.model, "gemini-3.6-flash");
});
(0, node_test_1.default)("prefers OpenAI when Gemini is not configured", () => {
    const provider = (0, ml_1.createProvider)({
        OPENAI_API_KEY: "openai-key",
        AI_MODEL: "gpt-4o"
    });
    strict_1.default.equal(provider.config.provider, "openai");
    strict_1.default.equal(provider.config.configured, true);
    strict_1.default.equal(provider.config.model, "gpt-4o");
});
(0, node_test_1.default)("prefers NVIDIA when configured without Gemini/OpenAI", () => {
    const provider = (0, ml_1.createProvider)({
        NVIDIA_API_KEY: "nvidia-key",
        NVIDIA_BASE_URL: "https://integrate.api.nvidia.com/v1",
        NVIDIA_MODEL: "qwen/qwen3-coder-480b-a35b-instruct"
    });
    strict_1.default.equal(provider.config.provider, "nvidia");
    strict_1.default.equal(provider.config.configured, true);
    strict_1.default.equal(provider.config.model, "qwen/qwen3-coder-480b-a35b-instruct");
});
(0, node_test_1.default)("prefers BYNARA when configured without other providers", () => {
    const provider = (0, ml_1.createProvider)({
        BYNARA_API_KEY: "bynara-key",
        BYNARA_BASE_URL: "https://router.bynara.id/v1",
        BYNARA_MODEL: "agnes-2.0-flash"
    });
    strict_1.default.equal(provider.config.provider, "bynara");
    strict_1.default.equal(provider.config.configured, true);
    strict_1.default.equal(provider.config.model, "agnes-2.0-flash");
});
