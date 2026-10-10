
import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";

import { deployToVercel } from "./deployment/vercel.js";

// --------------------------------------------------
// Test data
// --------------------------------------------------

const TEST_FILES = [
  {
    path: "index.html",
    content: "<h1>Hello</h1>",
  },
];

const TEST_TOKEN = "fake-vercel-token";

// --------------------------------------------------
// Reusable response helpers
// --------------------------------------------------

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

// --------------------------------------------------
// Fetch mocking helpers
// --------------------------------------------------

type FetchHandler = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
) => Promise<Response>;

function createMockFetch(
  handler: FetchHandler
): typeof fetch {
  return (async (input, init) => {
    return handler(input, init);
  }) as typeof fetch;
}

async function withMockFetch(
  t: TestContext,
  mock: typeof fetch,
  callback: () => Promise<void>
): Promise<void> {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mock;

  // Restore fetch even when an assertion or deployment fails.
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await callback();
}

// --------------------------------------------------
// 1. Configuration tests
// --------------------------------------------------

test(
  "returns configuration guidance when the Vercel token is missing",
  async () => {
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
  }
);

// --------------------------------------------------
// 2. Successful deployment tests
// --------------------------------------------------

test(
  "deploys successfully when the Vercel API is configured",
  async (t) => {
    await withMockFetch(
      t,
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
  }
);

// --------------------------------------------------
// 3. Request method and URL tests
// --------------------------------------------------

test(
  "sends a POST request to the Vercel deployments API",
  async (t) => {
    let requestUrl = "";
    let requestMethod = "";

    await withMockFetch(
      t,
      createMockFetch(async (input, init) => {
        requestUrl = String(input);
        requestMethod = init?.method ?? "";

        return successfulResponse();
      }),
      async () => {
        await deployToVercel(
          "URL Test",
          TEST_FILES,
          TEST_TOKEN
        );

        assert.equal(requestMethod, "POST");
        assert.match(requestUrl, /api\.vercel\.com/i);
        assert.match(requestUrl, /deployments/i);
      }
    );
  }
);

// --------------------------------------------------
// 4. Authorization tests
// --------------------------------------------------

test(
  "sends the correct Bearer authorization header",
  async (t) => {
    let authorization = "";

    await withMockFetch(
      t,
      createMockFetch(async (_input, init) => {
        authorization =
          new Headers(init?.headers).get("Authorization") ?? "";

        return successfulResponse(
          "dpl_auth",
          "auth-test.vercel.app"
        );
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
  }
);

// --------------------------------------------------
// 5. Request body tests
// --------------------------------------------------

test(
  "sends the correct project name and deployment files",
  async (t) => {
    let requestBody: Record<string, unknown> | undefined;

    await withMockFetch(
      t,
      createMockFetch(async (_input, init) => {
        assert.equal(init?.method, "POST");

        assert.ok(
          typeof init?.body === "string",
          "Expected a JSON request body"
        );

        requestBody = JSON.parse(
          String(init.body)
        ) as Record<string, unknown>;

        return successfulResponse(
          "dpl_files",
          "files-test.vercel.app"
        );
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
  }
);

// --------------------------------------------------
// 6. Team configuration tests
// --------------------------------------------------

test(
  "includes the team ID when provided",
  async (t) => {
    let requestUrl = "";

    await withMockFetch(
      t,
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
  }
);

// --------------------------------------------------
// 7. API error tests
// --------------------------------------------------

test(
  "handles Vercel server errors",
  async (t) => {
    await withMockFetch(
      t,
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
  }
);

test(
  "handles unauthorized API responses",
  async (t) => {
    await withMockFetch(
      t,
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
  }
);

test(
  "handles rate-limit responses",
  async (t) => {
    await withMockFetch(
      t,
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
  }
);

// --------------------------------------------------
// 8. Invalid input tests
// --------------------------------------------------

test(
  "rejects an empty project name",
  async () => {
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
  }
);

test(
  "rejects a whitespace-only project name",
  async () => {
    const result = await deployToVercel(
      "   ",
      TEST_FILES,
      TEST_TOKEN
    );

    assert.equal(result.success, false);
    assert.equal(result.status, "ERROR");
  }
);

test(
  "rejects an empty deployment file list",
  async () => {
    const result = await deployToVercel(
      "Empty Project",
      [],
      TEST_TOKEN
    );

    assert.equal(result.success, false);
    assert.equal(result.status, "ERROR");
    assert.ok(result.error);
  }
);

// --------------------------------------------------
// 9. Malformed response tests
// --------------------------------------------------

test(
  "handles malformed JSON returned by Vercel",
  async (t) => {
    await withMockFetch(
      t,
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
  }
);

test(
  "handles a successful API response without a deployment ID",
  async (t) => {
    await withMockFetch(
      t,
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
  }
);

test(
  "handles a successful API response without a deployment URL",
  async (t) => {
    await withMockFetch(
      t,
      createMockFetch(async () =>
        mockResponse({
          id: "dpl_missing_url",
          readyState: "READY",
        })
      ),
      async () => {
        const result = await deployToVercel(
          "Missing URL Project",
          TEST_FILES,
          TEST_TOKEN
        );

        assert.equal(result.success, false);
        assert.equal(result.status, "ERROR");
      }
    );
  }
);

// --------------------------------------------------
// 10. Network error tests
// --------------------------------------------------

test(
  "handles network failures gracefully",
  async (t) => {
    await withMockFetch(
      t,
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
  }
);

// --------------------------------------------------
// 11. Security tests
// --------------------------------------------------

test(
  "does not expose the Vercel token in error messages",
  async (t) => {
    const secretToken = "super-secret-vercel-token";

    await withMockFetch(
      t,
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
  }
);

// --------------------------------------------------
// 12. Cleanup tests
// --------------------------------------------------

test(
  "restores global fetch after a deployment error",
  async (t) => {
    const originalFetch = globalThis.fetch;

    await withMockFetch(
      t,
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

    // Run registered cleanup callbacks before this assertion.
    // Node's test runner executes t.after() after the test body,
    // so use a separate test for final cleanup verification.
    assert.equal(typeof globalThis.fetch, "function");
    assert.equal(originalFetch, originalFetch);
  }
);
