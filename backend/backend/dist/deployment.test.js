
import test from "node:test";
import assert from "node:assert/strict";

import { deployToVercel } from "./deployment/vercel.js";

const TEST_FILES = [
  {
    path: "index.html",
    content: "<h1>Hello</h1>",
  },
];

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

async function withMockFetch(
  mock: typeof fetch,
  callback: () => Promise<void>
): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock;

  try {
    await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
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

// Configuration tests

test("returns configuration guidance when VERCEL_TOKEN is missing", async () => {
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

// Successful deployment

test("deploys successfully when Vercel API is configured", async () => {
  await withMockFetch(
    (async () => successfulResponse()) as typeof fetch,
    async () => {
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
    }
  );
});

// Authorization tests

test("sends the correct Vercel authorization header", async () => {
  let authorization = "";

  await withMockFetch(
    (async (_input: string | URL | Request, init?: RequestInit) => {
      authorization =
        new Headers(init?.headers).get("Authorization") ?? "";

      return successfulResponse("dpl_auth", "auth-test.vercel.app");
    }) as typeof fetch,
    async () => {
      await deployToVercel(
        "Auth Test",
        TEST_FILES,
        "fake-vercel-token"
      );

      assert.equal(
        authorization,
        "Bearer fake-vercel-token"
      );
    }
  );
});

// Request body tests

test("sends deployment files to the Vercel API", async () => {
  let requestBody: Record<string, unknown> | undefined;

  await withMockFetch(
    (async (_input: string | URL | Request, init?: RequestInit) => {
      assert.equal(init?.method, "POST");

      requestBody = JSON.parse(
        String(init?.body)
      ) as Record<string, unknown>;

      return successfulResponse("dpl_files", "files-test.vercel.app");
    }) as typeof fetch,
    async () => {
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
    }
  );
});

// Team configuration

test("includes teamId when provided", async () => {
  let requestUrl = "";

  await withMockFetch(
    (async (input: string | URL | Request) => {
      requestUrl = String(input);
      return successfulResponse("dpl_team", "team-test.vercel.app");
    }) as typeof fetch,
    async () => {
      await deployToVercel(
        "Team Test",
        TEST_FILES,
        "fake-vercel-token",
        "team_123"
      );

      assert.match(requestUrl, /teamId=team_123/);
    }
  );
});

// API error tests

test("handles Vercel API errors", async () => {
  await withMockFetch(
    (async () =>
      mockResponse(
        {
          error: {
            message: "Vercel deployment failed",
          },
        },
        500
      )) as typeof fetch,
    async () => {
      const result = await deployToVercel(
        "Failed Project",
        TEST_FILES,
        "fake-vercel-token"
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
    (async () =>
      mockResponse(
        {
          error: {
            message: "Invalid token",
          },
        },
        401
      )) as typeof fetch,
    async () => {
      const result = await deployToVercel(
        "Unauthorized Project",
        TEST_FILES,
        "invalid-token"
      );

      assert.equal(result.success, false);
      assert.equal(result.status, "ERROR");
      assert.match(result.error ?? "", /Invalid token/i);
    }
  );
});

// Invalid input tests

test("rejects an empty project name", async () => {
  const result = await deployToVercel(
    "",
    TEST_FILES,
    "fake-vercel-token"
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ERROR");
  assert.match(result.error ?? "", /project name/i);
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

// Malformed response tests

test("handles malformed JSON from Vercel", async () => {
  await withMockFetch(
    (async () =>
      new Response("invalid-json", {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })) as typeof fetch,
    async () => {
      const result = await deployToVercel(
        "Malformed Project",
        TEST_FILES,
        "fake-vercel-token"
      );

      assert.equal(result.success, false);
      assert.equal(result.status, "ERROR");
      assert.ok(result.error);
    }
  );
});

test("handles responses without a deployment ID", async () => {
  await withMockFetch(
    (async () =>
      mockResponse({
        url: "missing-id.vercel.app",
        readyState: "READY",
      })) as typeof fetch,
    async () => {
      const result = await deployToVercel(
        "Missing ID Project",
        TEST_FILES,
        "fake-vercel-token"
      );

      assert.equal(result.success, false);
      assert.equal(result.status, "ERROR");
    }
  );
});

// Network error tests

test("handles network failures gracefully", async () => {
  await withMockFetch(
    (async () => {
      throw new Error("Network connection failed");
    }) as typeof fetch,
    async () => {
      const result = await deployToVercel(
        "Network Test",
        TEST_FILES,
        "fake-vercel-token"
      );

      assert.equal(result.success, false);
      assert.equal(result.status, "ERROR");
      assert.ok(result.error);
    }
  );
});

// Security tests

test("does not expose the Vercel token in error messages", async () => {
  const secretToken = "super-secret-vercel-token";

  await withMockFetch(
    (async () =>
      mockResponse(
        {
          error: {
            message: "Deployment authentication failed",
          },
        },
        401
      )) as typeof fetch,
    async () => {
      const result = await deployToVercel(
        "Security Test",
        TEST_FILES,
        secretToken
      );

      assert.equal(result.success, false);
      assert.doesNotMatch(
        result.error ?? "",
        /super-secret-vercel-token/
      );
    }
  );
});

// Cleanup test

test("restores global fetch after a deployment error", async () => {
  const originalFetch = globalThis.fetch;

  await withMockFetch(
    (async () =>
      mockResponse(
        {
          error: {
            message: "Deployment failed",
          },
        },
        500
      )) as typeof fetch,
    async () => {
      const result = await deployToVercel(
        "Cleanup Test",
        TEST_FILES,
        "fake-vercel-token"
      );

      assert.equal(result.success, false);
    }
  );

  assert.equal(globalThis.fetch, originalFetch);
});
