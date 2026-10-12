
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

const VERCEL_API_URL = "https://api.vercel.com/v13/deployments";

// ==================================================
// TYPES
// ==================================================

type MockFetchHandler = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Response | Promise<Response>;

// ==================================================
// MOCK HELPERS
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

function createMockFetch(
  handler: MockFetchHandler
): typeof fetch {
  return (async (input, init) => {
    return handler(input, init);
  }) as typeof fetch;
}

async function withMockFetch<T>(
  mock: typeof fetch,
  callback: () => Promise<T>
): Promise<T> {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mock;

  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function deployWithMock(
  handler: MockFetchHandler,
  projectName = "Test Project",
  files = TEST_FILES,
  token = TEST_TOKEN,
  teamId?: string
) {
  return withMockFetch(
    createMockFetch(handler),
    () =>
      deployToVercel(
        projectName,
        files,
        token,
        teamId
      )
  );
}

// ==================================================
// 1. CONFIGURATION
// ==================================================

test("returns an error when the Vercel token is missing", async () => {
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
  const result = await deployWithMock(() =>
    successfulResponse()
  );

  assert.equal(result.success, true);
  assert.equal(result.status, "READY");
  assert.equal(result.deploymentId, "dpl_12345");
  assert.equal(
    result.deploymentUrl,
    "https://test-project.vercel.app"
  );
  assert.equal(result.provider, "vercel");
});

test("uses the deployment ID and URL returned by Vercel", async () => {
  const result = await deployWithMock(() =>
    successfulResponse(
      "dpl_custom_456",
      "custom-project.vercel.app"
    )
  );

  assert.equal(result.success, true);
  assert.equal(result.deploymentId, "dpl_custom_456");
  assert.equal(
    result.deploymentUrl,
    "https://custom-project.vercel.app"
  );
});

// ==================================================
// 3. REQUEST METHOD AND URL
// ==================================================

test("sends a POST request to the Vercel deployments API", async () => {
  let requestUrl = "";
  let requestMethod = "";

  const result = await deployWithMock(
    (input, init) => {
      requestUrl = String(input);
      requestMethod = init?.method ?? "";

      return successfulResponse();
    }
  );

  assert.equal(result.success, true);
  assert.equal(requestMethod, "POST");
  assert.equal(requestUrl, VERCEL_API_URL);
});

// ==================================================
// 4. AUTHORIZATION
// ==================================================

test("sends the correct Bearer authorization header", async () => {
  let authorization = "";

  const result = await deployWithMock(
    (_input, init) => {
      authorization = new Headers(
        init?.headers
      ).get("Authorization") ?? "";

      return successfulResponse();
    }
  );

  assert.equal(result.success, true);
  assert.equal(
    authorization,
    `Bearer ${TEST_TOKEN}`
  );
});

// ==================================================
// 5. REQUEST BODY
// ==================================================

test("sends the project name and files in the request body", async () => {
  let requestBody: Record<string, unknown> | undefined;

  const result = await deployWithMock(
    (_input, init) => {
      assert.equal(init?.method, "POST");
      assert.equal(typeof init?.body, "string");

      requestBody = JSON.parse(
        String(init?.body)
      ) as Record<string, unknown>;

      return successfulResponse();
    },
    "Files Test"
  );

  assert.equal(result.success, true);
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
});

test("sends JSON content type", async () => {
  let contentType = "";

  const result = await deployWithMock(
    (_input, init) => {
      contentType = new Headers(
        init?.headers
      ).get("Content-Type") ?? "";

      return successfulResponse();
    }
  );

  assert.equal(result.success, true);
  assert.match(contentType, /application\/json/i);
});

// ==================================================
// 6. TEAM CONFIGURATION
// ==================================================

test("includes teamId when provided", async () => {
  let requestUrl = "";

  const result = await deployWithMock(
    (input) => {
      requestUrl = String(input);

      return successfulResponse(
        "dpl_team",
        "team-test.vercel.app"
      );
    },
    "Team Test",
    TEST_FILES,
    TEST_TOKEN,
    "team_123"
  );

  assert.equal(result.success, true);

  const url = new URL(requestUrl);

  assert.equal(
    url.searchParams.get("teamId"),
    "team_123"
  );
});

test("does not include teamId when it is omitted", async () => {
  let requestUrl = "";

  const result = await deployWithMock(
    (input) => {
      requestUrl = String(input);
      return successfulResponse();
    }
  );

  assert.equal(result.success, true);

  const url = new URL(requestUrl);

  assert.equal(
    url.searchParams.has("teamId"),
    false
  );
});

// ==================================================
// 7. API ERROR HANDLING
// ==================================================

test("handles Vercel server errors", async () => {
  const result = await deployWithMock(() =>
    mockResponse(
      {
        error: {
          message: "Vercel deployment failed",
        },
      },
      500
    )
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");

  assert.match(
    result.error ?? "",
    /Vercel deployment failed/i
  );
});

test("handles unauthorized API responses", async () => {
  const result = await deployWithMock(
    () =>
      mockResponse(
        {
          error: {
            message: "Invalid token",
          },
        },
        401
      ),
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
});

test("handles rate-limit responses", async () => {
  const result = await deployWithMock(() =>
    mockResponse(
      {
        error: {
          message: "Rate limit exceeded",
        },
      },
      429
    )
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.ok(result.error);
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

test("does not call the API when the project name is invalid", async () => {
  let requestCount = 0;

  const result = await deployWithMock(
    () => {
      requestCount++;
      return successfulResponse();
    },
    ""
  );

  assert.equal(result.success, false);
  assert.equal(requestCount, 0);
});

test("does not call the API when there are no files", async () => {
  let requestCount = 0;

  const result = await deployWithMock(
    () => {
      requestCount++;
      return successfulResponse();
    },
    "Empty Project",
    []
  );

  assert.equal(result.success, false);
  assert.equal(requestCount, 0);
});

// ==================================================
// 9. MALFORMED API RESPONSES
// ==================================================

test("handles malformed JSON from Vercel", async () => {
  const result = await deployWithMock(
    () =>
      new Response("invalid-json", {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.ok(result.error);
});

test("handles a response without a deployment ID", async () => {
  const result = await deployWithMock(() =>
    mockResponse({
      url: "missing-id.vercel.app",
      readyState: "READY",
    })
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
});

test("handles an empty API response body", async () => {
  const result = await deployWithMock(
    () =>
      new Response("", {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.ok(result.error);
});

// ==================================================
// 10. NETWORK FAILURES
// ==================================================

test("handles network failures gracefully", async () => {
  const result = await deployWithMock(() => {
    throw new Error("Network connection failed");
  });

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.ok(result.error);
});

test("handles non-Error network exceptions", async () => {
  const result = await deployWithMock(() => {
    throw "Network unavailable";
  });

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.ok(result.error);
});

// ==================================================
// 11. SECURITY
// ==================================================

test("does not expose the Vercel token in error messages", async () => {
  const secretToken = "super-secret-vercel-token";

  const result = await deployWithMock(
    () =>
      mockResponse(
        {
          error: {
            message: "Deployment authentication failed",
          },
        },
        401
      ),
    "Security Test",
    TEST_FILES,
    secretToken
  );

  assert.equal(result.success, false);

  assert.doesNotMatch(
    result.error ?? "",
    /super-secret-vercel-token/i
  );
});

// ==================================================
// 12. CLEANUP
// ==================================================

test("restores global fetch after a deployment error", async () => {
  const originalFetch = globalThis.fetch;

  const result = await deployWithMock(
    () =>
      mockResponse(
        {
          error: {
            message: "Deployment failed",
          },
        },
        500
      )
  );

  assert.equal(result.success, false);
  assert.equal(globalThis.fetch, originalFetch);
});

test("restores global fetch even when the mock throws", async () => {
  const originalFetch = globalThis.fetch;

  await assert.rejects(
    withMockFetch(
      createMockFetch(() => {
        throw new Error("Mock failure");
      }),
      async () => {
        await fetch("https://example.com");
      }
    ),
    /Mock failure/
  );

  assert.equal(globalThis.fetch, originalFetch);
});
