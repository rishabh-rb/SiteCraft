
import test from "node:test";
import assert from "node:assert/strict";

import {
  createProvider,
  ProviderError,
} from "@sitecraft/ml";

/* =========================================================
   Types and Helpers
========================================================= */

type FetchResponse =
  | Response
  | (() => Response | Promise<Response>);

type FetchMock = (
  response: FetchResponse,
  onRequest?: (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ) => void
) => typeof fetch;

function mockFetch(
  response: FetchResponse,
  onRequest?: (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ) => void
): typeof fetch {
  return (async (input, init) => {
    onRequest?.(input, init);

    if (typeof response === "function") {
      return response();
    }

    return response;
  }) as typeof fetch;
}

function jsonResponse(
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

function createNvidiaProvider(
  extraEnv: Record<string, string> = {}
) {
  return createProvider({
    NVIDIA_API_KEY: "nvidia-test-key",
    NVIDIA_BASE_URL:
      "https://integrate.api.nvidia.com/v1",
    NVIDIA_MODEL: "working-model",
    ...extraEnv,
  });
}

function assertProviderError(
  error: unknown,
  expectedCode: string
): boolean {
  assert.ok(
    error instanceof ProviderError,
    `Expected ProviderError, received: ${String(error)}`
  );

  assert.equal(error.code, expectedCode);

  return true;
}

/* =========================================================
   Missing NVIDIA Model
========================================================= */

test(
  "throws MODEL_UNAVAILABLE when the NVIDIA model does not exist",
  async () => {
    await withMockFetch(
      mockFetch(
        jsonResponse(
          {
            error: {
              message:
                'The model "missing-model" does not exist.',
            },
          },
          404
        )
      ),
      async () => {
        const provider = createNvidiaProvider({
          NVIDIA_MODEL: "missing-model",
        });

        await assert.rejects(
          () =>
            provider.generateJson("{}", "planner"),
          (error: unknown) => {
            assertProviderError(
              error,
              "MODEL_UNAVAILABLE"
            );

            assert.match(
              (error as ProviderError).message,
              /missing-model/i
            );

            assert.match(
              (error as ProviderError).message,
              /NVIDIA_MODEL/
            );

            return true;
          }
        );
      }
    );
  }
);

/* =========================================================
   Invalid JSON Content
========================================================= */

test(
  "throws MALFORMED_RESPONSE when NVIDIA returns invalid JSON content",
  async () => {
    await withMockFetch(
      mockFetch(
        jsonResponse({
          choices: [
            {
              message: {
                content: "not-json",
              },
            },
          ],
        })
      ),
      async () => {
        const provider = createNvidiaProvider();

        await assert.rejects(
          () =>
            provider.generateJson("{}", "planner"),
          (error: unknown) =>
            assertProviderError(
              error,
              "MALFORMED_RESPONSE"
            )
        );
      }
    );
  }
);

/* =========================================================
   Missing or Invalid Response Structure
========================================================= */

test(
  "throws MALFORMED_RESPONSE when choices are missing",
  async () => {
    await withMockFetch(
      mockFetch(
        jsonResponse({
          id: "test-response",
          object: "chat.completion",
        })
      ),
      async () => {
        const provider = createNvidiaProvider();

        await assert.rejects(
          () =>
            provider.generateJson("{}", "planner"),
          (error: unknown) =>
            assertProviderError(
              error,
              "MALFORMED_RESPONSE"
            )
        );
      }
    );
  }
);

test(
  "throws MALFORMED_RESPONSE when NVIDIA returns empty content",
  async () => {
    await withMockFetch(
      mockFetch(
        jsonResponse({
          choices: [
            {
              message: {
                content: "",
              },
            },
          ],
        })
      ),
      async () => {
        const provider = createNvidiaProvider();

        await assert.rejects(
          () =>
            provider.generateJson("{}", "planner"),
          (error: unknown) =>
            assertProviderError(
              error,
              "MALFORMED_RESPONSE"
            )
        );
      }
    );
  }
);

/* =========================================================
   Provider API Failure
========================================================= */

test(
  "throws API_FAILURE when NVIDIA returns an internal server error",
  async () => {
    await withMockFetch(
      mockFetch(
        jsonResponse(
          {
            error: {
              message: "Internal server error",
            },
          },
          500
        )
      ),
      async () => {
        const provider = createNvidiaProvider();

        await assert.rejects(
          () =>
            provider.generateJson("{}", "planner"),
          (error: unknown) =>
            assertProviderError(error, "API_FAILURE")
        );
      }
    );
  }
);

test(
  "throws API_FAILURE when NVIDIA returns service unavailable",
  async () => {
    await withMockFetch(
      mockFetch(
        jsonResponse(
          {
            error: {
              message: "Service temporarily unavailable",
            },
          },
          503
        )
      ),
      async () => {
        const provider = createNvidiaProvider();

        await assert.rejects(
          () =>
            provider.generateJson("{}", "planner"),
          (error: unknown) =>
            assertProviderError(error, "API_FAILURE")
        );
      }
    );
  }
);

/* =========================================================
   Invalid API Key
========================================================= */

test(
  "throws INVALID_API_KEY when NVIDIA rejects authentication",
  async () => {
    await withMockFetch(
      mockFetch(
        jsonResponse(
          {
            error: {
              message: "Invalid API key",
            },
          },
          401
        )
      ),
      async () => {
        const provider = createNvidiaProvider({
          NVIDIA_API_KEY: "invalid-test-key",
        });

        await assert.rejects(
          () =>
            provider.generateJson("{}", "planner"),
          (error: unknown) =>
            assertProviderError(
              error,
              "INVALID_API_KEY"
            )
        );
      }
    );
  }
);

/* =========================================================
   Rate Limit
========================================================= */

test(
  "throws RATE_LIMIT when NVIDIA rate limit is exceeded",
  async () => {
    await withMockFetch(
      mockFetch(
        jsonResponse(
          {
            error: {
              message: "Rate limit exceeded",
            },
          },
          429
        )
      ),
      async () => {
        const provider = createNvidiaProvider();

        await assert.rejects(
          () =>
            provider.generateJson("{}", "planner"),
          (error: unknown) =>
            assertProviderError(error, "RATE_LIMIT")
        );
      }
    );
  }
);

/* =========================================================
   Request Configuration
========================================================= */

test(
  "sends the expected NVIDIA API request",
  async () => {
    let requestUrl = "";
    let requestMethod = "";
    let authorization = "";
    let requestBody: Record<string, unknown> = {};

    const provider = createNvidiaProvider();

    await withMockFetch(
      mockFetch(
        jsonResponse({
          choices: [
            {
              message: {
                content: '{"ok":true}',
              },
            },
          ],
        }),
        (input, init) => {
          requestUrl =
            input instanceof Request
              ? input.url
              : String(input);

          requestMethod = init?.method ?? "GET";

          const headers = new Headers(init?.headers);
          authorization =
            headers.get("authorization") ?? "";

          requestBody = JSON.parse(
            String(init?.body ?? "{}")
          ) as Record<string, unknown>;
        }
      ),
      async () => {
        const result = await provider.generateJson(
          '{"task":"test"}',
          "planner"
        );

        assert.deepEqual(result, { ok: true });
      }
    );

    assert.equal(
      requestUrl,
      "https://integrate.api.nvidia.com/v1/chat/completions"
    );

    assert.equal(requestMethod, "POST");

    assert.equal(
      authorization,
      "Bearer nvidia-test-key"
    );

    assert.equal(
      requestBody.model,
      "working-model"
    );

    assert.ok(Array.isArray(requestBody.messages));
  }
);

/* =========================================================
   Network Failure
========================================================= */

test(
  "rejects when the NVIDIA network request fails",
  async () => {
    await withMockFetch(
      mockFetch(() => {
        throw new Error("Network connection failed");
      }),
      async () => {
        const provider = createNvidiaProvider();

        await assert.rejects(
          () =>
            provider.generateJson("{}", "planner")
        );
      }
    );
  }
);

/* =========================================================
   Fetch Restoration
========================================================= */

test(
  "restores global fetch after a successful mock operation",
  async () => {
    const originalFetch = globalThis.fetch;
    const mockedFetch = mockFetch(
      jsonResponse({ ok: true })
    );

    await withMockFetch(
      mockedFetch,
      async () => {
        assert.equal(globalThis.fetch, mockedFetch);
        assert.notEqual(globalThis.fetch, originalFetch);
      }
    );

    assert.equal(globalThis.fetch, originalFetch);
  }
);

test(
  "restores global fetch when the callback throws",
  async () => {
    const originalFetch = globalThis.fetch;

    await assert.rejects(
      () =>
        withMockFetch(
          mockFetch(jsonResponse({ ok: true })),
          async () => {
            throw new Error("test failure");
          }
        ),
      /test failure/
    );

    assert.equal(globalThis.fetch, originalFetch);
  }
);
