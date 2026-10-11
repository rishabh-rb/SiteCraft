
import test from "node:test";
import assert from "node:assert/strict";

import {
  createProvider,
  ProviderError,
} from "@sitecraft/ml";

/* =========================================================
   Helpers
========================================================= */

type FetchMock = (
  response: Response | (() => Response | Promise<Response>)
) => typeof fetch;

const mockFetch: FetchMock = (response) => {
  return (async () => {
    if (typeof response === "function") {
      return response();
    }

    return response;
  }) as typeof fetch;
};

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
        const provider = createProvider({
          NVIDIA_API_KEY: "nvidia-test-key",
          NVIDIA_MODEL: "missing-model",
        });

        await assert.rejects(
          () =>
            provider.generateJson("{}", "planner"),
          (error: unknown) => {
            assert.ok(error instanceof ProviderError);
            assert.equal(
              error.code,
              "MODEL_UNAVAILABLE"
            );
            assert.match(
              error.message,
              /missing-model/i
            );
            assert.match(
              error.message,
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
        const provider = createProvider({
          NVIDIA_API_KEY: "nvidia-test-key",
          NVIDIA_MODEL: "working-model",
        });

        await assert.rejects(
          () =>
            provider.generateJson("{}", "planner"),
          (error: unknown) => {
            assert.ok(error instanceof ProviderError);
            assert.equal(
              error.code,
              "MALFORMED_RESPONSE"
            );

            return true;
          }
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
        const provider = createProvider({
          NVIDIA_API_KEY: "nvidia-test-key",
          NVIDIA_MODEL: "working-model",
        });

        await assert.rejects(
          () =>
            provider.generateJson("{}", "planner"),
          (error: unknown) => {
            assert.ok(error instanceof ProviderError);
            assert.equal(error.code, "API_FAILURE");

            return true;
          }
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
        const provider = createProvider({
          NVIDIA_API_KEY: "invalid-test-key",
          NVIDIA_MODEL: "working-model",
        });

        await assert.rejects(
          () =>
            provider.generateJson("{}", "planner"),
          (error: unknown) => {
            assert.ok(error instanceof ProviderError);
            assert.equal(
              error.code,
              "INVALID_API_KEY"
            );

            return true;
          }
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
        const provider = createProvider({
          NVIDIA_API_KEY: "nvidia-test-key",
          NVIDIA_MODEL: "working-model",
        });

        await assert.rejects(
          () =>
            provider.generateJson("{}", "planner"),
          (error: unknown) => {
            assert.ok(error instanceof ProviderError);
            assert.equal(error.code, "RATE_LIMIT");

            return true;
          }
        );
      }
    );
  }
);

/* =========================================================
   Empty Response Content
========================================================= */

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
        const provider = createProvider({
          NVIDIA_API_KEY: "nvidia-test-key",
          NVIDIA_MODEL: "working-model",
        });

        await assert.rejects(
          () =>
            provider.generateJson("{}", "planner"),
          (error: unknown) => {
            assert.ok(error instanceof ProviderError);
            assert.equal(
              error.code,
              "MALFORMED_RESPONSE"
            );

            return true;
          }
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

    await withMockFetch(
      mockFetch(jsonResponse({ ok: true })),
      async () => {
        assert.notEqual(
          globalThis.fetch,
          originalFetch
        );
      }
    );

    assert.equal(globalThis.fetch, originalFetch);
  }
);

test(
  "restores global fetch when the test callback throws",
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
