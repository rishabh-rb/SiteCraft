"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const vercel_js_1 = require("./deployment/vercel.js");
(0, node_test_1.default)("returns configuration guidance when VERCEL_TOKEN is missing", async () => {
    const result = await (0, vercel_js_1.deployToVercel)("Test Project", [{ path: "index.html", content: "<h1>Hello</h1>" }], "");
    strict_1.default.equal(result.success, false);
    strict_1.default.equal(result.status, "ERROR");
    strict_1.default.match(result.error || "", /Vercel deployment is not configured/i);
});
(0, node_test_1.default)("handles Vercel API deployment successfully when configured", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({
        id: "dpl_12345",
        url: "test-project.vercel.app",
        readyState: "READY"
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    try {
        const result = await (0, vercel_js_1.deployToVercel)("Test Project", [{ path: "index.html", content: "<h1>Hello</h1>" }], "fake-vercel-token");
        strict_1.default.equal(result.success, true);
        strict_1.default.equal(result.status, "READY");
        strict_1.default.equal(result.deploymentId, "dpl_12345");
        strict_1.default.equal(result.deploymentUrl, "https://test-project.vercel.app");
    }
    finally {
        globalThis.fetch = originalFetch;
    }
});
