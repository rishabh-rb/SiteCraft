
import test from "node:test";
import assert from "node:assert/strict";

import { deployToVercel } from "./deployment/vercel.js";

/* =========================================================
   Test Data
========================================================= */

const TEST_TOKEN = "fake-vercel-token";
const VERCEL_API_URL = "https://api.vercel.com/v13/deployments";

const TEST_FILES = [
  {
    path: "index.html",
    content: "<h1>Hello</h1>",
  },
];

/* =========================================================
   Types
========================================================= */

type MockFetchHandler = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Response | Promise<Response>;

type DeploymentFile = {
  path: string;
  content: string;
};

type DeploymentResponse = {
  success: boolean;
  status: string;
  deploymentId?: string;
  deploymentUrl?: string;
  provider?: string;
  error?: string;
};

/* =========================================================
   Mock Helpers
========================================================= */

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
  mockedFetch: typeof fetch,
  callback: () => Promise<T>
): Promise<T> {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = mockedFetch;
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function deployWithMock(
  handler: MockFetchHandler,
  projectName = "Test Project",
  files: DeploymentFile[] = TEST_FILES,
  token = TEST_TOKEN,
  teamId?: string
): Promise<DeploymentResponse> {
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

function assertDeploymentFailed(
  result: DeploymentResponse
): void {
  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.ok(result.error);
}

/* =========================================================
   1. Configuration
========================================================= */

test("returns an error when the Vercel token is missing", async () => {
  const result = await deployToVercel(
    "Test Project",
    TEST_FILES,
    ""
  );

  assertDeploymentFailed(result);

  assert.match(
    result.error ?? "",
    /Vercel deployment is not configured/i
  );
});

/* =========================================================
   2. Successful Deployment
========================================================= */

test("deploys a project successfully", async () => {
  const result = await deployWithMock(
    () => successfulResponse()
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
  const result = await deployWithMock(
    () =>
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

/* =========================================================
   3. Request Method and URL
========================================================= */

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

/* =========================================================
   4. Authorization and Headers
========================================================= */

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
  assert.match(
    contentType,
    /application\/json/i
  );
});

/* =========================================================
   5. Request Body
========================================================= */

test("sends the correct project slug and deployment files", async () => {
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

test("preserves multiple deployment files", async () => {
  const inputFiles = [
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

  const result = await deployWithMock(
    (_input, init) => {
      requestBody = JSON.parse(
        String(init?.body)
      ) as Record<string, unknown>;

      return successfulResponse();
    },
    "Multiple Files",
    inputFiles
  );

  assert.equal(result.success, true);
  assert.ok(requestBody);
  assert.ok(Array.isArray(requestBody.files));

  const files = requestBody.files as Array<{
    file: string;
    data: string;
  }>;

  assert.equal(files.length, 3);
  assert.deepEqual(
    files.map((file) => file.file),
    ["index.html", "about.html", "styles.css"]
  );
  assert.deepEqual(
    files.map((file) => file.data),
    [
      "<h1>Home</h1>",
      "<h1>About</h1>",
      "body { margin: 0; }",
    ]
  );
});

/* =========================================================
   6. Team Configuration
========================================================= */

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

test("omits teamId when it is not provided", async () => {
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

/* =========================================================
   7. API Error Handling
========================================================= */

const apiFailureCases = [
  {
    name: "server errors",
    status: 500,
    message: "Vercel deployment failed",
  },
  {
    name: "unauthorized responses",
    status: 401,
    message: "Invalid token",
  },
  {
    name: "rate-limit responses",
    status: 429,
    message: "Rate limit exceeded",
  },
  {
    name: "forbidden responses",
    status: 403,
    message: "Permission denied",
  },
] as const;

for (const failure of apiFailureCases) {
  test(`handles ${failure.name}`, async () => {
    const result = await deployWithMock(
      () =>
        mockResponse(
          {
            error: {
              message: failure.message,
            },
          },
          failure.status
        )
    );

    assertDeploymentFailed(result);

    if (failure.status !== 429) {
      assert.match(
        result.error ?? "",
        new RegExp(failure.message, "i")
      );
    }
  });
}

/* =========================================================
   8. Invalid Inputs
========================================================= */

test("rejects an empty project name", async () => {
  const result = await deployToVercel(
    "",
    TEST_FILES,
    TEST_TOKEN
  );

  assertDeploymentFailed(result);

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

  assertDeploymentFailed(result);
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

  assertDeploymentFailed(result);
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

  assertDeploymentFailed(result);
  assert.equal(requestCount, 0);
});

/* =========================================================
   9. Malformed API Responses
========================================================= */

const malformedResponseCases = [
  {
    name: "invalid JSON",
    response: () =>
      new Response("invalid-json", {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
  },
  {
    name: "an empty response body",
    response: () =>
      new Response("", {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
  },
  {
    name: "a response without a deployment ID",
    response: () =>
      mockResponse({
        url: "missing-id.vercel.app",
        readyState: "READY",
      }),
  },
] as const;

for (const malformed of malformedResponseCases) {
  test(`handles ${malformed.name}`, async () => {
    const result = await deployWithMock(
      () => malformed.response()
    );

    assertDeploymentFailed(result);
  });
}

/* =========================================================
   10. Network Failures
========================================================= */

test("handles network failures gracefully", async () => {
  const result = await deployWithMock(() => {
    throw new Error("Network connection failed");
  });

  assertDeploymentFailed(result);
});

test("handles non-Error network exceptions", async () => {
  const result = await deployWithMock(() => {
    throw "Network unavailable";
  });

  assertDeploymentFailed(result);
});

/* =========================================================
   11. Security
========================================================= */

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

  assertDeploymentFailed(result);

  assert.doesNotMatch(
    result.error ?? "",
    /super-secret-vercel-token/i
  );
});

/* =========================================================
   12. Fetch Restoration
========================================================= */

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

  assertDeploymentFailed(result);
  assert.equal(globalThis.fetch, originalFetch);
});

test("restores global fetch when the mock throws", async () => {
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
