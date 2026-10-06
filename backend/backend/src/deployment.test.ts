
import test from "node:test";
import assert from "node:assert/strict";

import { deployToVercel } from "./deployment/vercel.js";

const TEST_FILES = [
  {
    path: "index.html",
    content: "<h1>Hello</h1>",
  },
];

/* =========================================================
   Configuration
========================================================= */

test("returns configuration guidance when VERCEL_TOKEN is missing", async () => {
  const result = await deployToVercel(
    "Test Project",
    TEST_FILES,
    ""
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");

  assert.match(
    result.error || "",
    /Vercel deployment is not configured/i
  );
});

/* =========================================================
   Successful Deployment
========================================================= */

test("handles Vercel API deployment successfully when configured", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        id: "dpl_12345",
        url: "test-project.vercel.app",
        readyState: "READY",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )) as typeof fetch;

  try {
    const result = await deployToVercel(
      "Test Project",
      TEST_FILES,
      "fake-vercel-token"
    );

    assert.equal(result.success, true);
    assert.equal(result.status, "READY");
    assert.equal(result.deploymentId, "dpl_12345");

    assert.equal(
      result.deploymentUrl,
      "https://test-project.vercel.app"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/* =========================================================
   Request Validation
========================================================= */

test("sends the Vercel authorization header", async () => {
  const originalFetch = globalThis.fetch;

  let requestHeaders: Headers | undefined;

  globalThis.fetch = (async (
    _input: string | URL | Request,
    init?: RequestInit
  ) => {
    requestHeaders = new Headers(init?.headers);

    return new Response(
      JSON.stringify({
        id: "dpl_auth_test",
        url: "auth-test.vercel.app",
        readyState: "READY",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }) as typeof fetch;

  try {
    await deployToVercel(
      "Auth Test Project",
      TEST_FILES,
      "fake-vercel-token"
    );

    assert.equal(
      requestHeaders?.get("Authorization"),
      "Bearer fake-vercel-token",
      "Vercel API request should contain the Bearer token"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sends deployment files to the Vercel API", async () => {
  const originalFetch = globalThis.fetch;

  let requestBody: Record<string, unknown> | undefined;

  globalThis.fetch = (async (
    _input: string | URL | Request,
    init?: RequestInit
  ) => {
    if (typeof init?.body === "string") {
      requestBody = JSON.parse(init.body) as Record<string, unknown>;
    }

    return new Response(
      JSON.stringify({
        id: "dpl_files_test",
        url: "files-test.vercel.app",
        readyState: "READY",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }) as typeof fetch;

  try {
    await deployToVercel(
      "Files Test Project",
      TEST_FILES,
      "fake-vercel-token"
    );

    assert.ok(requestBody, "Vercel request body should be present");

    assert.ok(
      Array.isArray(requestBody?.files),
      "Deployment request should contain a files array"
    );

    assert.ok(
      JSON.stringify(requestBody?.files).includes("index.html"),
      "Deployment request should contain index.html"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/* =========================================================
   API Errors
========================================================= */

test("handles Vercel API errors gracefully", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error: {
          message: "Vercel deployment failed",
        },
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )) as typeof fetch;

  try {
    const result = await deployToVercel(
      "Failed Project",
      TEST_FILES,
      "fake-vercel-token"
    );

    assert.equal(result.success, false);
    assert.equal(result.status, "ERROR");

    assert.match(
      result.error || "",
      /Vercel deployment failed/i
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("handles unauthorized Vercel API responses", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error: {
          message: "Invalid token",
        },
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )) as typeof fetch;

  try {
    const result = await deployToVercel(
      "Unauthorized Project",
      TEST_FILES,
      "invalid-token"
    );

    assert.equal(result.success, false);
    assert.equal(result.status, "ERROR");

    assert.match(
      result.error || "",
      /Invalid token/i
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/* =========================================================
   Malformed Responses
========================================================= */

test("handles malformed Vercel API responses", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        unexpected: true,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )) as typeof fetch;

  try {
    const result = await deployToVercel(
      "Malformed Response Project",
      TEST_FILES,
      "fake-vercel-token"
    );

    assert.equal(result.success, false);
    assert.equal(result.status, "ERROR");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/* =========================================================
   Security
========================================================= */

test("does not expose the Vercel token in deployment errors", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error: {
          message: "Deployment authentication failed",
        },
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )) as typeof fetch;

  const secretToken = "super-secret-vercel-token";

  try {
    const result = await deployToVercel(
      "Security Test Project",
      TEST_FILES,
      secretToken
    );

    assert.equal(result.success, false);

    assert.doesNotMatch(
      result.error || "",
      /super-secret-vercel-token/,
      "Deployment errors must not expose the Vercel token"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/* =========================================================
   Cleanup
========================================================= */

test("restores fetch after Vercel deployment errors", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error: {
          message: "Deployment failed",
        },
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )) as typeof fetch;

  try {
    const result = await deployToVercel(
      "Cleanup Test Project",
      TEST_FILES,
      "fake-vercel-token"
    );

    assert.equal(result.success, false);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(
    globalThis.fetch,
    originalFetch,
    "globalThis.fetch should be restored after the test"
  );
});
