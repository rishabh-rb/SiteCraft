
import test from "node:test";
import assert from "node:assert/strict";

import { createProvider, ProviderError } from "@sitecraft/ml";

const NVIDIA_API_KEY = "super-secret-nvidia-key";
const NVIDIA_MODEL = "working-model";
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

type FetchCall = {
  input: RequestInfo | URL;
  init?: RequestInit;
};

function mockFetch(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
): typeof fetch {
  return (async () => {
    return new Response(
      typeof body === "string"
        ? body
        : JSON.stringify(body),
      {
        status,
        headers,
      }
    );
  }) as typeof fetch;
}

async function withMockedFetch<T>(
  fetchMock: typeof fetch,
  callback: () => Promise<T>
): Promise<T> {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = fetchMock;

  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function withNvidiaEnvironment<T>(
  callback: () => Promise<T>
): Promise<T> {
  const originalEnv = { ...process.env };

  process.env.NVIDIA_API_KEY = NVIDIA_API_KEY;
  process.env.NVIDIA_MODEL = NVIDIA_MODEL;
  process.env.NVIDIA_BASE_URL = NVIDIA_BASE_URL;

  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.BYNARA_API_KEY;

  try {
    return await callback();
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }

    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function assertProviderError(
  action: () => Promise<unknown>,
  expectedCode: string,
  expectedModel = NVIDIA_MODEL
) {
  await assert.rejects(
    action,
    (error: unknown) => {
      assert.ok(
        error instanceof ProviderError,
        "Expected ProviderError"
      );

      assert.equal(
        error.code,
        expectedCode,
        `Expected error code ${expectedCode}`
      );

      assert.equal(
        error.model,
        expectedModel,
        "ProviderError should contain the requested model"
      );

      assert.equal(
        error.provider,
        "nvidia",
        "ProviderError should identify NVIDIA as the provider"
      );

      assert.ok(
        typeof error.message === "string",
        "ProviderError should contain a message"
      );

      assert.ok(
        error.message.length > 0,
        "ProviderError message should not be empty"
      );

      return true;
    }
  );
}

function createValidResponse(content = '{"ok":true}') {
  return {
    choices: [
      {
        message: {
          content,
        },
      },
    ],
  };
}

test(
  "throws MODEL_UNAVAILABLE when NVIDIA model is unavailable",
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch(
          {
            error: {
              message: "The requested model is not available",
            },
          },
          404
        ),
        async () => {
          await assertProviderError(
            () =>
              provider.generateJson(
                "Generate a test response",
                "code"
              ),
            "MODEL_UNAVAILABLE"
          );
        }
      );
    });
  }
);

test(
  "includes useful model guidance when NVIDIA model is unavailable",
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch(
          {
            error: {
              message: "Model not found",
            },
          },
          404
        ),
        async () => {
          await assert.rejects(
            provider.generateJson(
              "Generate a test response",
              "code"
            ),
            (error: unknown) => {
              assert.ok(error instanceof ProviderError);

              assert.equal(
                error.code,
                "MODEL_UNAVAILABLE"
              );

              assert.match(
                error.message,
                /NVIDIA_MODEL/i,
                "Error should tell the user how to configure the NVIDIA model"
              );

              assert.match(
                error.message,
                new RegExp(NVIDIA_MODEL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              );

              return true;
            }
          );
        }
      );
    });
  }
);

test(
  "throws MALFORMED_RESPONSE when NVIDIA returns invalid JSON",
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch(
          "{ this is not valid JSON",
          200,
          {
            "Content-Type": "application/json",
          }
        ),
        async () => {
          await assertProviderError(
            () =>
              provider.generateJson(
                "Generate a test response",
                "code"
              ),
            "MALFORMED_RESPONSE"
          );
        }
      );
    });
  }
);

test(
  "throws MALFORMED_RESPONSE when choices is missing",
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch({
          id: "test-response",
          object: "chat.completion",
        }),
        async () => {
          await assertProviderError(
            () =>
              provider.generateJson(
                "Generate a test response",
                "code"
              ),
            "MALFORMED_RESPONSE"
          );
        }
      );
    });
  }
);

test(
  "throws MALFORMED_RESPONSE when choices is null",
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch({
          choices: null,
        }),
        async () => {
          await assertProviderError(
            () =>
              provider.generateJson(
                "Generate a test response",
                "code"
              ),
            "MALFORMED_RESPONSE"
          );
        }
      );
    });
  }
);

test(
  "throws MALFORMED_RESPONSE when choices is empty",
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch({
          choices: [],
        }),
        async () => {
          await assertProviderError(
            () =>
              provider.generateJson(
                "Generate a test response",
                "code"
              ),
            "MALFORMED_RESPONSE"
          );
        }
      );
    });
  }
);

test(
  "throws MALFORMED_RESPONSE when message is missing",
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch({
          choices: [
            {},
          ],
        }),
        async () => {
          await assertProviderError(
            () =>
              provider.generateJson(
                "Generate a test response",
                "code"
              ),
            "MALFORMED_RESPONSE"
          );
        }
      );
    });
  }
);

test(
  "throws MALFORMED_RESPONSE when message content is missing",
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch({
          choices: [
            {
              message: {},
            },
          ],
        }),
        async () => {
          await assertProviderError(
            () =>
              provider.generateJson(
                "Generate a test response",
                "code"
              ),
            "MALFORMED_RESPONSE"
          );
        }
      );
    });
  }
);

test(
  "throws MALFORMED_RESPONSE when message content is empty",
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

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
          await assertProviderError(
            () =>
              provider.generateJson(
                "Generate a test response",
                "code"
              ),
            "MALFORMED_RESPONSE"
          );
        }
      );
    });
  }
);

test(
  "throws an appropriate ProviderError for a server failure",
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch(
          {
            error: {
              message: "Internal server error",
            },
          },
          500
        ),
        async () => {
          await assert.rejects(
            provider.generateJson(
              "Generate a test response",
              "code"
            ),
            (error: unknown) => {
              assert.ok(
                error instanceof ProviderError,
                "Server failure should produce ProviderError"
              );

              assert.equal(
                error.provider,
                "nvidia"
              );

              assert.equal(
                error.model,
                NVIDIA_MODEL
              );

              assert.ok(
                typeof error.message === "string"
              );

              assert.ok(
                error.message.length > 0
              );

              return true;
            }
          );
        }
      );
    });
  }
);

test(
  "throws an appropriate ProviderError for rate limiting",
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch(
          {
            error: {
              message: "Too many requests",
            },
          },
          429
        ),
        async () => {
          await assert.rejects(
            provider.generateJson(
              "Generate a test response",
              "code"
            ),
            (error: unknown) => {
              assert.ok(
                error instanceof ProviderError,
                "Rate-limit failure should produce ProviderError"
              );

              assert.equal(
                error.provider,
                "nvidia"
              );

              assert.equal(
                error.model,
                NVIDIA_MODEL
              );

              assert.ok(
                typeof error.message === "string"
              );

              return true;
            }
          );
        }
      );
    });
  }
);

test(
  "throws an appropriate ProviderError for invalid API key",
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch(
          {
            error: {
              message: "Invalid API key",
            },
          },
          401
        ),
        async () => {
          await assert.rejects(
            provider.generateJson(
              "Generate a test response",
              "code"
            ),
            (error: unknown) => {
              assert.ok(
                error instanceof ProviderError,
                "Authentication failure should produce ProviderError"
              );

              assert.equal(
                error.provider,
                "nvidia"
              );

              assert.equal(
                error.model,
                NVIDIA_MODEL
              );

              assert.ok(
                typeof error.message === "string"
              );

              return true;
            }
          );
        }
      );
    });
  }
);

test(
  "handles network failure without leaking the API key",
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      const networkError = new Error(
        "connect ECONNREFUSED"
      );

      await withMockedFetch(
        (async () => {
          throw networkError;
        }) as typeof fetch,
        async () => {
          await assert.rejects(
            provider.generateJson(
              "Generate a test response",
              "code"
            ),
            (error: unknown) => {
              assert.ok(
                error instanceof Error,
                "Network failure should produce an Error"
              );

              assert.ok(
                !error.message.includes(
                  NVIDIA_API_KEY
                ),
                "API key must never appear in the error message"
              );

              return true;
            }
          );
        }
      );
    });
  }
);

test(
  "never exposes the NVIDIA API key in provider errors",
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch(
          {
            error: {
              message: `Authentication failed for ${NVIDIA_API_KEY}`,
            },
          },
          401
        ),
        async () => {
          await assert.rejects(
            provider.generateJson(
              "Generate a test response",
              "code"
            ),
            (error: unknown) => {
              assert.ok(
                error instanceof Error
              );

              assert.ok(
                !error.message.includes(
                  NVIDIA_API_KEY
                ),
                "Provider error must not expose the API key"
              );

              return true;
            }
          );
        }
      );
    });
  }
);

test(
  "sends a correct NVIDIA request",
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      const calls: FetchCall[] = [];

      await withMockedFetch(
        (async (
          input: RequestInfo | URL,
          init?: RequestInit
        ) => {
          calls.push({
            input,
            init,
          });

          return new Response(
            JSON.stringify(
              createValidResponse(
                JSON.stringify({
                  success: true,
                })
              )
            ),
            {
              status: 200,
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );
        }) as typeof fetch,
        async () => {
          const result =
            await provider.generateJson<{
              success: boolean;
            }>(
              "Generate a test response",
              "code"
            );

          assert.deepEqual(
            result,
            {
              success: true,
            }
          );
        }
      );

      assert.equal(
        calls.length,
        1,
        "Exactly one NVIDIA request should be made"
      );

      const request = calls[0];

      assert.ok(
        request,
        "NVIDIA request should exist"
      );

      assert.equal(
        String(request.input),
        `${NVIDIA_BASE_URL}/chat/completions`
      );

      assert.equal(
        request.init?.method,
        "POST"
      );

      assert.ok(
        typeof request.init?.body === "string",
        "Request should contain a JSON body"
      );

      const body = JSON.parse(
        request.init!.body as string
      );

      assert.equal(
        body.model,
        NVIDIA_MODEL
      );

      assert.ok(
        Array.isArray(body.messages),
        "Request should contain messages"
      );

      assert.ok(
        body.messages.length > 0,
        "Request should contain at least one message"
      );

      assert.ok(
        body.messages.some(
          (message: {
            role?: string;
            content?: string;
          }) =>
            message.role === "user"
        ),
        "Request should contain a user message"
      );

      const headers = new Headers(
        request.init?.headers
      );

      assert.equal(
        headers.get("Content-Type"),
        "application/json"
      );

      assert.equal(
        headers.get("Authorization"),
        `Bearer ${NVIDIA_API_KEY}`
      );
    });
  }
);

test(
  "successfully parses a valid NVIDIA JSON response",
  async () => {
    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch(
          createValidResponse(
            JSON.stringify({
              message: "success",
              value: 42,
            })
          )
        ),
        async () => {
          const result =
            await provider.generateJson<{
              message: string;
              value: number;
            }>(
              "Return JSON",
              "code"
            );

          assert.deepEqual(
            result,
            {
              message: "success",
              value: 42,
            }
          );
        }
      );
    });
  }
);

test(
  "restores fetch after a successful request",
  async () => {
    const originalFetch = globalThis.fetch;

    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch(
          createValidResponse(
            JSON.stringify({
              ok: true,
            })
          )
        ),
        async () => {
          await provider.generateJson(
            "Return JSON",
            "code"
          );

          assert.notEqual(
            globalThis.fetch,
            originalFetch,
            "Mock fetch should be active inside the test"
          );
        }
      );
    });

    assert.equal(
      globalThis.fetch,
      originalFetch,
      "Original fetch should be restored after the test"
    );
  }
);

test(
  "restores fetch after a failed request",
  async () => {
    const originalFetch = globalThis.fetch;

    await withNvidiaEnvironment(async () => {
      const provider = createProvider();

      await withMockedFetch(
        mockFetch(
          {
            choices: [],
          }
        ),
        async () => {
          await assert.rejects(
            provider.generateJson(
              "Return JSON",
              "code"
            )
          );

          assert.notEqual(
            globalThis.fetch,
            originalFetch,
            "Mock fetch should be active inside the test"
          );
        }
      );
    });

    assert.equal(
      globalThis.fetch,
      originalFetch,
      "Original fetch should be restored after failure"
    );
  }
);
