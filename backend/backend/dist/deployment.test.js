
import test from "node:test";
import assert from "node:assert/strict";

import { deployToVercel } from "./deployment/vercel.js";

// ==================================================
// Test Data
// ==================================================

const TEST_TOKEN = "fake-vercel-token";
const SECRET_TOKEN = "super-secret-vercel-token";

const VERCEL_API_URL = "https://api.vercel.com/v13/deployments";

const TEST_FILES = [
  {
    path: "index.html",
    content: "<h1>Hello</h1>",
  },
];

// ==================================================
// Response Helpers
// ==================================================

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
      error: {
        message,
      },
    },
    status,
  );
}

function malformedResponse(): Response {
  return new Response("invalid-json", {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

// ==================================================
// Fetch Mocking Helpers
// ==================================================

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

async function withMockFetch<T>(
  mock: typeof fetch,
  callback: () => Promise<T>,
): Promise<T> {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mock;

  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// ==================================================
// Shared Deployment Helper
// ==================================================

async function deployWithMock(
  mock: typeof fetch,
  projectName = "Test Project",
  files = TEST_FILES,
  token = TEST_TOKEN,
  teamId?: string,
) {
  return withMockFetch(mock, () =>
    deployToVercel(
      projectName,
      files,
      token,
      teamId,
    ),
  );
}

// ==================================================
// 1. Configuration Tests
// ==================================================

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
  let requestMade = false;

  const mock = createMockFetch(async () => {
    requestMade = true;
    return successfulResponse();
  });

  await withMockFetch(mock, async () => {
    await deployToVercel(
      "Test Project",
      TEST_FILES,
      "",
    );
  });

  assert.equal(requestMade, false);
});

// ==================================================
// 2. Successful Deployment Tests
// ==================================================

test("deploys successfully and returns deployment details", async () => {
  const result = await deployWithMock(
    createMockFetch(async () => successfulResponse()),
  );

  assert.equal(result.success, true);
  assert.equal(result.status, "READY");
  assert.equal(result.deploymentId, "dpl_12345");
  assert.equal(
    result.deploymentUrl,
    "https://test-project.vercel.app",
  );
  assert.equal(result.provider, "vercel");
});

test("returns the correct custom deployment ID and URL", async () => {
  const result = await deployWithMock(
    createMockFetch(async () =>
      successfulResponse(
        "dpl_custom_123",
        "custom-project.vercel.app",
      ),
    ),
    "Custom Project",
  );

  assert.equal(result.success, true);
  assert.equal(result.deploymentId, "dpl_custom_123");
  assert.equal(
    result.deploymentUrl,
    "https://custom-project.vercel.app",
  );
});

test("uses the supplied project name when creating a deployment", async () => {
  let requestBody: Record<string, unknown> | undefined;

  await deployWithMock(
    createMockFetch(async (_input, init) => {
      requestBody = JSON.parse(
        String(init?.body),
      ) as Record<string, unknown>;

      return successfulResponse();
    }),
    "My Awesome Website",
  );

  assert.ok(requestBody);
  assert.equal(requestBody.name, "my-awesome-website");
});

// ==================================================
// 3. HTTP Request Tests
// ==================================================

test("sends a POST request to the Vercel API", async () => {
  let requestUrl = "";
  let requestMethod = "";

  await deployWithMock(
    createMockFetch(async (input, init) => {
      requestUrl = String(input);
      requestMethod = init?.method ?? "";

      return successfulResponse();
    }),
  );

  assert.equal(
    new URL(requestUrl).origin + new URL(requestUrl).pathname,
    VERCEL_API_URL,
  );

  assert.equal(requestMethod, "POST");
});

test("sends the Bearer authorization header", async () => {
  let authorization = "";

  await deployWithMock(
    createMockFetch(async (_input, init) => {
      authorization =
        new Headers(init?.headers).get("Authorization") ?? "";

      return successfulResponse();
    }),
  );

  assert.equal(
    authorization,
    `Bearer ${TEST_TOKEN}`,
  );
});

test("sends a JSON content type", async () => {
  let contentType = "";

  await deployWithMock(
    createMockFetch(async (_input, init) => {
      contentType =
        new Headers(init?.headers).get("Content-Type") ?? "";

      return successfulResponse();
    }),
  );

  assert.match(
    contentType,
    /application\/json/i,
  );
});

// ==================================================
// 4. Request Body Tests
// ==================================================

test("sends the correct project name and deployment files", async () => {
  let requestBody: Record<string, unknown> | undefined;

  await deployWithMock(
    createMockFetch(async (_input, init) => {
      assert.equal(init?.method, "POST");
      assert.equal(typeof init?.body, "string");

      requestBody = JSON.parse(
        String(init?.body),
      ) as Record<string, unknown>;

      return successfulResponse();
    }),
    "Files Test",
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
});

test("includes all supplied deployment files", async () => {
  const multipleFiles = [
    {
      path: "index.html",
      content: "<h1>Home</h1>",
    },
    {
      path: "about.html",
      content: "<h1>About</h1>",
    },
    {
      path: "styles.css",
      content: "body { margin: 0; }",
    },
  ];

  let requestBody: Record<string, unknown> | undefined;

  await deployWithMock(
    createMockFetch(async (_input, init) => {
      requestBody = JSON.parse(
        String(init?.body),
      ) as Record<string, unknown>;

      return successfulResponse();
    }),
    "Multiple Files",
    multipleFiles,
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

  assert.deepEqual(
    files.map((file) => file.data),
    [
      "<h1>Home</h1>",
      "<h1>About</h1>",
      "body { margin: 0; }",
    ],
  );
});

test("includes the team ID when provided", async () => {
  let requestUrl = "";

  await deployWithMock(
    createMockFetch(async (input) => {
      requestUrl = String(input);
      return successfulResponse();
    }),
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
});

// ==================================================
// 5. API Error Tests
// ==================================================

const apiErrorCases = [
  {
    name: "server errors",
    message: "Vercel deployment failed",
    status: 500,
  },
  {
    name: "unauthorized responses",
    message: "Invalid token",
    status: 401,
  },
  {
    name: "forbidden responses",
    message: "Permission denied",
    status: 403,
  },
  {
    name: "rate-limit responses",
    message: "Rate limit exceeded",
    status: 429,
  },
];

for (const apiError of apiErrorCases) {
  test(`handles ${apiError.name}`, async () => {
    const result = await deployWithMock(
      createMockFetch(async () =>
        errorResponse(
          apiError.message,
          apiError.status,
        ),
      ),
    );

    assert.equal(result.success, false);
    assert.equal(result.status, "ERROR");

    assert.match(
      result.error ?? "",
      new RegExp(apiError.message, "i"),
    );
  });
}

// ==================================================
// 6. Input Validation Tests
// ==================================================

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

test("does not make an API request for an invalid project name", async () => {
  let requestMade = false;

  await withMockFetch(
    createMockFetch(async () => {
      requestMade = true;
      return successfulResponse();
    }),
    async () => {
      await deployToVercel(
        "   ",
        TEST_FILES,
        TEST_TOKEN,
      );
    },
  );

  assert.equal(requestMade, false);
});

// ==================================================
// 7. Malformed Response Tests
// ==================================================

test("handles malformed JSON returned by Vercel", async () => {
  const result = await deployWithMock(
    createMockFetch(async () => malformedResponse()),
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.ok(result.error);
});

test("handles a response without a deployment ID", async () => {
  const result = await deployWithMock(
    createMockFetch(async () =>
      mockResponse({
        url: "missing-id.vercel.app",
        readyState: "READY",
      }),
    ),
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
});

test("handles a response without a deployment URL", async () => {
  const result = await deployWithMock(
    createMockFetch(async () =>
      mockResponse({
        id: "dpl_missing_url",
        readyState: "READY",
      }),
    ),
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
});

test("handles an unsuccessful HTTP response with an empty body", async () => {
  const result = await deployWithMock(
    createMockFetch(async () =>
      new Response(null, {
        status: 500,
      }),
    ),
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.ok(result.error);
});

// ==================================================
// 8. Network Error Tests
// ==================================================

test("handles network failures gracefully", async () => {
  const result = await deployWithMock(
    createMockFetch(async () => {
      throw new Error("Network connection failed");
    }),
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.ok(result.error);
});

test("does not expose the token after a network failure", async () => {
  const result = await deployWithMock(
    createMockFetch(async () => {
      throw new Error("Network connection failed");
    }),
    "Network Security Test",
    TEST_FILES,
    SECRET_TOKEN,
  );

  assert.equal(result.success, false);

  assert.doesNotMatch(
    result.error ?? "",
    /super-secret-vercel-token/i,
  );
});

test("handles a non-Error network rejection", async () => {
  const result = await deployWithMock(
    createMockFetch(async () => {
      throw "Network failure";
    }),
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.ok(result.error);
});

// ==================================================
// 9. Security Tests
// ==================================================

test("does not expose the token in API error messages", async () => {
  const result = await deployWithMock(
    createMockFetch(async () =>
      errorResponse(
        "Deployment authentication failed",
        401,
      ),
    ),
    "Security Test",
    TEST_FILES,
    SECRET_TOKEN,
  );

  assert.equal(result.success, false);

  assert.doesNotMatch(
    result.error ?? "",
    /super-secret-vercel-token/i,
  );
});

// ==================================================
// 10. Fetch Cleanup Tests
// ==================================================

test("restores global fetch after a successful request", async () => {
  const originalFetch = globalThis.fetch;

  await deployWithMock(
    createMockFetch(async () => successfulResponse()),
  );

  assert.equal(globalThis.fetch, originalFetch);
});

test("restores global fetch after a failed request", async () => {
  const originalFetch = globalThis.fetch;

  await deployWithMock(
    createMockFetch(async () =>
      errorResponse("Deployment failed", 500),
    ),
  );

  assert.equal(globalThis.fetch, originalFetch);
});

test("restores global fetch even if the callback throws", async () => {
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
