import test from "node:test";
import assert from "node:assert/strict";
import { deployToVercel } from "./deployment/vercel.js";

test("returns configuration guidance when VERCEL_TOKEN is missing", async () => {
  const result = await deployToVercel("Test Project", [{ path: "index.html", content: "<h1>Hello</h1>" }], "");
  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.match(result.error || "", /Vercel deployment is not configured/i);
});

test("handles Vercel API deployment successfully when configured", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    id: "dpl_12345",
    url: "test-project.vercel.app",
    readyState: "READY"
  }), { status: 200, headers: { "Content-Type": "application/json" } })) as typeof fetch;

  try {
    const result = await deployToVercel(
      "Test Project",
      [{ path: "index.html", content: "<h1>Hello</h1>" }],
      "fake-vercel-token"
    );
    assert.equal(result.success, true);
    assert.equal(result.status, "READY");
    assert.equal(result.deploymentId, "dpl_12345");
    assert.equal(result.deploymentUrl, "https://test-project.vercel.app");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
