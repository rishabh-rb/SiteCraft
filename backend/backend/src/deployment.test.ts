
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

type ApiPayload = Record<string, unknown>;

type FetchHandler = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) => Response | Promise<Response>;

const TEST_FILES: DeploymentFile[] = [
  {
    path: "index.html",
    content: "<h1>Hello</h1>",
  },
];

const TEST_TOKEN = "fake-vercel-token";
const TEST_PROJECT = "Test Project";

const SUCCESS_RESPONSE = {
  id: "dpl_12345",
  url: "test-project.vercel.app",
  readyState: "READY",
};

let previousFetch: typeof fetch;
let previousToken: string | undefined;

/* =========================================================
   Test Isolation
========================================================= */

test.beforeEach(() => {
  previousFetch = globalThis.fetch;
  previousToken = process.env.VERCEL_TOKEN;
});

test.afterEach(() => {
  globalThis.fetch = previousFetch;

  if (previousToken === undefined) {
    delete process.env.VERCEL_TOKEN;
  } else {
    process.env.VERCEL_TOKEN = previousToken;
  }
});

/* =========================================================
   Reusable Helpers
========================================================= */

function createApiResponse(
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

function mockFetch(handler: FetchHandler): void {
  globalThis.fetch = (async (input, init) =>
    handler(input, init)) as typeof fetch;
}

function mockJsonResponse(
  body: unknown,
  status = 200,
): void {
  mockFetch(() => createApiResponse(body, status));
}

function mockNetworkError(message = "Network connection failed"): void {
  mockFetch(() => {
    throw new Error(message);
  });
}

function parseRequestBody(
  body: BodyInit | null | undefined,
): ApiPayload {
  assert.equal(typeof body, "string");

  const parsed: unknown = JSON.parse(body as string);

  assert.ok(
    parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed),
    "Expected a JSON object in the request body",
  );

  return parsed as ApiPayload;
}

function assertDeploymentError(
  result: Awaited<ReturnType<typeof deployToVercel>>,
): void {
  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.equal(typeof result.error, "string");
  assert.ok(result.error.length > 0);
}

/* =========================================================
   Configuration
========================================================= */

test("returns configuration guidance when the token is missing", async () => {
  delete process.env.VERCEL_TOKEN;

  let fetchCalled = false;

  mockFetch(() => {
    fetchCalled = true;
    return createApiResponse(SUCCESS_RESPONSE);
  });

  const result = await deployToVercel(
    TEST_PROJECT,
    TEST_FILES,
    "",
  );

  assertDeploymentError(result);
  assert.match(
    result.error,
    /Vercel deployment is not configured/i,
  );
  assert.equal(fetchCalled, false);
});

test("uses VERCEL_TOKEN from the environment when no token is passed", async () => {
  process.env.VERCEL_TOKEN = "environment-token";

  let authorization: string | null = null;

  mockFetch((_input, init) => {
    authorization = new Headers(init?.headers).get("Authorization");
    return createApiResponse(SUCCESS_RESPONSE);
  });

  const result = await deployToVercel(
    "Environment Token Project",
    TEST_FILES,
  );

  assert.equal(result.success, true);
  assert.equal(authorization, "Bearer environment-token");
});

test("uses the explicitly provided token", async () => {
  process.env.VERCEL_TOKEN = "environment-token";

  let authorization: string | null = null;

  mockFetch((_input, init) => {
    authorization = new Headers(init?.headers).get("Authorization");
    return createApiResponse(SUCCESS_RESPONSE);
  });

  const result = await deployToVercel(
    TEST_PROJECT,
    TEST_FILES,
    TEST_TOKEN,
  );

  assert.equal(result.success, true);
  assert.equal(authorization, `Bearer ${TEST_TOKEN}`);
});

/* =========================================================
   Successful Deployment
========================================================= */

test("returns deployment details on success", async () => {
  mockJsonResponse(SUCCESS_RESPONSE);

  const result = await deployToVercel(
    TEST_PROJECT,
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
});

test("handles a deployment that is still building", async () => {
  mockJsonResponse({
    id: "dpl_building",
    url: "building-project.vercel.app",
    readyState: "BUILDING",
  });

  const result = await deployToVercel(
    "Building Project",
    TEST_FILES,
    TEST_TOKEN,
  );

  assert.equal(result.success, true);
  assert.equal(result.status, "BUILDING");
  assert.equal(result.deploymentId, "dpl_building");
});

test("does not duplicate HTTPS in the deployment URL", async () => {
  mockJsonResponse({
    id: "dpl_https",
    url: "https://example.vercel.app",
    readyState: "READY",
  });

  const result = await deployToVercel(
    "HTTPS Project",
    TEST_FILES,
    TEST_TOKEN,
  );

  assert.equal(
    result.deploymentUrl,
    "https://example.vercel.app",
  );
});

/* =========================================================
   Request Verification
========================================================= */

test("sends the correct HTTP method and headers", async () => {
  let method: string | undefined;
  let headers: Headers | undefined;

  mockFetch((_input, init) => {
    method = init?.method;
    headers = new Headers(init?.headers);

    return createApiResponse(SUCCESS_RESPONSE);
  });

  const result = await deployToVercel(
    TEST_PROJECT,
    TEST_FILES,
    TEST_TOKEN,
  );

  assert.equal(result.success, true);
  assert.equal(method, "POST");
  assert.equal(
    headers?.get("Authorization"),
    `Bearer ${TEST_TOKEN}`,
  );
  assert.equal(headers?.get("Content-Type"), "application/json");
  assert.equal(headers?.get("Accept"), "application/json");
});

test("sends the deployment files in the JSON body", async () => {
  let requestBody: ApiPayload | undefined;

  mockFetch((_input, init) => {
    requestBody = parseRequestBody(init?.body);
    return createApiResponse(SUCCESS_RESPONSE);
  });

  const result = await deployToVercel(
    "Files Test Project",
    TEST_FILES,
    TEST_TOKEN,
  );

  assert.equal(result.success, true);
  assert.ok(Array.isArray(requestBody?.files));

  const files = requestBody.files as Array<Record<string, unknown>>;

  assert.ok(
    files.some(
      (file) =>
        file.file === "index.html" &&
        file.data === "<h1>Hello</h1>",
    ),
    "Expected the deployment request to contain index.html and its content",
  );
});

test("converts the project name to a deployment-friendly slug", async () => {
  let requestBody: ApiPayload | undefined;

  mockFetch((_input, init) => {
    requestBody = parseRequestBody(init?.body);
    return createApiResponse(SUCCESS_RESPONSE);
  });

  const result = await deployToVercel(
    "My Test Project",
    TEST_FILES,
    TEST_TOKEN,
  );

  assert.equal(result.success, true);
  assert.equal(requestBody?.name, "my-test-project");
});

test("includes teamId in the request URL when provided", async () => {
  let requestUrl: URL | undefined;

  mockFetch((input) => {
    requestUrl = new URL(String(input));
    return createApiResponse(SUCCESS_RESPONSE);
  });

  const result = await deployToVercel(
    "Team Project",
    TEST_FILES,
    TEST_TOKEN,
    "team_123",
  );

  assert.equal(result.success, true);
  assert.ok(requestUrl);
  assert.equal(requestUrl.searchParams.get("teamId"), "team_123");
});

/* =========================================================
   Input Validation
========================================================= */

test("rejects an empty project name without calling the API", async () => {
  let fetchCalled = false;

  mockFetch(() => {
    fetchCalled = true;
    return createApiResponse(SUCCESS_RESPONSE);
  });

  const result = await deployToVercel(
    "",
    TEST_FILES,
    TEST_TOKEN,
  );

  assertDeploymentError(result);
  assert.match(result.error, /project name/i);
  assert.equal(fetchCalled, false);
});

test("rejects an empty file list without calling the API", async () => {
  let fetchCalled = false;

  mockFetch(() => {
    fetchCalled = true;
    return createApiResponse(SUCCESS_RESPONSE);
  });

  const result = await deployToVercel(
    "Empty Files Project",
    [],
    TEST_TOKEN,
  );

  assertDeploymentError(result);
  assert.match(result.error, /file/i);
  assert.equal(fetchCalled, false);
});

test("rejects an empty file path", async () => {
  let fetchCalled = false;

  mockFetch(() => {
    fetchCalled = true;
    return createApiResponse(SUCCESS_RESPONSE);
  });

  const result = await deployToVercel(
    "Invalid Files Project",
    [{ path: "", content: "hello" }],
    TEST_TOKEN,
  );

  assertDeploymentError(result);
  assert.equal(fetchCalled, false);
});

test("rejects parent-directory traversal in file paths", async () => {
  let fetchCalled = false;

  mockFetch(() => {
    fetchCalled = true;
    return createApiResponse(SUCCESS_RESPONSE);
  });

  const result = await deployToVercel(
    "Traversal Project",
    [{ path: "../secret.txt", content: "secret" }],
    TEST_TOKEN,
  );

  assertDeploymentError(result);
  assert.match(result.error, /path|invalid/i);
  assert.equal(fetchCalled, false);
});

/* =========================================================
   API Errors
========================================================= */

test("handles Vercel server errors", async () => {
  mockJsonResponse(
    {
      error: {
        message: "Vercel deployment failed",
      },
    },
    500,
  );

  const result = await deployToVercel(
    "Failed Project",
    TEST_FILES,
    TEST_TOKEN,
  );

  assertDeploymentError(result);
  assert.match(result.error, /Vercel deployment failed/i);
});

test("handles unauthorized responses", async () => {
  mockJsonResponse(
    {
      error: {
        message: "Invalid token",
      },
    },
    401,
  );

  const result = await deployToVercel(
    "Unauthorized Project",
    TEST_FILES,
    "invalid-token",
  );

  assertDeploymentError(result);
  assert.match(result.error, /Invalid token/i);
});

test("handles API errors without an error message", async () => {
  mockJsonResponse({ error: {} }, 500);

  const result = await deployToVercel(
    "Unknown Error Project",
    TEST_FILES,
    TEST_TOKEN,
  );

  assertDeploymentError(result);
});

test("handles non-JSON API error responses", async () => {
  mockFetch(
    () =>
      new Response("Internal server error", {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
        },
      }),
  );

  const result = await deployToVercel(
    "Non JSON Error Project",
    TEST_FILES,
    TEST_TOKEN,
  );

  assertDeploymentError(result);
});

/* =========================================================
   Malformed Responses
========================================================= */

test("handles malformed JSON returned by the API", async () => {
  mockFetch(
    () =>
      new Response("not valid JSON", {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
  );

  const result = await deployToVercel(
    "Malformed JSON Project",
    TEST_FILES,
    TEST_TOKEN,
  );

  assertDeploymentError(result);
});

test("rejects a successful HTTP response with an invalid payload", async () => {
  mockJsonResponse({ unexpected: true });

  const result = await deployToVercel(
    "Malformed Response Project",
    TEST_FILES,
    TEST_TOKEN,
  );

  assertDeploymentError(result);
});

test("rejects a response without a deployment ID", async () => {
  mockJsonResponse({
    url: "missing-id.vercel.app",
    readyState: "READY",
  });

  const result = await deployToVercel(
    "Missing ID Project",
    TEST_FILES,
    TEST_TOKEN,
  );

  assertDeploymentError(result);
});

/* =========================================================
   Network Errors
========================================================= */

test("handles network failures gracefully", async () => {
  mockNetworkError();

  const result = await deployToVercel(
    "Network Error Project",
    TEST_FILES,
    TEST_TOKEN,
  );

  assertDeploymentError(result);
  assert.match(result.error, /network|connection|failed/i);
});

test("handles a rejected fetch promise", async () => {
  mockFetch(() => Promise.reject(new TypeError("fetch failed")));

  const result = await deployToVercel(
    "Fetch Failure Project",
    TEST_FILES,
    TEST_TOKEN,
  );

  assertDeploymentError(result);
  assert.match(result.error, /fetch|failed/i);
});

/* =========================================================
   Security
========================================================= */

test("does not expose the Vercel token in deployment errors", async () => {
  const secretToken = "super-secret-vercel-token";

  mockJsonResponse(
    {
      error: {
        message: "Deployment authentication failed",
      },
    },
    401,
  );

  const result = await deployToVercel(
    "Security Test Project",
    TEST_FILES,
    secretToken,
  );

  assertDeploymentError(result);

  assert.doesNotMatch(
    result.error,
    /super-secret-vercel-token/i,
  );
});

/* =========================================================
   Global State Restoration
========================================================= */

test("restores fetch and VERCEL_TOKEN after the test", () => {
  // The afterEach hook restores the state captured by beforeEach.
  assert.equal(globalThis.fetch, previousFetch);

  if (previousToken === undefined) {
    assert.equal(process.env.VERCEL_TOKEN, undefined);
  } else {
    assert.equal(process.env.VERCEL_TOKEN, previousToken);
  }
});
