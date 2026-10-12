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
const VERCEL_API_URL = "https://api.vercel.com/v13/deployments";

// --------------------------------------------------
// Response helpers
// --------------------------------------------------

function mockResponse(
  body: unknown,
  status = 200,
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
  url = "test-project.vercel.app",
): Response {
  return mockResponse({
    id,
    url,
    readyState: "READY",
  });
}

function errorResponse(
  message: string,
  status: number,
): Response {
  return mockResponse(
    {
      error: { message },
    },
    status,
  );
}

// --------------------------------------------------
// Fetch mocking helpers
// --------------------------------------------------

type FetchHandler = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) => Promise<Response>;

function createMockFetch(
  handler: FetchHandler,
): typeof fetch {
  return (async (input, init) => {
    return handler(input, init);
  }) as typeof fetch;
}

async function withMockFetch(
  mock: typeof fetch,
  callback: () => Promise<void>,
): Promise<void> {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mock;

  try {
    await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// --------------------------------------------------
// 1. Configuration tests
// --------------------------------------------------

test("returns an error when the Vercel token is missing", async () => {
  const result = await deployToVercel(
    "Test Project",
    TEST_FILES,
    "",
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.match(
    result.error ?? "",
    /Vercel deployment is not configured/i,
  );
});

test("does not make an API request when the token is missing", async () => {
  const originalFetch = globalThis.fetch;
  let requestMade = false;

  try {
    globalThis.fetch = createMockFetch(async () => {
      requestMade = true;
      return successfulResponse();
    });

    await deployToVercel("Test Project", TEST_FILES, "");

    assert.equal(requestMade, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// --------------------------------------------------
// 2. Successful deployment tests
// --------------------------------------------------

test("deploys successfully and returns deployment details", async () => {
  await withMockFetch(
    createMockFetch(async () => successfulResponse()),
    async () => {
      const result = await deployToVercel(
        "Test Project",
        TEST_FILES,
        TEST_TOKEN,
      );

      assert.equal(result.success, true);
      assert.equal(result.status, "READY");
      assert.equal(result.deploymentId, "dpl_12345");
      assert.equal(
        result.deploymentUrl,
        "https://test-project.vercel.app",
      );
      assert.equal(result.provider, "vercel");
    },
  );
});

test("returns the correct deployment ID and URL", async () => {
  await withMockFetch(
    createMockFetch(async () =>
      successfulResponse(
        "dpl_custom_123",
        "custom-project.vercel.app",
      ),
    ),
    async () => {
      const result = await deployToVercel(
        "Custom Project",
        TEST_FILES,
        TEST_TOKEN,
      );

      assert.equal(result.success, true);
      assert.equal(result.deploymentId, "dpl_custom_123");
      assert.equal(
        result.deploymentUrl,
        "https://custom-project.vercel.app",
      );
    },
  );
});

// --------------------------------------------------
// 3. HTTP request tests
// --------------------------------------------------

test("sends a POST request to the Vercel deployments API", async () => {
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
        "Request Test",
        TEST_FILES,
        TEST_TOKEN,
      );

      assert.equal(requestUrl.split("?")[0], VERCEL_API_URL);
      assert.equal(requestMethod, "POST");
    },
  );
});

test("sends the Bearer authorization header", async () => {
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
        TEST_TOKEN,
      );

      assert.equal(authorization, `Bearer ${TEST_TOKEN}`);
    },
  );
});

test("sends a JSON content type", async () => {
  let contentType = "";

  await withMockFetch(
    createMockFetch(async (_input, init) => {
      contentType =
        new Headers(init?.headers).get("Content-Type") ?? "";

      return successfulResponse();
    }),
    async () => {
      await deployToVercel(
        "Content Type Test",
        TEST_FILES,
        TEST_TOKEN,
      );

      assert.match(contentType, /application\/json/i);
    },
  );
});

// --------------------------------------------------
// 4. Request body tests
// --------------------------------------------------

test("sends the correct project name and files", async () => {
  let requestBody: Record<string, unknown> | undefined;

  await withMockFetch(
    createMockFetch(async (_input, init) => {
      assert.equal(init?.method, "POST");
      assert.equal(typeof init?.body, "string");

      requestBody = JSON.parse(
        String(init?.body),
      ) as Record<string, unknown>;

      return successfulResponse();
    }),
    async () => {
      await deployToVercel(
        "Files Test",
        TEST_FILES,
        TEST_TOKEN,
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
    },
  );
});

test("includes all supplied deployment files", async () => {
  const multipleFiles = [
    { path: "index.html", content: "<h1>Home</h1>" },
    { path: "about.html", content: "<h1>About</h1>" },
    { path: "styles.css", content: "body { margin: 0; }" },
  ];

  let requestBody: Record<string, unknown> | undefined;

  await withMockFetch(
    createMockFetch(async (_input, init) => {
      requestBody = JSON.parse(
        String(init?.body),
      ) as Record<string, unknown>;

      return successfulResponse();
    }),
    async () => {
      await deployToVercel(
        "Multiple Files",
        multipleFiles,
        TEST_TOKEN,
      );

      assert.ok(requestBody);
      assert.ok(Array.isArray(requestBody.files));

      const files = requestBody.files as Array<{
        file: string;
        data: string;
      }>;

      assert.equal(files.length, 3);
      assert.deepEqual(
        files.map((file) => file.file),
        ["index.html", "about.html", "styles.css"],
      );
    },
  );
});

// --------------------------------------------------
// 5. Team configuration tests
// --------------------------------------------------

test("includes the team ID when provided", async () => {
  let requestUrl = "";

  await withMockFetch(
    createMockFetch(async (input) => {
      requestUrl = String(input);
      return successfulResponse();
    }),
    async () => {
      await deployToVercel(
        "Team Test",
        TEST_FILES,
        TEST_TOKEN,
        "team_123",
      );

      const url = new URL(requestUrl);

      assert.equal(
        url.searchParams.get("teamId"),
        "team_123",
      );
    },
  );
});

// --------------------------------------------------
// 6. API error tests
// --------------------------------------------------

test("handles server errors", async () => {
  await withMockFetch(
    createMockFetch(async () =>
      errorResponse("Vercel deployment failed", 500),
    ),
    async () => {
      const result = await deployToVercel(
        "Server Error Test",
        TEST_FILES,
        TEST_TOKEN,
      );

      assert.equal(result.success, false);
      assert.equal(result.status, "ERROR");
      assert.match(
        result.error ?? "",
        /Vercel deployment failed/i,
      );
    },
  );
});

test("handles unauthorized responses", async () => {
  await withMockFetch(
    createMockFetch(async () =>
      errorResponse("Invalid token", 401),
    ),
    async () => {
      const result = await deployToVercel(
        "Unauthorized Test",
        TEST_FILES,
        "invalid-token",
      );

      assert.equal(result.success, false);
      assert.equal(result.status, "ERROR");
      assert.match(result.error ?? "", /Invalid token/i);
    },
  );
});

test("handles forbidden responses", async () => {
  await withMockFetch(
    createMockFetch(async () =>
      errorResponse("Permission denied", 403),
    ),
    async () => {
      const result = await deployToVercel(
        "Forbidden Test",
        TEST_FILES,
        TEST_TOKEN,
      );

      assert.equal(result.success, false);
      assert.equal(result.status, "ERROR");
      assert.ok(result.error);
    },
  );
});

test("handles rate-limit responses", async () => {
  await withMockFetch(
    createMockFetch(async () =>
      errorResponse("Rate limit exceeded", 429),
    ),
    async () => {
      const result = await deployToVercel(
        "Rate Limit Test",
        TEST_FILES,
        TEST_TOKEN,
      );

      assert.equal(result.success, false);
      assert.equal(result.status, "ERROR");
      assert.ok(result.error);
    },
  );
});

// --------------------------------------------------
// 7. Invalid input tests
// --------------------------------------------------

test("rejects an empty project name", async () => {
  const result = await deployToVercel(
    "",
    TEST_FILES,
    TEST_TOKEN,
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.match(result.error ?? "", /project name/i);
});

test("rejects a whitespace-only project name", async () => {
  const result = await deployToVercel(
    "   ",
    TEST_FILES,
    TEST_TOKEN,
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
});

test("rejects an empty deployment file list", async () => {
  const result = await deployToVercel(
    "Empty Project",
    [],
    TEST_TOKEN,
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.ok(result.error);
});

// --------------------------------------------------
// 8. Malformed response tests
// --------------------------------------------------

test("handles malformed JSON returned by Vercel", async () => {
  await withMockFetch(
    createMockFetch(async () =>
      new Response("invalid-json", {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    ),
    async () => {
      const result = await deployToVercel(
        "Malformed JSON Test",
        TEST_FILES,
        TEST_TOKEN,
      );

      assert.equal(result.success, false);
      assert.equal(result.status, "ERROR");
      assert.ok(result.error);
    },
  );
});

test("handles a response without a deployment ID", async () => {
  await withMockFetch(
    createMockFetch(async () =>
      mockResponse({
        url: "missing-id.vercel.app",
        readyState: "READY",
      }),
    ),
    async () => {
      const result = await deployToVercel(
        "Missing ID Test",
        TEST_FILES,
        TEST_TOKEN,
      );

      assert.equal(result.success, false);
      assert.equal(result.status, "ERROR");
    },
  );
});

test("handles a response without a deployment URL", async () => {
  await withMockFetch(
    createMockFetch(async () =>
      mockResponse({
        id: "dpl_missing_url",
        readyState: "READY",
      }),
    ),
    async () => {
      const result = await deployToVercel(
        "Missing URL Test",
        TEST_FILES,
        TEST_TOKEN,
      );

      assert.equal(result.success, false);
      assert.equal(result.status, "ERROR");
    },
  );
});

// --------------------------------------------------
// 9. Network error tests
// --------------------------------------------------

test("handles network failures gracefully", async () => {
  await withMockFetch(
    createMockFetch(async () => {
      throw new Error("Network connection failed");
    }),
    async () => {
      const result = await deployToVercel(
        "Network Test",
        TEST_FILES,
        TEST_TOKEN,
      );

      assert.equal(result.success, false);
      assert.equal(result.status, "ERROR");
      assert.ok(result.error);
    },
  );
});

test("handles a network failure without exposing the token", async () => {
  const secretToken = "super-secret-vercel-token";

  await withMockFetch(
    createMockFetch(async () => {
      throw new Error("Network connection failed");
    }),
    async () => {
      const result = await deployToVercel(
        "Network Security Test",
        TEST_FILES,
        secretToken,
      );

      assert.equal(result.success, false);
      assert.doesNotMatch(
        result.error ?? "",
        /super-secret-vercel-token/i,
      );
    },
  );
});

// --------------------------------------------------
// 10. Security tests
// --------------------------------------------------

test("does not expose the token in API error messages", async () => {
  const secretToken = "super-secret-vercel-token";

  await withMockFetch(
    createMockFetch(async () =>
      errorResponse("Deployment authentication failed", 401),
    ),
    async () => {
      const result = await deployToVercel(
        "Security Test",
        TEST_FILES,
        secretToken,
      );

      assert.equal(result.success, false);
      assert.doesNotMatch(
        result.error ?? "",
        /super-secret-vercel-token/i,
      );
    },
  );
});

// --------------------------------------------------
// 11. Cleanup tests
// --------------------------------------------------

test("restores global fetch after a successful request", async () => {
  const originalFetch = globalThis.fetch;

  await withMockFetch(
    createMockFetch(async () => successfulResponse()),
    async () => {
      await deployToVercel(
        "Cleanup Success Test",
        TEST_FILES,
        TEST_TOKEN,
      );
    },
  );

  assert.equal(globalThis.fetch, originalFetch);
});

test("restores global fetch after a failed request", async () => {
  const originalFetch = globalThis.fetch;

  await withMockFetch(
    createMockFetch(async () =>
      errorResponse("Deployment failed", 500),
    ),
    async () => {
      const result = await deployToVercel(
        "Cleanup Failure Test",
        TEST_FILES,
        TEST_TOKEN,
      );

      assert.equal(result.success, false);
    },
  );

  assert.equal(globalThis.fetch, originalFetch);
});

test("restores global fetch even if the test callback throws", async () => {
  const originalFetch = globalThis.fetch;

  await assert.rejects(
    withMockFetch(
      createMockFetch(async () => successfulResponse()),
      async () => {
        throw new Error("Intentional test failure");
      },
    ),
    /Intentional test failure/,
  );

  assert.equal(globalThis.fetch, originalFetch);
});
