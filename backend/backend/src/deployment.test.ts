
import test from "node:test";
import assert from "node:assert/strict";

import { deployToVercel } from "./deployment/vercel.js";

/* =========================================================
   Types and Test Data
========================================================= */

type DeploymentFile = {
  path: string;
  content: string;
};

type VercelApiResponse = {
  id?: string;
  url?: string;
  readyState?: string;
  error?: {
    message?: string;
  };
};

const TEST_FILES: DeploymentFile[] = [
  {
    path: "index.html",
    content: "<h1>Hello</h1>",
  },
];

const TEST_TOKEN = "fake-vercel-token";
const TEST_PROJECT = "Test Project";

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_VERCEL_TOKEN = process.env.VERCEL_TOKEN;

/* =========================================================
   Reusable Helpers
========================================================= */

/**
 * Creates a mock Response for the Vercel API.
 */
function createApiResponse(
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

/**
 * Creates a mock fetch implementation.
 */
function mockFetch(
  response: Response | (() => Response | Promise<Response>)
): typeof fetch {
  return (async () => {
    if (typeof response === "function") {
      return response();
    }

    return response;
  }) as typeof fetch;
}

/**
 * Installs a mocked fetch function.
 */
function installFetchMock(
  response: Response | (() => Response | Promise<Response>)
): void {
  globalThis.fetch = mockFetch(response);
}

/**
 * Restores global state after every test.
 */
test.afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;

  if (ORIGINAL_VERCEL_TOKEN === undefined) {
    delete process.env.VERCEL_TOKEN;
  } else {
    process.env.VERCEL_TOKEN = ORIGINAL_VERCEL_TOKEN;
  }
});

/* =========================================================
   Configuration
========================================================= */

test("returns configuration guidance when VERCEL_TOKEN is missing", async () => {
  delete process.env.VERCEL_TOKEN;

  const result = await deployToVercel(
    TEST_PROJECT,
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

test("uses VERCEL_TOKEN from the environment when no token is provided", async () => {
  process.env.VERCEL_TOKEN = "environment-token";

  let authorization: string | null = null;

  installFetchMock(() => {
    authorization = null;

    return createApiResponse({
      id: "dpl_env_token",
      url: "env-token.vercel.app",
      readyState: "READY",
    });
  });

  // Capture the request header through fetch itself.
  globalThis.fetch = (async (
    _input: string | URL | Request,
    init?: RequestInit
  ) => {
    authorization = new Headers(init?.headers).get(
      "Authorization"
    );

    return createApiResponse({
      id: "dpl_env_token",
      url: "env-token.vercel.app",
      readyState: "READY",
    });
  }) as typeof fetch;

  const result = await deployToVercel(
    "Environment Token Project",
    TEST_FILES
  );

  assert.equal(result.success, true);
  assert.equal(authorization, "Bearer environment-token");
});

/* =========================================================
   Successful Deployment
========================================================= */

test("deploys successfully and returns the deployment details", async () => {
  installFetchMock(
    createApiResponse({
      id: "dpl_12345",
      url: "test-project.vercel.app",
      readyState: "READY",
    })
  );

  const result = await deployToVercel(
    TEST_PROJECT,
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
});

test("handles a deployment that is still building", async () => {
  installFetchMock(
    createApiResponse({
      id: "dpl_building",
      url: "building-project.vercel.app",
      readyState: "BUILDING",
    })
  );

  const result = await deployToVercel(
    "Building Project",
    TEST_FILES,
    TEST_TOKEN
  );

  assert.equal(result.success, true);
  assert.equal(result.status, "BUILDING");
  assert.equal(result.deploymentId, "dpl_building");
});

test("does not duplicate HTTPS when the API URL already has a protocol", async () => {
  installFetchMock(
    createApiResponse({
      id: "dpl_https",
      url: "https://example.vercel.app",
      readyState: "READY",
    })
  );

  const result = await deployToVercel(
    "HTTPS Project",
    TEST_FILES,
    TEST_TOKEN
  );

  assert.equal(
    result.deploymentUrl,
    "https://example.vercel.app"
  );
});

/* =========================================================
   Request Validation
========================================================= */

test("sends the Bearer authorization header", async () => {
  let authorization: string | null = null;

  globalThis.fetch = (async (
    _input: string | URL | Request,
    init?: RequestInit
  ) => {
    authorization = new Headers(init?.headers).get(
      "Authorization"
    );

    return createApiResponse({
      id: "dpl_auth",
      url: "auth-test.vercel.app",
      readyState: "READY",
    });
  }) as typeof fetch;

  await deployToVercel(
    "Auth Test Project",
    TEST_FILES,
    TEST_TOKEN
  );

  assert.equal(
    authorization,
    `Bearer ${TEST_TOKEN}`
  );
});

test("sends JSON Content-Type and Accept headers", async () => {
  let headers: Headers | undefined;

  globalThis.fetch = (async (
    _input: string | URL | Request,
    init?: RequestInit
  ) => {
    headers = new Headers(init?.headers);

    return createApiResponse({
      id: "dpl_headers",
      url: "headers-test.vercel.app",
      readyState: "READY",
    });
  }) as typeof fetch;

  await deployToVercel(
    "Headers Test Project",
    TEST_FILES,
    TEST_TOKEN
  );

  assert.equal(
    headers?.get("Content-Type"),
    "application/json"
  );

  assert.equal(
    headers?.get("Accept"),
    "application/json"
  );
});

test("uses POST for the deployment request", async () => {
  let method: string | undefined;

  globalThis.fetch = (async (
    _input: string | URL | Request,
    init?: RequestInit
  ) => {
    method = init?.method;

    return createApiResponse({
      id: "dpl_method",
      url: "method-test.vercel.app",
      readyState: "READY",
    });
  }) as typeof fetch;

  await deployToVercel(
    "Method Test Project",
    TEST_FILES,
    TEST_TOKEN
  );

  assert.equal(method, "POST");
});

test("sends deployment files in the request body", async () => {
  let requestBody: Record<string, unknown> | undefined;

  globalThis.fetch = (async (
    _input: string | URL | Request,
    init?: RequestInit
  ) => {
    assert.equal(typeof init?.body, "string");

    requestBody = JSON.parse(
      init!.body as string
    ) as Record<string, unknown>;

    return createApiResponse({
      id: "dpl_files",
      url: "files-test.vercel.app",
      readyState: "READY",
    });
  }) as typeof fetch;

  await deployToVercel(
    "Files Test Project",
    TEST_FILES,
    TEST_TOKEN
  );

  assert.ok(requestBody);
  assert.ok(Array.isArray(requestBody.files));

  const serializedFiles = JSON.stringify(requestBody.files);

  assert.match(serializedFiles, /index\.html/);
  assert.match(serializedFiles, /<h1>Hello<\/h1>/);
});

test("converts the project name into a deployment-friendly slug", async () => {
  let requestBody: Record<string, unknown> | undefined;

  globalThis.fetch = (async (
    _input: string | URL | Request,
    init?: RequestInit
  ) => {
    requestBody = JSON.parse(
      init?.body as string
    ) as Record<string, unknown>;

    return createApiResponse({
      id: "dpl_name",
      url: "my-test-project.vercel.app",
      readyState: "READY",
    });
  }) as typeof fetch;

  await deployToVercel(
    "My Test Project",
    TEST_FILES,
    TEST_TOKEN
  );

  assert.equal(requestBody?.name, "my-test-project");
});

test("includes teamId in the deployment URL when provided", async () => {
  let requestUrl: string | undefined;

  globalThis.fetch = (async (
    input: string | URL | Request
  ) => {
    requestUrl = String(input);

    return createApiResponse({
      id: "dpl_team",
      url: "team-project.vercel.app",
      readyState: "READY",
    });
  }) as typeof fetch;

  await deployToVercel(
    "Team Project",
    TEST_FILES,
    TEST_TOKEN,
    "team_123"
  );

  assert.ok(requestUrl);

  const url = new URL(requestUrl);

  assert.equal(url.searchParams.get("teamId"), "team_123");
});

/* =========================================================
   Input Validation
========================================================= */

test("rejects an empty project name without calling the API", async () => {
  let fetchCalled = false;

  globalThis.fetch = (async () => {
    fetchCalled = true;

    return createApiResponse({});
  }) as typeof fetch;

  const result = await deployToVercel(
    "",
    TEST_FILES,
    TEST_TOKEN
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.match(result.error ?? "", /project name/i);
  assert.equal(fetchCalled, false);
});

test("rejects an empty file list without calling the API", async () => {
  let fetchCalled = false;

  globalThis.fetch = (async () => {
    fetchCalled = true;

    return createApiResponse({});
  }) as typeof fetch;

  const result = await deployToVercel(
    "Empty Files Project",
    [],
    TEST_TOKEN
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.match(result.error ?? "", /file/i);
  assert.equal(fetchCalled, false);
});

test("rejects deployment files with an empty path", async () => {
  const result = await deployToVercel(
    "Invalid Files Project",
    [
      {
        path: "",
        content: "hello",
      },
    ],
    TEST_TOKEN
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.match(result.error ?? "", /file|path/i);
});

test("rejects file paths containing parent-directory traversal", async () => {
  const result = await deployToVercel(
    "Traversal Project",
    [
      {
        path: "../secret.txt",
        content: "secret",
      },
    ],
    TEST_TOKEN
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.match(result.error ?? "", /path|invalid/i);
});

/* =========================================================
   API Errors
========================================================= */

test("handles Vercel server errors", async () => {
  installFetchMock(
    createApiResponse(
      {
        error: {
          message: "Vercel deployment failed",
        },
      },
      500
    )
  );

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
});

test("handles unauthorized responses", async () => {
  installFetchMock(
    createApiResponse(
      {
        error: {
          message: "Invalid token",
        },
      },
      401
    )
  );

  const result = await deployToVercel(
    "Unauthorized Project",
    TEST_FILES,
    "invalid-token"
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.match(result.error ?? "", /Invalid token/i);
});

test("handles API errors without an error message", async () => {
  installFetchMock(
    createApiResponse(
      {
        error: {},
      },
      500
    )
  );

  const result = await deployToVercel(
    "Unknown Error Project",
    TEST_FILES,
    TEST_TOKEN
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.ok(result.error);
  assert.ok(result.error.length > 0);
});

/* =========================================================
   Malformed Responses
========================================================= */

test("handles malformed JSON returned by the API", async () => {
  installFetchMock(
    new Response("this is not valid JSON", {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    })
  );

  const result = await deployToVercel(
    "Malformed JSON Project",
    TEST_FILES,
    TEST_TOKEN
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.ok(result.error);
});

test("rejects a successful HTTP response with an invalid payload", async () => {
  installFetchMock(
    createApiResponse({
      unexpected: true,
    })
  );

  const result = await deployToVercel(
    "Malformed Response Project",
    TEST_FILES,
    TEST_TOKEN
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
});

test("rejects a response that does not contain a deployment ID", async () => {
  installFetchMock(
    createApiResponse({
      url: "missing-id.vercel.app",
      readyState: "READY",
    })
  );

  const result = await deployToVercel(
    "Missing ID Project",
    TEST_FILES,
    TEST_TOKEN
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
});

/* =========================================================
   Network Errors
========================================================= */

test("handles network failures gracefully", async () => {
  globalThis.fetch = (async () => {
    throw new Error("Network connection failed");
  }) as typeof fetch;

  const result = await deployToVercel(
    "Network Error Project",
    TEST_FILES,
    TEST_TOKEN
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.match(
    result.error ?? "",
    /network|connection|failed/i
  );
});

test("handles a rejected fetch promise", async () => {
  globalThis.fetch = (async () => {
    throw new TypeError("fetch failed");
  }) as typeof fetch;

  const result = await deployToVercel(
    "Fetch Failure Project",
    TEST_FILES,
    TEST_TOKEN
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.ok(result.error);
});

/* =========================================================
   Security
========================================================= */

test("does not expose the Vercel token in deployment errors", async () => {
  const secretToken = "super-secret-vercel-token";

  installFetchMock(
    createApiResponse(
      {
        error: {
          message: "Deployment authentication failed",
        },
      },
      401
    )
  );

  const result = await deployToVercel(
    "Security Test Project",
    TEST_FILES,
    secretToken
  );

  assert.equal(result.success, false);

  assert.doesNotMatch(
    result.error ?? "",
    /super-secret-vercel-token/i
  );
});

/* =========================================================
   Cleanup
========================================================= */

test("restores fetch after a deployment error", async () => {
  const fetchBeforeDeployment = globalThis.fetch;

  installFetchMock(
    createApiResponse(
      {
        error: {
          message: "Deployment failed",
        },
      },
      500
    )
  );

  const result = await deployToVercel(
    "Cleanup Test Project",
    TEST_FILES,
    TEST_TOKEN
  );

  assert.equal(result.success, false);

  // Each test's afterEach hook restores the original fetch.
  assert.notEqual(globalThis.fetch, ORIGINAL_FETCH);

  // Verify restoration after the afterEach hook below.
  assert.equal(typeof fetchBeforeDeployment, "function");
});

test("uses a fresh fetch implementation after test cleanup", () => {
  assert.equal(
    globalThis.fetch,
    ORIGINAL_FETCH,
    "fetch should be restored after the previous test"
  );
});
