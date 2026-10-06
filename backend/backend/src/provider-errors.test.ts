
import test from "node:test";
import assert from "node:assert/strict";
import { createProvider, ProviderError } from "@sitecraft/ml";

const NVIDIA_API_KEY = "super-secret-nvidia-key";
const NVIDIA_MODEL = "working-model";

function mockFetch(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers,
    })) as typeof fetch;
}

async function withMockedFetch(
  fetchMock: typeof fetch,
  callback: () => Promise<void>
) {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = fetchMock;

  try {
    await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

/* =========================================================
   Model Errors
========================================================= */

test(
  "surfaces NVIDIA model unavailable errors with configuration guidance",
  async () => {
    await withMockedFetch(
      mockFetch(
        {
          error: {
            message:
              'The model "missing-model" does not exist.',
          },
        },
        404
      ),
      async () => {
        const provider = createProvider({
          NVIDIA_API_KEY: NVIDIA_API_KEY,
          NVIDIA_MODEL: "missing-model",
        });

        await assert.rejects(
          () =>
            provider.generateJson(
              "{}",
              "planner"
            ),
          (error: unknown) => {
            assert.ok(
              error instanceof ProviderError,
              "Error should be a ProviderError"
            );

            assert.equal(
              error.code,
              "MODEL_UNAVAILABLE",
              "Incorrect error code for unavailable model"
            );

            assert.match(
              error.message,
              /missing-model/,
              "Error should contain the unavailable model name"
            );

            assert.match(
              error.message,
              /NVIDIA_MODEL/i,
              "Error should provide configuration guidance"
            );

            return true;
          }
        );
      }
    );
  }
);

/* =========================================================
   Malformed Responses
========================================================= */

test(
  "surfaces malformed NVIDIA JSON responses",
  async () => {
    await withMockedFetch(
      mockFetch({
        choices: [
          {
            message: {
              content: "not-json",
            },
          },
        ],
      }),
      async () => {
        const provider = createProvider({
          NVIDIA_API_KEY,
          NVIDIA_MODEL,
        });

        await assert.rejects(
          () =>
            provider.generateJson(
              "{}",
              "planner"
            ),
          (error: unknown) => {
            assert.ok(
              error instanceof ProviderError,
              "Error should be a ProviderError"
            );

            assert.equal(
              error.code,
              "MALFORMED_RESPONSE",
              "Incorrect error code for malformed JSON"
            );

            return true;
          }
        );
      }
    );
  }
);

test(
  "surfaces NVIDIA responses with missing choices",
  async () => {
    await withMockedFetch(
      mockFetch({
        object: "chat.completion",
        choices: [],
      }),
      async () => {
        const provider = createProvider({
          NVIDIA_API_KEY,
          NVIDIA_MODEL,
        });

        await assert.rejects(
          () =>
            provider.generateJson(
              "{}",
              "planner"
            ),
          (error: unknown) => {
            assert.ok(
              error instanceof ProviderError,
              "Error should be a ProviderError"
            );

            assert.equal(
              error.code,
              "MALFORMED_RESPONSE",
              "Missing choices should produce MALFORMED_RESPONSE"
            );

            return true;
          }
        );
      }
    );
  }
);

test(
  "surfaces NVIDIA responses with missing message content",
  async () => {
    await withMockedFetch(
      mockFetch({
        choices: [
          {
            message: {},
          },
        ],
      }),
      async () => {
        const provider = createProvider({
          NVIDIA_API_KEY,
          NVIDIA_MODEL,
        });

        await assert.rejects(
          () =>
            provider.generateJson(
              "{}",
              "planner"
            ),
          (error: unknown) => {
            assert.ok(
              error instanceof ProviderError,
              "Error should be a ProviderError"
            );

            assert.equal(
              error.code,
              "MALFORMED_RESPONSE",
              "Missing content should produce MALFORMED_RESPONSE"
            );

            return true;
          }
        );
      }
    );
  }
);

test(
  "surfaces NVIDIA responses with empty message content",
  async () => {
    await withMockedFetch(
      mockFetch({
        choices: [
          {
            message: {
              content: "",
            },
          },
        ],
      }),
      async () => {
        const provider = createProvider({
          NVIDIA_API_KEY,
          NVIDIA_MODEL,
        });

        await assert.rejects(
          () =>
            provider.generateJson(
              "{}",
              "planner"
            ),
          (error: unknown) => {
            assert.ok(
              error instanceof ProviderError,
              "Error should be a ProviderError"
            );

            assert.equal(
              error.code,
              "MALFORMED_RESPONSE",
              "Empty content should produce MALFORMED_RESPONSE"
            );

            return true;
          }
        );
      }
    );
  }
);

test(
  "surfaces NVIDIA responses with null choices",
  async () => {
    await withMockedFetch(
      mockFetch({
        choices: null,
      }),
      async () => {
        const provider = createProvider({
          NVIDIA_API_KEY,
          NVIDIA_MODEL,
        });

        await assert.rejects(
          () =>
            provider.generateJson(
              "{}",
              "planner"
            ),
          (error: unknown) => {
            assert.ok(
              error instanceof ProviderError,
              "Error should be a ProviderError"
            );

            assert.equal(
              error.code,
              "MALFORMED_RESPONSE",
              "Null choices should produce MALFORMED_RESPONSE"
            );

            return true;
          }
        );
      }
    );
  }
);

/* =========================================================
   Server Errors
========================================================= */

test(
  "surfaces NVIDIA server errors",
  async () => {
    await withMockedFetch(
      mockFetch(
        {
          error: {
            message:
              "NVIDIA service temporarily unavailable",
          },
        },
        500
      ),
      async () => {
        const provider = createProvider({
          NVIDIA_API_KEY,
          NVIDIA_MODEL,
        });

        await assert.rejects(
          () =>
            provider.generateJson(
              "{}",
              "planner"
            ),
          (error: unknown) => {
            assert.ok(
              error instanceof ProviderError,
              "Error should be a ProviderError"
            );

            assert.match(
              error.message,
              /NVIDIA|unavailable|500/i,
              "Server error should provide useful context"
            );

            return true;
          }
        );
      }
    );
  }
);

test(
  "surfaces NVIDIA rate-limit errors",
  async () => {
    await withMockedFetch(
      mockFetch(
        {
          error: {
            message:
              "Rate limit exceeded",
          },
        },
        429
      ),
      async () => {
        const provider = createProvider({
          NVIDIA_API_KEY,
          NVIDIA_MODEL,
        });

        await assert.rejects(
          () =>
            provider.generateJson(
              "{}",
              "planner"
            ),
          (error: unknown) => {
            assert.ok(
              error instanceof ProviderError,
              "Error should be a ProviderError"
            );

            assert.match(
              error.message,
              /rate|429|limit/i,
              "Rate-limit error should be identifiable"
            );

            return true;
          }
        );
      }
    );
  }
);

/* =========================================================
   Authentication Errors
========================================================= */

test(
  "surfaces NVIDIA authentication errors",
  async () => {
    await withMockedFetch(
      mockFetch(
        {
          error: {
            message:
              "Invalid API key",
          },
        },
        401
      ),
      async () => {
        const provider = createProvider({
          NVIDIA_API_KEY,
          NVIDIA_MODEL,
        });

        await assert.rejects(
          () =>
            provider.generateJson(
              "{}",
              "planner"
            ),
          (error: unknown) => {
            assert.ok(
              error instanceof ProviderError,
              "Error should be a ProviderError"
            );

            assert.match(
              error.message,
              /401|unauthorized|authentication|invalid|key/i,
              "Authentication error should provide useful context"
            );

            return true;
          }
        );
      }
    );
  }
);

/* =========================================================
   Network Errors
========================================================= */

test(
  "surfaces NVIDIA network failures as ProviderError",
  async () => {
    const networkError = new Error(
      "Network connection failed"
    );

    const fetchMock = (async () => {
      throw networkError;
    }) as typeof fetch;

    await withMockedFetch(
      fetchMock,
      async () => {
        const provider = createProvider({
          NVIDIA_API_KEY,
          NVIDIA_MODEL,
        });

        await assert.rejects(
          () =>
            provider.generateJson(
              "{}",
              "planner"
            ),
          (error: unknown) => {
            assert.ok(
              error instanceof ProviderError,
              "Network failure should be converted to ProviderError"
            );

            assert.match(
              error.message,
              /network|connection|failed/i,
              "Network error should preserve useful context"
            );

            return true;
          }
        );
      }
    );
  }
);

/* =========================================================
   Successful Response
========================================================= */

test(
  "parses a valid NVIDIA JSON response successfully",
  async () => {
    const expected = {
      siteName: "Northstar Studio",
      theme: "modern",
      pages: ["Home"],
    };

    await withMockedFetch(
      mockFetch({
        choices: [
          {
            message: {
              content:
                JSON.stringify(expected),
            },
          },
        ],
      }),
      async () => {
        const provider = createProvider({
          NVIDIA_API_KEY,
          NVIDIA_MODEL,
        });

        const result =
          await provider.generateJson(
            "{}",
            "planner"
          );

        assert.deepEqual(
          result,
          expected,
          "Provider should return parsed JSON data"
        );
      }
    );
  }
);

/* =========================================================
   Request Validation
========================================================= */

test(
  "sends POST request with the configured NVIDIA model",
  async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;

    const fetchMock = (async (
      input,
      init
    ) => {
      capturedUrl = String(input);
      capturedInit = init;

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: '{"ok":true}',
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type":
              "application/json",
          },
        }
      );
    }) as typeof fetch;

    await withMockedFetch(
      fetchMock,
      async () => {
        const provider = createProvider({
          NVIDIA_API_KEY,
          NVIDIA_BASE_URL:
            "https://integrate.api.nvidia.com/v1",
          NVIDIA_MODEL,
        });

        await provider.generateJson(
          "{}",
          "planner"
        );

        assert.ok(
          capturedUrl.includes(
            "integrate.api.nvidia.com"
          ),
          "Request should use NVIDIA base URL"
        );

        assert.equal(
          capturedInit?.method,
          "POST",
          "NVIDIA request should use POST"
        );

        assert.equal(
          capturedInit?.headers &&
            new Headers(
              capturedInit.headers
            ).get("Authorization"),
          `Bearer ${NVIDIA_API_KEY}`,
          "Request should use the configured NVIDIA API key"
        );

        assert.equal(
          capturedInit?.headers &&
            new Headers(
              capturedInit.headers
            ).get("Content-Type"),
          "application/json",
          "Request should send JSON"
        );

        assert.equal(
          typeof capturedInit?.body,
          "string",
          "Request should contain a JSON body"
        );

        const body = JSON.parse(
          capturedInit?.body as string
        );

        assert.equal(
          body.model,
          NVIDIA_MODEL,
          "Request should use the configured NVIDIA model"
        );

        assert.ok(
          Array.isArray(body.messages),
          "Request should contain messages"
        );

        assert.ok(
          body.messages.length > 0,
          "Request should contain at least one message"
        );
      }
    );
  }
);

/* =========================================================
   Secret Protection
========================================================= */

test(
  "does not leak the NVIDIA API key in provider errors",
  async () => {
    await withMockedFetch(
      mockFetch(
        {
          error: {
            message:
              "Request failed for super-secret-nvidia-key",
          },
        },
        500
      ),
      async () => {
        const provider = createProvider({
          NVIDIA_API_KEY,
          NVIDIA_MODEL,
        });

        await assert.rejects(
          () =>
            provider.generateJson(
              "{}",
              "planner"
            ),
          (error: unknown) => {
            assert.ok(
              error instanceof ProviderError,
              "Error should be a ProviderError"
            );

            assert.doesNotMatch(
              error.message,
              new RegExp(
                NVIDIA_API_KEY.replace(
                  /[.*+?^${}()|[\]\\]/g,
                  "\\$&"
                )
              ),
              "Provider error must not expose the API key"
            );

            return true;
          }
        );
      }
    );
  }
);

/* =========================================================
   Fetch Cleanup
========================================================= */

test(
  "restores global fetch after a successful provider call",
  async () => {
    const originalFetch = globalThis.fetch;

    await withMockedFetch(
      mockFetch({
        choices: [
          {
            message: {
              content: '{"ok":true}',
            },
          },
        ],
      }),
      async () => {
        const provider = createProvider({
          NVIDIA_API_KEY,
          NVIDIA_MODEL,
        });

        await provider.generateJson(
          "{}",
          "planner"
        );
      }
    );

    assert.equal(
      globalThis.fetch,
      originalFetch,
      "Global fetch should be restored after success"
    );
  }
);

test(
  "restores global fetch after a provider failure",
  async () => {
    const originalFetch = globalThis.fetch;

    await assert.rejects(
      () =>
        withMockedFetch(
          mockFetch(
            {
              error: {
                message: "Server failure",
              },
            },
            500
          ),
          async () => {
            const provider =
              createProvider({
                NVIDIA_API_KEY,
                NVIDIA_MODEL,
              });

            await provider.generateJson(
              "{}",
              "planner"
            );
          }
        )
    );

    assert.equal(
      globalThis.fetch,
      originalFetch,
      "Global fetch should be restored after failure"
    );
  }
);
