
import test from "node:test";
import assert from "node:assert/strict";

import { deployToVercel } from "./deployment/vercel.js";

// ==================================================
// TEST DATA
// ==================================================

const TEST_TOKEN = "fake-vercel-token";

const TEST_FILES = [
  {
    path: "index.html",
    content: "<h1>Hello</h1>",
  },
];

// ==================================================
// HELPER FUNCTIONS
// ==================================================

function mockResponse(
  body: unknown,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function successfulResponse(
  id = "dpl_12345",
  url = "test-project.vercel.app"
): Response {
  return mockResponse({
    id,
    url,
    readyState: "READY",
  });
}

type MockFetchHandler = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

function createMockFetch(
  handler: MockFetchHandler
): typeof fetch {
  return (async (input, init) => {
    return handler(input, init);
  }) as typeof fetch;
}

async function withMockFetch(
  mock: typeof fetch,
  callback: () => Promise<void>
): Promise<void> {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mock;

  try {
    await callback();
  } finally {
    // Always restore fetch, including when assertions fail.
    globalThis.fetch = originalFetch;
  }
}

// ==================================================
// 1. CONFIGURATION TESTS
// ==================================================

test("returns an error when Vercel token is missing", async () => {
  const result = await deployToVercel(
    "Test Project",
    TEST_FILES,
    ""
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");

  assert.match(
    result.error ?? "",
    /Vercel deployment is not configured/i
  );
});

// ==================================================
// 2. SUCCESSFUL DEPLOYMENT
// ==================================================

test("deploys a project successfully", async () => {
  await withMockFetch(
    createMockFetch(async () => successfulResponse()),
    async () => {
      const result = await deployToVercel(
        "Test Project",
        TEST_FILES,
        TEST_TOKEN
      );

      assert.equal(result.success, true);
      assert.equal(result.status, "READY");
      assert.equal(result.deploymentId, "dpl_12345");

      assert.equal(
        result.deploymentUrl,
        "https://test-project.vercel.app"
      );

      assert.equal(result.provider, "vercel");
    }
  );
});

// ==================================================
// 3. REQUEST METHOD AND URL
// ==================================================

test("sends a POST request to the Vercel API", async () => {
  let requestUrl = "";
  let requestMethod = "";

  await withMockFetch(
    createMockFetch(async (input, init) => {
      requestUrl = String(input);
      requestMethod = init?.method ?? "";

      return successfulResponse();
    }),
    async () => {
      await deployToVercel(
        "Test Project",
        TEST_FILES,
        TEST_TOKEN
      );

      assert.equal(requestMethod, "POST");
      assert.match(requestUrl, /api\.vercel\.com/i);
      assert.match(requestUrl, /deployments/i);
    }
  );
});

// ==================================================
// 4. AUTHORIZATION
// ==================================================

test("sends the correct authorization header", async () => {
  let authorization = "";

  await withMockFetch(
    createMockFetch(async (_input, init) => {
      authorization =
        new Headers(init?.headers).get("Authorization") ?? "";

      return successfulResponse();
    }),
    async () => {
      await deployToVercel(
        "Auth Test",
        TEST_FILES,
        TEST_TOKEN
      );

      assert.equal(
        authorization,
        `Bearer ${TEST_TOKEN}`
      );
    }
  );
});

// ==================================================
// 5. REQUEST BODY
// ==================================================

test("sends the correct project name and files", async () => {
  let requestBody: Record<string, unknown> | undefined;

  await withMockFetch(
    createMockFetch(async (_input, init) => {
      assert.equal(init?.method, "POST");
      assert.equal(typeof init?.body, "string");

      requestBody = JSON.parse(
        String(init?.body)
      ) as Record<string, unknown>;

      return successfulResponse();
    }),
    async () => {
      await deployToVercel(
        "Files Test",
        TEST_FILES,
        TEST_TOKEN
      );

      assert.ok(requestBody);
      assert.equal(requestBody.name, "files-test");
      assert.ok(Array.isArray(requestBody.files));

      const files = requestBody.files as Array<{
        file: string;
        data: string;
      }>;

      assert.equal(files.length, 1);
      assert.equal(files[0].file, "index.html");
      assert.equal(files[0].data, "<h1>Hello</h1>");
    }
  );
});

// ==================================================
// 6. TEAM CONFIGURATION
// ==================================================

test("includes teamId when provided", async () => {
  let requestUrl = "";

  await withMockFetch(
    createMockFetch(async (input) => {
      requestUrl = String(input);

      return successfulResponse(
        "dpl_team",
        "team-test.vercel.app"
      );
    }),
    async () => {
      await deployToVercel(
        "Team Test",
        TEST_FILES,
        TEST_TOKEN,
        "team_123"
      );

      const url = new URL(requestUrl);

      assert.equal(
        url.searchParams.get("teamId"),
        "team_123"
      );
    }
  );
});

// ==================================================
// 7. API ERROR HANDLING
// ==================================================

test("handles Vercel server errors", async () => {
  await withMockFetch(
    createMockFetch(async () =>
      mockResponse(
        {
          error: {
            message: "Vercel deployment failed",
          },
        },
        500
      )
    ),
    async () => {
      const result = await deployToVercel(
        "Failed Project",
        TEST_FILES,
        TEST_TOKEN
      );

      assert.equal(result.success, false);
      assert.equal(result.status, "ERROR");

      assert.match(
        result.error ?? "",
        /Vercel deployment failed/i
      );
    }
  );
});

test("handles unauthorized API responses", async () => {
  await withMockFetch(
    createMockFetch(async () =>
      mockResponse(
        {
          error: {
            message: "Invalid token",
          },
        },
        401
      )
    ),
    async () => {
      const result = await deployToVercel(
        "Unauthorized Project",
        TEST_FILES,
        "invalid-token"
      );

      assert.equal(result.success, false);
      assert.equal(result.status, "ERROR");

      assert.match(
        result.error ?? "",
        /Invalid token/i
      );
    }
  );
});

test("handles rate-limit responses", async () => {
  await withMockFetch(
    createMockFetch(async () =>
      mockResponse(
        {
          error: {
            message: "Rate limit exceeded",
          },
        },
        429
      )
    ),
    async () => {
      const result = await deployToVercel(
        "Rate Limit Test",
        TEST_FILES,
        TEST_TOKEN
      );

      assert.equal(result.success, false);
      assert.equal(result.status, "ERROR");
      assert.ok(result.error);
    }
  );
});

// ==================================================
// 8. INVALID INPUTS
// ==================================================

test("rejects an empty project name", async () => {
  const result = await deployToVercel(
    "",
    TEST_FILES,
    TEST_TOKEN
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");

  assert.match(
    result.error ?? "",
    /project name/i
  );
});

test("rejects an empty deployment file list", async () => {
  const result = await deployToVercel(
    "Empty Project",
    [],
    TEST_TOKEN
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.ok(result.error);
});

// ==================================================
// 9. MALFORMED API RESPONSES
// ==================================================

test("handles malformed JSON from Vercel", async () => {
  await withMockFetch(
    createMockFetch(async () =>
      new Response("invalid-json", {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
    ),
    async () => {
      const result = await deployToVercel(
        "Malformed Project",
        TEST_FILES,
        TEST_TOKEN
      );

      assert.equal(result.success, false);
      assert.equal(result.status, "ERROR");
      assert.ok(result.error);
    }
  );
});

test("handles a response without a deployment ID", async () => {
  await withMockFetch(
    createMockFetch(async () =>
      mockResponse({
        url: "missing-id.vercel.app",
        readyState: "READY",
      })
    ),
    async () => {
      const result = await deployToVercel(
        "Missing ID Project",
        TEST_FILES,
        TEST_TOKEN
      );

      assert.equal(result.success, false);
      assert.equal(result.status, "ERROR");
    }
  );
});

// ==================================================
// 10. NETWORK FAILURES
// ==================================================

test("handles network failures gracefully", async () => {
  await withMockFetch(
    createMockFetch(async () => {
      throw new Error("Network connection failed");
    }),
    async () => {
      const result = await deployToVercel(
        "Network Test",
        TEST_FILES,
        TEST_TOKEN
      );

      assert.equal(result.success, false);
      assert.equal(result.status, "ERROR");
      assert.ok(result.error);
    }
  );
});

// ==================================================
// 11. SECURITY
// ==================================================

test("does not expose the Vercel token in error messages", async () => {
  const secretToken = "super-secret-vercel-token";

  await withMockFetch(
    createMockFetch(async () =>
      mockResponse(
        {
          error: {
            message: "Deployment authentication failed",
          },
        },
        401
      )
    ),
    async () => {
      const result = await deployToVercel(
        "Security Test",
        TEST_FILES,
        secretToken
      );

      assert.equal(result.success, false);

      assert.doesNotMatch(
        result.error ?? "",
        /super-secret-vercel-token/i
      );
    }
  );
});

// ==================================================
// 12. CLEANUP
// ==================================================

test("restores global fetch after a deployment error", async () => {
  const originalFetch = globalThis.fetch;

  await withMockFetch(
    createMockFetch(async () =>
      mockResponse(
        {
          error: {
            message: "Deployment failed",
          },
        },
        500
      )
    ),
    async () => {
      const result = await deployToVercel(
        "Cleanup Test",
        TEST_FILES,
        TEST_TOKEN
      );

      assert.equal(result.success, false);
    }
  );

  assert.equal(globalThis.fetch, originalFetch);
});