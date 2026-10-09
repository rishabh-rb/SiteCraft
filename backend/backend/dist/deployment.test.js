
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
   Helper
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

/* =========================================================
   Configuration Tests
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

test("deploys successfully when Vercel API is configured", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    mockResponse({
      id: "dpl_12345",
      url: "test-project.vercel.app",
      readyState: "READY",
    })) as typeof fetch;

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
    assert.equal(result.provider, "vercel");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/* =========================================================
   Authorization Tests
========================================================= */

test("sends the correct Vercel authorization header", async () => {
  const originalFetch = globalThis.fetch;
  let authorization = "";

  globalThis.fetch = (async (
    _input: string | URL | Request,
    init?: RequestInit
  ) => {
    authorization = new Headers(init?.headers).get(
      "Authorization"
    ) || "";

    return mockResponse({
      id: "dpl_auth",
      url: "auth-test.vercel.app",
      readyState: "READY",
    });
  }) as typeof fetch;

  try {
    await deployToVercel(
      "Auth Test",
      TEST_FILES,
      "fake-vercel-token"
    );

    assert.equal(
      authorization,
      "Bearer fake-vercel-token"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/* =========================================================
   Request Body Tests
========================================================= */

test("sends deployment files to the Vercel API", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | undefined;

  globalThis.fetch = (async (
    _input: string | URL | Request,
    init?: RequestInit
  ) => {
    assert.equal(init?.method, "POST");

    requestBody = JSON.parse(
      String(init?.body)
    ) as Record<string, unknown>;

    return mockResponse({
      id: "dpl_files",
      url: "files-test.vercel.app",
      readyState: "READY",
    });
  }) as typeof fetch;

  try {
    await deployToVercel(
      "Files Test",
      TEST_FILES,
      "fake-vercel-token"
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
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/* =========================================================
   Team Configuration
========================================================= */

test("includes teamId when provided", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = "";

  globalThis.fetch = (async (
    input: string | URL | Request
  ) => {
    requestUrl = String(input);

    return mockResponse({
      id: "dpl_team",
      url: "team-test.vercel.app",
      readyState: "READY",
    });
  }) as typeof fetch;

  try {
    await deployToVercel(
      "Team Test",
      TEST_FILES,
      "fake-vercel-token",
      "team_123"
    );

    assert.match(requestUrl, /teamId=team_123/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/* =========================================================
   API Error Tests
========================================================= */

test("handles Vercel API errors", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    mockResponse(
      {
        error: {
          message: "Vercel deployment failed",
        },
      },
      500
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

test("handles unauthorized API responses", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    mockResponse(
      {
        error: {
          message: "Invalid token",
        },
      },
      401
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
   Invalid Input Tests
========================================================= */

test("rejects an empty project name", async () => {
  const result = await deployToVercel(
    "",
    TEST_FILES,
    "fake-vercel-token"
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.match(result.error || "", /project name/i);
});

test("rejects an empty deployment file list", async () => {
  const result = await deployToVercel(
    "Empty Project",
    [],
    "fake-vercel-token"
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.ok(result.error);
});

/* =========================================================
   Malformed Response Tests
========================================================= */

test("handles malformed JSON from Vercel", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response("invalid-json", {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    })) as typeof fetch;

  try {
    const result = await deployToVercel(
      "Malformed Project",
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

test("handles responses without a deployment ID", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    mockResponse({
      url: "missing-id.vercel.app",
      readyState: "READY",
    })) as typeof fetch;

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
   Network Error Tests
========================================================= */

test("handles network failures gracefully", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    throw new Error("Network connection failed");
  }) as typeof fetch;

  try {
    const result = await deployToVercel(
      "Network Test",
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
   Security Tests
========================================================= */

test("does not expose the Vercel token in error messages", async () => {
  const originalFetch = globalThis.fetch;
  const secretToken = "super-secret-vercel-token";

  globalThis.fetch = (async () =>
    mockResponse(
      {
        error: {
          message: "Deployment authentication failed",
        },
      },
      401
    )) as typeof fetch;

  try {
    const result = await deployToVercel(
      "Security Test",
      TEST_FILES,
      secretToken
    );

    assert.equal(result.success, false);

    assert.doesNotMatch(
      result.error || "",
      /super-secret-vercel-token/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/* =========================================================
   Cleanup Test
========================================================= */

test("restores global fetch after a deployment error", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    mockResponse(
      {
        error: {
          message: "Deployment failed",
        },
      },
      500
    )) as typeof fetch;

  try {
    const result = await deployToVercel(
      "Cleanup Test",
      TEST_FILES,
      "fake-vercel-token"
    );

    assert.equal(result.success, false);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(globalThis.fetch, originalFetch);
});
