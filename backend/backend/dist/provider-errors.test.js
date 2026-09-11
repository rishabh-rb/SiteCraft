"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const ml_1 = require("@sitecraft/ml");
(0, node_test_1.default)("surfaces NVIDIA model unavailable errors with configuration guidance", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: { message: 'The model "missing-model" does not exist.' } }), { status: 404, headers: { "Content-Type": "application/json" } }));
    try {
        const provider = (0, ml_1.createProvider)({ NVIDIA_API_KEY: "nvidia-key", NVIDIA_MODEL: "missing-model" });
        await strict_1.default.rejects(() => provider.generateJson("{}", "planner"), (error) => {
            strict_1.default.ok(error instanceof ml_1.ProviderError);
            strict_1.default.equal(error.code, "MODEL_UNAVAILABLE");
            strict_1.default.match(error.message, /missing-model/);
            strict_1.default.match(error.message, /NVIDIA_MODEL/);
            return true;
        });
    }
    finally {
        globalThis.fetch = originalFetch;
    }
});
(0, node_test_1.default)("surfaces malformed NVIDIA responses", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({ choices: [{ message: { content: "not-json" } }] }), { status: 200, headers: { "Content-Type": "application/json" } }));
    try {
        const provider = (0, ml_1.createProvider)({ NVIDIA_API_KEY: "nvidia-key", NVIDIA_MODEL: "working-model" });
        await strict_1.default.rejects(() => provider.generateJson("{}", "planner"), (error) => {
            strict_1.default.ok(error instanceof ml_1.ProviderError);
            strict_1.default.equal(error.code, "MALFORMED_RESPONSE");
            return true;
        });
    }
    finally {
        globalThis.fetch = originalFetch;
    }
});
