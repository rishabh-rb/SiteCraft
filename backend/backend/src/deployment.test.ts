
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
   Helpers
========================================================= */

function mockFetch(
  response: Response | (() => Response | Promise<Response>)
): typeof fetch {
  return (async () => {
    return typeof response === "function"
      ? await response()
      : response;
  }) as typeof fetch;
}

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

test("uses VERCEL_TOKEN from environment when token is not provided", async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.VERCEL_TOKEN;

  process.env.VERCEL_TOKEN = "environment-token";

  let authorization = "";

  globalThis.fetch = (async (
    _input: string | URL | Request,
    init?: RequestInit
  ) => {
    authorization = new Headers(init?.headers).get("Authorization") || "";

    return new Response(
      JSON.stringify({
        id: "dpl_env_token",
        url: "env-token.vercel.app",
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
    const result = await deployToVercel(
      "Environment Token Project",
      TEST_FILES
    );

    assert.equal(result.success, true);
    assert.equal(
      authorization,
      "Bearer environment-token"
    );
  } finally {
    globalThis.fetch = originalFetch;

    if (originalToken === undefined) {
      delete process.env.VERCEL_TOKEN;
    } else {
      process.env.VERCEL_TOKEN = originalToken;
    }
  }
});

/* =========================================================
   Successful Deployment
========================================================= */

test("handles Vercel API deployment successfully when configured", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mockFetch(
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
    )
  );

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

test("handles BUILDING deployment status", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mockFetch(
    new Response(
      JSON.stringify({
        id: "dpl_building",
        url: "building-project.vercel.app",
        readyState: "BUILDING",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  );

  try {
    const result = await deployToVercel(
      "Building Project",
      TEST_FILES,
      "fake-vercel-token"
    );

    assert.equal(result.success, true);
    assert.equal(result.status, "BUILDING");
    assert.equal(result.deploymentId, "dpl_building");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("normalizes a Vercel URL that already contains https", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mockFetch(
    new Response(
      JSON.stringify({
        id: "dpl_https",
        url: "https://example.vercel.app",
        readyState: "READY",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  );

  try {
    const result = await deployToVercel(
      "HTTPS Project",
      TEST_FILES,
      "fake-vercel-token"
    );

    assert.equal(
      result.deploymentUrl,
      "https://example.vercel.app"
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

test("sends JSON content type and accept headers", async () => {
  const originalFetch = globalThis.fetch;

  let requestHeaders: Headers | undefined;

  globalThis.fetch = (async (
    _input: string | URL | Request,
    init?: RequestInit
  ) => {
    requestHeaders = new Headers(init?.headers);

    return new Response(
      JSON.stringify({
        id: "dpl_headers",
        url: "headers-test.vercel.app",
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
      "Headers Test Project",
      TEST_FILES,
      "fake-vercel-token"
    );

    assert.equal(
      requestHeaders?.get("Content-Type"),
      "application/json"
    );

    assert.equal(
      requestHeaders?.get("Accept"),
      "application/json"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uses POST method for Vercel deployment", async () => {
  const originalFetch = globalThis.fetch;

  let requestMethod = "";

  globalThis.fetch = (async (
    _input: string | URL | Request,
    init?: RequestInit
  ) => {
    requestMethod = init?.method || "";

    return new Response(
      JSON.stringify({
        id: "dpl_method",
        url: "method-test.vercel.app",
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
      "Method Test Project",
      TEST_FILES,
      "fake-vercel-token"
    );

    assert.equal(requestMethod, "POST");
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

    assert.ok(
      requestBody,
      "Vercel request body should be present"
    );

    assert.ok(
      Array.isArray(requestBody?.files),
      "Deployment request should contain a files array"
    );

    assert.ok(
      JSON.stringify(requestBody?.files).includes("index.html"),
      "Deployment request should contain index.html"
    );

    assert.ok(
      JSON.stringify(requestBody?.files).includes("<h1>Hello</h1>"),
      "Deployment request should contain file content"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sends the expected project name", async () => {
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
        id: "dpl_project_name",
        url: "my-test-project.vercel.app",
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
      "My Test Project",
      TEST_FILES,
      "fake-vercel-token"
    );

    assert.equal(
      requestBody?.name,
      "my-test-project"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("includes teamId in the Vercel request URL when provided", async () => {
  const originalFetch = globalThis.fetch;

  let requestUrl = "";

  globalThis.fetch = (async (
    input: string | URL | Request
  ) => {
    requestUrl = String(input);

    return new Response(
      JSON.stringify({
        id: "dpl_team",
        url: "team-project.vercel.app",
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
      "Team Project",
      TEST_FILES,
      "fake-vercel-token",
      "team_123"
    );

    assert.match(
      requestUrl,
      /teamId=team_123/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/* =========================================================
   Input Validation
========================================================= */

test("rejects an empty project name", async () => {
  const result = await deployToVercel(
    "",
    TEST_FILES,
    "fake-vercel-token"
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.match(
    result.error || "",
    /project name/i
  );
});

test("rejects an empty file list", async () => {
  const result = await deployToVercel(
    "Empty Files Project",
    [],
    "fake-vercel-token"
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.match(
    result.error || "",
    /file/i
  );
});

test("rejects invalid deployment file entries", async () => {
  const result = await deployToVercel(
    "Invalid Files Project",
    [
      {
        path: "",
        content: "hello",
      },
    ],
    "fake-vercel-token"
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.match(
    result.error || "",
    /file|path/i
  );
});

test("rejects deployment file paths containing parent traversal", async () => {
  const result = await deployToVercel(
    "Traversal Project",
    [
      {
        path: "../secret.txt",
        content: "secret",
      },
    ],
    "fake-vercel-token"
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.match(
    result.error || "",
    /path|invalid/i
  );
});

/* =========================================================
   API Errors
========================================================= */

test("handles Vercel API errors gracefully", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mockFetch(
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
    )
  );

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

  globalThis.fetch = mockFetch(
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
    )
  );

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

test("handles API errors without an error message", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mockFetch(
    new Response(
      JSON.stringify({
        error: {},
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  );

  try {
    const result = await deployToVercel(
      "Unknown Error Project",
      TEST_FILES,
      "fake-vercel-token"
    );

    assert.equal(result.success, false);
    assert.equal(result.status, "ERROR");
    assert.ok(result.error);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/* =========================================================
   Malformed Responses
========================================================= */

test("handles malformed JSON responses", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mockFetch(
    new Response(
      "this is not valid json",
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  );

  try {
    const result = await deployToVercel(
      "Malformed JSON Project",
      TEST_FILES,
      "fake-vercel-token"
    );

    assert.equal(result.success, false);
    assert.equal(result.status, "ERROR");
    assert.ok(result.error);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("handles malformed Vercel API responses", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mockFetch(
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
    )
  );

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

test("handles successful responses without deployment ID", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mockFetch(
    new Response(
      JSON.stringify({
        url: "missing-id.vercel.app",
        readyState: "READY",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  );

  try {
    const result = await deployToVercel(
      "Missing ID Project",
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
   Network Errors
========================================================= */

test("handles network failures gracefully", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    throw new Error("Network connection failed");
  }) as typeof fetch;

  try {
    const result = await deployToVercel(
      "Network Error Project",
      TEST_FILES,
      "fake-vercel-token"
    );

    assert.equal(result.success, false);
    assert.equal(result.status, "ERROR");

    assert.match(
      result.error || "",
      /network|connection|failed/i
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/* =========================================================
   Security
========================================================= */

test("does not expose the Vercel token in deployment errors", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mockFetch(
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
    )
  );

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

  globalThis.fetch = mockFetch(
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
    )
  );

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
